/**
 * SIGMA — High-Performance Technical & Order-Flow Indicators
 */

import { Candle, OrderBookDepth } from '../types';

/**
 * Exponential Moving Average
 */
export function calcEMA(values: number[], period: number): number[] {
  if (!values || values.length < period) return [];
  const k = 2 / (period + 1);
  const result: number[] = new Array(values.length).fill(NaN);

  // Initial SMA
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  result[period - 1] = sum / period;

  // Smoothing
  for (let i = period; i < values.length; i++) {
    result[i] = values[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

/**
 * Average True Range (ATR)
 */
export function calcATR(candles: Candle[], period = 14): number[] {
  if (!candles || candles.length < period + 1) return [];
  const tr: number[] = [candles[0].high - candles[0].low];

  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    tr.push(Math.max(hl, hc, lc));
  }

  const atr: number[] = new Array(candles.length).fill(NaN);
  let trSum = 0;
  for (let i = 0; i < period; i++) trSum += tr[i];
  atr[period - 1] = trSum / period;

  for (let i = period; i < candles.length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }
  return atr;
}

/**
 * Relative Strength Index (RSI)
 */
export function calcRSI(closes: number[], period = 14): number[] {
  if (!closes || closes.length < period + 1) return [];
  const rsi: number[] = new Array(closes.length).fill(NaN);

  let gainSum = 0;
  let lossSum = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gainSum += diff;
    else lossSum += Math.abs(diff);
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi[period] = 100 - 100 / (1 + rs);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi[i] = 100 - 100 / (1 + rs);
  }
  return rsi;
}

/**
 * Volume Weighted Average Price (VWAP)
 */
export function calcVWAP(candles: Candle[]): number[] {
  if (!candles || candles.length === 0) return [];
  const vwap: number[] = [];
  let cumVol = 0;
  let cumVolPrice = 0;

  for (const c of candles) {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumVolPrice += typicalPrice * c.volume;
    cumVol += c.volume;
    vwap.push(cumVol === 0 ? typicalPrice : cumVolPrice / cumVol);
  }
  return vwap;
}

/**
 * Cumulative Volume Delta (CVD)
 */
export function calcCVD(candles: Candle[]): { cvdSeries: number[]; currentCvd: number } {
  if (!candles || candles.length === 0) return { cvdSeries: [], currentCvd: 0 };
  const cvdSeries: number[] = [];
  let runningCvd = 0;

  for (const c of candles) {
    // If buyVolume/sellVolume provided, use exact delta; else proxy from candle body vs wick
    let delta = 0;
    if (c.buyVolume !== undefined && c.sellVolume !== undefined) {
      delta = c.buyVolume - c.sellVolume;
    } else {
      const range = c.high - c.low;
      const body = c.close - c.open;
      const factor = range > 0 ? body / range : 0;
      delta = c.volume * factor;
    }
    runningCvd += delta;
    cvdSeries.push(runningCvd);
  }

  return {
    cvdSeries,
    currentCvd: runningCvd,
  };
}

/**
 * Order Book Imbalance Calculation at Depth Thresholds
 */
export function computeOrderBookImbalance(bids: [number, number][], asks: [number, number][], midPrice: number) {
  // bids: [price, size], asks: [price, size]
  const thresholds = [
    { name: '5bps', bps: 0.0005 },
    { name: '10bps', bps: 0.001 },
    { name: '25bps', bps: 0.0025 },
    { name: '50bps', bps: 0.005 },
  ];

  const results: Record<string, { bidQty: number; askQty: number; imbalance: number }> = {};

  for (const t of thresholds) {
    const minBidPrice = midPrice * (1 - t.bps);
    const maxAskPrice = midPrice * (1 + t.bps);

    let bidQty = 0;
    for (const [p, s] of bids) {
      if (p >= minBidPrice) bidQty += s;
      else break;
    }

    let askQty = 0;
    for (const [p, s] of asks) {
      if (p <= maxAskPrice) askQty += s;
      else break;
    }

    const total = bidQty + askQty;
    const imbalance = total > 0 ? Number(((bidQty - askQty) / total).toFixed(3)) : 0;

    results[`depth${t.name}`] = {
      bidQty: Number(bidQty.toFixed(3)),
      askQty: Number(askQty.toFixed(3)),
      imbalance,
    };
  }

  return results;
}

/**
 * Detects Key Support and Resistance Structures from Candle Clustered Pivots
 */
export function findKeyStructuralLevels(candles: Candle[], window = 10): {
  nearestSupport: number;
  nearestResistance: number;
  recentSwingHigh: number;
  recentSwingLow: number;
} {
  if (!candles || candles.length < window * 2) {
    const lastPrice = candles[candles.length - 1]?.close || 70000;
    return {
      nearestSupport: lastPrice * 0.98,
      nearestResistance: lastPrice * 1.02,
      recentSwingHigh: lastPrice * 1.03,
      recentSwingLow: lastPrice * 0.97,
    };
  }

  const currentPrice = candles[candles.length - 1].close;
  const swingHighs: number[] = [];
  const swingLows: number[] = [];

  for (let i = window; i < candles.length - window; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - window; j <= i + window; j++) {
      if (candles[j].high > candles[i].high) isHigh = false;
      if (candles[j].low < candles[i].low) isLow = false;
    }
    if (isHigh) swingHighs.push(candles[i].high);
    if (isLow) swingLows.push(candles[i].low);
  }

  // Find nearest levels
  const supports = swingLows.filter((p) => p < currentPrice).sort((a, b) => b - a);
  const resistances = swingHighs.filter((p) => p > currentPrice).sort((a, b) => a - b);

  return {
    nearestSupport: supports[0] || currentPrice * 0.985,
    nearestResistance: resistances[0] || currentPrice * 1.015,
    recentSwingHigh: Math.max(...candles.slice(-30).map((c) => c.high)),
    recentSwingLow: Math.min(...candles.slice(-30).map((c) => c.low)),
  };
}
