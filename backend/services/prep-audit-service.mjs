/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — QUANTITATIVE PREP AUDIT & PERFORMANCE LEDGER
 *
 * Persists every PREP and READY market candidate to PostgreSQL/Supabase
 * (with JSON file fallback for offline dev/export) to calculate empirical
 * forward conversion statistics:
 * 1. PREP → BREAKOUT Conversion Rate
 * 2. PREP → +1R Profit Rate
 * 3. PREP → STOP Invalidation Rate
 * 4. FALSE_BREAKOUT_RATE
 * 5. TIME_TO_CONFIRM (ms & minutes)
 * 6. Maximum Favorable (MFE) & Adverse (MAE) Excursions
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { supabase } from './whale-detector.mjs';
import { queueNotificationAlerts, isTestExecution } from './notification-outbox.mjs';
import { routePreBreakoutEvent } from './discord/discord-router.mjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');

export function getLocalPrepAuditPath() {
  const fileName = isTestExecution() ? 'test_prep_signal_audits.json' : 'prep_signal_audits.json';
  return path.join(DATA_DIR, fileName);
}

// In-Memory cache of active audit records (capped at 500)
export const AuditMemoryStore = {
  records: new Map(), // id -> auditRecord
  isInitialized: false,
};

// Cooldown map to prevent duplicate notification spam for same symbol:state
export const AuditAlertCooldowns = new Map(); // `${symbol}:${state}` -> timestamp

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Initializes the in-memory store from file fallback.
 */
export function initAuditStore(forceReload = false) {
  if (AuditMemoryStore.isInitialized && !forceReload) return;
  ensureDataDir();

  const auditPath = getLocalPrepAuditPath();
  if (fs.existsSync(auditPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item?.id) AuditMemoryStore.records.set(item.id, item);
        }
      }
    } catch {
      // Ignore corrupt json
    }
  }
  AuditMemoryStore.isInitialized = true;
}

/**
 * Persists an audit candidate (PREP or READY) to Supabase / local file.
 *
 * @param {Object} candidate
 * @returns {Promise<Object>} Created or updated audit record
 */
export async function recordPrepAudit(candidate) {
  initAuditStore();

  const now = Date.now();
  const dateStr = new Date(now).toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  const id = candidate.id || `AUD-${dateStr}-${candidate.exchange || 'EX'}-${candidate.symbol}-${rand}`;

  // Target Stop: basePrice - 1.5 * ATR
  const basePrice = Number(candidate.basePrice || candidate.price || 1);
  const atr = Number(candidate.atr15m || basePrice * 0.015);
  const initialStopLoss = basePrice - 1.5 * atr;
  const target1R = basePrice + 1.5 * atr;

  const record = {
    id,
    symbol: candidate.symbol,
    exchange: candidate.exchange || 'BYBIT',
    entry_market_status: candidate.marketStatus || 'PREP',
    current_market_status: candidate.marketStatus || 'PREP',
    prep_score: candidate.prepScore || 0,
    confirmation_score: candidate.confirmationScore || 0,
    base_price_v1: basePrice,
    entry_price: Number(candidate.price || basePrice),
    atr_15m: atr,
    initial_stop_price: Number(initialStopLoss.toFixed(6)),
    target_1r_price: Number(target1R.toFixed(6)),
    chase_risk_level: candidate.chaseRisk?.level || 'LOW',
    iceberg_likelihood: candidate.icebergLikelihood || 'LOW',
    detected_at: new Date(now).toISOString(),
    confirmed_at: candidate.marketStatus === 'CONFIRMED' ? new Date(now).toISOString() : null,
    resolved_at: null,
    did_breakout: candidate.marketStatus === 'CONFIRMED',
    reached_1r: false,
    stopped_out: false,
    is_false_breakout: false,
    time_to_confirm_ms: null,
    time_to_confirm_min: null,
    peak_price: Number(candidate.price || basePrice),
    trough_price: Number(candidate.price || basePrice),
    mfe_pct: 0,
    mae_pct: 0,
    status: 'OPEN',
    discord_message_id: candidate.discord_message_id || null,
    notification_event_id: candidate.notification_event_id || null,
  };

  AuditMemoryStore.records.set(id, record);

  // 1. Primary: PostgreSQL / Supabase
  if (supabase) {
    try {
      await supabase.from('prep_signal_audits').upsert(record, { onConflict: 'id' });
    } catch {
      // Fallback gracefully if table doesn't exist yet
    }
  }

  // 2. Local JSON export/development fallback
  saveAuditsToFile();

  // 3. Queue downstream notification to #pre-breakout if not on cooldown
  const cooldownKey = `${candidate.symbol}:${record.current_market_status}`;
  const lastAlert = AuditAlertCooldowns.get(cooldownKey) || 0;
  if (candidate.emitNotification !== false && now - lastAlert > 15 * 60 * 1000) {
    AuditAlertCooldowns.set(cooldownKey, now);
    const eventType = record.current_market_status === 'READY' ? 'READY_DETECTED' : 'PREP_DETECTED';
    queuePreBreakoutNotification(record, eventType, candidate).catch(() => {});
  }

  return record;
}

