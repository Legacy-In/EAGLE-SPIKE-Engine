/**
 * 🦅 EAGLE FLASH — Production-Grade Spike Intelligence Engine
 * Comprehensive Domain Types & Schemas
 */

export type SpikeTimeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '4h' | '8h' | '1d';

export type SpikeLifecycleState =
  | 'NORMAL'
  | 'PRE_SPIKE'
  | 'EARLY_SPIKE'
  | 'ACCELERATION'
  | 'EXTREME'
  | 'EXHAUSTION'
  | 'COOLING'
  | 'REVERSAL'
  | 'CONTINUATION';

export type SpikeType =
  | 'MOMENTUM'
  | 'BREAKOUT'
  | 'VOLUME_EXPLOSION'
  | 'SHORT_SQUEEZE'
  | 'LONG_SQUEEZE'
  | 'ACCUMULATION'
  | 'EXHAUSTION'
  | 'REVERSAL'
  | 'LOW_LIQUIDITY'
  | 'MIXED'
  | 'UNKNOWN';

export type SpikeQualityGrade =
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'EXHAUSTION_RISK'
  | 'INSUFFICIENT_DATA';

export type BtcRegime =
  | 'BULLISH'
  | 'BEARISH'
  | 'NEUTRAL'
  | 'HIGH_VOLATILITY'
  | 'RISK_OFF'
  | 'RISK_ON'
  | 'MIXED';

export type FundingState =
  | 'NORMAL'
  | 'ELEVATED'
  | 'EXTREME'
  | 'NEGATIVE_EXTREME';

export type LiquidationDominance =
  | 'SHORT_LIQUIDATION_DOMINANT'
  | 'LONG_LIQUIDATION_DOMINANT'
  | 'BALANCED'
  | 'LOW_ACTIVITY';

export type DataFreshnessStatus =
  | 'FRESH'
  | 'DELAYED'
  | 'STALE'
  | 'INSUFFICIENT_DATA';

export interface ScoreBreakdown {
  priceAcceleration: number;    // max 20
  volumeConfirmation: number;   // max 20
  rvol: number;                 // max 20
  orderFlow: number;            // max 15
  openInterest: number;         // max 10
  liquidity: number;            // max 5
  btcRegime: number;            // max 5
  dataQuality: number;          // max 5
  total: number;                // 0 - 100
}

export interface MultiTimeframeReturns {
  '1m'?: number;
  '3m'?: number;
  '5m': number;
  '15m': number;
  '30m'?: number;
  '1h': number;
  '4h'?: number;
  '24h': number;
}

export interface MultiTimeframeRvol {
  '1m'?: number;
  '5m': number;
  '15m': number;
  '1h'?: number;
}

export interface OrderBookMetrics {
  bestBid: number;
  bestAsk: number;
  midPrice: number;
  spreadBps: number;
  bidDepth01PctUsd: number;
  askDepth01PctUsd: number;
  bidDepth05PctUsd: number;
  askDepth05PctUsd: number;
  bidDepth1PctUsd: number;
  askDepth1PctUsd: number;
  depthImbalance: number; // -1 to +1 (+1 = all bids, -1 = all asks)
  largeBidWallDetected: boolean;
  largeAskWallDetected: boolean;
  lastUpdated: number;
}

export interface OrderFlowIntelligence {
  takerBuyVolumeUsd: number;
  takerSellVolumeUsd: number;
  takerImbalancePct: number; // -100% to +100%
  cvdDeltaUsd: number;
  flowDominance: 'STRONG_BUY' | 'MODERATE_BUY' | 'BALANCED' | 'MODERATE_SELL' | 'STRONG_SELL';
}

export interface DerivativesIntelligence {
  openInterestUsd: number;
  oiChange5mPct?: number;
  oiChange15mPct: number;
  oiChange1hPct: number;
  oiChange4hPct?: number;
  oiStructure: 'NEW_POSITIONING' | 'POSITION_CLOSURE' | 'POTENTIAL_SHORT_COVERING' | 'POTENTIAL_LONG_UNWINDING' | 'NEUTRAL';
  fundingRate: number;
  fundingState: FundingState;
  estimatedLongLiquidationsUsd: number;
  estimatedShortLiquidationsUsd: number;
  liquidationDominance: LiquidationDominance;
}

export interface SpikeEventRecord {
  eventId: string;
  symbol: string;
  exchange: 'BYBIT' | 'MEXC' | 'WEEX';
  timestamp: number;
  price: number;
  returns: MultiTimeframeReturns;
  rvol: MultiTimeframeRvol;
  volumeZScore: number;
  tradeCountAcceleration: number;
  orderFlow: OrderFlowIntelligence;
  derivatives: DerivativesIntelligence;
  orderBook: OrderBookMetrics;
  btcRegime: BtcRegime;
  marketBreadthPct: number;
  eagleScore: number;
  scoreBreakdown: ScoreBreakdown;
  dataConfidence: number; // 0 - 100%
  spikePhase: SpikeLifecycleState;
  spikeType: SpikeType;
  spikeQuality: SpikeQualityGrade;
  triggerReasons: string[];
  riskFlags: string[];
  scoreVersion: string;
  featureVersion: string;
  alertSent: boolean;
  // Objective Forward Outcomes
  forwardReturns: {
    '1m'?: number;
    '5m'?: number;
    '15m'?: number;
    '30m'?: number;
    '1h'?: number;
    '4h'?: number;
  };
  mfePct: number | null;
  maePct: number | null;
  outcomeClassification?: 'CONTINUATION' | 'REVERSAL' | 'CHOP_CONSOLIDATION' | 'PENDING';
  resolvedAt?: number;
}

export interface TelegramAlertPayload {
  eventId: string;
  symbol: string;
  eventType: string;
  state: SpikeLifecycleState;
  price: number;
  returns5m: number;
  returns15m: number;
  returns1h: number;
  rvol: number;
  volumeZ: number;
  openInterestUsd: number;
  oiChangePct: number;
  takerFlowPct: number;
  rsi: number;
  eagleScore: number;
  spikeType: SpikeType;
  spikeQuality: SpikeQualityGrade;
  dataConfidence: number;
  btcRegime: BtcRegime;
  triggerReasons: string[];
  timestamp: number;
  cooldownSeconds: number;
}
