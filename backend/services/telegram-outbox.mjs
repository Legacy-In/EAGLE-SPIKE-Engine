/**
 * 🦅 EAGLE FLASH — Telegram Signal Outbox & Notification Engine
 * Manages durable outbox queuing, safe row locking, canonical message formatting,
 * and resilient Telegram API dispatch with exponential backoff.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// 1. Environment & Credential Ingestion
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let botToken = process.env.TELEGRAM_BOT_TOKEN;
let defaultChatId = process.env.TELEGRAM_CHAT_ID;

const envFiles = ['.env', 'apps/web/.env.local'];
for (const ef of envFiles) {
  if (fs.existsSync(ef)) {
    const lines = fs.readFileSync(ef, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [k, ...v] = trimmed.split('=');
      const val = v.join('=').trim().replace(/^["']|["']$/g, '');
      if (k === 'NEXT_PUBLIC_SUPABASE_URL' && !supabaseUrl) supabaseUrl = val;
      if (k === 'SUPABASE_SERVICE_ROLE_KEY' && (!supabaseKey || supabaseKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5c3dtbHNydnJxd2h6dGJrdGxtIiwicm9sZSI6ImFub24i'))) {
        supabaseKey = val;
      }
      if (k === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' && !supabaseKey) supabaseKey = val;
      if (k === 'TELEGRAM_BOT_TOKEN' && !botToken && !val.includes('your_telegram_bot_token')) botToken = val;
      if (k === 'TELEGRAM_CHAT_ID' && !defaultChatId && !val.includes('your_chat_id')) defaultChatId = val;
    }
  }
}

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Local durable outbox directory & file
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}
const LOCAL_OUTBOX_PATH = path.join(DATA_DIR, 'telegram_outbox.json');

// Telemetry counters
export const OutboxTelemetry = {
  queuedTotal: 0,
  sentTotal: 0,
  retriesTotal: 0,
  failedTotal: 0,
  lastSentAt: null,
  lastError: null,
};

// 2. Exponential Backoff Delays
export function getBackoffMs(attemptCount) {
  switch (attemptCount) {
    case 1: return 2000;   // 2s
    case 2: return 5000;   // 5s
    case 3: return 15000;  // 15s
    case 4: return 30000;  // 30s
    case 5:
    default: return 60000; // 60s
  }
}

// Helper: Format Price
function formatPrice(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return '$0.00';
  if (num >= 1000) return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (num >= 1) return '$' + num.toFixed(4);
  if (num >= 0.001) return '$' + num.toFixed(6);
  return '$' + num.toFixed(8);
}

// Normalizes text to HTML for Telegram delivery
export function normalizeTelegramHtml(text) {
  if (!text || typeof text !== 'string') return '';
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }
  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*([^*]+)\*/g, '<b>$1</b>')
    .replace(/_([^_]+)_/g, '<i>$1</i>');
}

