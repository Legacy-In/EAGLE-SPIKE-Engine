/**
 * 🦅 EAGLE FLASH — TypeScript Typed Strategy Combination & Dynamic TP/SL Configuration
 */

export interface StrategyTpProfile {
  tp1R: number;
  tp2R: number;
  tp3R: number;
  description: string;
}

export type StrategyCategory =
  | 'EARLY_IGNITION'
  | 'QUICK_PUMP'
  | 'BREAKOUT'
  | 'BREAKOUT_RETEST'
  | 'LEVERAGE_EXPANSION'
  | 'SHORT_SQUEEZE'
  | 'LONG_SQUEEZE'
  | 'ACCUMULATION'
  | 'VOLUME_EXPLOSION'
  | 'OI_DIVERGENCE'
  | 'EXHAUSTION'
  | 'REVERSAL_WATCH';

export type EntryQualityGrade = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNAVAILABLE';
export type ChaseRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

export const TPSL_CONFIG = {
  version: 'v1.0',
  atr: {
    period: 14,
    timeframe: '15m',
    stopMultiplier: 1.5,
    minSlDistancePct: 2.0,
    maxSlDistancePct: 3.5,
    structureBufferPct: 0.2,
  },
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
  ] as StrategyCategory[],
  strategyProfiles: {
    EARLY_IGNITION: { tp1R: 1.0, tp2R: 2.0, tp3R: 3.0, description: 'Price, OI, and Volume accelerating early in cycle' },
    QUICK_PUMP: { tp1R: 0.8, tp2R: 1.6, tp3R: 2.5, description: 'Rapid price velocity and high RVOL; tighter initial scale-out' },
    BREAKOUT: { tp1R: 1.0, tp2R: 2.0, tp3R: 3.0, description: 'Key level breach with volume and OI expansion' },
    BREAKOUT_RETEST: { tp1R: 1.0, tp2R: 2.0, tp3R: 3.5, description: 'Retest of breakout level holding with structural confirmation' },
    LEVERAGE_EXPANSION: { tp1R: 1.0, tp2R: 2.0, tp3R: 3.0, description: 'Aggressive derivatives open interest buildup with directional bias' },
    SHORT_SQUEEZE: { tp1R: 0.8, tp2R: 1.8, tp3R: 3.0, description: 'Forced short liquidation expansion with rapid initial impulse' },
    LONG_SQUEEZE: { tp1R: 0.8, tp2R: 1.8, tp3R: 3.0, description: 'Cascade long liquidations pushing downward impulse' },
    ACCUMULATION: { tp1R: 1.5, tp2R: 2.5, tp3R: 4.0, description: 'Extended compression range breakout with expansive reward profile' },
    VOLUME_EXPLOSION: { tp1R: 1.0, tp2R: 2.0, tp3R: 3.0, description: 'Extreme volume Z-score and RVOL breakout impulse' },
    OI_DIVERGENCE: { tp1R: 0.8, tp2R: 1.5, tp3R: 2.2, description: 'Price trend divergent from positioning flow; cautious scale-out' },
    EXHAUSTION: { tp1R: 0.5, tp2R: 1.0, tp3R: 1.5, description: 'Overextended price or funding extreme; tight conservative targets' },
    REVERSAL_WATCH: { tp1R: 1.0, tp2R: 2.0, tp3R: 3.0, description: 'Structural exhaustion confirmed with counter-trend reversal order flow' },
  } as Record<StrategyCategory, StrategyTpProfile>,
  combinationAdjustments: {
    strongBreakoutBonusR: 0.5,
    volumeExplosionBonusR: 0.3,
    exhaustionPenaltyR: -0.5,
    minTp1R: 0.5,
    maxTp1R: 1.8,
    minTp2R: 1.0,
    maxTp2R: 3.0,
    minTp3R: 1.5,
    maxTp3R: 5.0,
  },
  qualityThresholds: {
    excellentMaxAtrDist: 0.8,
    goodMaxAtrDist: 1.5,
    fairMaxAtrDist: 2.2,
  },
  chaseRiskThresholds: {
    lowMaxPriceRunPct: 2.5,
    mediumMaxPriceRunPct: 5.0,
    highMaxPriceRunPct: 8.0,
  },
  trailingRules: {
    moveStopToEntryOnTp1: true,
    moveStopToTp1OnTp2: true,
    closeOnTp3: true,
    stopFirstConservativeRule: true,
  },
};
