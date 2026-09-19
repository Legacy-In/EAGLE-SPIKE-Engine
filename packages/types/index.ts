/**
 * SIGMA — Institutional BTC Quantitative Intelligence & Trading Platform
 * Core TypeScript Domain Types & Interfaces
 */

// ============================================================================
// 1. DATA PROVENANCE & HEALTH
// ============================================================================

export type DataSourceType = 'WEBSOCKET' | 'REST_API' | 'ONCHAIN_RPC' | 'MACRO_FEED' | 'CALCULATED' | 'SYNTHETIC';

export type DataQualityGrade = 'LIVE' | 'VERIFIED' | 'DELAYED' | 'STALE' | 'FALLBACK' | 'UNAVAILABLE';

export interface DataProvenance<T> {
  value: T;
  timestamp: number; // UTC Unix Epoch ms
  source: string; // e.g. "Binance WebSocket", "OKX L2", "FRED US10Y", "Glassnode RPC"
  sourceType: DataSourceType;
  freshnessMs: number; // Age in milliseconds
  confidenceScore: number; // 0 to 100%
  quality: DataQualityGrade;
  fallbackStatus: boolean; // True if primary feed failed and fallback is active
  metadata?: Record<string, unknown>;
}

export interface SourceHealthStatus {
  id: string;
  name: string;
  sourceType: DataSourceType;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'STALE';
  latencyMs: number;
  lastHeartbeat: number;
  freshnessMs: number;
  confidenceScore: number;
  quality: DataQualityGrade;
  errorCount24h: number;
  message?: string;
}

export interface CrossSourceComparison {
  metric: string;
  primaryValue: number;
  primarySource: string;
  secondaryValue: number;
  secondarySource: string;
  tertiaryValue?: number;
  tertiarySource?: string;
  maxDeviationBps: number; // Basis points deviation
  status: 'NORMAL' | 'ELEVATED_SPREAD' | 'ANOMALY_DETECTED';
  timestamp: number;
}

// ============================================================================
// 2. MARKET DATA & ORDER FLOW
// ============================================================================

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades?: number;
  buyVolume?: number;
  sellVolume?: number;
}

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '12h' | '1D' | '1W';

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

export interface OrderBookDepth {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadBps: number;
  midPrice: number;
  depth5bps: { bidQty: number; askQty: number; imbalance: number };
  depth10bps: { bidQty: number; askQty: number; imbalance: number };
  depth25bps: { bidQty: number; askQty: number; imbalance: number };
  depth50bps: { bidQty: number; askQty: number; imbalance: number };
  liquidityWalls: { type: 'BID_WALL' | 'ASK_WALL'; price: number; notional: number }[];
  potentialSpoofingPatterns: { description: string; confidence: 'LOW' | 'MODERATE' }[];
  timestamp: number;
}

export interface OrderFlowMetrics {
  timestamp: number;
  buyersPct: number; // 0 - 100%
  sellersPct: number; // 0 - 100%
  spotDeltaNotional: number; // USD
  perpDeltaNotional: number; // USD
  netDeltaNotional: number; // USD
  cvd30mNotional: number; // Cumulative Volume Delta
  takerBuyNotional: number;
  takerSellNotional: number;
  spotTakerBuy: number;
  spotTakerSell: number;
  perpTakerBuy: number;
  perpTakerSell: number;
  volume24hUsd: number;
  tradesCount30m: number;
  largeTradesCount30m: number; // Trades > $250k
  priceDeltaDivergence: 'BULLISH_DIVERGENCE' | 'BEARISH_DIVERGENCE' | 'NEUTRAL';
}

// ============================================================================
// 3. DERIVATIVES INTELLIGENCE
// ============================================================================

