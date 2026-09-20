/**
 * 🦅 EAGLE FLASH — Multi-Timeframe Feature Engine
 * Quantitative feature extraction: Timeframe-correct RVOL, Volume Z-Score, Trade Acceleration,
 * Taker Imbalance, and Volatility Expansion.
 */

import { MultiTimeframeReturns, MultiTimeframeRvol, OrderFlowIntelligence } from './types';

export class FeatureEngine {
  /**
   * Calculates timeframe-correct RVOL.
   * Compares the current window volume against the historical expected baseline for the SAME timeframe.
   * @param currentVolume Volume in current window (e.g. 5m volume)
   * @param historicalBaseline Rolling median or mean volume for the same window (e.g. median 5m volume)
   */
  public static calculateRvol(currentVolume: number, historicalBaseline: number): number {
    if (!historicalBaseline || historicalBaseline <= 0) {
      return 1.0;
    }
    const rvol = currentVolume / historicalBaseline;
    return parseFloat(Math.max(0.1, rvol).toFixed(2));
  }

  /**
   * Calculates Volume Z-Score: standard deviations away from the historical mean.
   */
  public static calculateZScore(currentVolume: number, meanVolume: number, stdDevVolume: number): number {
    if (!stdDevVolume || stdDevVolume <= 0) {
      // Robust pseudo Z-score fallback if standard deviation is zero or unprovided
      if (meanVolume > 0) {
        return parseFloat(((currentVolume / meanVolume - 1) * 2.5).toFixed(2));
      }
      return 0;
    }
    const z = (currentVolume - meanVolume) / stdDevVolume;
    return parseFloat(z.toFixed(2));
  }

  /**
   * Calculates Trade-Count Acceleration: percentage increase in trades vs moving baseline.
   */
  public static calculateTradeAcceleration(currentTrades: number, baselineTrades: number): number {
    if (!baselineTrades || baselineTrades <= 0) return 0;
    const accel = ((currentTrades - baselineTrades) / baselineTrades) * 100;
    return parseFloat(accel.toFixed(1));
  }

  /**
   * Calculates Taker Order Flow Imbalance (-100% to +100%).
   * positive = buyer initiated dominance, negative = seller initiated dominance.
   */
  public static calculateTakerImbalance(takerBuyVolume: number, takerSellVolume: number): OrderFlowIntelligence {
    const total = takerBuyVolume + takerSellVolume;
    let imbalance = 0;
    if (total > 0) {
      imbalance = ((takerBuyVolume - takerSellVolume) / total) * 100;
    }
    imbalance = parseFloat(Math.max(-100, Math.min(100, imbalance)).toFixed(1));

    let dominance: OrderFlowIntelligence['flowDominance'] = 'BALANCED';
    if (imbalance >= 35) dominance = 'STRONG_BUY';
    else if (imbalance >= 15) dominance = 'MODERATE_BUY';
    else if (imbalance <= -35) dominance = 'STRONG_SELL';
    else if (imbalance <= -15) dominance = 'MODERATE_SELL';

    return {
      takerBuyVolumeUsd: takerBuyVolume,
      takerSellVolumeUsd: takerSellVolume,
      takerImbalancePct: imbalance,
      cvdDeltaUsd: takerBuyVolume - takerSellVolume,
      flowDominance: dominance,
    };
  }

  /**
   * Evaluates Price Acceleration (second derivative of price).
   */
  public static calculatePriceAcceleration(returnShort: number, returnMedium: number): number {
    // If 5m return is +4% and 15m return is +5% (which means 5m pace is ~3x faster),
    // acceleration is strong.
    const normalized5mRate = returnShort * 3; // 3 x 5m in 15m
    const diff = normalized5mRate - returnMedium;
    return parseFloat(diff.toFixed(2));
  }

  /**
   * Calculates Market Breadth Metrics across the entire active universe.
   */
  public static calculateMarketBreadth(symbols: Array<{ price24hChange: number; turnover24h: number }>): {
    advancingCount: number;
    decliningCount: number;
    advancingPct: number;
    decliningPct: number;
    volumeWeightedBreadthPct: number;
  } {
    if (!symbols || symbols.length === 0) {
      return { advancingCount: 0, decliningCount: 0, advancingPct: 50, decliningPct: 50, volumeWeightedBreadthPct: 50 };
    }

    let advancingCount = 0;
    let decliningCount = 0;
    let advancingTurnover = 0;
    let totalTurnover = 0;

    for (const s of symbols) {
      const change = s.price24hChange || 0;
      const turn = s.turnover24h || 0;
      totalTurnover += turn;
      if (change > 0) {
        advancingCount++;
        advancingTurnover += turn;
      } else if (change < 0) {
        decliningCount++;
      }
    }

    const advancingPct = Math.round((advancingCount / symbols.length) * 100);
    const decliningPct = Math.round((decliningCount / symbols.length) * 100);
    const volumeWeightedBreadthPct = totalTurnover > 0 ? Math.round((advancingTurnover / totalTurnover) * 100) : advancingPct;

    return {
      advancingCount,
      decliningCount,
      advancingPct,
      decliningPct,
      volumeWeightedBreadthPct,
    };
  }
}
