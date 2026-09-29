/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — QUANTITATIVE FEATURE CALCULATOR & DERIVATIVES NORMALIZER
 *
 * Implements:
 * 1. Kaufman Price Efficiency (KER): Directional displacement vs total path length
 * 2. Time-Normalized Open Interest (OI) Acceleration (1-minute uniform rate basis)
 * 3. Volatility Compression Index (VCI) & Rolling VCI Percentiles
 * 4. Funding Rate Normalization: Cross-sectional & Historical Z-Score & Percentiles
 * 5. Mandatory Liquidity-Quality Gate: Turnover, Spread bps, Depth, Market Impact
 * 6. Deterministic & Versioned Base Price Calculation (base_price_v1)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Computes the Kaufman Price Efficiency Ratio (KER).
 * Efficiency = |Close_t - Close_t-N| / sum(|Close_i - Close_i-1|)
 *
 * @param {Array<Array<number|string>>} candles Array of candles [timestamp, open, high, low, close, volume]
 *                                              Index 0 is latest candle or oldest depending on feed.
 *                                              We sort or assume ascending chronological order.
 * @param {number} period Lookback period (default 14)
 * @returns {number} Value between 0.0 (pure random walk / high-noise consolidation) and 1.0 (pure trend)
 */
export function computeKaufmanPriceEfficiency(candles, period = 14) {
  if (!candles || candles.length < 2) return 0.5;

  // Extract closes in chronological order (oldest to newest)
  const isDescending = Number(candles[0][0]) > Number(candles[candles.length - 1][0]);
  const sorted = isDescending ? [...candles].reverse() : candles;

  const closes = sorted.map((c) => parseFloat(c[4]));
  const windowCloses = closes.slice(-Math.min(closes.length, period + 1));
  if (windowCloses.length < 2) return 0.5;

  const netChange = Math.abs(windowCloses[windowCloses.length - 1] - windowCloses[0]);

  let sumPath = 0;
  for (let i = 1; i < windowCloses.length; i++) {
    sumPath += Math.abs(windowCloses[i] - windowCloses[i - 1]);
  }

  if (sumPath === 0) return 0.0;
  const efficiency = netChange / sumPath;
  return Number(Math.max(0.0, Math.min(1.0, efficiency)).toFixed(4));
}

/**
 * Computes Time-Normalized Open Interest (OI) Acceleration on a uniform 1-minute rate basis.
 * OI_Rate_5m = Delta_OI_5m / 5
 * OI_Rate_15m = Delta_OI_15m / 15
 * OI_Acceleration = (OI_Rate_5m - OI_Rate_15m) / Baseline_OI
 *
 * @param {number} deltaOi5m Change in Open Interest over 5 minutes (USD or contracts)
 * @param {number} deltaOi15m Change in Open Interest over 15 minutes (USD or contracts)
 * @param {number} baselineOi Total current baseline Open Interest
 * @returns {{ oiRate5m: number, oiRate15m: number, oiAcceleration: number, oiAccelerationPct: number }}
 */
export function computeNormalizedOiAcceleration(deltaOi5m, deltaOi15m, baselineOi) {
  const safeBaseline = Math.max(1, Math.abs(Number(baselineOi) || 1));
  const d5 = Number(deltaOi5m) || 0;
  const d15 = Number(deltaOi15m) || 0;

  // Uniform 1-minute rate basis
  const oiRate5m = d5 / 5;
  const oiRate15m = d15 / 15;

  // Normalized acceleration per minute relative to total baseline
  const oiAcceleration = (oiRate5m - oiRate15m) / safeBaseline;
  const oiAccelerationPct = Number((oiAcceleration * 100).toFixed(4));

  return {
    oiRate5m: Number(oiRate5m.toFixed(2)),
    oiRate15m: Number(oiRate15m.toFixed(2)),
    oiAcceleration: Number(oiAcceleration.toFixed(6)),
    oiAccelerationPct,
  };
}

/**
 * Calculates Average True Range (ATR) for a given candle series.
 * @param {Array<Array<number|string>>} candles Chronological candles [ts, o, h, l, c, v]
 * @param {number} period Lookback period (default 14)
 * @returns {number}
 */
