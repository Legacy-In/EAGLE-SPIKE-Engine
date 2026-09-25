/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🐋 EAGLE FLASH — WHALE TRACKING & MANIPULATION DETECTION ENGINE
 * Institutional algorithmic detection for:
 * 1. Whale Blocks ($10K+ for altcoins, $100K+ for large caps)
 * 2. Whale Accumulation / Distribution (Net flow >= 70% in tight price range)
 * 3. Pump & Dump / Exit Scam Risk (>15% pump with taker sell dump)
 * 4. Spoofing & Fake Wall Detection (Orderbook phantom walls pulled < 60s)
 * 5. Concentration Index (>65% volume controlled by whales)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { queueTelegramSignalAlert } from './telegram-outbox.mjs';

// 1. Supabase Initialization with Robust Fallback
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
  auth: { persistSession: false, autoRefreshToken: false }
}) : null;

// In-Memory Storage & Diagnostics Cache
export const WhaleMemoryStore = {
  trades: [],             // recent whale trades (capped at 1000)
  alerts: [],             // recent alerts (capped at 200)
  symbolMetrics: new Map(), // symbol -> live computed metrics
  activeWalls: new Map(), // key -> phantom wall tracker
  lastEvaluatedAt: null,
};

// Configurable Constants
export const BIG_CAP_SYMBOLS = new Set(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);
export const ALT_WHALE_MIN_USD = 10000;    // $10k+ for altcoins
export const BIG_CAP_MIN_USD = 100000;     // $100k+ for BTC/ETH/SOL
export const WINDOW_15M_MS = 15 * 60 * 1000;
export const WINDOW_1H_MS = 60 * 60 * 1000;

/**
 * Normalizes symbol names (e.g. BTC_USDT -> BTCUSDT)
 */
export function normalizeSymbol(rawSymbol) {
  if (!rawSymbol) return '';
  return String(rawSymbol).toUpperCase().replace(/[-_/]/g, '');
}

/**
 * Determines whether a trade qualifies as a Whale Block
 */
export function isWhaleBlock(symbol, amountUsdt) {
  const normSym = normalizeSymbol(symbol);
  const minThreshold = BIG_CAP_SYMBOLS.has(normSym) ? BIG_CAP_MIN_USD : ALT_WHALE_MIN_USD;
  return Number(amountUsdt) >= minThreshold;
}

/**
 * Calculates rolling Net Large Flow for a given trades window
 * Net Flow = sum(Buy Vol) - sum(Sell Vol)
 */
export function computeNetFlow(trades, windowMs, now = Date.now()) {
  const cutoff = now - windowMs;
  let buyVol = 0;
  let sellVol = 0;
  let count = 0;

  for (const t of trades) {
    const tradeTime = new Date(t.detected_at || t.timestamp).getTime();
    if (tradeTime >= cutoff) {
      count++;
      const amt = Number(t.amount_usdt || 0);
      if (t.side === 'BUY') {
        buyVol += amt;
      } else if (t.side === 'SELL') {
        sellVol += amt;
      }
    }
  }

  const totalVol = buyVol + sellVol;
  const netFlow = buyVol - sellVol;
  const netFlowRatio = totalVol > 0 ? (buyVol / totalVol) : 0.5;

  return {
    count,
    buyVol,
    sellVol,
    totalVol,
    netFlow,
    netFlowRatio, // e.g. 0.85 = 85% buys
    netFlowPct: totalVol > 0 ? ((netFlow / totalVol) * 100) : 0
  };
}

/**
 * 1. Whale Accumulation / Distribution Algorithm
 * Trigger: Net Flow >= +70% of total large volume while price range <= 2.5%
 */
