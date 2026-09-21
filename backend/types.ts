export type ExchangeName = 'BYBIT' | 'MEXC' | 'WEEX' | 'BINANCE';

export interface MarketContract {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  exchange: ExchangeName;
  status: 'Trading' | 'Settling' | 'Closed' | 'Suspended';
  contractType: 'LinearPerpetual';
  pricePrecision: number;
  lotSize: number;
  tickSize: number;
  minOrderQty: number;
}

export interface NormalizedTicker {
  symbol: string;
  exchange: ExchangeName;
  lastPrice: number;
  markPrice: number;
  indexPrice: number;
  price24hChange: number;
  high24h: number;
  low24h: number;
  turnover24h: number; // Quote volume (USDT)
  volume24h: number;   // Base volume
  previous24hVolume: number;
  volumeChange24h: number;
  returns5m: number;
  returns15m: number;
  returns1h: number;
  relativeVolume: number; // RVOL
  volumeZScore: number;   // Volume Z-score
  openInterestValue: number; // USDT
  oiChangePct: number;    // % change in Open Interest
  fundingRate: number;
  bidPrice: number;
  askPrice: number;
  spreadPct: number;
  takerImbalance: number; // -100 to +100
  rsi: number;
  trend: 'STRONG BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG BEARISH';
  signalScore: number;    // Standardized Eagle Score (0-100)
  spikePhase: SpikePhase;
  spikeType: SpikeType;
  spikeQuality: SpikeQuality;
  lastUpdated: number;
}

export type SpikePhase = 'NORMAL' | 'PRE_SPIKE' | 'BREAKOUT' | 'ACCELERATION' | 'BLOW_OFF' | 'COOLING';

export type SpikeType =
  | 'VOLUME_BREAKOUT'
  | 'SHORT_SQUEEZE'
  | 'LONG_LIQUIDATION'
  | 'MOMENTUM_SPIKE'
  | 'MEAN_REVERSION'
  | 'CHOP';

export type SpikeQuality =
  | 'HIGH_CONVICTION'
  | 'CLEAN_BREAKOUT'
  | 'DELTA_DIVERGENCE'
  | 'CHOP'
  | 'EXHAUSTION_RISK';

export interface EagleSignalRecord {
  signalId: string;
  symbol: string;
  exchange: ExchangeName;
  direction: 'LONG' | 'SHORT';
  triggerPrice: number;
  triggerTimestamp: number;
  eagleScore: number;
  rvol: number;
  oiChangePct: number;
  volumeZScore: number;
  takerFlow: number;
  spikePhase: SpikePhase;
  spikeType: SpikeType;
  spikeQuality: SpikeQuality;
  currentPrice: number;
  highestPriceSinceTrigger: number;
  lowestPriceSinceTrigger: number;
  mfePct: number; // Maximum Favorable Excursion
  maePct: number; // Maximum Adverse Excursion
  status: 'ACTIVE' | 'CONFIRMED' | 'TARGET_HIT' | 'INVALIDATED' | 'COOLING';
  lastUpdated: number;
}

export interface ScannerSnapshotPayload {
  timestamp: number;
  latencyMs: number;
  totalContracts: number;
  activeContracts: number;
  bybitCount: number;
  mexcCount: number;
  weexCount: number;
  activeSpikesCount: number;
  longCandidatesCount: number;
  shortCandidatesCount: number;
  marketBreadthPct: number;
  btcPrice: number;
  btcChange24h: number;
  tickers: NormalizedTicker[];
  recentSignals: EagleSignalRecord[];
}