export interface DerivativesMetrics {
  timestamp: number;
  fundingRate: number; // e.g. 0.0001 = 0.01%
  fundingRateAnnualizedPct: number;
  fundingZScore30d: number;
  openInterestUsd: number;
  openInterestBtc: number;
  oiChange24hPct: number;
  oiPriceDivergence: 'AGGRESSIVE_LONGS' | 'AGGRESSIVE_SHORTS' | 'DELEVERAGING' | 'ORGANIC_EXPANSION' | 'NEUTRAL';
  basisAnnualizedPct: number; // Futures vs Spot basis
  liquidations24hUsd: number;
  longLiquidations24hUsd: number;
  shortLiquidations24hUsd: number;
  liquidationBias: 'LONG_SQUEEZE' | 'SHORT_SQUEEZE' | 'BALANCED';
  impliedVolatility30d: number; // e.g. 52.4%
  putCallRatio: number;
  optionsSkew25Delta: number; // Positive = Put premium (bearish hedge), Negative = Call premium
  optionsTermStructureSlope: 'CONTANGO' | 'BACKWARDATION' | 'FLAT';
  interpretation: {
    event: string; // e.g. "DELEVERAGING EVENT"
    confidence: number;
    description: string;
  };
}

// ============================================================================
// 4. ON-CHAIN & ETF FLOWS
// ============================================================================

export interface OnChainMetrics {
  timestamp: number;
  mvrv: number;
  mvrvPercentile3y: number;
  mvrvTrend: 'RISING' | 'FALLING' | 'STABLE';
  realizedPrice: number;
  realizedCapUsd: number;
  nupl: number; // Net Unrealized Profit/Loss
  nuplPhase: 'CAPITULATION' | 'HOPE' | 'OPTIMISM' | 'BELIEF' | 'EUPHORIA';
  sopr: number; // Spent Output Profit Ratio
  aSopr: number;
  lthSupplyBtc: number;
  sthSupplyBtc: number;
  exchangeReserveBtc: number;
  exchangeNetflow24hBtc: number; // Negative = outflow (accumulation)
  whaleAccumulationScore: number; // 0 - 100
  minerOutflowIntensity: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH_STRESS';
  stablecoinTotalSupplyUsd: number;
  stablecoinSupplyChange30dPct: number;
  dataAgeHours: number;
}

export interface EtfFlowMetrics {
  timestamp: number;
  isProxy: boolean; // True if using estimated proxy, False if verified 13F/issuer reports
  flow1dUsdMillions: number;
  flow3dUsdMillions: number;
  flow7dUsdMillions: number;
  flow30dUsdMillions: number;
  cumulativeNetFlowUsdMillions: number;
  flowMomentumScore: number; // -100 to +100
  flowAcceleration: 'ACCELERATING_INFLOWS' | 'STEADY_INFLOWS' | 'ACCELERATING_OUTFLOWS' | 'STEADY_OUTFLOWS' | 'NEUTRAL';
}

// ============================================================================
// 5. MACRO INTELLIGENCE
// ============================================================================

export interface MacroMetrics {
  timestamp: number;
  dxy: number;
  dxyChange30dPct: number;
  us2yYield: number; // e.g. 4.15%
  us10yYield: number; // e.g. 4.38%
  yieldCurve10y2yBps: number; // Inversion or steepening in bps
  realYield10y: number; // TIPS yield
  liquidityRegime: 'EXPANDING' | 'NEUTRAL' | 'CONTRACTING';
  macroRiskScore: number; // 0 (benign) to 100 (extreme macro risk)
  equitiesCorrelation30d: {
    sp500: number;
    nasdaq100: number;
    gold: number;
    crudeOil: number;
  };
  sentimentFearGreed: number; // Alternative.me (0-100)
  sentimentClassification: 'EXTREME_FEAR' | 'FEAR' | 'NEUTRAL' | 'GREED' | 'EXTREME_GREED';
}

// ============================================================================
// 6. MARKET REGIMES & FACTORS
// ============================================================================

export type MarketRegimeType =
  | 'STRONG_BULL_TREND'
  | 'WEAK_BULL_TREND'
  | 'RANGE'
  | 'ACCUMULATION'
  | 'DISTRIBUTION'
  | 'STRONG_BEAR_TREND'
  | 'CAPITULATION'
  | 'RECOVERY'
  | 'HIGH_VOLATILITY'
  | 'LIQUIDITY_STRESS';

export interface MarketRegimeState {
  currentRegime: MarketRegimeType;
  regimeLabel: string;
  confidenceScore: number; // 0 - 100%
  durationHours: number;
  regimeChangePct: number;
  primaryDrivers: string[];
  secondaryRegime?: MarketRegimeType;
}

