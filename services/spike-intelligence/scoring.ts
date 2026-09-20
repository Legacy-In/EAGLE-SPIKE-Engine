/**
 * 🦅 EAGLE FLASH — Spike Quality, Classification & Explainable Scoring Engine
 * Model Version: score_v2.1.0 | feature_version: features_v3.0.1
 */

import {
  BtcRegime,
  ScoreBreakdown,
  SpikeQualityGrade,
  SpikeType,
} from './types';

export const SCORE_VERSION = 'score_v2.1.0';
export const FEATURE_VERSION = 'features_v3.0.1';

export interface ScoringInput {
  price: number;
  returns5m: number;
  returns15m: number;
  returns24h: number;
  rvol5m: number;
  volumeZ: number;
  turnover24h: number;
  takerImbalancePct: number;
  openInterestUsd: number;
  oiChangePct: number;
  fundingRate: number;
  spreadPct: number;
  rsi: number;
  btcRegime: BtcRegime;
  dataFreshnessMs: number;
  isNear24hHigh?: boolean;
  isNear24hLow?: boolean;
}

export class ScoringEngine {
  /**
   * Calculates the Explainable Eagle Score (0 to 100) with full mathematical component breakdown.
   */
  public static calculateEagleScore(input: ScoringInput): { score: number; breakdown: ScoreBreakdown } {
    const abs5m = Math.abs(input.returns5m);
    const abs15m = Math.abs(input.returns15m);

    // 1. Price Acceleration (0 - 20 pts)
    let priceScore = 0;
    if (abs5m >= 4.0) priceScore = 20;
    else if (abs5m >= 2.5) priceScore = 16;
    else if (abs5m >= 1.5) priceScore = 12;
    else if (abs5m >= 0.8) priceScore = 8;
    else if (abs5m >= 0.3) priceScore = 4;

    // 2. Volume Confirmation (0 - 20 pts)
    let volumeScore = 0;
    if (input.volumeZ >= 4.0) volumeScore = 20;
    else if (input.volumeZ >= 3.0) volumeScore = 17;
    else if (input.volumeZ >= 2.0) volumeScore = 13;
    else if (input.volumeZ >= 1.2) volumeScore = 9;
    else if (input.volumeZ >= 0.5) volumeScore = 5;

    // 3. Relative Volume (RVOL) (0 - 20 pts)
    let rvolScore = 0;
    if (input.rvol5m >= 4.0) rvolScore = 20;
    else if (input.rvol5m >= 3.0) rvolScore = 17;
    else if (input.rvol5m >= 2.0) rvolScore = 14;
    else if (input.rvol5m >= 1.5) rvolScore = 10;
    else if (input.rvol5m >= 1.2) rvolScore = 6;

    // 4. Order Flow / Taker Imbalance (0 - 15 pts)
    let flowScore = 0;
    const isAligned = (input.returns5m >= 0 && input.takerImbalancePct > 0) || (input.returns5m < 0 && input.takerImbalancePct < 0);
    const absFlow = Math.abs(input.takerImbalancePct);
    if (isAligned) {
      if (absFlow >= 45) flowScore = 15;
      else if (absFlow >= 30) flowScore = 12;
      else if (absFlow >= 15) flowScore = 9;
      else flowScore = 6;
    } else {
      // Delta divergence penalty
      flowScore = Math.max(1, 6 - Math.round(absFlow / 10));
    }

    // 5. Open Interest Delta (0 - 10 pts)
    let oiScore = 0;
    if (input.oiChangePct >= 8.0) oiScore = 10;
    else if (input.oiChangePct >= 4.0) oiScore = 8;
    else if (input.oiChangePct >= 1.5) oiScore = 6;
    else if (input.oiChangePct >= 0) oiScore = 4;
    else oiScore = 2; // OI contraction

    // 6. Liquidity & Spread (0 - 5 pts)
    let liqScore = 0;
    if (input.turnover24h >= 5000000 && input.spreadPct <= 0.03) liqScore = 5;
    else if (input.turnover24h >= 1000000 && input.spreadPct <= 0.06) liqScore = 4;
    else if (input.turnover24h >= 300000 && input.spreadPct <= 0.12) liqScore = 3;
    else liqScore = 1;

    // 7. BTC Regime Alignment (0 - 5 pts)
    let btcScore = 3; // Neutral default
    if (input.btcRegime === 'BULLISH' && input.returns5m > 0) btcScore = 5;
    else if (input.btcRegime === 'BEARISH' && input.returns5m < 0) btcScore = 5;
    else if (input.btcRegime === 'HIGH_VOLATILITY') btcScore = 4;
    else if (input.btcRegime === 'RISK_OFF' && input.returns5m > 0) btcScore = 2;

    // 8. Data Quality & Freshness (0 - 5 pts)
    let dataScore = 5;
    if (input.dataFreshnessMs > 30000) dataScore = 1;
    else if (input.dataFreshnessMs > 10000) dataScore = 3;
    else if (input.dataFreshnessMs > 5000) dataScore = 4;

    const total = Math.min(100, priceScore + volumeScore + rvolScore + flowScore + oiScore + liqScore + btcScore + dataScore);

    const breakdown: ScoreBreakdown = {
      priceAcceleration: priceScore,
      volumeConfirmation: volumeScore,
      rvol: rvolScore,
      orderFlow: flowScore,
      openInterest: oiScore,
      liquidity: liqScore,
      btcRegime: btcScore,
      dataQuality: dataScore,
      total,
    };

    return { score: total, breakdown };
  }

