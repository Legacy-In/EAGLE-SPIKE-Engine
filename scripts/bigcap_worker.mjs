/**
 * 🏛️ EAGLE FLASH — Big Cap Spike & PnL Intelligence Daemon (BTC, ETH, SOL)
 * Continuous 24/7 background worker monitoring BTCUSDT, ETHUSDT, and SOLUSDT perpetuals
 * across 5m, 15m, and 1h timeframes.
 *
 * Enforces:
 * - Multi-timeframe RVOL & Z-Score footprint calculation
 * - Macro session sensitivity (London, NY, Asia)
 * - Exclusive non-overlapping active symbol position lock (At most 1 ACTIVE position per symbol)
 * - Strict 45-minute post-closure cooldown per symbol
 * - 4-bullet deterministic quantitative rationale synthesizer
 * - Automated TP/SL position management state machine
 * - Direct Supabase PostgreSQL persistence (big_cap_signals)
 *
 * Usage: node scripts/bigcap_worker.mjs
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// 1. Environment & Configuration Loading
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
    }
  }
}

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
export const TIMEFRAMES = ['5m', '15m', '1h'];
export const COOLDOWN_MS = 45 * 60 * 1000; // 45-minute strict cooldown post-closure
export const MIN_TURNOVER_USD = 10_000_000; // 10M USD filter

// In-memory runtime state
export const ActivePositions = new Map(); // symbol -> signal object
export const ClosedCooldowns = new Map(); // symbol -> timestamp of last close
export const LatestPrices = new Map();    // symbol -> markPrice
export const LatestMetrics = new Map();   // symbol -> { 5m, 15m, 1h, oi, 24h }

// ============================================================================
// 2. MATHEMATICAL BASELINE & ROLLING METRICS
// ============================================================================

export function calculateMovingAverage(values, period = 20) {
  if (!values || values.length === 0) return 0;
  const slice = values.slice(-period);
  const sum = slice.reduce((acc, v) => acc + v, 0);
  return sum / slice.length;
}

export function calculateStdDev(values, mean, period = 20) {
  if (!values || values.length < 2) return 0;
  const slice = values.slice(-period);
  const variance = slice.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / slice.length;
  return Math.sqrt(variance);
}

export function calculateRvolAndZScore(volumes, period = 20) {
  if (!volumes || volumes.length === 0) return { rvol: 1.0, zScore: 0.0 };
  const current = volumes[volumes.length - 1];
  const history = volumes.slice(0, -1);
  const ma = calculateMovingAverage(history.length > 0 ? history : volumes, period);
  const std = calculateStdDev(history.length > 0 ? history : volumes, ma, period) || 1;

  const rvol = ma > 0 ? parseFloat((current / ma).toFixed(2)) : 1.0;
  const zScore = parseFloat(((current - ma) / std).toFixed(2));
  return { rvol, zScore };
}

export function calculateEma(prices, period = 50) {
  if (!prices || prices.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

export function getMacroSession(date = new Date()) {
  const hour = date.getUTCHours();
  if (hour >= 13 && hour < 16) {
    return { tag: 'LONDON_NY_OVERLAP', rvolThreshold: 1.5, name: 'London / New York Overlap' };
  } else if (hour >= 7 && hour < 16) {
    return { tag: 'LONDON', rvolThreshold: 1.5, name: 'London Institutional Session' };
  } else if (hour >= 13 && hour < 22) {
    return { tag: 'NEW_YORK', rvolThreshold: 1.5, name: 'New York Cash Session' };
  } else {
    return { tag: 'ASIA_PACIFIC', rvolThreshold: 2.1, name: 'Asia / Off-Hours' };
  }
}

// ============================================================================
// 3. CONFLUENCE & BEST TIMEFRAME SELECTOR
// ============================================================================

export function selectBestTimeframe(metrics5m, metrics15m, metrics1h) {
  // If extreme volatility breakout: 5m Z-score > 4.0
  if (metrics5m && metrics5m.zScore > 4.0) {
    return {
      bestTf: '5m',
      tag: 'High-Beta Breakout Scalp',
      rationale: '5m Z-Score exceeded +4.0 indicating violent impulse flow, prioritizing immediate execution over lag.'
    };
  }

  // If 15m & 1h align in direction
  const dir15m = metrics15m?.priceDelta >= 0 ? 'LONG' : 'SHORT';
  const dir1h = metrics1h?.trend === 'BULLISH' ? 'LONG' : (metrics1h?.trend === 'BEARISH' ? 'SHORT' : null);

  if (dir15m === dir1h) {
    return {
      bestTf: '15m',
      tag: '15m Institutional Flow Alignment',
      rationale: '15m setup tightly aligned with 1h structural trend bias, providing the optimal ratio of noise rejection and speed.'
    };
  }

  // Otherwise swing/trend continuation on 1h
  return {
    bestTf: '1h',
    tag: '1h Macro Trend Continuation',
    rationale: '1h macro structure dominant; executing on 1h timeframe to ride structural session continuation.'
  };
}

// ============================================================================
// 4. 4-BULLET DETERMINISTIC RATIONALE SYNTHESIZER
// ============================================================================

export function synthesizeRationale({
  symbol,
  direction,
  bestTf,
  rvol,
  zScore,
  oiDelta,
  priceDelta,
  session,
  trend1h
}) {
  const b1 = `${bestTf.toUpperCase()} RVOL reached ${rvol.toFixed(2)}x (Z-Score ${zScore >= 0 ? '+' : ''}${zScore.toFixed(2)}) indicating aggressive institutional participation.`;
  
  const b2 = `Open Interest shifted ${oiDelta >= 0 ? '+' : ''}${oiDelta.toFixed(2)}% alongside ${priceDelta >= 0 ? 'positive' : 'negative'} price delta, confirming ${
    direction === 'LONG'
      ? 'fresh long leverage accumulation rather than passive short covering'
      : 'aggressive short positioning and structural liquidity distribution'
  }.`;

  const b3 = `Aligned with ${session.name}; 1h trend (${trend1h}) EMA(50) holding as primary directional anchor.`;

  const b4 = `${bestTf} selected as optimal entry timeframe to ${
    bestTf === '5m'
      ? 'capture immediate high-beta impulse volatility'
      : bestTf === '15m'
      ? 'filter 5m micro-whips while capturing impulse continuation'
      : 'ride sustained multi-session macro trend continuation'
  }.`;

  return [b1, b2, b3, b4];
}

// ============================================================================
// 5. TP / SL FORMULAS & TARGET CALCULATOR
// ============================================================================

export function calculateTradeTargets(entryPrice, direction) {
  if (direction === 'LONG') {
    return {
      stopLossPrice: parseFloat((entryPrice * (1 - 0.008)).toFixed(4)),  // -0.8%
      targetPrice1: parseFloat((entryPrice * (1 + 0.015)).toFixed(4)),   // +1.5%
      targetPrice2: parseFloat((entryPrice * (1 + 0.035)).toFixed(4)),   // +3.5%
    };
  } else {
    return {
      stopLossPrice: parseFloat((entryPrice * (1 + 0.008)).toFixed(4)),  // +0.8%
      targetPrice1: parseFloat((entryPrice * (1 - 0.015)).toFixed(4)),   // -1.5%
      targetPrice2: parseFloat((entryPrice * (1 - 0.035)).toFixed(4)),   // -3.5%
    };
  }
}

// ============================================================================
// 6. POSITION EXIT & STATE MACHINE EVALUATION
// ============================================================================

export function evaluatePositionExit(position, currentPrice) {
  if (!position || position.status !== 'ACTIVE') return null;

  const isLong = position.direction === 'LONG';

  if (isLong) {
    // TP2 hit (+3.5%)
    if (currentPrice >= position.target_price_2) {
      return {
        status: 'TP_HIT',
        realizedPnl: 3.5,
        exitPrice: position.target_price_2,
        reason: 'Target 2 reached (+3.5%)'
      };
    }
    // SL hit (-0.8%)
    if (currentPrice <= position.stop_loss_price) {
      return {
        status: 'SL_HIT',
        realizedPnl: -0.8,
        exitPrice: position.stop_loss_price,
        reason: 'Structural stop loss breached (-0.8%)'
      };
    }
  } else {
    // SHORT TP2 hit (+3.5%)
    if (currentPrice <= position.target_price_2) {
      return {
        status: 'TP_HIT',
        realizedPnl: 3.5,
        exitPrice: position.target_price_2,
        reason: 'Target 2 reached (+3.5%)'
      };
    }
    // SHORT SL hit (-0.8%)
    if (currentPrice >= position.stop_loss_price) {
      return {
        status: 'SL_HIT',
        realizedPnl: -0.8,
        exitPrice: position.stop_loss_price,
        reason: 'Structural stop loss breached (-0.8%)'
      };
    }
  }

  // Calculate live unrealized PnL
  const unrealized = isLong
    ? ((currentPrice - position.entry_price) / position.entry_price) * 100
    : ((position.entry_price - currentPrice) / position.entry_price) * 100;

  return {
    status: 'ACTIVE',
    realizedPnl: 0,
    unrealizedPnl: parseFloat(unrealized.toFixed(2)),
    currentPrice
  };
}

// ============================================================================
// 7. PUBLIC EXCHANGE INGESTION PIPELINE (BINANCE & BYBIT)
// ============================================================================

async function fetchBinanceKlines(symbol, interval, limit = 50) {
  try {
    const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Binance klines HTTP ${res.status}`);
    const data = await res.json();
    return data.map(k => ({
      openTime: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      turnover: parseFloat(k[7]),
    }));
  } catch (err) {
    return null;
  }
}

async function fetchBinanceOpenInterest(symbol) {
  try {
    const url = `https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Binance OI HTTP ${res.status}`);
    const data = await res.json();
    return parseFloat(data.openInterest || 0);
  } catch (err) {
    return 0;
  }
}

async function fetchBinanceTicker(symbol) {
  try {
    const url = `https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Binance ticker HTTP ${res.status}`);
    const data = await res.json();
    return {
      lastPrice: parseFloat(data.lastPrice || 0),
      priceChangePercent: parseFloat(data.priceChangePercent || 0),
      turnover24h: parseFloat(data.quoteVolume || 0),
    };
  } catch (err) {
    return null;
  }
}

// Fallback to Bybit V5 Linear
async function fetchBybitTicker(symbol) {
  try {
    const url = `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const json = await res.json();
    const item = json?.result?.list?.[0];
    if (!item) return null;
    return {
      lastPrice: parseFloat(item.lastPrice || 0),
      priceChangePercent: parseFloat(item.price24hPcnt || 0) * 100,
      turnover24h: parseFloat(item.turnover24h || 0),
    };
  } catch (err) {
    return null;
  }
}

// ============================================================================
// 8. DATABASE SYNCHRONIZATION WITH SUPABASE
// ============================================================================

async function rehydrateActivePositions() {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from('big_cap_signals')
      .select('*')
      .eq('status', 'ACTIVE');

    if (!error && Array.isArray(data)) {
      data.forEach(sig => {
        ActivePositions.set(sig.symbol, sig);
        console.log(`🔒 Rehydrated active lock for ${sig.symbol} (${sig.direction} @ ${sig.entry_price})`);
      });
    }
  } catch (err) {
    console.warn('⚠️ Supabase rehydration error:', err?.message);
  }
}

async function persistNewSignal(sig) {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase
      .from('big_cap_signals')
      .insert({
        signal_id: sig.signal_id,
        symbol: sig.symbol,
        direction: sig.direction,
        best_timeframe: sig.best_timeframe,
        entry_price: sig.entry_price,
        stop_loss_price: sig.stop_loss_price,
        target_price_1: sig.target_price_1,
        target_price_2: sig.target_price_2,
        current_price: sig.current_price,
        realized_pnl_pct: 0,
        eagle_score: sig.eagle_score,
        rvol: sig.rvol,
        z_score: sig.z_score,
        oi_delta_pct: sig.oi_delta_pct,
        session_tag: sig.session_tag,
        status: 'ACTIVE',
        rationale_json: sig.rationale_json,
        detected_at: new Date(sig.detected_at).toISOString(),
      });

    if (error) {
      if (error.code === '23505') {
        console.warn(`🔒 Non-overlapping lock active in DB for ${sig.symbol}`);
      } else {
        console.error('Failed to persist signal to Supabase:', error);
      }
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase insert unexpected error:', err?.message);
    return false;
  }
}

async function updatePositionStatusInDb(signalId, status, exitPrice, realizedPnl) {
  if (!supabase) return;
  try {
    const now = new Date().toISOString();
    await supabase
      .from('big_cap_signals')
      .update({
        status,
        current_price: exitPrice,
        realized_pnl_pct: realizedPnl,
        closed_at: now,
        updated_at: now,
      })
      .eq('signal_id', signalId);
  } catch (err) {
    console.error(`Failed to update signal ${signalId} in Supabase:`, err?.message);
  }
}

async function updateCurrentPriceInDb(signalId, currentPrice) {
  if (!supabase) return;
  try {
    await supabase
      .from('big_cap_signals')
      .update({
        current_price: currentPrice,
        updated_at: new Date().toISOString(),
      })
      .eq('signal_id', signalId);
  } catch (e) {}
}

// ============================================================================
// 8B. TELEGRAM ALERT DISPATCHER (BIG-CAP DESK)
// ============================================================================

export function formatBigCapTelegramMessage(sig) {
  const bullets = Array.isArray(sig.rationale_json) ? sig.rationale_json : [];
  const b0 = bullets[0] || 'Institutional volume compression breakout verified';
  const b1 = bullets[1] || 'Open Interest positioning and delta confluence confirmed';
  const b2 = bullets[2] || 'Macro trading session volatility threshold satisfied';
  const b3 = bullets[3] || 'Optimal execution timeframe isolated';

  return `🦅 BIG-CAP SPIKE DETECTED\n\n` +
    `🪙 Symbol: ${sig.symbol}\n` +
    `📈 Direction: ${sig.direction}\n` +
    `⚡ Best TF: ${sig.best_timeframe}\n` +
    `🎯 Entry: $${sig.entry_price}\n` +
    `🛑 Stop-Loss: $${sig.stop_loss_price}\n` +
    `🚀 TP1 / TP2: $${sig.target_price_1} / $${sig.target_price_2}\n` +
    `📊 Eagle Score: ${sig.eagle_score} | RVOL: ${sig.rvol}x\n\n` +
    `Deterministic Rationale:\n` +
    `• ${b0}\n` +
    `• ${b1}\n` +
    `• ${b2}\n` +
    `• ${b3}`;
}

export async function sendBigCapTelegramAlert(sig) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId || token.includes('your_telegram_bot_token')) {
    console.log(`ℹ️ [TELEGRAM] Bot token/chat_id not configured in environment. Alert for ${sig.symbol} skipped.`);
    return { success: false, reason: 'NOT_CONFIGURED' };
  }

  const messageText = formatBigCapTelegramMessage(sig);

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      console.log(`📢 [TELEGRAM] Successfully dispatched Big-Cap alert for ${sig.symbol} (Message ID: ${data.result?.message_id})`);
      return { success: true, messageId: data.result?.message_id };
    } else {
      console.warn(`⚠️ [TELEGRAM] Telegram API error dispatching alert for ${sig.symbol}:`, data?.description || res.statusText);
      return { success: false, error: data?.description || res.statusText };
    }
  } catch (err) {
    console.error(`❌ [TELEGRAM] Network error sending alert for ${sig.symbol}:`, err?.message);
    return { success: false, error: err?.message };
  }
}

// ============================================================================
// 9. MAIN DAEMON EVALUATION CYCLE
// ============================================================================

export async function processBigCapSymbol(symbol) {
  // 1. Fetch live ticker (Binance first, Bybit fallback)
  let ticker = await fetchBinanceTicker(symbol);
  if (!ticker || ticker.lastPrice <= 0) {
    ticker = await fetchBybitTicker(symbol);
  }
  if (!ticker || ticker.lastPrice <= 0) return null;

  const currentPrice = ticker.lastPrice;
  LatestPrices.set(symbol, currentPrice);

  // 2. Automated Exit Evaluation for Existing ACTIVE Position
  const active = ActivePositions.get(symbol);
  if (active) {
    const exitResult = evaluatePositionExit(active, currentPrice);
    if (exitResult && exitResult.status !== 'ACTIVE') {
      console.log(`\n🔔 [${symbol}] POSITION CLOSED: ${exitResult.status} (${exitResult.reason}) | ROI: ${exitResult.realizedPnl >= 0 ? '+' : ''}${exitResult.realizedPnl}%`);
      ActivePositions.delete(symbol);
      ClosedCooldowns.set(symbol, Date.now());
      await updatePositionStatusInDb(active.signal_id, exitResult.status, exitResult.exitPrice, exitResult.realizedPnl);
    } else if (exitResult) {
      // Periodic price update
      await updateCurrentPriceInDb(active.signal_id, currentPrice);
    }
    // Symbol is locked while active position exists
    return { symbol, status: 'LOCKED_ACTIVE', position: active, currentPrice };
  }

  // 3. Strict 45-minute Cooldown Check
  const lastClosed = ClosedCooldowns.get(symbol) || 0;
  const elapsedSinceClose = Date.now() - lastClosed;
  if (elapsedSinceClose < COOLDOWN_MS) {
    const remainingMin = Math.ceil((COOLDOWN_MS - elapsedSinceClose) / 60000);
    return { symbol, status: 'COOLDOWN', remainingMinutes: remainingMin, currentPrice };
  }

  // 4. Turnover check (Must exceed $10M USD 24h volume)
  if (ticker.turnover24h < MIN_TURNOVER_USD) {
    return { symbol, status: 'LOW_TURNOVER', turnover: ticker.turnover24h };
  }

  // 5. Ingest multi-timeframe candles (5m, 15m, 1h) and Open Interest
  const [klines5m, klines15m, klines1h, currentOi] = await Promise.all([
    fetchBinanceKlines(symbol, '5m', 50),
    fetchBinanceKlines(symbol, '15m', 50),
    fetchBinanceKlines(symbol, '1h', 50),
    fetchBinanceOpenInterest(symbol),
  ]);

  if (!klines5m || !klines15m || !klines1h) {
    return { symbol, status: 'FETCH_ERROR' };
  }

  // Calculate Metrics for 5m
  const volumes5m = klines5m.map(k => k.volume);
  const { rvol: rvol5m, zScore: zScore5m } = calculateRvolAndZScore(volumes5m, 20);
  const open5m = klines5m[klines5m.length - 1].open;
  const close5m = klines5m[klines5m.length - 1].close;
  const priceDelta5m = parseFloat((((close5m - open5m) / open5m) * 100).toFixed(2));

  // Calculate Metrics for 15m
  const volumes15m = klines15m.map(k => k.volume);
  const { rvol: rvol15m, zScore: zScore15m } = calculateRvolAndZScore(volumes15m, 20);
  const open15m = klines15m[klines15m.length - 1].open;
  const close15m = klines15m[klines15m.length - 1].close;
  const priceDelta15m = parseFloat((((close15m - open15m) / open15m) * 100).toFixed(2));

  // Calculate Metrics for 1h
  const volumes1h = klines1h.map(k => k.volume);
  const closes1h = klines1h.map(k => k.close);
  const { rvol: rvol1h, zScore: zScore1h } = calculateRvolAndZScore(volumes1h, 20);
  const ema50_1h = calculateEma(closes1h, 50);
  const trend1h = close5m > ema50_1h ? 'BULLISH' : 'BEARISH';

  // OI change calculation
  const prevOi = LatestMetrics.get(symbol)?.oi || (currentOi * 0.98);
  const oiDelta = prevOi > 0 ? parseFloat((((currentOi - prevOi) / prevOi) * 100).toFixed(2)) : 0;

  const session = getMacroSession();

  const metricsObj = {
    symbol,
    currentPrice,
    session,
    oi: currentOi,
    oiDelta,
    '5m': { rvol: rvol5m, zScore: zScore5m, priceDelta: priceDelta5m },
    '15m': { rvol: rvol15m, zScore: zScore15m, priceDelta: priceDelta15m },
    '1h': { rvol: rvol1h, zScore: zScore1h, ema50: ema50_1h, trend: trend1h },
  };
  LatestMetrics.set(symbol, metricsObj);

  // 6. Signal Trigger Condition Check:
  // Must exceed session RVOL threshold on 15m OR 5m, plus significant OI expansion
  const primaryRvol = Math.max(rvol15m, rvol5m);
  const primaryZScore = Math.max(zScore15m, zScore5m);
  const qualifies = (primaryRvol >= session.rvolThreshold) && (Math.abs(primaryZScore) >= 1.8) && (oiDelta >= 1.5 || Math.abs(priceDelta15m) >= 0.8);

  if (!qualifies) {
    return { symbol, status: 'SCANNING', metrics: metricsObj };
  }

  // 7. Qualify Signal Setup
  const direction = (priceDelta15m >= 0 || trend1h === 'BULLISH') ? 'LONG' : 'SHORT';
  const { bestTf } = selectBestTimeframe(metricsObj['5m'], metricsObj['15m'], metricsObj['1h']);
  const targets = calculateTradeTargets(currentPrice, direction);

  const eagleScore = Math.min(99, Math.round(50 + (primaryRvol * 10) + (Math.abs(primaryZScore) * 5) + (Math.abs(oiDelta) * 3)));

  const rationale = synthesizeRationale({
    symbol,
    direction,
    bestTf,
    rvol: primaryRvol,
    zScore: primaryZScore,
    oiDelta,
    priceDelta: priceDelta15m,
    session,
    trend1h,
  });

  const now = Date.now();
  const dateStr = new Date(now).toISOString().slice(0, 10).replace(/-/g, '');
  const signalId = `BIGCAP-${dateStr}-${symbol}-${direction}-${now.toString().slice(-4)}`;

  const newSignal = {
    signal_id: signalId,
    symbol,
    direction,
    best_timeframe: bestTf,
    entry_price: currentPrice,
    stop_loss_price: targets.stopLossPrice,
    target_price_1: targets.targetPrice1,
    target_price_2: targets.targetPrice2,
    current_price: currentPrice,
    eagle_score: eagleScore,
    rvol: primaryRvol,
    z_score: primaryZScore,
    oi_delta_pct: oiDelta,
    session_tag: session.tag,
    status: 'ACTIVE',
    rationale_json: rationale,
    detected_at: now,
  };

  // Lock and persist
  ActivePositions.set(symbol, newSignal);
  console.log(`\n🚀 [NEW BIG CAP SIGNAL] ${signalId}`);
  console.log(`   Symbol: ${symbol} | Direction: ${direction} | Best TF: ${bestTf} | Entry: $${currentPrice}`);
  console.log(`   TP1: $${targets.targetPrice1} (+1.5%) | TP2: $${targets.targetPrice2} (+3.5%) | SL: $${targets.stopLossPrice} (-0.8%)`);
  console.log(`   Rationale: \n   • ${rationale.join('\n   • ')}`);

  const persisted = await persistNewSignal(newSignal);
  if (persisted) {
    await sendBigCapTelegramAlert(newSignal);
  }

  return { symbol, status: 'NEW_SIGNAL', signal: newSignal };
}

// Daemon execution loop
let isRunning = false;

export async function runDaemonCycle() {
  if (isRunning) return;
  isRunning = true;
  try {
    for (const symbol of SYMBOLS) {
      try {
        await processBigCapSymbol(symbol);
      } catch (err) {
        console.warn(`Error processing ${symbol}:`, err?.message);
      }
    }
  } finally {
    isRunning = false;
  }
}

// Start if executed directly
if (process.argv[1] && (import.meta.url.includes(path.basename(process.argv[1])) || process.argv[1].includes('bigcap_worker'))) {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🏛️ EAGLE FLASH — BIG CAP SPIKE & PNL INTELLIGENCE DAEMON (24/7)');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Symbols: ${SYMBOLS.join(', ')}`);
  console.log(`Timeframes: 5m, 15m, 1h`);
  console.log(`Supabase Connected: ${Boolean(supabase)}`);

  rehydrateActivePositions().then(() => {
    runDaemonCycle();
    setInterval(runDaemonCycle, 3000); // Poll and exit state machine every 3s
  });
}
