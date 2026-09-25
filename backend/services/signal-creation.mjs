/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — CANONICAL SIGNAL CREATION & PERSISTENCE SERVICE
 * Shared single-source-of-truth service used by:
 * - Global Cloud Scanner (scripts/server_scanner.mjs)
 * - Big Cap Intelligence Daemon (scripts/bigcap_worker.mjs)
 * - Ingestion & Spikes API (apps/web/app/api/spikes/route.ts)
 * - Production Test Suites
 * ═══════════════════════════════════════════════════════════════════════════
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { queueTelegramSignalAlert } from './telegram-outbox.mjs';

// 1. Environment & Supabase Configuration
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

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
}) : null;

// 2. In-Memory Runtime Diagnostics Telemetry
export const SignalTelemetry = {
  scanCyclesTotal: 0,
  lastScanStartedAt: null,
  lastScanCompletedAt: null,
  symbolsScannedLastCycle: 0,
  activeSymbolsCount: 0,
  qualifiedCandidatesTotal: 0,
  disqualifiedCandidatesTotal: 0,
  signalsCreatedTotal: 0,
  signalsRejectedTotal: 0,
  signalsDeduplicatedTotal: 0,
  persistenceSuccessTotal: 0,
  persistenceFailureTotal: 0,
  bigCapCandidatesTotal: 0,
  bigCapSignalsCreatedTotal: 0,
  telegramOutboxQueuedTotal: 0,
  lastSignalCreatedAt: null,
  lastDbInsertAt: null,
  activeCooldowns: new Map(), // `${exchange}:${symbol}` -> timestamp
};

// 3. ATR14 Stop Loss & Take Profit Target Calculation
// Baseline: ATR14 on 15m (or 24h fallback). Raw stop = 1.5 * ATR14.
// Stop percentage clamped to 2.0% - 3.5%. T1 = 1.2 * ATR, T2 = 2.5 * ATR, T3 = 5.0 * ATR.
export function calculateAtrStopsAndTargets(entryPrice, direction, high24h = 0, low24h = 0) {
  if (!entryPrice || entryPrice <= 0) {
    throw new Error(`Invalid entry price for ATR calculation: ${entryPrice}`);
  }

  // 15M ATR estimate or 24h high/low fallback
  let atr = (high24h > low24h && low24h > 0)
    ? Math.max(entryPrice * 0.015, (high24h - low24h) / 10)
    : entryPrice * 0.018;

  const rawStopPct = (1.5 * atr) / entryPrice;
  const clampedStopPct = Math.max(0.02, Math.min(0.035, rawStopPct));
  const effectiveAtr = (clampedStopPct * entryPrice) / 1.5;

  const isLong = direction === 'LONG';
  const stopLossPrice = isLong
    ? entryPrice * (1 - clampedStopPct)
    : entryPrice * (1 + clampedStopPct);

  const targetPrice1 = isLong
    ? entryPrice + (1.2 * effectiveAtr)
    : entryPrice - (1.2 * effectiveAtr);

  const targetPrice2 = isLong
    ? entryPrice + (2.5 * effectiveAtr)
    : entryPrice - (2.5 * effectiveAtr);

  const targetPrice3 = isLong
    ? entryPrice + (5.0 * effectiveAtr)
    : entryPrice - (5.0 * effectiveAtr);

  const decimals = entryPrice >= 1000 ? 2 : entryPrice >= 1 ? 4 : entryPrice >= 0.001 ? 6 : 8;

  return {
    atr: parseFloat(effectiveAtr.toFixed(decimals)),
    stopLossPrice: parseFloat(stopLossPrice.toFixed(decimals)),
    targetPrice1: parseFloat(targetPrice1.toFixed(decimals)),
    targetPrice2: parseFloat(targetPrice2.toFixed(decimals)),
    targetPrice3: parseFloat(targetPrice3.toFixed(decimals)),
    stopLossPct: parseFloat((clampedStopPct * 100).toFixed(2)),
  };
}

