/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — REAL-TIME TP/SL LIFECYCLE MONITOR WORKER DAEMON
 * Continuously monitors active signals against live exchange ticker prices.
 * Evaluates directional take-profit and stop-loss excursion limits, executes
 * atomic database state updates, and dispatches rich alerts to dedicated
 * Discord channels (#tp-hits and #stop-loss) with single-dispatch idempotency.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { queueNotificationAlerts, isTestExecution } from '../backend/services/notification-outbox.mjs';
import { resolveDiscordChannel } from '../backend/services/discord/discord-router.mjs';

// 1. Supabase Initialization
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
        if (k === 'SUPABASE_SERVICE_ROLE_KEY' && (!supabaseKey || supabaseKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5c3dtbHNydnJxd2h6dGJrdGxtIiwicm9sZSI6ImFub24i'))) {
          supabaseKey = val;
        }
        if (k === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' && !supabaseKey) supabaseKey = val;
      }
    }
  } catch (e) {}
}

export const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
}) : null;

// 2. High-Speed In-Memory Price Cache & Idempotency State
export const LivePrices = new Map(); // symbol -> { price: number, timestamp: number }
export const ResolvedPositions = new Set(); // signal_id -> true (Terminally closed)
export const MilestoneTracker = new Map(); // signal_id -> Set<'TP1' | 'TP2' | 'TP3'>

export const MonitorTelemetry = {
  ticksProcessed: 0,
  activeSignalsMonitored: 0,
  tpHitsTotal: 0,
  slHitsTotal: 0,
  dbUpdatesTotal: 0,
  lastPollTimestamp: null,
  lastPriceUpdateAt: null,
};

// 3. Normalization Helper
export function normalizeSymbol(rawSymbol) {
  if (!rawSymbol) return '';
  return String(rawSymbol)
    .trim()
    .toUpperCase()
    .replace(/[-_]/g, '')
    .replace(/(USDT|PERP)$/, '') + 'USDT';
}

/**
 * Pure Mathematical Evaluator for TP/SL Excursions
 * Evaluates live mark price against order parameters for both LONG and SHORT.
 *
 * @param {object} signal - Signal object containing entry, stop, targets, direction
 * @param {number} currentPrice - Latest verified mark price
 * @returns {object|null} - Invalidation or target resolution result, or null if no threshold crossed
 */