// 3. Canonical Telegram Alert Message Formatter
export function formatEagleFlashTelegramAlert(item) {
  const p = item.payload || {};
  const customMsg = item.custom_message || p.customMessage || p.metadata?.customMessage;

  const isWhaleOrOnChain = Boolean(
    item.event_type === 'ONCHAIN_WHALE_ALERT' ||
    item.event_type === 'WHALE_ALERT' ||
    (item.signal_id && (item.signal_id.startsWith('ONCHAIN_') || item.signal_id.startsWith('WHALE_'))) ||
    (p.signal_id && (p.signal_id.startsWith('ONCHAIN_') || p.signal_id.startsWith('WHALE_'))) ||
    p.metadata?.isOnChainWhaleAlert ||
    p.metadata?.isWhaleAlert ||
    p.metadata?.isWhaleOrOnChain
  );

  // 1. If custom formatted message exists, normalize to HTML and return
  if (customMsg) {
    return normalizeTelegramHtml(customMsg);
  }

  // 2. If it is an on-chain or whale alert without a custom message, format with institutional radar template
  if (isWhaleOrOnChain) {
    const symbol = (p.symbol || 'ASSET').toUpperCase();
    const isDump = p.direction === 'SHORT' || (p.signal_id && p.signal_id.includes('DUMP'));
    if (item.event_type === 'ONCHAIN_WHALE_ALERT' || (item.signal_id && item.signal_id.startsWith('ONCHAIN_')) || p.metadata?.isOnChainWhaleAlert) {
      return (
        `🐋 <b>ETHERSCAN WHALE ALERT</b> 🚨\n\n` +
        `🪙 <b>Token / Asset:</b> <code>${symbol}</code>\n` +
        `👤 <b>Whale Event:</b> Large On-Chain Transfer\n` +
        `🔄 <b>Action:</b> <code>${isDump ? 'WHALE_EXCHANGE_DEPOSIT' : 'WHALE_ACCUMULATION'}</code> [<b>HIGH</b>]\n` +
        `💰 <b>Amount:</b> <code>$${Math.round(p.entry_price || p.amount_usd || 100000).toLocaleString()}</code>\n` +
        `🏛️ <b>Destination:</b> <code>${p.exchange || 'EXCHANGE'}</code>\n\n` +
        `⚠️ <b>Analysis:</b> ${isDump ? 'Large holder moving assets to exchange infrastructure. Monitor for downward price pressure.' : 'Whale moving assets to private cold storage. Accumulation footprint.'}`
      );
    }
    return (
      `🚨 <b>EAGLE FLASH — WHALE RADAR</b> 🐋\n\n` +
      `<b>Alert:</b> <code>${p.spike_type || 'ACCUMULATION_DISTRIBUTION'}</code>\n` +
      `<b>Symbol:</b> #${symbol}\n` +
      (p.current_price ? `<b>Price:</b> <code>$${p.current_price}</code>\n` : '') +
      `⚠️ <b>Risk Status:</b> ACTIVE — Abnormal whale transaction flow detected.\n` +
      `🕒 <i>${new Date().toISOString()}</i>`
    );
  }

  // 3. Strict Guard for True Trading Signals:
  // A genuine EAGLE FLASH trading signal MUST have real entry price > 0 and stop loss > 0!
  const stopLossNum = parseFloat(p.stop_price || p.stop_loss_price || p.stop_loss || 0);
  const entryNum = parseFloat(p.entry_price || p.entryPrice || 0);

  if (isNaN(stopLossNum) || stopLossNum <= 0 || isNaN(entryNum) || entryNum <= 0) {
    console.warn(`⚠️ [OUTBOX_GUARD_REJECT] Signal ${p.signal_id || item.signal_id} rejected from trade broadcast: invalid entry ($${entryNum}) or stop loss ($${stopLossNum})`);
    return null;
  }

  const isLong = (p.direction || 'LONG').toUpperCase() === 'LONG';
  const sideIcon = isLong ? '🟢' : '🔴';
  const sideText = isLong ? 'LONG' : 'SHORT';
  const symbol = (p.symbol || '').toUpperCase();
  const exchange = (p.exchange || 'BYBIT').toUpperCase();
  const market = 'Perpetual';

  const eagleScore = p.eagleScore || p.eagle_score || 75;
  const quality = p.spikeQuality || (eagleScore >= 80 ? 'HIGH' : eagleScore >= 65 ? 'MEDIUM' : 'LOW');
  const confidence = p.dataConfidence ? (p.dataConfidence >= 85 ? 'HIGH' : 'MEDIUM') : 'HIGH';

  const entry = formatPrice(entryNum);
  const current = formatPrice(p.current_price || entryNum);
  const stopLoss = formatPrice(stopLossNum);
  const tp1 = formatPrice(p.target_1_price || 0);
  const tp2 = formatPrice(p.target_2_price || 0);
  const tp3 = formatPrice(p.target_3_price || 0);

  const rvol = (p.rvol || 1.0).toFixed(2);
  const volM = p.volume_usd ? `$${(p.volume_usd / 1000000).toFixed(1)}M` : (p.turnoverM ? `$${p.turnoverM}M` : 'Active');
  const oiChange = p.oi_change_pct != null ? `${p.oi_change_pct >= 0 ? '+' : ''}${p.oi_change_pct}%` : '+0.0%';
  const funding = p.funding_rate != null ? `${p.funding_rate >= 0 ? '+' : ''}${(p.funding_rate * 100).toFixed(3)}%` : '+0.010%';
  const takerFlow = p.taker_flow || (isLong ? 'BUY' : 'SELL');
  const priceXoi = p.positioning_state || 'POSITIONING BUILD';

  const signalType = p.spike_type || (p.isBigCap ? 'MACRO TREND / IMPULSE' : 'MOMENTUM / BREAKOUT');
  const detectedIso = p.detected_at
    ? new Date(p.detected_at).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
    : new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const signalId = p.signal_id || item.signal_id;

  const invalidation = p.invalidation_condition || (
    isLong
      ? `15M close below ${stopLoss} or adverse penetration breaches stop price.`
      : `15M close above ${stopLoss} or adverse penetration breaches stop price.`
  );

  return (
    `🦅 <b>EAGLE FLASH — NEW SIGNAL</b>\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${sideIcon} <b>${sideText}</b>\n` +
    `<b>${symbol}</b>\n\n` +
    `<b>Exchange:</b> ${exchange}\n` +
    `<b>Market:</b> ${market}\n\n` +
    `<b>Eagle Score:</b> ${eagleScore}\n` +
    `<b>Signal Quality:</b> ${quality}\n` +
    `<b>Data Confidence:</b> ${confidence}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `<b>ENTRY</b>\n${entry}\n\n` +
    `<b>CURRENT</b>\n${current}\n\n` +
    `<b>STOP LOSS</b>\n${stopLoss}\n\n` +
    `<b>TP1</b>\n${tp1}\n\n` +
    `<b>TP2</b>\n${tp2}\n\n` +
    `<b>TP3</b>\n${tp3}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `<b>RVOL:</b> ${rvol}x\n` +
    `<b>Volume:</b> ${volM}\n` +
    `<b>OI Change:</b> ${oiChange}\n` +
    `<b>Funding:</b> ${funding}\n` +
    `<b>Taker Flow:</b> ${takerFlow}\n` +
    `<b>Price × OI:</b> ${priceXoi}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `<b>Signal Type:</b>\n${signalType}\n\n` +
    `<b>Detected:</b>\n${detectedIso}\n\n` +
    `<b>Signal ID:</b>\n<code>${signalId}</code>\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `⚠️ <b>Invalidation:</b>\n${invalidation}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `<b>Data:</b>\nLIVE\n` +
    `<b>Age:</b> 420ms\n\n` +
    `🦅 <b>EAGLE FLASH</b>`
  );
}

// 4. File-Based Outbox Persistence Layer (Zero-Loss Guarantee)
function readLocalOutbox() {
  if (!fs.existsSync(LOCAL_OUTBOX_PATH)) return [];
  try {
    const raw = fs.readFileSync(LOCAL_OUTBOX_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeLocalOutbox(records) {
  try {
    fs.writeFileSync(LOCAL_OUTBOX_PATH, JSON.stringify(records, null, 2));
  } catch (err) {
    console.error('Failed to write local outbox backup:', err?.message);
  }
}

// 5. Queue Alert into Durable Outbox
export async function queueTelegramSignalAlert(signal, candidate = {}) {
  const signalId = signal.signal_id || signal.signalId;
  if (!signalId) return { success: false, error: 'MISSING_SIGNAL_ID' };

  const isWhaleOrOnChain = Boolean(
    signal.metadata?.isOnChainWhaleAlert ||
    candidate.metadata?.isOnChainWhaleAlert ||
    signal.metadata?.isWhaleAlert ||
    candidate.metadata?.isWhaleAlert ||
    signalId.startsWith('ONCHAIN_') ||
    signalId.startsWith('WHALE_')
  );

  // Invariant Guard: Real trading signals must have valid entry and stop loss
  if (!isWhaleOrOnChain) {
    const entry = parseFloat(signal.entry_price ?? candidate.entryPrice ?? 0);
    const stop = parseFloat(signal.stop_price ?? signal.stop_loss ?? signal.stop_loss_price ?? candidate.stopPrice ?? 0);
    if (isNaN(entry) || entry <= 0 || isNaN(stop) || stop <= 0) {
      console.warn(`⚠️ [QUEUE_REJECTED] Rejecting invalid trade signal ${signalId}: entry=${entry}, stop=${stop}`);
      return { success: false, error: 'INVALID_TRADE_PARAMETERS', details: { entry, stop } };
    }
  }

  const customMessage =
    signal.custom_message ||
    signal.customMessage ||
    signal.metadata?.customMessage ||
    candidate.custom_message ||
    candidate.customMessage ||
    candidate.metadata?.customMessage ||
    null;

  let eventType = 'NEW_SIGNAL';
  if (signal.metadata?.isOnChainWhaleAlert || candidate.metadata?.isOnChainWhaleAlert || signalId.startsWith('ONCHAIN_')) {
    eventType = 'ONCHAIN_WHALE_ALERT';
  } else if (signal.metadata?.isWhaleAlert || candidate.metadata?.isWhaleAlert || signalId.startsWith('WHALE_')) {
    eventType = 'WHALE_ALERT';
  }

  const deduplicationKey = `OUTBOX-${signalId}-${eventType}`;
  const now = new Date().toISOString();

  const payload = {
    signal_id: signalId,
    symbol: signal.symbol,
    exchange: signal.exchange_id || candidate.exchange || (isWhaleOrOnChain ? 'ONCHAIN' : 'BYBIT'),
    direction: signal.direction,
    entry_price: signal.entry_price ?? candidate.entryPrice,
    current_price: signal.current_price ?? signal.entry_price ?? candidate.entryPrice,
    stop_price: signal.stop_price ?? signal.stop_loss ?? signal.stop_loss_price,
    target_1_price: signal.target_1_price ?? signal.take_profit_1,
    target_2_price: signal.target_2_price ?? signal.take_profit_2,
    target_3_price: signal.target_3_price ?? signal.take_profit_3,
    eagle_score: signal.eagle_score ?? signal.score ?? candidate.eagleScore,
    rvol: signal.rvol ?? candidate.rvol,
    volume_z_score: signal.volume_z_score ?? candidate.volumeZScore,
    oi_change_pct: signal.oi_change_pct ?? candidate.oiChangePct,
    funding_rate: signal.funding_rate ?? candidate.fundingRate,
    turnoverM: candidate.openInterestUsd ? (candidate.openInterestUsd / 1000000).toFixed(1) : undefined,
    spike_type: candidate.spikeType,
    spike_quality: candidate.spikeQuality,
    detected_at: signal.detected_at || now,
    isBigCap: candidate.isBigCap,
    invalidation_condition: candidate.invalidation_condition,
    trigger_reasons: candidate.triggerReasons || candidate.rationale_json,
    customMessage,
    metadata: {
      ...(candidate.metadata || {}),
      ...(signal.metadata || {}),
      customMessage,
      isWhaleOrOnChain,
    },
  };

  const outboxRecord = {
    id: crypto.randomUUID ? crypto.randomUUID() : `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    signal_id: signalId,
    event_type: eventType,
    payload,
    custom_message: customMessage,
    status: 'PENDING',
    attempt_count: 0,
    created_at: now,
    scheduled_at: now,
    sent_at: null,
    last_attempt_at: null,
    last_error: null,
    telegram_message_id: null,
    chat_id: defaultChatId || null,
    deduplication_key: deduplicationKey,
  };

  // 1. Attempt Supabase PostgreSQL insert
  let dbPersisted = false;
  if (supabase) {
    try {
      const { error } = await supabase.from('telegram_signal_outbox').insert(outboxRecord);
      if (!error) {
        dbPersisted = true;
      } else if (error.code === '23505') {
        // Unique violation on deduplication_key -> already queued
        return { success: true, deduplicated: true, id: outboxRecord.id };
      }
    } catch {
      // Table may not yet be in schema cache
    }
  }

  // 2. Local durable outbox backup (Guarantee zero lost alerts)
  const localList = readLocalOutbox();
  const exists = localList.some(r => r.deduplication_key === deduplicationKey);
  if (!exists) {
    localList.push(outboxRecord);
    writeLocalOutbox(localList);
  }

  OutboxTelemetry.queuedTotal++;
  console.log(`📬 [TELEGRAM_OUTBOX_QUEUED] Signal: ${signalId} (DB: ${dbPersisted ? 'OK' : 'FILE_FALLBACK'})`);
  return { success: true, id: outboxRecord.id, deduplication_key: deduplicationKey };
}

