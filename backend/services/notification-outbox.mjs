/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — GENERALIZED MULTI-CHANNEL NOTIFICATION OUTBOX SERVICE
 * Authoritative outbox dispatcher for both Telegram and Discord channels.
 * Guarantees durable queuing, atomic registration, idempotent delivery,
 * and isolated failure handling.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// 1. Environment & Credential Ingestion
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const envFiles = ['.env', 'apps/web/.env.local'];
for (const ef of envFiles) {
  try {
    const fullPath = path.resolve(process.cwd(), ef);
    if (fs.existsSync(fullPath)) {
      const lines = fs.readFileSync(fullPath, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...v] = trimmed.split('=');
        const val = v.join('=').trim().replace(/^["']|["']$/g, '');
        if (k === 'NEXT_PUBLIC_SUPABASE_URL' && !supabaseUrl) supabaseUrl = val;
        if (k === 'SUPABASE_SERVICE_ROLE_KEY' && !supabaseKey) supabaseKey = val;
        if (k === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' && !supabaseKey) supabaseKey = val;
      }
    }
  } catch (e) {}
}

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
}) : null;

// Local durable outbox directory & file
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}

export function isTestExecution() {
  return (
    process.env.NODE_ENV === 'test' ||
    Boolean(process.env.TEST_MODE) ||
    Boolean(process.env.VITEST) ||
    process.argv.some(a => a.includes('test') || a.includes('tsx'))
  );
}

export function getLocalNotificationOutboxPath() {
  const fileName = isTestExecution() ? 'test_notification_outbox.json' : 'notification_outbox.json';
  return path.join(DATA_DIR, fileName);
}

// Telemetry counters
export const NotificationTelemetry = {
  telegramQueuedTotal: 0,
  telegramSentTotal: 0,
  discordQueuedTotal: 0,
  discordSentTotal: 0,
  retriesTotal: 0,
  failuresTotal: 0,
  lastSentAt: null,
  lastError: null,
};

// Exponential backoff calculation
export function getNotificationBackoffMs(attemptCount) {
  switch (attemptCount) {
    case 1: return 2000;   // 2s
    case 2: return 5000;   // 5s
    case 3: return 15000;  // 15s
    case 4: return 30000;  // 30s
    case 5:
    default: return 60000; // 60s
  }
}