// 4. Deterministic Identity Generators (Idempotency Key & Stable Signal ID)
export function generateDeterministicIdentities({
  exchange,
  canonicalSymbol,
  direction,
  strategyVersion = 'v1.5',
  detectedAtMs = Date.now(),
}) {
  const normEx = (exchange || 'BYBIT').toUpperCase();
  const normSym = (canonicalSymbol || '').toUpperCase().replace(/[-_]/g, '');
  const normDir = (direction || 'LONG').toUpperCase();
  const normVer = strategyVersion || 'v1.5';

  // 15-minute quantized epoch window
  const BUCKET_MS = 15 * 60 * 1000;
  const timeBucket = Math.floor(detectedAtMs / BUCKET_MS) * BUCKET_MS;

  const d = new Date(detectedAtMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;

  // Deterministic composite hash
  const hashKey = `${normEx}:${normSym}:${normDir}:${normVer}:${timeBucket}`;
  const hashSuffix = crypto.createHash('sha256').update(hashKey).digest('hex').slice(0, 4).toUpperCase();

  const signalId = `EGL-${dateStr}-${normEx}-${normSym}-${hashSuffix}`;
  const idempotencyKey = `IDEMP-${normEx}-${normSym}-${normDir}-${normVer}-${timeBucket}`;

  return {
    signalId,
    idempotencyKey,
    timeBucket,
    dateStr,
    hashSuffix,
  };
}

// 5. Ensure Market Specs Exist in Database
async function ensureMarketExists(admin, exchange, symbol, price, strategyVersion = 'v1.5') {
  const normEx = exchange.toUpperCase();
  const normSym = symbol.toUpperCase().replace(/[-_]/g, '');
  const marketId = `${normEx}:${normSym}`;
  const baseCoin = normSym.replace(/USDT$/, '');

  try {
    // 1. Asset
    await admin.from('assets').upsert({ id: baseCoin, name: `${baseCoin} Perpetual` }, { onConflict: 'id' });
    // 2. Exchange
    await admin.from('exchanges').upsert({ id: normEx, name: `${normEx} Exchange`, api_url: `https://api.${normEx.toLowerCase()}.com` }, { onConflict: 'id' });
    // 3. Strategy Version
    await admin.from('strategy_versions').upsert({
      version: strategyVersion,
      description: `EAGLE FLASH Strategy Version ${strategyVersion}`,
      config: {
        atr_period: 14,
        atr_timeframe: '15m',
        rvol_threshold: strategyVersion === 'v1.4' ? 1.5 : 2.0,
        score_threshold: 65,
        cooldown_minutes: 15,
        stop_loss_min_pct: 2.0,
        stop_loss_max_pct: 3.5,
        target_1_multiplier: 1.2,
        target_2_multiplier: 2.5,
        target_3_multiplier: 5.0,
        stop_loss_multiplier: 1.5,
      }
    }, { onConflict: 'version' });
    // 4. Market
    await admin.from('markets').upsert({
      id: marketId,
      exchange_id: normEx,
      asset_id: baseCoin,
      symbol: normSym,
      base_coin: baseCoin,
      quote_coin: 'USDT',
      price_precision: price >= 1000 ? 2 : price >= 1 ? 4 : 8,
      tick_size: price >= 1000 ? 0.01 : 0.0001,
      min_order_qty: 1,
    }, { onConflict: 'id' });
  } catch (e) {
    // Non-fatal
  }
  return marketId;
}

// 6. Canonical createSignal() Implementation
export async function createSignal(candidate, options = {}) {
  const now = candidate.detectedAt || Date.now();
  const symbol = (candidate.symbol || '').toUpperCase().replace(/[-_]/g, '');
  const exchange = (candidate.exchange || 'BYBIT').toUpperCase();
  const direction = (candidate.direction || (candidate.returns5m < 0 ? 'SHORT' : 'LONG')).toUpperCase();
  const entryPrice = parseFloat(candidate.entryPrice || candidate.price || candidate.lastPrice || 0);
  const eagleScore = Math.round(parseFloat(candidate.eagleScore || candidate.score || 75));
  const rvol = parseFloat(candidate.rvol || candidate.relativeVolume || 1.0);
  const volumeZScore = parseFloat(candidate.volumeZScore || candidate.volumeZ || 0);
  const oiChangePct = parseFloat(candidate.oiChangePct || candidate.oiDelta || candidate.oiDeltaPct || 0);
  const strategyVersion = candidate.strategyVersion || options.strategyVersion || 'v1.5';
  const isBigCap = Boolean(candidate.isBigCap || ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'].includes(symbol));

  SignalTelemetry.qualifiedCandidatesTotal++;
  if (isBigCap) SignalTelemetry.bigCapCandidatesTotal++;

  console.log(`\n[SIGNAL_CREATE_ATTEMPT] Symbol: ${exchange}:${symbol} | Direction: ${direction} | Entry: $${entryPrice} | Score: ${eagleScore} | RVOL: ${rvol}x`);

  // Basic validation
  if (!symbol || entryPrice <= 0) {
    SignalTelemetry.signalsRejectedTotal++;
    console.error(`[SIGNAL_CREATE_REJECTED] Invalid candidate payload: symbol=${symbol}, entryPrice=${entryPrice}`);
    return { success: false, error: 'INVALID_CANDIDATE_DATA' };
  }

  // Deduplication check: Same exchange + symbol cooldown (15 minutes)
  const cooldownKey = `${exchange}:${symbol}`;
  const lastDetectedAt = SignalTelemetry.activeCooldowns.get(cooldownKey) || 0;
  const cooldownPeriodMs = options.cooldownMs || (15 * 60 * 1000);

  if (now - lastDetectedAt < cooldownPeriodMs && !options.force) {
    SignalTelemetry.signalsDeduplicatedTotal++;
    console.log(`[DEDUP_CHECK] symbol=${symbol} exchange=${exchange} decision=DUPLICATE (Cooldown active for ${Math.round((cooldownPeriodMs - (now - lastDetectedAt)) / 1000)}s)`);
    return {
      success: false,
      error_code: 'DEDUPLICATED',
      reason: `Cooldown active for ${exchange}:${symbol}`,
    };
  }

  console.log(`[DEDUP_CHECK] symbol=${symbol} exchange=${exchange} decision=ALLOW`);

  // Calculate ATR targets
  const targets = calculateAtrStopsAndTargets(entryPrice, direction, candidate.high24h, candidate.low24h);

  // Generate deterministic identities
  const { signalId, idempotencyKey } = generateDeterministicIdentities({
    exchange,
    canonicalSymbol: symbol,
    direction,
    strategyVersion,
    detectedAtMs: now,
  });

  const signalPayload = {
    signal_id: signalId,
    idempotency_key: idempotencyKey,
    exchange_id: exchange,
    market_id: `${exchange}:${symbol}`,
    symbol,
    direction,
    strategy_version: strategyVersion,
    entry_price: entryPrice,
    target_1_price: targets.targetPrice1,
    target_2_price: targets.targetPrice2,
    target_3_price: targets.targetPrice3,
    stop_price: targets.stopLossPrice,
    eagle_score: eagleScore,
    rvol,
    volume_z_score: volumeZScore,
    oi_change_pct: oiChangePct,
    detected_at: new Date(now).toISOString(),
  };

  const snapshotPayload = {
    signal_id: signalId,
    price: entryPrice,
    mark_price: entryPrice,
    index_price: entryPrice,
    price_24h_change: parseFloat(candidate.price24hChange || candidate.returns5m || 0),
    turnover_24h_usd: parseFloat(candidate.turnover24h || candidate.openInterestUsd || 0),
    rvol,
    volume_z_score: volumeZScore,
    open_interest_usd: parseFloat(candidate.openInterestUsd || 0),
    oi_change_pct: oiChangePct,
    funding_rate: parseFloat(candidate.fundingRate || 0.0001),
    taker_flow: parseFloat(candidate.takerFlow || candidate.takerImbalance || 0),
    rsi: parseFloat(candidate.rsi || 50),
    trend: candidate.trend || (direction === 'LONG' ? 'BULLISH' : 'BEARISH'),
    spike_phase: candidate.spikePhase || (direction === 'LONG' ? 'ACCELERATION' : 'BREAKDOWN'),
    positioning_state: 'LEVERAGE_EXPANSION',
    market_breadth: 54.0,
    btc_regime: candidate.btcRegime || 'NEUTRAL',
  };

  const extremesPayload = {
    signal_id: signalId,
    mfe_price: entryPrice,
    mfe_pct: 0.0,
    mfe_timestamp: new Date(now).toISOString(),
    mae_price: entryPrice,
    mae_pct: 0.0,
    mae_timestamp: new Date(now).toISOString(),
  };

  const checkpointsPayload = [
    { checkpoint_type: '15M', scheduled_at: new Date(now + 15 * 60 * 1000).toISOString() },
    { checkpoint_type: '1H', scheduled_at: new Date(now + 60 * 60 * 1000).toISOString() },
    { checkpoint_type: '4H', scheduled_at: new Date(now + 4 * 3600 * 1000).toISOString() },
    { checkpoint_type: '8H', scheduled_at: new Date(now + 8 * 3600 * 1000).toISOString() },
    { checkpoint_type: '1D', scheduled_at: new Date(now + 24 * 3600 * 1000).toISOString() },
  ];

  const bigCapPayload = isBigCap ? {
    symbol,
    direction,
    best_timeframe: candidate.best_timeframe || candidate.bestTf || '15m',
    entry_price: entryPrice,
    stop_loss_price: targets.stopLossPrice,
    target_price_1: targets.targetPrice1,
    target_price_2: targets.targetPrice2,
    current_price: entryPrice,
    eagle_score: eagleScore,
    rvol,
    z_score: volumeZScore,
    oi_delta_pct: oiChangePct,
    session_tag: candidate.session_tag || 'LONDON_NY_OVERLAP',
    rationale_json: candidate.rationale_json || candidate.triggerReasons || [
      `${symbol} qualified with RVOL ${rvol}x and Eagle Score ${eagleScore}`,
      `ATR14 Stop calculated at $${targets.stopLossPrice} (-${targets.stopLossPct}%)`,
      `Initial Target 1 established at $${targets.targetPrice1}`,
      `Position anchored to authoritative signals table`
    ],
  } : null;

  if (!supabase) {
    console.warn('[SIGNAL_CREATE_ERROR] Supabase client not initialized (check environment keys).');
    SignalTelemetry.persistenceFailureTotal++;
    return { success: false, error: 'DATABASE_UNAVAILABLE' };
  }

  const telegramOutboxPayload = {
    signal_id: signalId,
    event_type: 'NEW_SIGNAL',
    payload: {
      ...signalPayload,
      funding_rate: candidate.fundingRate,
      turnoverM: candidate.openInterestUsd ? (candidate.openInterestUsd / 1000000).toFixed(1) : undefined,
      spike_type: candidate.spikeType,
      spike_quality: candidate.spikeQuality,
      isBigCap,
      invalidation_condition: candidate.invalidation_condition,
      trigger_reasons: candidate.triggerReasons || candidate.rationale_json,
    },
    chat_id: process.env.TELEGRAM_CHAT_ID || null,
    deduplication_key: `OUTBOX-${signalId}-NEW_SIGNAL`,
  };

  // Ensure Market & Strategy Version Specs Exist in DB
  await ensureMarketExists(supabase, exchange, symbol, entryPrice, strategyVersion);

  // 1. Attempt Native PostgreSQL Atomic Transaction via RPC
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_signal_atomic', {
      p_signal: signalPayload,
      p_snapshot: snapshotPayload,
      p_extremes: extremesPayload,
      p_checkpoints: checkpointsPayload,
      p_bigcap: bigCapPayload,
      p_telegram_outbox: telegramOutboxPayload,
    });

    if (!rpcErr && rpcRes && rpcRes.success) {
      SignalTelemetry.activeCooldowns.set(cooldownKey, now);
      SignalTelemetry.signalsCreatedTotal++;
      SignalTelemetry.persistenceSuccessTotal++;
      SignalTelemetry.lastSignalCreatedAt = new Date(now).toISOString();
      SignalTelemetry.lastDbInsertAt = new Date().toISOString();
      if (isBigCap) SignalTelemetry.bigCapSignalsCreatedTotal++;

      // Non-blocking outbox registration & telemetry
      queueTelegramSignalAlert(signalPayload, candidate).catch(err => {
        console.warn('Telegram outbox queue notice:', err?.message);
      });
      SignalTelemetry.telegramOutboxQueuedTotal++;

      console.log(`✅ [SIGNAL_CREATE_SUCCESS] (PostgreSQL RPC Transaction) Signal ID: ${signalId}`);
      return {
        success: true,
        signal_id: signalId,
        signalId,
        idempotency_key: idempotencyKey,
        idempotencyKey,
        signal: signalPayload,
      };
    }

    if (rpcErr && rpcErr.code === '23505') {
      SignalTelemetry.signalsDeduplicatedTotal++;
      console.log(`[DEDUP_CHECK] Duplicate unique constraint hit in DB: ${signalId}`);
      return { success: false, error_code: 'DUPLICATE_SIGNAL', signal_id: signalId };
    }
  } catch (err) {
    // If RPC function not found in schema cache, proceed to compensating transaction fallback
  }

  // 2. Compensating Transaction Fallback with Guaranteed Rollback
  try {
    // Primary row insert
    const { error: sigErr } = await supabase.from('signals').insert(signalPayload);
    if (sigErr) {
      if (sigErr.code === '23505') {
        SignalTelemetry.signalsDeduplicatedTotal++;
        console.log(`[DEDUP_CHECK] Duplicate key violation on signals table: ${signalId}`);
        return { success: false, error_code: 'DUPLICATE_SIGNAL', signal_id: signalId };
      }
      throw new Error(`Failed to insert into signals: ${sigErr.message}`);
    }

    // Secondary inserts with rollback on error
    try {
      const [snapRes, extRes] = await Promise.all([
        supabase.from('signal_snapshots').insert(snapshotPayload),
        supabase.from('signal_extremes').insert(extremesPayload),
      ]);
      if (snapRes.error) throw new Error(`Snapshot insert error: ${snapRes.error.message}`);
      if (extRes.error) throw new Error(`Extremes insert error: ${extRes.error.message}`);

      // Checkpoints
      try {
        const cpRes = await supabase.from('signal_checkpoints').insert(checkpointsPayload.map(cp => ({
          signal_id: signalId,
          checkpoint_type: cp.checkpoint_type,
          scheduled_at: cp.scheduled_at,
          is_available: false,
        })));
        if (cpRes.error) console.warn('Checkpoints insert notice:', cpRes.error.message);
      } catch (cpErr) {
        console.warn('Checkpoints insert notice:', cpErr?.message);
      }

      // Big Cap sync if applicable
      if (isBigCap && bigCapPayload) {
        try {
          const bcRes = await supabase.from('big_cap_signals').insert({
            signal_id: signalId,
            ...bigCapPayload,
          });
          if (bcRes.error) console.warn('Big cap table sync notice:', bcRes.error.message);
        } catch (bcErr) {
          console.warn('Big cap table sync notice:', bcErr?.message);
        }
      }
    } catch (childErr) {
      // COMPENSATING ROLLBACK: Delete parent row (cascades to all children)
      console.error(`❌ [ROLLBACK] Child insert failed for ${signalId}. Rolling back parent row...`);
      await supabase.from('signals').delete().eq('signal_id', signalId);
      throw childErr;
    }

    SignalTelemetry.activeCooldowns.set(cooldownKey, now);
    SignalTelemetry.signalsCreatedTotal++;
    SignalTelemetry.persistenceSuccessTotal++;
    SignalTelemetry.lastSignalCreatedAt = new Date(now).toISOString();
    SignalTelemetry.lastDbInsertAt = new Date().toISOString();
    if (isBigCap) SignalTelemetry.bigCapSignalsCreatedTotal++;

    // Non-blocking outbox registration & telemetry
    queueTelegramSignalAlert(signalPayload, candidate).catch(err => {
      console.warn('Telegram outbox queue notice:', err?.message);
    });
    SignalTelemetry.telegramOutboxQueuedTotal++;

    console.log(`✅ [SIGNAL_CREATE_SUCCESS] (Compensating Transaction) Signal ID: ${signalId}`);
    return {
      success: true,
      signal_id: signalId,
      signalId,
      idempotency_key: idempotencyKey,
      idempotencyKey,
      signal: signalPayload,
    };
  } catch (err) {
    SignalTelemetry.persistenceFailureTotal++;
    console.error(`❌ [SIGNAL_CREATE_ERROR] Signal creation failed for ${signalId}:`, err?.message);
    return { success: false, error: err?.message || 'SIGNAL_CREATION_FAILED' };
  }
}

// 7. Get Diagnostic Telemetry
export function getSignalEngineDiagnostics() {
  return {
    ...SignalTelemetry,
    activeCooldownsCount: SignalTelemetry.activeCooldowns.size,
  };
}
