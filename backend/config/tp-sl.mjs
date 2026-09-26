/**
 * 🦅 EAGLE FLASH — Centralized Dynamic TP/SL & Strategy Combination Configuration
 * Production Single Source of Truth for:
 * - ATR multiplier & stop clamps
 * - 12 Strategy TP multiplier profiles (in units of R)
 * - Deterministic strategy priority ranking
 * - Combination adjustments & bounds
 * - Entry quality & chase risk thresholds
 * - Trailing stop rules
 */

export const TPSL_CONFIG = {
  version: 'v1.0',

  // 1. ATR Stop Loss Parameters
  atr: {
    period: 14,
    timeframe: '15m',
    stopMultiplier: 1.5,
    minSlDistancePct: 2.0, // Minimum protective stop distance: 2.0%
    maxSlDistancePct: 3.5, // Maximum protective stop distance: 3.5%
    structureBufferPct: 0.2, // 20 bps buffer beyond structural swing high/low
  },

  // 2. Deterministic Strategy Priority Hierarchy
  // Exhaustion and squeezes take precedence over momentum and baseline expansions.
  strategyPriority: [
    'EXHAUSTION',
    'REVERSAL_WATCH',
    'SHORT_SQUEEZE',
    'LONG_SQUEEZE',
    'BREAKOUT_RETEST',
    'BREAKOUT',
    'QUICK_PUMP',
    'EARLY_IGNITION',
    'ACCUMULATION',
    'LEVERAGE_EXPANSION',
    'VOLUME_EXPLOSION',
    'OI_DIVERGENCE',
  ],

  // 3. Strategy Base TP Multiplier Profiles (Units of R)
  // TP = ENTRY ± R * multiplier
  strategyProfiles: {
    EARLY_IGNITION: {
      tp1R: 1.0,
      tp2R: 2.0,
      tp3R: 3.0,
      description: 'Price, OI, and Volume accelerating early in cycle',
    },
    QUICK_PUMP: {
      tp1R: 0.8,
      tp2R: 1.6,
      tp3R: 2.5,
      description: 'Rapid price velocity and high RVOL; tighter initial scale-out',
    },
    BREAKOUT: {
      tp1R: 1.0,
      tp2R: 2.0,
      tp3R: 3.0,
      description: 'Key level breach with volume and OI expansion',
    },
    BREAKOUT_RETEST: {
      tp1R: 1.0,
      tp2R: 2.0,
      tp3R: 3.5,
      description: 'Retest of breakout level holding with structural confirmation',
    },
    LEVERAGE_EXPANSION: {
      tp1R: 1.0,
      tp2R: 2.0,
      tp3R: 3.0,
      description: 'Aggressive derivatives open interest buildup with directional bias',
    },
    SHORT_SQUEEZE: {
      tp1R: 0.8,
      tp2R: 1.8,
      tp3R: 3.0,
      description: 'Forced short liquidation expansion with rapid initial impulse',
    },
    LONG_SQUEEZE: {
      tp1R: 0.8,
      tp2R: 1.8,
      tp3R: 3.0,
      description: 'Cascade long liquidations pushing downward impulse',
    },
    ACCUMULATION: {
      tp1R: 1.5,
      tp2R: 2.5,
      tp3R: 4.0,
      description: 'Extended compression range breakout with expansive reward profile',
    },
    VOLUME_EXPLOSION: {
      tp1R: 1.0,
      tp2R: 2.0,
      tp3R: 3.0,
      description: 'Extreme volume Z-score and RVOL breakout impulse',
    },
    OI_DIVERGENCE: {
      tp1R: 0.8,
      tp2R: 1.5,
      tp3R: 2.2,
      description: 'Price trend divergent from positioning flow; cautious scale-out',
    },
    EXHAUSTION: {
      tp1R: 0.5,
      tp2R: 1.0,
      tp3R: 1.5,
      description: 'Overextended price or funding extreme; tight conservative targets',
    },
    REVERSAL_WATCH: {
      tp1R: 1.0,
      tp2R: 2.0,
      tp3R: 3.0,
      description: 'Structural exhaustion confirmed with counter-trend reversal order flow',
    },
  },

  // 4. Secondary Strategy Combination Confluence Adjustments
  combinationAdjustments: {
    // When strong breakout accompanies secondary strategy: extend target 3 by up to +0.5R
    strongBreakoutBonusR: 0.5,
    // When volume explosion accompanies secondary strategy: extend target 2 by +0.2R, target 3 by +0.3R
    volumeExplosionBonusR: 0.3,
    // When exhaustion or divergence is present in secondary: penalize target 3 by -0.5R
    exhaustionPenaltyR: -0.5,
    // Hard boundary clamps for multipliers to avoid unrealistic targets
    minTp1R: 0.5,
    maxTp1R: 1.8,
    minTp2R: 1.0,
    maxTp2R: 3.0,
    minTp3R: 1.5,
    maxTp3R: 5.0,
  },

  // 5. Entry Quality & Chase Risk Calibration
  qualityThresholds: {
    // Distance from 15m breakout price or EMA20/VWAP as fraction of ATR
    excellentMaxAtrDist: 0.8, // within 0.8 ATR of breakout
    goodMaxAtrDist: 1.5,      // within 1.5 ATR of breakout
    fairMaxAtrDist: 2.2,      // within 2.2 ATR of breakout
    // Beyond 2.2 ATR is POOR (chasing)
  },

  chaseRiskThresholds: {
    lowMaxPriceRunPct: 2.5,     // price ran < 2.5% in 5m
    mediumMaxPriceRunPct: 5.0,  // price ran 2.5% - 5.0%
    highMaxPriceRunPct: 8.0,    // price ran 5.0% - 8.0%
    // > 8.0% in 5m is EXTREME chase risk
  },

  // 6. Trailing Stop Management State Rules
  trailingRules: {
    moveStopToEntryOnTp1: true,
    moveStopToTp1OnTp2: true,
    closeOnTp3: true,
    stopFirstConservativeRule: true,
  },
};