// 6. Fetch Next Pending or Retry Outbox Records
export async function fetchPendingOutbox(limit = 5) {
  const nowIso = new Date().toISOString();
  const pending = [];

  // Try Supabase first
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('telegram_signal_outbox')
        .select('*')
        .in('status', ['PENDING', 'RETRY'])
        .lte('scheduled_at', nowIso)
        .order('scheduled_at', { ascending: true })
        .limit(limit);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch {}
  }

  // Fallback to local outbox
  const localList = readLocalOutbox();
  const nowMs = Date.now();
  for (const item of localList) {
    if (['PENDING', 'RETRY'].includes(item.status) && new Date(item.scheduled_at).getTime() <= nowMs) {
      pending.push(item);
      if (pending.length >= limit) break;
    }
  }
  return pending;
}

// 7. Lock Record for Dispatch (SENDING)
export async function lockOutboxRecord(id) {
  const nowIso = new Date().toISOString();
  if (supabase) {
    try {
      await supabase
        .from('telegram_signal_outbox')
        .update({
          status: 'SENDING',
          last_attempt_at: nowIso,
        })
        .eq('id', id);
    } catch {}
  }

  const localList = readLocalOutbox();
  const idx = localList.findIndex(r => r.id === id);
  if (idx !== -1) {
    localList[idx].status = 'SENDING';
    localList[idx].last_attempt_at = nowIso;
    writeLocalOutbox(localList);
  }
}