export function detectWhaleAccumulation(trades, priceOpen, priceCurrent, windowMs = WINDOW_15M_MS, now = Date.now()) {
  const flow = computeNetFlow(trades, windowMs, now);
  if (flow.totalVol === 0 || flow.count < 2) {
    return { detected: false, reason: 'insufficient_volume' };
  }

  const priceDeltaPct = priceOpen > 0 ? Math.abs((priceCurrent - priceOpen) / priceOpen) * 100 : 0;
  const isAccumulationRatio = flow.netFlowRatio >= 0.70; // 70%+ buys
  const isTightPrice = priceDeltaPct <= 2.5;             // tight consolidation range

  if (isAccumulationRatio && isTightPrice) {
    const confidence = Math.min(99, Math.round(flow.netFlowRatio * 100 + (flow.totalVol > 500000 ? 10 : 0)));
    const severity = flow.totalVol > 500000 ? 'CRITICAL' : flow.totalVol > 100000 ? 'HIGH' : 'MEDIUM';
    return {
      detected: true,
      alert_type: 'WHALE_ACCUMULATION',
      severity,
      confidence,
      metrics: {
        flow_buy_vol: flow.buyVol,
        flow_sell_vol: flow.sellVol,
        net_flow_usd: flow.netFlow,
        net_flow_ratio_pct: Number((flow.netFlowRatio * 100).toFixed(1)),
        price_open: priceOpen,
        price_current: priceCurrent,
        price_delta_pct: Number(priceDeltaPct.toFixed(2)),
        trades_count: flow.count,
        window_minutes: Math.round(windowMs / 60000)
      }
    };
  }

  return { detected: false, netFlowRatio: flow.netFlowRatio, priceDeltaPct };
}

/**
 * 2. Pump & Dump / Exit Scam Risk Detector
 * Trigger: Sudden price expansion (>15% in 15m) + extreme Taker Sell Dominance (>65%) or large dumping
 */
export function detectPumpAndDumpRisk(trades, priceLowest15m, priceCurrent, windowMs = WINDOW_15M_MS, now = Date.now()) {
  if (priceLowest15m <= 0 || priceCurrent <= 0) return { detected: false };

  const priceExpansionPct = ((priceCurrent - priceLowest15m) / priceLowest15m) * 100;
  const flow = computeNetFlow(trades, windowMs, now);

  const takerSellDominancePct = flow.totalVol > 0 ? (flow.sellVol / flow.totalVol) * 100 : 0;
  const hasVerticalExpansion = priceExpansionPct >= 15.0; // >15% pump in 15m
  const hasExitDump = takerSellDominancePct >= 65.0 || (flow.sellVol > 150000 && flow.netFlow < -50000);

  if (hasVerticalExpansion && hasExitDump) {
    return {
      detected: true,
      alert_type: 'PUMP_AND_DUMP_RISK',
      severity: 'CRITICAL',
      metrics: {
        price_expansion_15m_pct: Number(priceExpansionPct.toFixed(2)),
        taker_sell_dominance_pct: Number(takerSellDominancePct.toFixed(1)),
        whale_sell_vol_usd: flow.sellVol,
        net_flow_usd: flow.netFlow,
        price_lowest_15m: priceLowest15m,
        price_current: priceCurrent,
        window_minutes: 15
      }
    };
  }

  return { detected: false, priceExpansionPct, takerSellDominancePct };
}

/**
 * 3. Spoofing & Fake Wall Detection
 * Monitors order book depth snapshots for massive bid/ask walls appearing and disappearing rapidly (<60s) without execution
 */
export function trackOrderbookWall(activeWallsMap, symbol, side, price, sizeUsdt, now = Date.now()) {
  const normSym = normalizeSymbol(symbol);
  const wallKey = `${normSym}_${side}_${price.toFixed(4)}`;
  const minWallUsdt = BIG_CAP_SYMBOLS.has(normSym) ? 250000 : 50000; // $50k min wall for altcoins

  if (sizeUsdt >= minWallUsdt) {
    if (!activeWallsMap.has(wallKey)) {
      activeWallsMap.set(wallKey, {
        symbol: normSym,
        side,
        price,
        peakSizeUsdt: sizeUsdt,
        firstSeenAt: now,
        lastSeenAt: now
      });
    } else {
      const wall = activeWallsMap.get(wallKey);
      wall.lastSeenAt = now;
      if (sizeUsdt > wall.peakSizeUsdt) wall.peakSizeUsdt = sizeUsdt;
    }
  }
}

/**
 * Evaluates phantom walls removed without trades
 */