  /**
   * Classifies the Spike Type based on quantitative indicators.
   */
  public static classifySpikeType(input: ScoringInput): SpikeType {
    // 1. Low Liquidity Trap
    if (input.turnover24h < 200000 || input.spreadPct > 0.18) {
      return 'LOW_LIQUIDITY';
    }

    // 2. Short Squeeze: Price up surging + OI collapsing + negative funding rate
    if (input.returns5m >= 2.0 && input.oiChangePct <= -3.0 && input.fundingRate < -0.0001) {
      return 'SHORT_SQUEEZE';
    }

    // 3. Long Squeeze: Price down + OI collapsing + positive high funding rate
    if (input.returns5m <= -2.0 && input.oiChangePct <= -3.0 && input.fundingRate > 0.0003) {
      return 'LONG_SQUEEZE';
    }

    // 4. Volume Explosion: RVOL >= 3.5x + Volume Z >= 3.5
    if (input.rvol5m >= 3.5 && input.volumeZ >= 3.5) {
      return 'VOLUME_EXPLOSION';
    }

    // 5. Breakout: Near 24h High/Low with strong volume
    if ((input.isNear24hHigh || input.isNear24hLow) && input.rvol5m >= 2.0) {
      return 'BREAKOUT';
    }

    // 6. Exhaustion: High volume with stalled return or extreme RSI
    if (input.rvol5m >= 2.5 && (input.rsi > 82 || input.rsi < 18)) {
      return 'EXHAUSTION';
    }

    // 7. Accumulation: High volume with tight price move
    if (input.rvol5m >= 2.2 && Math.abs(input.returns5m) < 0.6 && input.oiChangePct >= 2.0) {
      return 'ACCUMULATION';
    }

    // 8. Momentum: Steady price velocity and positive taker flow
    if (Math.abs(input.returns5m) >= 1.8 && Math.abs(input.takerImbalancePct) >= 20) {
      return 'MOMENTUM';
    }

    // 9. Reversal
    if ((input.returns24h < -5 && input.returns5m > 2) || (input.returns24h > 5 && input.returns5m < -2)) {
      return 'REVERSAL';
    }

    return input.rvol5m >= 1.5 ? 'MOMENTUM' : 'UNKNOWN';
  }

  /**
   * Evaluates the Spike Quality Grade.
   */
  public static evaluateSpikeQuality(input: ScoringInput): {
    quality: SpikeQualityGrade;
    triggerReasons: string[];
    riskFlags: string[];
  } {
    const triggerReasons: string[] = [];
    const riskFlags: string[] = [];

    // Trigger checks
    if (input.rvol5m >= 2.0) triggerReasons.push(`Elevated RVOL (${input.rvol5m.toFixed(2)}x)`);
    if (input.volumeZ >= 2.5) triggerReasons.push(`Volume Z-Score anomaly (+${input.volumeZ.toFixed(2)}σ)`);
    if (Math.abs(input.takerImbalancePct) >= 25) {
      triggerReasons.push(`Taker order flow imbalance (${input.takerImbalancePct > 0 ? '+' : ''}${input.takerImbalancePct.toFixed(1)}%)`);
    }
    if (input.oiChangePct >= 4.0) triggerReasons.push(`Open interest expansion (+${input.oiChangePct.toFixed(1)}%)`);
    if (Math.abs(input.returns5m) >= 2.0) triggerReasons.push(`5M velocity expansion (${input.returns5m > 0 ? '+' : ''}${input.returns5m.toFixed(2)}%)`);
    if (input.spreadPct <= 0.04) triggerReasons.push('Tight institutional spread');

    // Risk checks
    if (input.turnover24h < 300000) riskFlags.push('Low 24H Turnover (<$300K)');
    if (input.spreadPct > 0.12) riskFlags.push(`Wide bid-ask spread (${input.spreadPct.toFixed(2)}%)`);
    if (input.rsi >= 82) riskFlags.push(`Overbought RSI (${input.rsi})`);
    if (input.rsi <= 18) riskFlags.push(`Oversold RSI (${input.rsi})`);
    if (Math.abs(input.fundingRate) >= 0.001) riskFlags.push(`Extreme funding rate (${(input.fundingRate * 100).toFixed(3)}%)`);
    if (input.dataFreshnessMs > 25000) riskFlags.push('Stale market data');

    // Delta Divergence check
    const isBull = input.returns5m > 0;
    if (isBull && input.takerImbalancePct < -20) {
      riskFlags.push('Bearish Delta Divergence (Price rising on net selling)');
    } else if (!isBull && input.takerImbalancePct > 20) {
      riskFlags.push('Bullish Delta Divergence (Price falling on net buying)');
    }

    // Quality Determination
    if (input.dataFreshnessMs > 45000) {
      return { quality: 'INSUFFICIENT_DATA', triggerReasons, riskFlags };
    }

    if (riskFlags.some((f) => f.includes('Delta Divergence') || f.includes('Overbought') || f.includes('Oversold'))) {
      return { quality: 'EXHAUSTION_RISK', triggerReasons, riskFlags };
    }

    if (input.rvol5m >= 2.2 && input.volumeZ >= 2.0 && triggerReasons.length >= 3 && riskFlags.length === 0) {
      return { quality: 'HIGH', triggerReasons, riskFlags };
    }

    if (triggerReasons.length >= 2 && riskFlags.length <= 1) {
      return { quality: 'MEDIUM', triggerReasons, riskFlags };
    }

    return { quality: 'LOW', triggerReasons, riskFlags };
  }
}
