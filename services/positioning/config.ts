/**
 * SIGMA — BTC Price × OI Positioning Engine Configuration
 * All analytical parameters and thresholds are centralized here.
 * Zero hardcoded magic numbers inside UI or evaluation algorithms.
 */

export interface PositioningConfig {
  priceDeltaThresholds: {
    '1m': number;
    '5m': number;
    '15m': number;
    '30m': number;
    '1h': number;
    '4h': number;
  };
  oiDeltaThresholds: {
    '5m': number;
    '15m': number;
    '1h': number;
    '4h': number;
  };
  oiIntensityThresholds: {
    elevatedPct: number;
    highPct: number;
    extremePct: number;
    extremeZScore: number;
  };
  rvolThresholds: {
    confirmed: number;
    neutral: number;
    weak: number;
  };
  takerDominanceThresholds: {
    longConfirmedPct: number;
    shortConfirmedPct: number;
  };
  liquidationThresholds: {
    minVolumeUsd: number;
    dominantRatio: number;
  };
  fundingThresholds: {
    baselineMin: number;
    baselineMax: number;
    crowdedLong: number;
    crowdedShort: number;
  };
  dataQuality: {
    maxFreshnessMs: number;
    staleCutoffMs: number;
  };
}

export const POSITIONING_CONFIG: PositioningConfig = {
  priceDeltaThresholds: {
    '1m': 0.08,  // 0.08%
    '5m': 0.20,  // 0.20%
    '15m': 0.40, // 0.40%
    '30m': 0.65, // 0.65%
    '1h': 0.90,  // 0.90%
    '4h': 1.60,  // 1.60%
  },
  oiDeltaThresholds: {
    '5m': 0.35,  // 0.35%
    '15m': 0.80, // 0.80%
    '1h': 1.60,  // 1.60%
    '4h': 3.20,  // 3.20%
  },
  oiIntensityThresholds: {
    elevatedPct: 1.5,
    highPct: 3.5,
    extremePct: 6.0,
    extremeZScore: 3.0,
  },
  rvolThresholds: {
    confirmed: 1.8,
    neutral: 1.0,
    weak: 0.85,
  },
  takerDominanceThresholds: {
    longConfirmedPct: 54.0,  // >= 54% taker buyer volume
    shortConfirmedPct: 46.0, // <= 46% taker buyer volume (>= 54% sellers)
  },
  liquidationThresholds: {
    minVolumeUsd: 1500000,   // $1.5M minimum 1h liquidations to register cascade
    dominantRatio: 0.65,     // 65% of liquidations on one side
  },
  fundingThresholds: {
    baselineMin: -0.005,
    baselineMax: 0.015,
    crowdedLong: 0.035,      // Overcrowded long funding carry drag
    crowdedShort: -0.015,    // Extreme negative funding squeeze setup
  },
  dataQuality: {
    maxFreshnessMs: 5000,
    staleCutoffMs: 15000,    // 15 seconds stale cutoff
  },
};