export function detectSpoofing(activeWallsMap, symbol, currentDepth, recentExecutedTrades, now = Date.now()) {
  const normSym = normalizeSymbol(symbol);
  const detectedSpoofs = [];

  for (const [wallKey, wall] of activeWallsMap.entries()) {
    if (wall.symbol !== normSym) continue;

    const ageSec = (now - wall.firstSeenAt) / 1000;
    const sinceLastSeenSec = (now - wall.lastSeenAt) / 1000;

    // If wall was seen recently but disappeared within 60s
    if (sinceLastSeenSec > 4 && ageSec <= 60 && wall.peakSizeUsdt >= (BIG_CAP_SYMBOLS.has(normSym) ? 250000 : 50000)) {
      // Check if trades actually filled this price
      const priceTolerance = wall.price * 0.001; // 0.1% price tolerance
      let filledUsdt = 0;
      for (const t of recentExecutedTrades) {
        if (Math.abs(t.execution_price - wall.price) <= priceTolerance && t.side === (wall.side === 'BID' ? 'SELL' : 'BUY')) {
          filledUsdt += Number(t.amount_usdt || 0);
        }
      }

      const fillRatio = filledUsdt / wall.peakSizeUsdt;
      // If less than 15% was executed, this is a phantom/spoof wall pulled
      if (fillRatio < 0.15) {
        detectedSpoofs.push({
          detected: true,
          alert_type: 'SPOOFING_DETECTED',
          severity: wall.peakSizeUsdt > 150000 ? 'HIGH' : 'MEDIUM',
          metrics: {
            wall_side: wall.side,
            wall_price: wall.price,
            peak_size_usdt: wall.peakSizeUsdt,
            lifespan_seconds: Math.round(ageSec),
            filled_usdt: Math.round(filledUsdt),
            fill_ratio_pct: Number((fillRatio * 100).toFixed(1)),
            cancellation_type: 'PHANTOM_WALL_PULLED'
          }
        });
      }

      // Cleanup resolved wall
      activeWallsMap.delete(wallKey);
    } else if (ageSec > 180 || sinceLastSeenSec > 60) {
      // Cleanup stale tracked wall
      activeWallsMap.delete(wallKey);
    }
  }

  return detectedSpoofs;
}

/**
 * 4. Concentration Index Calculation
 * Top whale trades volume / Total market volume. Flag if > 65%
 */
export function computeConcentrationIndex(trades, totalMarketVolumeUsdt, windowMs = WINDOW_15M_MS, now = Date.now()) {
  const cutoff = now - windowMs;
  const recentWhales = trades
    .filter(t => new Date(t.detected_at || t.timestamp).getTime() >= cutoff)
    .sort((a, b) => Number(b.amount_usdt) - Number(a.amount_usdt));

  const top10WhaleVol = recentWhales.slice(0, 10).reduce((acc, t) => acc + Number(t.amount_usdt || 0), 0);

  if (totalMarketVolumeUsdt <= 0 || top10WhaleVol <= 0) {
    return { concentrationPct: 0, isHighRisk: false };
  }

  const concentrationPct = Math.min(100, Number(((top10WhaleVol / totalMarketVolumeUsdt) * 100).toFixed(1)));
  const isHighRisk = concentrationPct > 65.0;

  let alert = null;
  if (isHighRisk && recentWhales.length >= 3) {
    alert = {
      detected: true,
      alert_type: 'HIGH_MANIPULATION_RISK',
      severity: concentrationPct > 80 ? 'CRITICAL' : 'HIGH',
      metrics: {
        concentration_pct: concentrationPct,
        top_whales_vol_usd: top10WhaleVol,
        total_market_vol_usd: totalMarketVolumeUsdt,
        whale_trade_count: recentWhales.length,
        window_minutes: Math.round(windowMs / 60000)
      }
    };
  }

  return { concentrationPct, isHighRisk, alert };
}

/**
 * Records a Whale Trade to Supabase and In-Memory Buffer
 */
export async function recordWhaleTrade(trade) {
  const cleanTrade = {
    symbol: normalizeSymbol(trade.symbol),
    exchange: String(trade.exchange || 'BINANCE').toUpperCase(),
    side: trade.side === 'BUY' ? 'BUY' : 'SELL',
    amount_usdt: Number(trade.amount_usdt),
    execution_price: Number(trade.execution_price),
    detected_at: trade.detected_at || new Date().toISOString()
  };

  // Add to In-Memory buffer (capped at 1000)
  WhaleMemoryStore.trades.unshift(cleanTrade);
  if (WhaleMemoryStore.trades.length > 1000) {
    WhaleMemoryStore.trades.pop();
  }

  // Persist to Supabase if configured
  if (supabase) {
    try {
      const { error } = await supabase.from('whale_trades').insert(cleanTrade);
      if (error) {
        console.warn('⚠️ Supabase whale_trades insert warning:', error.message);
      }
    } catch (err) {
      console.warn('⚠️ whale_trades insert error:', err.message);
    }
  }

  return cleanTrade;
}