export interface FactorScores {
  marketStructure: number; // -100 to +100
  derivatives: number; // -100 to +100
  orderFlow: number; // -100 to +100
  onChain: number; // -100 to +100
  macro: number; // -100 to +100
  flow: number; // -100 to +100
  sentiment: number; // -100 to +100
  volatilityLiquidity: number; // -100 to +100
  compositeScore: number; // -100 to +100
}

export interface FactorAttributionItem {
  factor: string;
  score: number; // Weighted contribution points
  weightPct: number;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  summary: string;
}

// ============================================================================
// 7. SIGNALS & PROBABILITY FORECAST
// ============================================================================

export type SignalDecision =
  | 'STRONG_LONG'
  | 'LONG'
  | 'WAIT_NEUTRAL'
  | 'SHORT'
  | 'STRONG_SHORT'
  | 'SIGNAL_INVALIDATED'
  | 'DATA_INSUFFICIENT'
  | 'RISK_BLOCKED'
  | 'EXECUTION_BLOCKED';

export interface MultiTimeframeAnalysis {
  macro1D: { trend: 'BULLISH' | 'NEUTRAL' | 'BEARISH'; score: number; rsi: number; keyLevel: number };
  tactical4H: { regime: string; momentum: 'RECOVERING' | 'FADING' | 'STRONG_TREND' | 'CHOP'; score: number };
  entry15M: { flow: 'BUY_SIDE' | 'SELL_SIDE' | 'EQUILIBRIUM'; trigger: 'TRIGGER_READY' | 'AWAITING_PULLBACK' | 'NO_TRIGGER' };
}

export interface SignalCardData {
  symbol: string;
  price: number;
  change24hPct: number;
  decision: SignalDecision;
  decisionLabel: string;
  modelConfidence: number; // Calibrated statistical confidence (0 - 100%)
  dataQuality: number; // 0 - 100%
  timeframe: Timeframe;
  timestamp: number;
  modelVersion: string;
  featureSetDate: string;
  
  // Mathematical Entry & Invalidation
  entryZone: [number, number]; // [min, max]
  stopLossPrice: number;
  stopCalculationMethod: 'ATR_STRUCTURE_MAX' | 'VOLATILITY_BAND';
  target1: number;
  target2: number;
  target3: number;
  riskRewardRatio: number; // e.g. 2.8
  positionRiskPct: number; // e.g. 0.50%
  invalidationCondition: string;
  
  // Explainability
  topPositiveFactors: string[];
  topNegativeFactors: string[];
  confirmationTriggers: string[];
  keyRisks: string[];
  attribution: FactorAttributionItem[];
}

export interface ForecastDistribution {
  timeHorizon: '4H' | '24H' | '7D';
  expectedReturnPct: number;
  expectedVolatilityPct: number;
  probabilityPositiveReturn: number; // e.g. 68%
  probabilityDrawdownExceeding2Pct: number; // e.g. 22%
  expectedPriceRange: [number, number];
  confidenceInterval80Pct: [number, number];
  brierCalibrationScore: number; // 0.0 (perfect) to 1.0
}

// ============================================================================
// 8. RISK MANAGEMENT & POSITION SIZING
// ============================================================================

export interface RiskParameters {
  maxRiskPerTradePct: number; // e.g. 0.50%
  maxDailyLossPct: number; // e.g. 2.0%
  maxWeeklyLossPct: number; // e.g. 5.0%
  maxDrawdownPct: number; // e.g. 10.0%
  maxLeverage: number; // e.g. 3.0x
  maxNotionalExposureUsd: number;
  maxCorrelatedExposurePct: number;
  safeModeActive: boolean;
  killSwitchEngaged: boolean;
}

export interface PositionSizeCalculation {
  accountEquityUsd: number;
  riskCapitalUsd: number;
  entryPrice: number;
  stopLossPrice: number;
  stopDistanceUsd: number;
  stopDistancePct: number;
  volatilityAdjustmentMultiplier: number;
  confidenceAdjustmentMultiplier: number;
  regimeAdjustmentMultiplier: number;
  calculatedUnitsBtc: number;
  calculatedNotionalUsd: number;
  effectiveLeverage: number;
  riskUtilizedPct: number;
  status: 'APPROVED' | 'CAPPED_BY_MAX_EXPOSURE' | 'REJECTED_EXCEEDS_RISK';
}

