/**
 * 🦅 EAGLE FLASH — Centralized Quantitative Signal & Anomaly Configuration
 * Version: v1.2.0 (Institutional Model)
 */

export const SIGNAL_MODEL_VERSION = 'v1.2.0';
export const FEATURE_ENGINE_VERSION = 'v3.1.0';

export interface SignalModelThresholds {
  rvolTrigger: number;
  volZTrigger: number;
  priceAccel5m: number;
  priceAccel15m: number;
  takerImbalanceMin: number;
  oiChangeMin: number;
  minTurnoverUsd: number;
  maxSpreadPct: number;
  minDataConfidencePct: number;
  cooldownMinutes: number;
  maxAlertsPerMinute: number;
}

export interface DataFreshnessThresholds {
  liveMs: number;
  freshMs: number;
  staleMs: number;
  veryStaleMs: number;
}

export const SIGNAL_MODEL_CONFIG = {
  version: SIGNAL_MODEL_VERSION,
  featureVersion: FEATURE_ENGINE_VERSION,

  // Quantitative Trigger Thresholds
  thresholds: {
    rvolTrigger: 2.0,            // 2.0x volume expansion vs baseline
    volZTrigger: 2.0,            // 2.0 standard deviations
    priceAccel5m: 1.5,          // 1.5% in 5m
    priceAccel15m: 2.5,         // 2.5% in 15m
    takerImbalanceMin: 15,      // >= +15% taker buyer dominance
    oiChangeMin: 2.0,           // >= +2.0% open interest expansion
    minTurnoverUsd: 500000,     // $500k USD minimum 24h turnover
    maxSpreadPct: 0.12,         // 0.12% maximum acceptable spread
    minDataConfidencePct: 60,   // Minimum 60% confidence to alert
    cooldownMinutes: 15,        // 15-minute anti-spam symbol cooldown
    maxAlertsPerMinute: 20      // Global rate limit
  } as SignalModelThresholds,

  // Data Freshness Boundaries
  freshness: {
    liveMs: 5000,               // 0 - 5s: LIVE
    freshMs: 15000,             // 5s - 15s: FRESH
    staleMs: 60000,             // 15s - 60s: STALE
    veryStaleMs: 120000         // > 60s: VERY STALE / DEGRADED
  } as DataFreshnessThresholds,

  // Factor Weights for Eagle Score (100 pts total)
  scoreWeights: {
    priceAcceleration: 20,
    volumeConfirmation: 20,
    rvol: 20,
    orderFlow: 15,
    openInterest: 10,
    liquidity: 5,
    btcRegime: 5,
    dataQuality: 5
  },

  // Supported Crypto Sectors Taxonomy
  sectors: [
    'LAYER 1',
    'LAYER 2',
    'DEFI',
    'AI',
    'MEME',
    'GAMING',
    'INFRASTRUCTURE',
    'RWA',
    'EXCHANGE',
    'OTHER'
  ] as const
};