export function calculateAtr(candles, period = 14) {
  if (!candles || candles.length < 2) return 0;

  const isDescending = Number(candles[0][0]) > Number(candles[candles.length - 1][0]);
  const sorted = isDescending ? [...candles].reverse() : candles;

  const trs = [];
  for (let i = 1; i < sorted.length; i++) {
    const high = parseFloat(sorted[i][2]);
    const low = parseFloat(sorted[i][3]);
    const prevClose = parseFloat(sorted[i - 1][4]);

    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trs.push(tr);
  }

  const windowTrs = trs.slice(-period);
  if (windowTrs.length === 0) return 0;
  return windowTrs.reduce((a, b) => a + b, 0) / windowTrs.length;
}

/**
 * Computes Bollinger Band Width (BBWidth) = (Upper - Lower) / Middle
 * @param {Array<number>} closes Array of close prices
 * @param {number} period Default 20
 * @param {number} stdMultiplier Default 2
 * @returns {number}
 */
export function calculateBbWidth(closes, period = 20, stdMultiplier = 2) {
  if (!closes || closes.length < period) return 0.05;
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  if (mean === 0) return 0;

  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
  const std = Math.sqrt(variance);
  const bbWidth = (2 * stdMultiplier * std) / mean;
  return Number(bbWidth.toFixed(4));
}

/**
 * Computes Volatility Compression Index (VCI) & Rolling VCI Percentile.
 * VCI = (BBWidth_15m / SMA(BBWidth_15m, 40)) * (ATR_15m / ATR_1h)
 *
 * @param {Array<Array<number|string>>} candles15m 15-minute candles
 * @param {Array<Array<number|string>>} candles1h 1-hour candles
 * @param {number} configurableThreshold Default 0.60
 * @param {Array<number>} historicalVcis Rolling historical VCI values for percentile rank
 * @returns {{ vci: number, vciPercentile: number, isCompressed: boolean, atr15m: number, atr1h: number }}
 */
export function computeVciAndPercentile(
  candles15m,
  candles1h,
  configurableThreshold = 0.6,
  historicalVcis = []
) {
  const atr15m = calculateAtr(candles15m, 14);
  const atr1h = calculateAtr(candles1h, 14) || atr15m || 1;

  const isDescending = candles15m && candles15m.length > 1 && Number(candles15m[0][0]) > Number(candles15m[candles15m.length - 1][0]);
  const sorted15m = isDescending ? [...candles15m].reverse() : candles15m || [];
  const closes15m = sorted15m.map((c) => parseFloat(c[4]));

  const curBbWidth = calculateBbWidth(closes15m, 20, 2);

  // Compute SMA of BBWidth over last 30-40 periods if enough data, else fallback to curBbWidth
  let meanBbWidth = curBbWidth;
  if (closes15m.length >= 40) {
    const historicalBb = [];
    for (let i = 20; i <= closes15m.length; i++) {
      historicalBb.push(calculateBbWidth(closes15m.slice(0, i), 20, 2));
    }
    const sample = historicalBb.slice(-40);
    meanBbWidth = sample.reduce((a, b) => a + b, 0) / (sample.length || 1);
  }

  const bbRatio = meanBbWidth > 0 ? curBbWidth / meanBbWidth : 1.0;
  const atrRatio = atr1h > 0 ? atr15m / atr1h : 1.0;

  const vci = Number((bbRatio * atrRatio).toFixed(4));

  // Compute percentile against rolling distribution
  let vciPercentile = 50;
  if (historicalVcis && historicalVcis.length >= 10) {
    const countBelow = historicalVcis.filter((v) => v <= vci).length;
    vciPercentile = Number(((countBelow / historicalVcis.length) * 100).toFixed(1));
  } else {
    // Synthetic empirical percentile approximation based on typical distributions
    vciPercentile = Number(Math.max(1, Math.min(99, vci * 75)).toFixed(1));
  }

  const isCompressed = vci < configurableThreshold || vciPercentile <= 20;

  return {
    vci,
    vciPercentile,
    isCompressed,
    atr15m: Number(atr15m.toFixed(6)),
    atr1h: Number(atr1h.toFixed(6)),
    thresholdUsed: configurableThreshold,
  };
}

/**
 * Computes Funding Rate Z-Score and Percentile from historical funding distribution.
 *
 * @param {number} currentFunding Current funding rate (e.g. 0.0001 = 0.01%)
 * @param {Array<number>} historicalFunding Array of historical funding rates (e.g. 30-day 8-hour samples)
 * @returns {{ fundingZScore: number, fundingPercentile: number, isFrothy: boolean, isSeverelyNegative: boolean }}
 */