/**
 * Queue a Pre-Breakout event to the canonical notification_outbox.
 * Targets #pre-breakout via routePreBreakoutEvent().
 */
export async function queuePreBreakoutNotification(auditRecord, eventType, extraPayload = {}) {
  const signalId = auditRecord.id || `EGL-PRE-${auditRecord.symbol}`;
  const preBreakoutChannel = routePreBreakoutEvent(eventType);

  const payload = {
    ...auditRecord,
    signal_id: signalId,
    event_type: eventType,
    marketStatus: auditRecord.current_market_status || auditRecord.entry_market_status,
    prepScore: auditRecord.prep_score,
    confirmationScore: auditRecord.confirmation_score,
    price: auditRecord.entry_price,
    basePrice: auditRecord.base_price_v1,
    atr15m: auditRecord.atr_15m,
    chaseRisk: { level: auditRecord.chase_risk_level },
    icebergLikelihood: auditRecord.iceberg_likelihood,
    ...extraPayload,
  };

  const notification = {
    signal_id: signalId,
    event_type: eventType,
    channel_type: 'DISCORD',
    channel_id: preBreakoutChannel || null,
    payload,
    deduplication_key: `OUTBOX-${signalId}-${eventType}-DISCORD`,
  };

  return queueNotificationAlerts([notification]);
}

/**
 * Stores the delivered Discord message ID on the audit record.
 */
export function updateAuditDiscordMessageId(id, discordMessageId) {
  initAuditStore();
  const rec = AuditMemoryStore.records.get(id);
  if (rec) {
    rec.discord_message_id = discordMessageId;
    saveAuditsToFile();
    if (supabase) {
      supabase.from('prep_signal_audits').update({ discord_message_id: discordMessageId }).eq('id', id).then(() => {}).catch(() => {});
    }
  }
}

/**
 * Evaluates open audit records against live price ticks.
 * Updates MFE, MAE, Breakout confirmation, +1R reach, and False Breakout status.
 *
 * @param {string} symbol Symbol
 * @param {number} currentPrice Current mark price
 * @param {number} now Current timestamp
 */
export function updateAuditExcursions(symbol, currentPrice, now = Date.now()) {
  initAuditStore();

  let modified = false;
  for (const record of AuditMemoryStore.records.values()) {
    if (record.symbol !== symbol || record.status !== 'OPEN') continue;

    const entry = record.entry_price || record.base_price_v1;
    if (entry <= 0) continue;

    // Track peak & trough
    if (currentPrice > record.peak_price) {
      record.peak_price = currentPrice;
      const mfe = ((currentPrice - entry) / entry) * 100;
      record.mfe_pct = Number(Math.max(record.mfe_pct, mfe).toFixed(2));
      modified = true;
    }

    if (currentPrice < record.trough_price) {
      record.trough_price = currentPrice;
      const mae = ((entry - currentPrice) / entry) * 100;
      record.mae_pct = Number(Math.max(record.mae_pct, mae).toFixed(2));
      modified = true;
    }

    // Check +1R target
    if (currentPrice >= record.target_1r_price && !record.reached_1r) {
      record.reached_1r = true;
      modified = true;
    }

    // Check Stop Invalidation
    if (currentPrice <= record.initial_stop_price && !record.stopped_out) {
      record.stopped_out = true;
      record.status = 'STOPPED_OUT';
      record.resolved_at = new Date(now).toISOString();

      // If it previously triggered as a breakout or READY, but stopped out without reaching +1R
      if ((record.entry_market_status === 'READY' || record.did_breakout) && !record.reached_1r) {
        record.is_false_breakout = true;
        queuePreBreakoutNotification(record, 'FALSE_BREAKOUT', { failurePrice: currentPrice }).catch(() => {});
      } else {
        queuePreBreakoutNotification(record, 'PRE_BREAKOUT_CLOSED', { exit_price: currentPrice }).catch(() => {});
      }
      modified = true;
    }

    // Auto-expire audits older than 24 hours
    const ageMs = now - new Date(record.detected_at).getTime();
    if (ageMs > 86400000 && record.status === 'OPEN') {
      record.status = 'EXPIRED';
      record.resolved_at = new Date(now).toISOString();
      queuePreBreakoutNotification(record, 'PRE_BREAKOUT_EXPIRED', { exit_price: currentPrice }).catch(() => {});
      modified = true;
    }
  }

  if (modified) {
    saveAuditsToFile();
  }
}