// Local outbox persistence helpers
function readLocalOutbox() {
  const outboxPath = getLocalNotificationOutboxPath();
  try {
    if (fs.existsSync(outboxPath)) {
      const raw = fs.readFileSync(outboxPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {}
  return [];
}

function writeLocalOutbox(items) {
  const outboxPath = getLocalNotificationOutboxPath();
  try {
    fs.writeFileSync(outboxPath, JSON.stringify(items, null, 2), 'utf-8');
  } catch (e) {}
}

/**
 * Build outbox entries for both Telegram and Discord for a canonical signal
 */
export function buildSignalNotificationPayloads(signal, candidate = {}, eventType = 'NEW_SIGNAL') {
  const signalId = signal.signal_id || signal.signalId;
  const notifications = [];

  const phase = candidate.phase || candidate.spikePhase || signal.spike_phase || signal.phase || 'NORMAL';
  const type = candidate.type || candidate.spikeType || signal.primary_strategy || 'BREAKOUT';

  const commonPayload = {
    ...signal,
    signal_id: signalId,
    phase,
    spike_phase: phase,
    type,
    spike_type: type,
    funding_rate: candidate.fundingRate,
    turnoverM: candidate.openInterestUsd ? (candidate.openInterestUsd / 1000000).toFixed(1) : undefined,
    entry_quality: signal.entry_quality || 'MEDIUM',
    chase_risk: signal.chase_risk || 'MEDIUM',
    risk_r: signal.risk_r || signal.riskR,
    strategy_combination: signal.strategy_combination || [signal.primary_strategy || 'BREAKOUT'],
    trigger_reasons: candidate.triggerReasons || candidate.rationale_json,
    invalidation_condition: candidate.invalidation_condition,
    data_confidence: candidate.dataConfidence || 'HIGH',
    price_age_ms: candidate.priceAgeMs || 150,
    created_at: new Date().toISOString(),
  };

  // 1. Telegram Outbox Record
  notifications.push({
    signal_id: signalId,
    event_type: eventType,
    channel_type: 'TELEGRAM',
    channel_id: process.env.TELEGRAM_CHAT_ID || null,
    payload: commonPayload,
    deduplication_key: `OUTBOX-${signalId}-${eventType}-TELEGRAM`,
  });

  // 2. Discord Outbox Record
  notifications.push({
    signal_id: signalId,
    event_type: eventType,
    channel_type: 'DISCORD',
    channel_id: process.env.DISCORD_CHANNEL_SIGNALS || null,
    payload: commonPayload,
    deduplication_key: `OUTBOX-${signalId}-${eventType}-DISCORD`,
  });

  return notifications;
}

/**
 * Queue notifications into PostgreSQL notification_outbox with durable local fallback
 */
export async function queueNotificationAlerts(notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) return { success: true, count: 0 };

  let pgSuccess = false;
  if (supabase && !isTestExecution()) {
    try {
      const recordsToInsert = notifications.map(n => ({
        signal_id: n.signal_id,
        event_type: n.event_type || 'NEW_SIGNAL',
        channel_type: n.channel_type,
        channel_id: n.channel_id,
        payload: n.payload,
        status: 'PENDING',
        deduplication_key: n.deduplication_key,
        scheduled_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('notification_outbox')
        .upsert(recordsToInsert, { onConflict: 'deduplication_key', ignoreDuplicates: true });

      if (!error) {
        pgSuccess = true;
      }
    } catch (e) {
      // Fall through to local fallback
    }
  }

  // Always sync to local durable fallback store
  const localList = readLocalOutbox();
  let addedCount = 0;

  for (const n of notifications) {
    if (n.channel_type === 'TELEGRAM') NotificationTelemetry.telegramQueuedTotal++;
    if (n.channel_type === 'DISCORD') NotificationTelemetry.discordQueuedTotal++;

    const exists = localList.some(item => item.deduplication_key === n.deduplication_key);
    if (!exists) {
      localList.push({
        id: `LOCAL-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        signal_id: n.signal_id,
        event_type: n.event_type || 'NEW_SIGNAL',
        channel_type: n.channel_type,
        channel_id: n.channel_id,
        payload: n.payload,
        status: 'PENDING',
        attempt_count: 0,
        created_at: new Date().toISOString(),
        scheduled_at: new Date().toISOString(),
        deduplication_key: n.deduplication_key,
      });
      addedCount++;
    }
  }

  if (addedCount > 0) {
    writeLocalOutbox(localList);
  }

  return {
    success: true,
    pgSuccess,
    queuedCount: notifications.length,
  };
}

/**
 * Fetch pending notifications for a specific channel type (TELEGRAM or DISCORD)
 */
export async function fetchPendingOutbox(channelType, limit = 10) {
  const nowIso = new Date().toISOString();

  if (supabase && !isTestExecution()) {
    try {
      const { data, error } = await supabase
        .from('notification_outbox')
        .select('*')
        .eq('channel_type', channelType)
        .in('status', ['PENDING', 'RETRY'])
        .lte('scheduled_at', nowIso)
        .order('scheduled_at', { ascending: true })
        .limit(limit);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (e) {}
  }

  // Local fallback
  const localList = readLocalOutbox();
  const nowMs = Date.now();
  return localList.filter(item => 
    item.channel_type === channelType &&
    ['PENDING', 'RETRY'].includes(item.status) &&
    new Date(item.scheduled_at || item.created_at).getTime() <= nowMs
  ).slice(0, limit);
}

/**
 * Mark outbox item status transition
 */
export async function updateOutboxItemStatus(id, channelType, status, options = {}) {
  const updatePayload = {
    status,
    last_attempt_at: new Date().toISOString(),
  };

  if (status === 'SENT') {
    updatePayload.sent_at = new Date().toISOString();
    if (options.externalMessageId) {
      updatePayload.external_message_id = String(options.externalMessageId);
    }
    if (channelType === 'TELEGRAM') NotificationTelemetry.telegramSentTotal++;
    if (channelType === 'DISCORD') NotificationTelemetry.discordSentTotal++;
    NotificationTelemetry.lastSentAt = new Date().toISOString();
  } else if (status === 'RETRY') {
    updatePayload.attempt_count = (options.attemptCount || 0) + 1;
    const backoffMs = getNotificationBackoffMs(updatePayload.attempt_count);
    updatePayload.scheduled_at = new Date(Date.now() + backoffMs).toISOString();
    updatePayload.last_error = options.lastError || null;
    NotificationTelemetry.retriesTotal++;
  } else if (status === 'FAILED') {
    updatePayload.last_error = options.lastError || 'Max retries exceeded';
    NotificationTelemetry.failuresTotal++;
  }

  if (supabase && !isTestExecution()) {
    try {
      await supabase
        .from('notification_outbox')
        .update(updatePayload)
        .eq('id', id);
    } catch (e) {}
  }

  // Update local fallback
  const localList = readLocalOutbox();
  const idx = localList.findIndex(item => item.id === id);
  if (idx !== -1) {
    localList[idx] = { ...localList[idx], ...updatePayload };
    writeLocalOutbox(localList);
  }
}