// ============================================================================
// 9. EXECUTION & PAPER TRADING
// ============================================================================

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'TAKE_PROFIT_LIMIT';
export type OrderStatus = 'PENDING' | 'SUBMITTED' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED';
export type TradingMode = 'PAPER' | 'LIVE' | 'BACKTEST' | 'REPLAY';

export interface Order {
  id: string;
  clientOrderId: string;
  exchangeOrderId?: string;
  strategyId: string;
  signalId: string;
  decisionId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price?: number;
  stopPrice?: number;
  amountBtc: number;
  notionalUsd: number;
  filledBtc: number;
  averageFillPrice?: number;
  status: OrderStatus;
  postOnly: boolean;
  reduceOnly: boolean;
  mode: TradingMode;
  createdAt: number;
  updatedAt: number;
  reconciliationAuditId?: string;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  amountBtc: number;
  notionalUsd: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number;
  realizedPnlUsd: number;
  liquidationPrice?: number;
  leverage: number;
  maxAdverseExcursionBps: number; // MAE
  maxFavorableExcursionBps: number; // MFE
  cumulativeFundingPaidUsd: number;
  feesPaidUsd: number;
  openedAt: number;
  mode: TradingMode;
}

export interface TradeJournalEntry {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  amountBtc: number;
  realizedPnlUsd: number;
  realizedPnlPct: number;
  entryReason: string;
  signalSnapshot: SignalDecision;
  regimeSnapshot: MarketRegimeType;
  modelConfidenceSnapshot: number;
  dataQualitySnapshot: number;
  maePct: number;
  mfePct: number;
  slippageBps: number;
  feesPaidUsd: number;
  fundingPaidUsd: number;
  executionLatencyMs: number;
  openedAt: number;
  closedAt: number;
}

// ============================================================================
// 10. BACKTESTING & MODEL VALIDATION
// ============================================================================

export interface BacktestParameters {
  symbol: string;
  timeframe: Timeframe;
  startDate: string;
  endDate: string;
  initialCapitalUsd: number;
  makerFeeBps: number;
  takerFeeBps: number;
  slippageBps: number;
  simulatedLatencyMs: number;
  enableFundingRateDeduction: boolean;
  riskPerTradePct: number;
  walkForwardSplits: number;
  monteCarloSimulations: number;
}

export interface BacktestResults {
  summary: {
    initialCapitalUsd: number;
    endingCapitalUsd: number;
    netReturnPct: number;
    cagrPct: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    maxDrawdownPct: number;
    maxDrawdownDurationDays: number;
    winRatePct: number;
    profitFactor: number;
    expectancyUsd: number;
    totalTrades: number;
    avgTradeReturnPct: number;
    avgWinnerUsd: number;
    avgLoserUsd: number;
    recoveryFactor: number;
    exposureTimePct: number;
    turnoverAnnualized: number;
    totalFeesPaidUsd: number;
    totalFundingPaidUsd: number;
  };
  equityCurve: { timestamp: number; equityUsd: number; drawdownPct: number }[];
  monteCarloConfidenceBands: {
    percentile5: number;
    percentile50: number;
    percentile95: number;
  };
  calibrationMetrics: {
    brierScore: number;
    reliabilityBins: { predictedProb: number; actualFrequency: number; sampleCount: number }[];
  };
  regimeBreakdown: Record<string, { trades: number; winRatePct: number; pnlUsd: number }>;
}

// ============================================================================
// 11. AI MARKET BRIEF (FACT-GROUNDED)
// ============================================================================

export interface StructuredAiMarketBrief {
  timestamp: number;
  headline: string;
  regimeAssessment: string;
  whyMarketIsBehaving: string;
  whatChangedRecently: string;
  confirmationCriteria: string;
  invalidationCriteria: string;
  keyRisks: string[];
  modelConfidence: number;
  dataQuality: number;
  disclaimer: string;
}

// ============================================================================
// 12. MACRO / ECONOMIC CALENDAR
// ============================================================================

export interface EconomicCalendarEvent {
  id: string;
  title: string;
  country: string;
  scheduledTime: number; // Epoch ms
  importance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: string;
  status: 'SCHEDULED' | 'IMMINENT' | 'RELEASED' | 'CANCELLED';
  previousValue?: string;
  forecastValue?: string;
  actualValue?: string;
  marketReactionBtcBps?: number;
}
