/**
 * SIGMA — BTC Price × Open Interest Positioning Engine Types
 * Strict institutional market logic taxonomy:
 * Separate OBSERVATION, INTERPRETATION, CONFIRMATION, and SETUP STATE.
 */

export type PositioningState =
  | 'NEUTRAL'
  | 'LEVERAGE_EXPANSION'
  | 'SHORT_COVERING'
  | 'BEARISH_EXPANSION'
  | 'LONG_LIQUIDATION'
  | 'DELEVERAGING'
  | 'OI_ACCELERATION'
  | 'OI_CONTRACTION'
  | 'EXHAUSTION_WATCH';

export type ConfirmationLevel =
  | 'CONFIRMED'
  | 'NEUTRAL'
  | 'WEAK'
  | 'CONTRADICTING'
  | 'UNAVAILABLE';

export type SetupState =
  | 'NEUTRAL'
  | 'WATCH'
  | 'CONFIRMED'
  | 'ACCELERATION'
  | 'EXTREME'
  | 'EXHAUSTION'
  | 'COOLING'
  | 'REVERSAL_WATCH';

export type OiIntensity = 'NORMAL' | 'ELEVATED' | 'HIGH' | 'EXTREME';

export type MtfPositioningState = 'ALIGNED' | 'MIXED' | 'CONTRADICTING';

export interface PositioningObservation {
  price: number;
  currentPrice: number;
  priceChange1mPct: number;
  priceChange5mPct: number;
  priceChange15mPct: number;
  priceChange1hPct: number;
  priceChange4hPct: number;
  openInterestUsd: number;
  openInterestBtc: number;
  oiChange5mPct: number;
  oiChange15mPct: number;
  oiChange1hPct: number;
  oiChange4hPct: number;
  oiAccelerationPct: number;
  rvol: number;
  volume24hUsd: number;
  volumeDeltaPct: number;
  takerFlowRatio: number;
  takerDominancePct: number;
  takerBuyerPct: number;
  fundingRate: number;
  fundingRatePct: number;
  fundingRateAnnualizedPct: number;
  longLiquidations1hUsd: number;
  shortLiquidations1hUsd: number;
  totalLiquidations1hUsd: number;
  liquidations1hUsd: number;
}

export interface PositioningInterpretation {
  state: PositioningState;
  stateLabel: string;
  matrixQuadrant: 'PRICE_UP_OI_UP' | 'PRICE_UP_OI_DOWN' | 'PRICE_DOWN_OI_UP' | 'PRICE_DOWN_OI_DOWN' | 'NEUTRAL';
  oiIntensity: OiIntensity;
  narrative: string;
}

export interface ConfirmationEngineState {
  priceConfirmation: ConfirmationLevel;
  volumeConfirmation: ConfirmationLevel;
  rvolConfirmation: ConfirmationLevel;
  takerConfirmation: ConfirmationLevel;
  oiConfirmation: ConfirmationLevel;
  liquidationConfirmation: ConfirmationLevel;
  fundingConfirmation: ConfirmationLevel;
  structureConfirmation: ConfirmationLevel;
  mtfConfirmation: ConfirmationLevel;
  score: number; // 0 to 100
  summary: string;
}

export interface MtfTimeframeNode {
  timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '4h';
  state: PositioningState;
  priceDeltaPct: number;
  oiDeltaPct: number;
  status: ConfirmationLevel;
}

export interface PositioningDataQuality {
  timestamp: number;
  freshnessMs: number;
  exchangeSource: string;
  isStale: boolean;
  isComplete: boolean;
  qualityLevel: 'LIVE' | 'DELAYED' | 'UNAVAILABLE';
  status: 'LIVE' | 'DEGRADED' | 'STALE' | 'UNAVAILABLE';
  latencyMs: number;
  freshnessSeconds: number;
}

export interface BtcPositioningSnapshot {
  observation: PositioningObservation;
  interpretation: PositioningInterpretation;
  confirmation: ConfirmationEngineState;
  mtf: {
    state: MtfPositioningState;
    timeframes: MtfTimeframeNode[];
  };
  setupState: SetupState;
  setupRationale: string;
  dataQuality: PositioningDataQuality;
}