/**
 * Records confirmation event when asset transitions to CONFIRMED.
 */
export function recordAuditConfirmation(symbol, confScore, now = Date.now()) {
  initAuditStore();

  let matched = false;
  for (const record of AuditMemoryStore.records.values()) {
    if (record.symbol === symbol && record.status === 'OPEN' && !record.did_breakout) {
      record.did_breakout = true;
      record.current_market_status = 'CONFIRMED';
      record.confirmed_at = new Date(now).toISOString();
      record.confirmation_score = confScore;

      const detectedTime = new Date(record.detected_at).getTime();
      const elapsedMs = Math.max(0, now - detectedTime);
      record.time_to_confirm_ms = elapsedMs;
      record.time_to_confirm_min = Number((elapsedMs / 60000).toFixed(1));

      const isChaseHigh = record.chase_risk_level === 'HIGH';
      const eventType = isChaseHigh ? 'CHASE_RISK_BLOCKED' : 'CONFIRMED';
      queuePreBreakoutNotification(record, eventType).catch(() => {});

      matched = true;
    }
  }

  if (matched) {
    saveAuditsToFile();
  }
}

/**
 * Calculates aggregated quantitative conversion metrics across all audited records.
 */
export function computeAggregateAuditMetrics() {
  initAuditStore();
  const all = Array.from(AuditMemoryStore.records.values());
  if (all.length === 0) {
    return {
      totalAudits: 0,
      prepToBreakoutRatePct: 0,
      prepTo1rRatePct: 0,
      prepToStopRatePct: 0,
      falseBreakoutRatePct: 0,
      avgTimeToConfirmMin: 0,
      meanMfePct: 0,
      meanMaePct: 0,
    };
  }

  const breakouts = all.filter((r) => r.did_breakout);
  const reached1r = all.filter((r) => r.reached_1r);
  const stoppedOut = all.filter((r) => r.stopped_out);
  const falseBreakouts = all.filter((r) => r.is_false_breakout);

  const confirmedWithTime = all.filter((r) => r.time_to_confirm_min !== null);
  const avgTime =
    confirmedWithTime.length > 0
      ? confirmedWithTime.reduce((a, b) => a + (b.time_to_confirm_min || 0), 0) / confirmedWithTime.length
      : 0;

  const meanMfe = all.reduce((a, b) => a + (b.mfe_pct || 0), 0) / all.length;
  const meanMae = all.reduce((a, b) => a + (b.mae_pct || 0), 0) / all.length;

  return {
    totalAudits: all.length,
    prepToBreakoutRatePct: Number(((breakouts.length / all.length) * 100).toFixed(1)),
    prepTo1rRatePct: Number(((reached1r.length / all.length) * 100).toFixed(1)),
    prepToStopRatePct: Number(((stoppedOut.length / all.length) * 100).toFixed(1)),
    falseBreakoutRatePct: breakouts.length > 0 ? Number(((falseBreakouts.length / breakouts.length) * 100).toFixed(1)) : 0,
    avgTimeToConfirmMin: Number(avgTime.toFixed(1)),
    meanMfePct: Number(meanMfe.toFixed(2)),
    meanMaePct: Number(meanMae.toFixed(2)),
  };
}

function saveAuditsToFile() {
  try {
    ensureDataDir();
    const auditPath = getLocalPrepAuditPath();
    const array = Array.from(AuditMemoryStore.records.values()).slice(-500);
    fs.writeFileSync(auditPath, JSON.stringify(array, null, 2), 'utf-8');
  } catch {}
}