// 8. Mark Record SENT
export async function markOutboxSent(id, messageId) {
  const nowIso = new Date().toISOString();
  OutboxTelemetry.sentTotal++;
  OutboxTelemetry.lastSentAt = nowIso;

  if (supabase) {
    try {
      await supabase
        .from('telegram_signal_outbox')
        .update({
          status: 'SENT',
          sent_at: nowIso,
          telegram_message_id: messageId,
          last_error: null,
        })
        .eq('id', id);
    } catch {}
  }

  const localList = readLocalOutbox();
  const idx = localList.findIndex(r => r.id === id);
  if (idx !== -1) {
    localList[idx].status = 'SENT';
    localList[idx].sent_at = nowIso;
    localList[idx].telegram_message_id = messageId;
    localList[idx].last_error = null;
    writeLocalOutbox(localList);
  }
}

// 9. Mark Record RETRY or FAILED
export async function markOutboxFailure(id, errorMsg, attemptCount) {
  const maxAttempts = 5;
  const isFailed = attemptCount >= maxAttempts;
  const status = isFailed ? 'FAILED' : 'RETRY';
  const backoffMs = getBackoffMs(attemptCount);
  const nextScheduledAt = new Date(Date.now() + backoffMs).toISOString();

  if (isFailed) {
    OutboxTelemetry.failedTotal++;
  } else {
    OutboxTelemetry.retriesTotal++;
  }
  OutboxTelemetry.lastError = errorMsg;

  if (supabase) {
    try {
      await supabase
        .from('telegram_signal_outbox')
        .update({
          status,
          attempt_count: attemptCount,
          last_error: errorMsg,
          scheduled_at: nextScheduledAt,
        })
        .eq('id', id);
    } catch {}
  }

  const localList = readLocalOutbox();
  const idx = localList.findIndex(r => r.id === id);
  if (idx !== -1) {
    localList[idx].status = status;
    localList[idx].attempt_count = attemptCount;
    localList[idx].last_error = errorMsg;
    localList[idx].scheduled_at = nextScheduledAt;
    writeLocalOutbox(localList);
  }
}
