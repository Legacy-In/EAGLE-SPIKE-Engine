/**
 * 🦅 EAGLE FLASH — Order Book, Open Interest & Derivatives Intelligence
 */

import {
  DerivativesIntelligence,
  FundingState,
  LiquidationDominance,
  OrderBookMetrics,
} from './types';

export class DerivativesOrderBookEngine {
  /**
   * Evaluates Order Book Depth Imbalance and Bid/Ask Walls.
   */
  public static calculateOrderBookMetrics(
    bids: Array<[number, number]>, // [price, size]
    asks: Array<[number, number]>,
    midPrice: number
  ): OrderBookMetrics {
    if (!bids || bids.length === 0 || !asks || asks.length === 0 || midPrice <= 0) {
      return {
        bestBid: midPrice,
        bestAsk: midPrice,
        midPrice,
        spreadBps: 1.0,
        bidDepth01PctUsd: 0,
        askDepth01PctUsd: 0,
        bidDepth05PctUsd: 0,
        askDepth05PctUsd: 0,
        bidDepth1PctUsd: 0,
        askDepth1PctUsd: 0,
        depthImbalance: 0,
        largeBidWallDetected: false,
        largeAskWallDetected: false,
        lastUpdated: Date.now(),
      };
    }

    const bestBid = bids[0][0];
    const bestAsk = asks[0][0];
    const spreadBps = parseFloat((((bestAsk - bestBid) / midPrice) * 10000).toFixed(1));

    let bid01 = 0, ask01 = 0;
    let bid05 = 0, ask05 = 0;
    let bid10 = 0, ask10 = 0;

    let maxBidSizeUsd = 0;
    let maxAskSizeUsd = 0;

    for (const [p, sz] of bids) {
      const notional = p * sz;
      const distPct = Math.abs(midPrice - p) / midPrice;
      if (distPct <= 0.001) bid01 += notional;
      if (distPct <= 0.005) bid05 += notional;
      if (distPct <= 0.010) bid10 += notional;
      if (notional > maxBidSizeUsd) maxBidSizeUsd = notional;
    }

    for (const [p, sz] of asks) {
      const notional = p * sz;
      const distPct = Math.abs(p - midPrice) / midPrice;
      if (distPct <= 0.001) ask01 += notional;
      if (distPct <= 0.005) ask05 += notional;
      if (distPct <= 0.010) ask10 += notional;
      if (notional > maxAskSizeUsd) maxAskSizeUsd = notional;
    }

    const totalDepth05 = bid05 + ask05;
    const depthImbalance = totalDepth05 > 0 ? parseFloat(((bid05 - ask05) / totalDepth05).toFixed(2)) : 0;

    // Detect large wall if a single level is >= 35% of the total 0.5% depth and > $50,000
    const largeBidWallDetected = bid05 > 50000 && maxBidSizeUsd >= bid05 * 0.35;
    const largeAskWallDetected = ask05 > 50000 && maxAskSizeUsd >= ask05 * 0.35;

    return {
      bestBid,
      bestAsk,
      midPrice,
      spreadBps,
      bidDepth01PctUsd: Math.round(bid01),
      askDepth01PctUsd: Math.round(ask01),
      bidDepth05PctUsd: Math.round(bid05),
      askDepth05PctUsd: Math.round(ask05),
      bidDepth1PctUsd: Math.round(bid10),
      askDepth1PctUsd: Math.round(ask10),
      depthImbalance,
      largeBidWallDetected,
      largeAskWallDetected,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Classifies Market Structure from Price vs Open Interest relationship.
   */
  public static classifyOiStructure(
    priceChangePct: number,
    oiChangePct: number
  ): DerivativesIntelligence['oiStructure'] {
    if (Math.abs(priceChangePct) < 0.3 && Math.abs(oiChangePct) < 0.5) {
      return 'NEUTRAL';
    }

    if (priceChangePct > 0 && oiChangePct > 0) {
      return 'NEW_POSITIONING'; // Aggressive Longs entering
    }
    if (priceChangePct > 0 && oiChangePct < 0) {
      return 'POTENTIAL_SHORT_COVERING'; // Short covering / squeeze
    }
    if (priceChangePct < 0 && oiChangePct > 0) {
      return 'NEW_POSITIONING'; // Aggressive Shorts entering
    }
    if (priceChangePct < 0 && oiChangePct < 0) {
      return 'POTENTIAL_LONG_UNWINDING'; // Long liquidations / capitulation
    }

    return 'NEUTRAL';
  }

  /**
   * Evaluates Funding Rate State.
   */
  public static evaluateFundingState(fundingRate: number): FundingState {
    if (fundingRate >= 0.001) return 'EXTREME';            // >= +0.10% per 8h
    if (fundingRate >= 0.0003) return 'ELEVATED';          // >= +0.03%
    if (fundingRate <= -0.0005) return 'NEGATIVE_EXTREME'; // <= -0.05%
    return 'NORMAL';
  }

  /**
   * Classifies Liquidation Dominance based on observed/estimated liquidation volumes.
   */
  public static classifyLiquidationDominance(
    longLiqUsd: number,
    shortLiqUsd: number
  ): LiquidationDominance {
    const total = longLiqUsd + shortLiqUsd;
    if (total < 10000) return 'LOW_ACTIVITY';

    const netRatio = (shortLiqUsd - longLiqUsd) / total;
    if (netRatio >= 0.4) return 'SHORT_LIQUIDATION_DOMINANT';
    if (netRatio <= -0.4) return 'LONG_LIQUIDATION_DOMINANT';
    return 'BALANCED';
  }
}