export function evaluateSignalTpSl(signal, currentPrice) {
  if (!signal || !currentPrice || currentPrice <= 0) return null;

  const direction = (signal.direction || 'LONG').toUpperCase();
  const isLong = direction === 'LONG';
  const entry = parseFloat(signal.entry_price || signal.entryPrice || 0);
  const stop = parseFloat(signal.stop_price || signal.stop_loss_price || signal.stopLossPrice || 0);
  const tp1 = parseFloat(signal.target_1_price || signal.target_price_1 || signal.tp1_price || 0);
  const tp2 = parseFloat(signal.target_2_price || signal.target_price_2 || signal.tp2_price || 0);
  const tp3 = parseFloat(signal.target_3_price || signal.target_price_3 || signal.tp3_price || 0);

  if (entry <= 0 || stop <= 0) return null;

  const signalId = signal.signal_id || signal.id || 'ANON';
  let milestonesHit = MilestoneTracker.get(signalId);
  if (!milestonesHit) {
    milestonesHit = new Set();
    MilestoneTracker.set(signalId, milestonesHit);
  }

  // Hydrate persistent state from database fields to prevent duplicate alerts upon worker restart
  if (signal.tp1_hit_at || signal.tp1_hit_price || signal.status === 'T1_HIT' || signal.status === 'TP1_HIT') {
    milestonesHit.add('TP1');
  }
  if (signal.tp2_hit_at || signal.tp2_hit_price || signal.status === 'T2_HIT' || signal.status === 'TP2_HIT') {
    milestonesHit.add('TP1');
    milestonesHit.add('TP2');
  }
  if (signal.tp3_hit_at || signal.tp3_hit_price || signal.status === 'T3_HIT' || signal.status === 'TP3_HIT' || signal.status === 'TP_HIT') {
    milestonesHit.add('TP1');
    milestonesHit.add('TP2');
    milestonesHit.add('TP3');
  }
  if (signal.stop_hit_at || signal.stop_hit_price || signal.status === 'STOP_HIT' || signal.status === 'SL_HIT') {
    milestonesHit.add('SL');
  }

  // If already stopped out in DB, do not re-evaluate
  if (signal.stop_hit_at || signal.status === 'STOP_HIT' || signal.status === 'SL_HIT') {
    return null;
  }

  // 1. Check Stop-Loss Breach (STOP-FIRST Priority Rule)
  const isStopBreached = isLong ? (currentPrice <= stop) : (currentPrice >= stop);
  if (isStopBreached && !milestonesHit.has('SL')) {
    const rawRoi = isLong
      ? ((currentPrice - entry) / entry) * 100
      : ((entry - currentPrice) / entry) * 100;
    return {
      transition: 'SL_HIT',
      status: 'SL_HIT',
      eventType: 'SL_HIT',
      isTerminal: true,
      exitPrice: currentPrice,
      realizedPnlPct: parseFloat(rawRoi.toFixed(2)),
      reason: `Structural stop loss breached (${currentPrice} ${isLong ? '<=' : '>='} ${stop})`,
      actionText: 'PROTECTIVE CAPITAL SHIELD ACTIVATED',
    };
  }

  // 2. Check Take-Profit Hits
  // Check TP3 (Terminal Full Profit)
  const isTp3Breached = tp3 > 0 && (isLong ? (currentPrice >= tp3) : (currentPrice <= tp3));
  if (isTp3Breached && !milestonesHit.has('TP3')) {
    const rawRoi = isLong
      ? ((currentPrice - entry) / entry) * 100
      : ((entry - currentPrice) / entry) * 100;
    return {
      transition: 'TP3_HIT',
      status: 'TP_HIT',
      eventType: 'TP3_HIT',
      milestone: 'TP3',
      isTerminal: true,
      exitPrice: currentPrice,
      realizedPnlPct: parseFloat(rawRoi.toFixed(2)),
      reason: `Final Target 3 achieved (+${rawRoi.toFixed(2)}%)`,
      actionText: 'FULL TARGET ACHIEVED (PROFIT SECURED)',
    };
  }

  // Check TP2 (Expansion Milestone)
  const isTp2Breached = tp2 > 0 && (isLong ? (currentPrice >= tp2) : (currentPrice <= tp2));
  if (isTp2Breached && !milestonesHit.has('TP2')) {
    const rawRoi = isLong
      ? ((currentPrice - entry) / entry) * 100
      : ((entry - currentPrice) / entry) * 100;
    return {
      transition: 'TP2_HIT',
      status: 'ACTIVE',
      eventType: 'TP2_HIT',
      milestone: 'TP2',
      isTerminal: false,
      exitPrice: currentPrice,
      realizedPnlPct: parseFloat(rawRoi.toFixed(2)),
      trailingStop: tp1 > 0 ? tp1 : entry,
      reason: `Target 2 achieved (+${rawRoi.toFixed(2)}%)`,
      actionText: 'TRAILING STOP MOVED TO TP1',
    };
  }

  // Check TP1 (Initial Milestone / Breakeven Lock)
  const isTp1Breached = tp1 > 0 && (isLong ? (currentPrice >= tp1) : (currentPrice <= tp1));
  if (isTp1Breached && !milestonesHit.has('TP1')) {
    const rawRoi = isLong
      ? ((currentPrice - entry) / entry) * 100
      : ((entry - currentPrice) / entry) * 100;
    return {
      transition: 'TP1_HIT',
      status: 'ACTIVE',
      eventType: 'TP1_HIT',
      milestone: 'TP1',
      isTerminal: false,
      exitPrice: currentPrice,
      realizedPnlPct: parseFloat(rawRoi.toFixed(2)),
      trailingStop: entry,
      reason: `Target 1 achieved (+${rawRoi.toFixed(2)}%)`,
      actionText: 'STOP MOVED TO ENTRY (BREAKEVEN)',
    };
  }

  return null;
}