export function computeFundingZScoreAndPercentile(currentFunding, historicalFunding = []) {
  const current = Number(currentFunding) || 0;

  if (!historicalFunding || historicalFunding.length < 5) {
    // Fallback baseline: mean = 0.0001 (10 bps/day), std = 0.0003
    const mean = 0.0001;
    const std = 0.0003;
    const z = (current - mean) / std;
    const isFrothy = z > 2.0;
    const isSeverelyNegative = z < -1.8;
    return {
      fundingZScore: Number(z.toFixed(2)),
      fundingPercentile: z > 2.0 ? 95 : z < -2.0 ? 5 : 50,
      isFrothy,
      isSeverelyNegative,
    };
  }

  const mean = historicalFunding.reduce((a, b) => a + b, 0) / historicalFunding.length;
  const variance = historicalFunding.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / historicalFunding.length;
  const std = Math.sqrt(variance) || 0.0001;

  const z = (current - mean) / std;
  const countBelow = historicalFunding.filter((f) => f <= current).length;
  const percentile = Number(((countBelow / historicalFunding.length) * 100).toFixed(1));

  return {
    fundingZScore: Number(z.toFixed(2)),
    fundingPercentile: percentile,
    isFrothy: z > 2.2 || percentile >= 95,
    isSeverelyNegative: z < -1.8 || percentile <= 5,
  };
}

/**
 * Mandatory Liquidity-Quality Gate Filter
 * Enforces:
 * 1. 24h Turnover >= $2,000,000 (configurable)
 * 2. Spread <= 15 bps
 * 3. Bid/Ask Depth at ±0.5% >= $25,000
 * 4. Estimated Market Impact for $10k clip <= 0.20%
 *
 * @param {Object} ticker Ticker object containing turnover24h, lastPrice, etc.
 * @param {Object} orderbook Orderbook snapshot { bids: [[p, s], ...], asks: [[p, s], ...] }
 * @param {Object} config Configurable thresholds
 * @returns {{ passesGate: boolean, rejectionReason: string|null, metrics: Object }}
 */