/**
 * Creates and persists a Manipulation Alert
 * Automatically enqueues into telegram_signal_outbox if HIGH or CRITICAL
 */
export async function createManipulationAlert(symbol, alertType, severity, metricsJson) {
  const normSym = normalizeSymbol(symbol);
  const alertId = `WHALE_${normSym}_${alertType}_${Math.floor(Date.now() / 60000)}`;

  const alertRecord = {
    alert_id: alertId,
    symbol: normSym,
    alert_type: alertType,
    severity: severity || 'MEDIUM',
    metrics_json: metricsJson || {},
    status: 'ACTIVE',
    detected_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Update In-Memory Cache (de-duplicate by alert_id)
  const existingIdx = WhaleMemoryStore.alerts.findIndex(a => a.alert_id === alertId);
  if (existingIdx >= 0) {
    WhaleMemoryStore.alerts[existingIdx] = alertRecord;
  } else {
    WhaleMemoryStore.alerts.unshift(alertRecord);
    if (WhaleMemoryStore.alerts.length > 200) WhaleMemoryStore.alerts.pop();
  }

  // Persist to Supabase
  if (supabase) {
    try {
      const { error } = await supabase.from('manipulation_alerts').upsert(alertRecord, {
        onConflict: 'alert_id'
      });
      if (error) {
        console.warn('⚠️ Supabase manipulation_alerts upsert warning:', error.message);
      }
    } catch (err) {
      console.warn('⚠️ manipulation_alerts upsert error:', err.message);
    }
  }

  // If HIGH or CRITICAL severity, format and enqueue Telegram Alert
  if (severity === 'HIGH' || severity === 'CRITICAL') {
    try {
      const alertEmoji = severity === 'CRITICAL' ? '🚨🚨' : '⚠️';
      const typeLabel = alertType.replace(/_/g, ' ');
      const flowUsd = metricsJson.net_flow_usd 
        ? `$${Math.abs(Math.round(metricsJson.net_flow_usd)).toLocaleString()} (${metricsJson.net_flow_usd >= 0 ? 'Net BUY' : 'Net SELL'})`
        : 'N/A';

      const customMsg = [
        `${alertEmoji} *EAGLE FLASH — WHALE MANIPULATION RADAR* 🐋`,
        ``,
        `*Alert:* \`${alertType}\` [*${severity}*]`,
        `*Symbol:* #${normSym}`,
        metricsJson.price_current ? `*Current Price:* \`$${metricsJson.price_current}\`` : '',
        metricsJson.price_expansion_15m_pct ? `*15m Expansion:* \`+${metricsJson.price_expansion_15m_pct}%\`` : '',
        metricsJson.taker_sell_dominance_pct ? `*Taker Sell Dominance:* \`${metricsJson.taker_sell_dominance_pct}%\`` : '',
        metricsJson.net_flow_usd ? `*Net Large Flow:* \`${flowUsd}\`` : '',
        metricsJson.concentration_pct ? `*Concentration Index:* \`${metricsJson.concentration_pct}%\` (High Risk)` : '',
        metricsJson.peak_size_usdt ? `*Spoof Wall Size:* \`$${Math.round(metricsJson.peak_size_usdt).toLocaleString()}\` (${metricsJson.lifespan_seconds}s lifespan)` : '',
        ``,
        `⚠️ *Risk Status:* ACTIVE — Monitor order book and taker exit pressure.`,
        `🕒 _${new Date().toISOString()}_`
      ].filter(Boolean).join('\n');

      await queueTelegramSignalAlert({
        signal_id: alertId,
        symbol: normSym,
        direction: alertType.includes('ACCUMULATION') ? 'LONG' : 'SHORT',
        score: severity === 'CRITICAL' ? 95 : 85,
        entry_price: metricsJson.price_current || 0,
        stop_loss: 0,
        take_profit_1: 0,
        take_profit_2: 0,
        take_profit_3: 0,
        metadata: {
          isWhaleAlert: true,
          alertType,
          severity,
          customMessage: customMsg
        }
      });
    } catch (e) {
      console.warn('⚠️ Telegram queue error for whale alert:', e.message);
    }
  }

  return alertRecord;
}