// 4. Live Exchange Ingestion: Binance & Bybit REST / WebSocket Ticker Polling
export async function updateLivePricesFromExchanges(symbols = []) {
  if (!symbols || symbols.length === 0) return 0;
  let updatedCount = 0;

  // 1. Fetch Binance Futures Tickers
  try {
    const res = await fetch('https://fapi.binance.com/fapi/v1/ticker/price', {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const symbolSet = new Set(symbols.map(s => normalizeSymbol(s)));
        const now = Date.now();
        for (const item of data) {
          if (symbolSet.has(item.symbol)) {
            const p = parseFloat(item.price);
            if (p > 0) {
              LivePrices.set(item.symbol, { price: p, timestamp: now });
              updatedCount++;
            }
          }
        }
      }
    }
  } catch (err) {
    // Non-blocking fallback to Bybit
  }

  // 2. Fetch Bybit Linear Tickers for missing symbols
  const missing = symbols.filter(s => !LivePrices.has(normalizeSymbol(s)));
  if (missing.length > 0) {
    try {
      const res = await fetch('https://api.bybit.com/v5/market/tickers?category=linear', {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        const list = data?.result?.list || [];
        const missingSet = new Set(missing.map(s => normalizeSymbol(s)));
        const now = Date.now();
        for (const item of list) {
          if (missingSet.has(item.symbol)) {
            const p = parseFloat(item.lastPrice);
            if (p > 0) {
              LivePrices.set(item.symbol, { price: p, timestamp: now });
              updatedCount++;
            }
          }
        }
      }
    } catch (err) {}
  }

  MonitorTelemetry.ticksProcessed += updatedCount;
  MonitorTelemetry.lastPriceUpdateAt = new Date().toISOString();
  return updatedCount;
}

export const MAX_SIGNAL_LIFETIME_MS = 48 * 60 * 60 * 1000; // 48 hours maximum lifetime for active signals

export function isSignalStale(signal, maxLifetimeMs = MAX_SIGNAL_LIFETIME_MS) {
  if (!signal) return false;
  const timestamp = signal.detected_at || signal.created_at;
  if (!timestamp) return false;
  const ageMs = Date.now() - new Date(timestamp).getTime();
  return ageMs > maxLifetimeMs;
}

// 5. Fetch Active Positions from Supabase
export async function fetchActivePositions() {
  if (!supabase || isTestExecution()) {
    return [];
  }

  try {
    const [sigRes, bigCapRes] = await Promise.allSettled([
      supabase.from('signals').select('*').eq('status', 'ACTIVE').limit(50),
      supabase.from('big_cap_signals').select('*').eq('status', 'ACTIVE').limit(10),
    ]);

    const activeList = [];
    const seenIds = new Set();

    if (sigRes.status === 'fulfilled' && Array.isArray(sigRes.value.data)) {
      for (const row of sigRes.value.data) {
        if (!ResolvedPositions.has(row.signal_id) && !seenIds.has(row.signal_id)) {
          if (isSignalStale(row)) {
            ResolvedPositions.add(row.signal_id);
            Promise.allSettled([
              supabase.from('signals').update({ status: 'EXPIRED', updated_at: new Date().toISOString() }).eq('signal_id', row.signal_id),
              supabase.from('big_cap_signals').update({ status: 'EXPIRED', updated_at: new Date().toISOString() }).eq('signal_id', row.signal_id),
            ]).catch(() => {});
            continue;
          }
          seenIds.add(row.signal_id);
          activeList.push(row);
        }
      }
    }

    if (bigCapRes.status === 'fulfilled' && Array.isArray(bigCapRes.value.data)) {
      for (const row of bigCapRes.value.data) {
        if (!ResolvedPositions.has(row.signal_id) && !seenIds.has(row.signal_id)) {
          if (isSignalStale(row)) {
            ResolvedPositions.add(row.signal_id);
            Promise.allSettled([
              supabase.from('signals').update({ status: 'EXPIRED', updated_at: new Date().toISOString() }).eq('signal_id', row.signal_id),
              supabase.from('big_cap_signals').update({ status: 'EXPIRED', updated_at: new Date().toISOString() }).eq('signal_id', row.signal_id),
            ]).catch(() => {});
            continue;
          }
          seenIds.add(row.signal_id);
          activeList.push(row);
        }
      }
    }

    MonitorTelemetry.activeSignalsMonitored = activeList.length;
    MonitorTelemetry.lastPollTimestamp = new Date().toISOString();
    return activeList;
  } catch (err) {
    console.warn('⚠️ [TPSL_MONITOR] Error fetching active signals:', err.message);
    return [];
  }
}

// 6. Execute Single Position Resolution
export async function processSignalEvaluation(signal, currentPrice) {
  const signalId = signal.signal_id;
  if (!signalId || ResolvedPositions.has(signalId)) return null;

  const result = evaluateSignalTpSl(signal, currentPrice);
  if (!result) return null;

  const nowIso = new Date().toISOString();

  // 1. Record Milestone in Idempotency Tracker
  if (result.milestone || result.eventType === 'SL_HIT' || result.eventType === 'STOP_HIT') {
    let milestones = MilestoneTracker.get(signalId);
    if (!milestones) {
      milestones = new Set();
      MilestoneTracker.set(signalId, milestones);
    }
    if (result.milestone) milestones.add(result.milestone);
    if (result.eventType === 'SL_HIT' || result.eventType === 'STOP_HIT') milestones.add('SL');
  }

  // 2. Lock Terminal States
  if (result.isTerminal) {
    ResolvedPositions.add(signalId);
  }

  // 3. Update Database Atomically
  if (supabase && !isTestExecution()) {
    try {
      const updateData = {
        updated_at: nowIso,
      };

      if (result.isTerminal) {
        updateData.status = result.status;
        updateData.exit_price = result.exitPrice;
        updateData.resolved_at = nowIso;
        if (result.transition === 'SL_HIT') {
          updateData.stop_hit_at = nowIso;
          updateData.stop_hit_price = result.exitPrice;
        } else if (result.transition === 'TP3_HIT' || result.transition === 'TP_HIT') {
          updateData.tp3_hit_at = nowIso;
          updateData.tp3_hit_price = result.exitPrice;
        }
      } else if (result.trailingStop) {
        updateData.stop_price = result.trailingStop;
        if (result.milestone === 'TP1') {
          updateData.tp1_hit_at = nowIso;
          updateData.tp1_hit_price = result.exitPrice;
        } else if (result.milestone === 'TP2') {
          updateData.tp2_hit_at = nowIso;
          updateData.tp2_hit_price = result.exitPrice;
        }
      }

      await Promise.allSettled([
        supabase.from('signals').update(updateData).eq('signal_id', signalId),
        supabase.from('big_cap_signals').update({
          ...updateData,
          realized_pnl_pct: result.realizedPnlPct,
          current_price: result.exitPrice,
        }).eq('signal_id', signalId),
      ]);
      MonitorTelemetry.dbUpdatesTotal++;
    } catch (dbErr) {
      console.error(`❌ [TPSL_MONITOR_DB_ERROR] Failed to update signal ${signalId}:`, dbErr.message);
    }
  }

  // 4. Queue Discord Notification with Dynamically Resolved Dedicated Channel
  try {
    const entry = parseFloat(signal.entry_price || signal.entryPrice || 0);
    const dir = (signal.direction || 'LONG').toUpperCase();
    const isLong = dir === 'LONG';
    let mfe_pct = signal.mfe_pct !== undefined ? parseFloat(signal.mfe_pct) : 0;
    let mae_pct = signal.mae_pct !== undefined ? parseFloat(signal.mae_pct) : 0;
    if (entry > 0 && result.exitPrice > 0) {
      const exitRoi = isLong 
        ? ((result.exitPrice - entry) / entry) * 100 
        : ((entry - result.exitPrice) / entry) * 100;
      if (mfe_pct === 0 && exitRoi > 0) {
        mfe_pct = parseFloat(exitRoi.toFixed(2));
      }
      if (mae_pct === 0 && exitRoi < 0) {
        mae_pct = parseFloat(exitRoi.toFixed(2));
      }
    }

    const payload = {
      ...signal,
      target_1_price: signal.target_1_price || signal.target_price_1,
      target_2_price: signal.target_2_price || signal.target_price_2,
      target_3_price: signal.target_3_price || signal.target_price_3,
      target_price_1: signal.target_price_1 || signal.target_1_price,
      target_price_2: signal.target_price_2 || signal.target_2_price,
      target_price_3: signal.target_price_3 || signal.target_3_price,
      stop_price: signal.stop_price || signal.stop_loss_price,
      stop_loss_price: signal.stop_loss_price || signal.stop_price,
      current_price: result.exitPrice,
      exit_price: result.exitPrice,
      realized_roi_pct: result.realizedPnlPct,
      roi: result.realizedPnlPct,
      mfe_pct,
      mae_pct,
      milestone: result.milestone || result.transition,
      target_hit: result.milestone || result.transition,
      reason: result.reason,
      actionText: result.actionText,
      resolved_at: nowIso,
    };

    const targetChannel = resolveDiscordChannel({
      signal_id: signalId,
      event_type: result.eventType,
      payload,
    });

    const outboxItem = {
      signal_id: signalId,
      event_type: result.eventType,
      channel_type: 'DISCORD',
      channel_id: targetChannel,
      payload,
      deduplication_key: `OUTBOX-${signalId}-${result.eventType}-DISCORD`,
    };

    await queueNotificationAlerts([outboxItem]);

    if (result.eventType === 'SL_HIT' || result.eventType === 'STOP_HIT') {
      MonitorTelemetry.slHitsTotal++;
      console.log(`🛑 [SL_TRIGGERED] Signal ${signalId} hit stop-loss at $${result.exitPrice} (${result.realizedPnlPct}%). Queued for #stop-loss.`);
    } else {
      MonitorTelemetry.tpHitsTotal++;
      console.log(`🎯 [TP_TRIGGERED] Signal ${signalId} achieved ${result.eventType} at $${result.exitPrice} (+${result.realizedPnlPct}%). Queued for #tp-hits.`);
    }
  } catch (alertErr) {
    console.warn(`⚠️ [TPSL_ALERT_WARN] Could not queue alert for ${signalId}:`, alertErr.message);
  }

  return result;
}

// 7. Core Monitoring Cycle
export async function runMonitoringCycle() {
  try {
    const activePositions = await fetchActivePositions();
    if (activePositions.length === 0) return { checked: 0, actions: 0 };

    const symbols = activePositions.map(s => s.symbol).filter(Boolean);
    await updateLivePricesFromExchanges(symbols);

    let actionsCount = 0;
    for (const signal of activePositions) {
      const sym = normalizeSymbol(signal.symbol);
      const cached = LivePrices.get(sym);
      if (cached && cached.price > 0) {
        const action = await processSignalEvaluation(signal, cached.price);
        if (action) actionsCount++;
      }
    }

    return { checked: activePositions.length, actions: actionsCount };
  } catch (cycleErr) {
    console.error('❌ [TPSL_CYCLE_ERROR] Exception in monitoring cycle:', cycleErr.message);
    return { checked: 0, actions: 0, error: cycleErr.message };
  }
}

// 8. Main Worker Daemon Loop
let isRunning = true;
const POLL_INTERVAL_MS = 3000; // 3 seconds poll rate

export async function main() {
  console.log('═════════════════════════════════════════════════════════════════');
  console.log('🦅 EAGLE FLASH — REAL-TIME TP/SL LIFECYCLE MONITOR DAEMON ACTIVE');
  console.log('═════════════════════════════════════════════════════════════════');
  console.log(`📡 Ingestion Engine: Binance Futures & Bybit Linear Tickers`);
  console.log(`⏱️ Position Check Interval: ${POLL_INTERVAL_MS / 1000}s`);
  console.log(`🎯 TP Routing: DISCORD_CHANNEL_TP_HITS (#tp-hits)`);
  console.log(`🛑 SL Routing: DISCORD_CHANNEL_STOP_LOSS (#stop-loss)`);

  while (isRunning) {
    await runMonitoringCycle();
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
}

// Direct execution entry
if (process.argv[1] && process.argv[1].endsWith('tpsl_monitor_worker.mjs')) {
  main().catch(err => {
    console.error('Fatal daemon error:', err);
    process.exit(1);
  });
}