export function computeLiquidityQuality(ticker, orderbook, config = {}) {
  const minTurnoverUsd = config.minTurnoverUsd ?? 2000000;
  const maxSpreadBps = config.maxSpreadBps ?? 15.0;
  const minDepth05Usd = config.minDepth05Usd ?? 25000;
  const maxImpactPct = config.maxImpactPct ?? 0.2;

  const turnover = Number(ticker?.turnover24h || ticker?.amount24 || 0);
  if (turnover < minTurnoverUsd) {
    return {
      passesGate: false,
      rejectionReason: `TURNOVER_BELOW_THRESHOLD ($${Math.round(turnover).toLocaleString()} < $${minTurnoverUsd.toLocaleString()})`,
      metrics: { turnover, spreadBps: null, depth05Usd: null, marketImpactPct: null },
    };
  }

  const bids = orderbook?.bids || [];
  const asks = orderbook?.asks || [];

  if (bids.length === 0 || asks.length === 0) {
    // If orderbook is temporarily unavailable, allow pass only if turnover is robust (> $10M)
    const fallbackPass = turnover >= 10000000;
    return {
      passesGate: fallbackPass,
      rejectionReason: fallbackPass ? null : 'ORDERBOOK_DEPTH_UNAVAILABLE',
      metrics: { turnover, spreadBps: null, depth05Usd: null, marketImpactPct: null },
    };
  }

  const bestBid = parseFloat(bids[0][0]);
  const bestAsk = parseFloat(asks[0][0]);
  const midPrice = (bestBid + bestAsk) / 2;

  if (midPrice <= 0) {
    return {
      passesGate: false,
      rejectionReason: 'INVALID_MID_PRICE',
      metrics: { turnover, spreadBps: 999, depth05Usd: 0, marketImpactPct: 99 },
    };
  }

  const spreadBps = Number((((bestAsk - bestBid) / midPrice) * 10000).toFixed(2));
  if (spreadBps > maxSpreadBps) {
    return {
      passesGate: false,
      rejectionReason: `SPREAD_EXCEEDS_MAX (${spreadBps} bps > ${maxSpreadBps} bps)`,
      metrics: { turnover, spreadBps, depth05Usd: 0, marketImpactPct: 0 },
    };
  }

  // Calculate Depth within ±0.5%
  const bidThreshold = bestBid * 0.995;
  const askThreshold = bestAsk * 1.005;

  let bidDepth05 = 0;
  for (const b of bids) {
    const p = parseFloat(b[0]);
    const sz = parseFloat(b[1]);
    if (p >= bidThreshold) {
      bidDepth05 += p * sz;
    } else {
      break;
    }
  }

  let askDepth05 = 0;
  for (const a of asks) {
    const p = parseFloat(a[0]);
    const sz = parseFloat(a[1]);
    if (p <= askThreshold) {
      askDepth05 += p * sz;
    } else {
      break;
    }
  }

  const minSideDepth = Math.min(bidDepth05, askDepth05);
  if (minSideDepth < minDepth05Usd) {
    return {
      passesGate: false,
      rejectionReason: `INSUFFICIENT_0.5PCT_DEPTH ($${Math.round(minSideDepth).toLocaleString()} < $${minDepth05Usd.toLocaleString()})`,
      metrics: { turnover, spreadBps, depth05Usd: Math.round(minSideDepth), marketImpactPct: null },
    };
  }

  // Estimated Market Impact for $10K clip
  let filledClip = 0;
  let weightedPriceSum = 0;
  for (const a of asks) {
    const p = parseFloat(a[0]);
    const sz = parseFloat(a[1]);
    const notional = p * sz;
    const takeNotional = Math.min(notional, 10000 - filledClip);
    weightedPriceSum += p * takeNotional;
    filledClip += takeNotional;
    if (filledClip >= 10000) break;
  }

  const avgFillPrice = filledClip > 0 ? weightedPriceSum / filledClip : bestAsk;
  const marketImpactPct = Number((((avgFillPrice - bestAsk) / bestAsk) * 100).toFixed(4));

  if (marketImpactPct > maxImpactPct) {
    return {
      passesGate: false,
      rejectionReason: `MARKET_IMPACT_TOO_HIGH (${marketImpactPct}% > ${maxImpactPct}%)`,
      metrics: { turnover, spreadBps, depth05Usd: Math.round(minSideDepth), marketImpactPct },
    };
  }

  return {
    passesGate: true,
    rejectionReason: null,
    metrics: {
      turnover: Math.round(turnover),
      spreadBps,
      depth05Usd: Math.round(minSideDepth),
      marketImpactPct,
    },
  };
}

/**
 * Calculates a deterministic, versioned Base Price (base_price_v1)
 * Defined as the Volume-Weighted Average Price (VWAP) across the preceding 12-bar consolidation window.
 *
 * @param {Array<Array<number|string>>} candles Array of candles [ts, o, h, l, c, v]
 * @param {number} windowBars Lookback window (default 12 bars)
 * @returns {{ basePrice: number, basePriceVersion: string, basePriceTimestamp: number }}
 */
export function calculateDeterministicBasePrice(candles, windowBars = 12) {
  if (!candles || candles.length === 0) {
    return { basePrice: 0, basePriceVersion: 'base_price_v1', basePriceTimestamp: Date.now() };
  }

  const isDescending = Number(candles[0][0]) > Number(candles[candles.length - 1][0]);
  const sorted = isDescending ? [...candles].reverse() : candles;

  const window = sorted.slice(-Math.min(sorted.length, windowBars));
  let sumPv = 0;
  let sumV = 0;

  for (const c of window) {
    const high = parseFloat(c[2]);
    const low = parseFloat(c[3]);
    const close = parseFloat(c[4]);
    const vol = parseFloat(c[5]) || 1;

    // Typical price (H + L + C) / 3
    const typicalPrice = (high + low + close) / 3;
    sumPv += typicalPrice * vol;
    sumV += vol;
  }

  const basePrice = sumV > 0 ? sumPv / sumV : parseFloat(window[window.length - 1][4]);
  const lastTs = Number(window[window.length - 1][0]) || Date.now();

  return {
    basePrice: Number(basePrice.toFixed(6)),
    basePriceVersion: 'base_price_v1',
    basePriceTimestamp: lastTs,
  };
}
