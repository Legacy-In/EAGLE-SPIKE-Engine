import { NormalizedTicker, SpikePhase, SpikeQuality, SpikeType } from '../types';

export class ScannerMathEngine {
  /**
   * Calculates Relative Volume (RVOL)
   */
  public static calculateRvol(currentVol: number, baselineVol: number): number {
    if (!baselineVol || baselineVol <= 0) return 1.0;
    return parseFloat(Math.max(0.1, currentVol / baselineVol).toFixed(2));
  }

  /**
   * Calculates Volume Z-Score
   */
  public static calculateZScore(vol: number, mean: number, stdDev: number): number {
    if (!stdDev || stdDev <= 0) return 0.0;
    return parseFloat(((vol - mean) / stdDev).toFixed(2));
  }

  /**
   * Standardized Multi-Factor Eagle Score (0 to 100)
   * Factors:
   * - RVOL Weight: 25%
   * - Volume Z-Score Weight: 20%
   * - Price Momentum (Returns): 20%
   * - OI Acceleration / Delta: 20%
   * - Taker Flow / Imbalance: 15%
   */
  public static calculateEagleScore(ticker: NormalizedTicker): number {
    let score = 50; // Baseline neutral

    // 1. RVOL Contribution (0 to 25 pts)
    const rvol = ticker.relativeVolume || 1.0;
    if (rvol >= 3.0) score += 25;
    else if (rvol >= 2.0) score += 18;
    else if (rvol >= 1.5) score += 12;
    else if (rvol >= 1.2) score += 6;
    else if (rvol < 0.7) score -= 8;

    // 2. Volume Z-Score Contribution (0 to 20 pts)
    const z = ticker.volumeZScore || 0;
    if (z >= 3.0) score += 20;
    else if (z >= 2.0) score += 15;
    else if (z >= 1.0) score += 8;
    else if (z < -1.0) score -= 6;

    // 3. Price Velocity & Directional Momentum (0 to 20 pts)
    const abs5m = Math.abs(ticker.returns5m || 0);
    const abs24h = Math.abs(ticker.price24hChange || 0);
    if (abs5m >= 2.0 || abs24h >= 10.0) score += 20;
    else if (abs5m >= 1.0 || abs24h >= 5.0) score += 14;
    else if (abs5m >= 0.4 || abs24h >= 2.0) score += 8;

    // 4. Open Interest Acceleration (0 to 20 pts)
    const oiDelta = ticker.oiChangePct || 0;
    if (oiDelta >= 5.0) score += 20;
    else if (oiDelta >= 3.0) score += 15;
    else if (oiDelta >= 1.5) score += 8;
    else if (oiDelta < -3.0) score += 5; // Long liquidation / short squeeze signal

    // 5. Taker Imbalance Dominance (0 to 15 pts)
    const taker = Math.abs(ticker.takerImbalance || 0);
    if (taker >= 40) score += 15;
    else if (taker >= 20) score += 10;
    else if (taker >= 10) score += 5;

    // Penalty for illiquidity or extreme spread
    if (ticker.turnover24h < 500000) score -= 15;
    if (ticker.spreadPct > 0.15) score -= 10;

    return Math.max(10, Math.min(99, Math.round(score)));
  }

  /**
   * Evaluates lifecycle phase of a spike
   */
  public static classifySpikePhase(ticker: NormalizedTicker): SpikePhase {
    const rvol = ticker.relativeVolume || 1.0;
    const abs5m = Math.abs(ticker.returns5m || 0);
    const z = ticker.volumeZScore || 0;

    if (rvol >= 3.0 && z >= 3.0 && abs5m >= 3.0) return 'BLOW_OFF';
    if (rvol >= 2.2 && z >= 2.0 && abs5m >= 1.5) return 'ACCELERATION';
    if (rvol >= 1.8 && abs5m >= 0.8) return 'BREAKOUT';
    if (rvol >= 1.4 && abs5m < 0.6) return 'PRE_SPIKE';
    if (rvol < 1.0 && ticker.spikePhase === 'ACCELERATION') return 'COOLING';
    return 'NORMAL';
  }

  /**
   * Classifies the structural archetype of the spike
   */
  public static classifySpikeType(ticker: NormalizedTicker): SpikeType {
    const pChange = ticker.price24hChange || 0;
    const oiDelta = ticker.oiChangePct || 0;
    const funding = ticker.fundingRate || 0;

    // Price ↑ + OI ↓ = Short Squeeze
    if (pChange > 3.0 && oiDelta < -1.0) return 'SHORT_SQUEEZE';
    // Price ↓ + OI ↓ = Long Liquidation
    if (pChange < -3.0 && oiDelta < -1.0) return 'LONG_LIQUIDATION';
    // Price ↑ + OI ↑ = Volume Breakout
    if (pChange > 2.0 && oiDelta > 1.5) return 'VOLUME_BREAKOUT';
    // Strong momentum with high RVOL
    if (ticker.relativeVolume >= 2.0) return 'MOMENTUM_SPIKE';
    return 'VOLUME_BREAKOUT';
  }

  /**
   * Evaluates signal quality / conviction
   */
  public static classifySpikeQuality(ticker: NormalizedTicker): SpikeQuality {
    const spread = ticker.spreadPct || 0;
    const turnover = ticker.turnover24h || 0;
    const rvol = ticker.relativeVolume || 1.0;

    if (spread > 0.12 || turnover < 300000) return 'CHOP';
    if (ticker.rsi > 85 || ticker.rsi < 15) return 'EXHAUSTION_RISK';
    if (rvol >= 2.5 && ticker.signalScore >= 75) return 'HIGH_CONVICTION';
    if (rvol >= 1.8) return 'CLEAN_BREAKOUT';
    return 'CLEAN_BREAKOUT';
  }
}
