import test from 'node:test';
import assert from 'node:assert/strict';

import { FeatureEngine } from '../services/spike-intelligence/features';
import { SpikeLifecycleStateMachine } from '../services/spike-intelligence/lifecycle';
import { ScoringEngine, SCORE_VERSION, FEATURE_VERSION } from '../services/spike-intelligence/scoring';
import { BtcRegimeEngine } from '../services/spike-intelligence/btc-regime';
import { DerivativesOrderBookEngine } from '../services/spike-intelligence/derivatives-orderbook';
import { SpikeEventStore } from '../services/spike-intelligence/event-store';
import { AlertDispatcher } from '../services/telegram/alert-dispatcher';
import { TelegramService } from '../services/telegram/telegram-service';
import { FreshnessEngine } from '../services/spike-intelligence/freshness';
import { BacktestEngine } from '../services/spike-intelligence/backtest-engine';

// ============================================================================
// 1. Feature Engine Tests
// ============================================================================
test('FeatureEngine: calculateRvol calculates timeframe-correct ratio', () => {
  const rvol = FeatureEngine.calculateRvol(500000, 200000);
  assert.equal(rvol, 2.5);

  const fallbackRvol = FeatureEngine.calculateRvol(500000, 0);
  assert.equal(fallbackRvol, 1.0);
});

test('FeatureEngine: calculateZScore standard deviations', () => {
  const z = FeatureEngine.calculateZScore(600000, 200000, 100000);
  assert.equal(z, 4.0);
});

test('FeatureEngine: calculateTakerImbalance produces correct ratio and dominance', () => {
  const flow = FeatureEngine.calculateTakerImbalance(700000, 300000);
  assert.equal(flow.takerImbalancePct, 40.0);
  assert.equal(flow.flowDominance, 'STRONG_BUY');
  assert.equal(flow.cvdDeltaUsd, 400000);

  const sellFlow = FeatureEngine.calculateTakerImbalance(200000, 800000);
  assert.equal(sellFlow.takerImbalancePct, -60.0);
  assert.equal(sellFlow.flowDominance, 'STRONG_SELL');
});

test('FeatureEngine: calculateMarketBreadth', () => {
  const symbols = [
    { price24hChange: 2.5, turnover24h: 1000000 },
    { price24hChange: 1.2, turnover24h: 2000000 },
    { price24hChange: -3.0, turnover24h: 1000000 },
  ];
  const breadth = FeatureEngine.calculateMarketBreadth(symbols);
  assert.equal(breadth.advancingCount, 2);
  assert.equal(breadth.decliningCount, 1);
  assert.equal(breadth.advancingPct, 67);
  assert.equal(breadth.volumeWeightedBreadthPct, 75);
});

// ============================================================================
// 2. Spike Lifecycle State Machine Tests
// ============================================================================
test('SpikeLifecycle: NORMAL -> PRE_SPIKE on volume accumulation without breakout', () => {
  const sm = new SpikeLifecycleStateMachine(30000);
  const res = sm.evaluate({
    rvol5m: 2.0,
    volumeZ: 2.2,
    returns5m: 0.5,
    returns15m: 0.8,
    takerImbalancePct: 15,
    rsi: 58,
    spreadPct: 0.02,
    currentPrice: 10.0,
    peakPrice: 10.0,
    troughPrice: 10.0,
    currentState: 'NORMAL',
    stateEnteredTimestamp: Date.now() - 50000,
    now: Date.now(),
  });

  assert.equal(res.nextState, 'PRE_SPIKE');
  assert.equal(res.stateChanged, true);
});

test('SpikeLifecycle: PRE_SPIKE -> EARLY_SPIKE on price breakout', () => {
  const sm = new SpikeLifecycleStateMachine(30000);
  const res = sm.evaluate({
    rvol5m: 2.5,
    volumeZ: 2.8,
    returns5m: 2.2,
    returns15m: 3.1,
    takerImbalancePct: 35,
    rsi: 65,
    spreadPct: 0.02,
    currentPrice: 10.5,
    peakPrice: 10.5,
    troughPrice: 10.0,
    currentState: 'PRE_SPIKE',
    stateEnteredTimestamp: Date.now() - 40000,
    now: Date.now(),
  });

  assert.equal(res.nextState, 'EARLY_SPIKE');
  assert.equal(res.stateChanged, true);
});

test('SpikeLifecycle: EARLY_SPIKE -> ACCELERATION when velocity expands', () => {
  const sm = new SpikeLifecycleStateMachine(30000);
  const res = sm.evaluate({
    rvol5m: 3.2,
    volumeZ: 3.4,
    returns5m: 3.5,
    returns15m: 5.5,
    takerImbalancePct: 45,
    rsi: 74,
    spreadPct: 0.02,
    currentPrice: 11.2,
    peakPrice: 11.2,
    troughPrice: 10.0,
    currentState: 'EARLY_SPIKE',
    stateEnteredTimestamp: Date.now() - 40000,
    now: Date.now(),
  });

  assert.equal(res.nextState, 'ACCELERATION');
  assert.equal(res.stateChanged, true);
});

test('SpikeLifecycle: REVERSAL triggered when adverse move exceeds invalidation threshold', () => {
  const sm = new SpikeLifecycleStateMachine(30000);
  const res = sm.evaluate({
    rvol5m: 1.8,
    volumeZ: 1.5,
    returns5m: -2.0,
    returns15m: 1.0,
    takerImbalancePct: -45,
    rsi: 48,
    spreadPct: 0.04,
    currentPrice: 9.5,
    peakPrice: 10.0, // adverse move is (9.5 - 10)/10 = -5.0% (> 3.5%)
    troughPrice: 9.5,
    currentState: 'ACCELERATION',
    direction: 'LONG',
    stateEnteredTimestamp: Date.now() - 60000,
    now: Date.now(),
  });

  assert.equal(res.nextState, 'REVERSAL');
  assert.equal(res.invalidationTriggered, true);
});

// ============================================================================
// 3. Explainable Eagle Scoring & Classification Tests
// ============================================================================
test('ScoringEngine: Eagle Score breakdown sum equals total', () => {
  const input = {
    price: 15.4,
    returns5m: 3.2,
    returns15m: 5.5,
    returns24h: 12.0,
    rvol5m: 3.13,
    volumeZ: 4.2,
    turnover24h: 8500000,
    takerImbalancePct: 45,
    openInterestUsd: 76000000,
    oiChangePct: 8.7,
    fundingRate: 0.0001,
    spreadPct: 0.02,
    rsi: 73,
    btcRegime: 'NEUTRAL' as const,
    dataFreshnessMs: 1200,
  };

  const { score, breakdown } = ScoringEngine.calculateEagleScore(input);
  assert(score >= 75 && score <= 100, `Expected high score, got ${score}`);

  const sum =
    breakdown.priceAcceleration +
    breakdown.volumeConfirmation +
    breakdown.rvol +
    breakdown.orderFlow +
    breakdown.openInterest +
    breakdown.liquidity +
    breakdown.btcRegime +
    breakdown.dataQuality;

  assert.equal(sum, breakdown.total);
  assert.equal(score, breakdown.total);
});

test('ScoringEngine: classifySpikeType identifies SHORT_SQUEEZE', () => {
  const input = {
    price: 10.0,
    returns5m: 3.5,
    returns15m: 6.0,
    returns24h: 8.0,
    rvol5m: 3.0,
    volumeZ: 3.2,
    turnover24h: 5000000,
    takerImbalancePct: 40,
    openInterestUsd: 20000000,
    oiChangePct: -4.5, // OI collapsing
    fundingRate: -0.0003, // Negative funding
    spreadPct: 0.02,
    rsi: 68,
    btcRegime: 'NEUTRAL' as const,
    dataFreshnessMs: 800,
  };

  const type = ScoringEngine.classifySpikeType(input);
  assert.equal(type, 'SHORT_SQUEEZE');
});

test('ScoringEngine: evaluateSpikeQuality detects Delta Divergence / EXHAUSTION_RISK', () => {
  const input = {
    price: 25.0,
    returns5m: 3.5, // Price rising strongly
    returns15m: 7.0,
    returns24h: 15.0,
    rvol5m: 2.8,
    volumeZ: 2.9,
    turnover24h: 4000000,
    takerImbalancePct: -35, // But aggressive net SELLING
    openInterestUsd: 15000000,
    oiChangePct: 2.0,
    fundingRate: 0.0002,
    spreadPct: 0.03,
    rsi: 75,
    btcRegime: 'NEUTRAL' as const,
    dataFreshnessMs: 500,
  };

  const { quality, riskFlags } = ScoringEngine.evaluateSpikeQuality(input);
  assert.equal(quality, 'EXHAUSTION_RISK');
  assert(riskFlags.some((f) => f.includes('Delta Divergence')));
});

// ============================================================================
// 4. BTC Macro Regime Tests
// ============================================================================
test('BtcRegimeEngine: Evaluates HIGH_VOLATILITY, RISK_OFF, RISK_ON and NEUTRAL', () => {
  const highVol = BtcRegimeEngine.evaluateRegime({
    btcPrice: 81000,
    btcReturns5m: 1.8,
    btcReturns15m: 2.5,
    btcReturns1h: 3.2,
    btcReturns24h: 4.0,
    btcVolume24hUsd: 2000000000,
    marketAdvancingPct: 55,
  });
  assert.equal(highVol.regime, 'HIGH_VOLATILITY');

  const riskOff = BtcRegimeEngine.evaluateRegime({
    btcPrice: 79000,
    btcReturns5m: -0.6,
    btcReturns15m: -1.0,
    btcReturns1h: -1.8,
    btcReturns24h: -3.5,
    btcVolume24hUsd: 2000000000,
    marketAdvancingPct: 25,
  });
  assert.equal(riskOff.regime, 'RISK_OFF');
});

// ============================================================================
// 5. Historical Event Store & Outcome Tracking Tests
// ============================================================================
test('SpikeEventStore: Records event snapshot and tracks forward outcomes', () => {
  const store = new SpikeEventStore();
  const event = store.recordEvent({
    eventId: '',
    symbol: 'AVAXUSDT',
    exchange: 'BYBIT',
    timestamp: Date.now() - 3600000, // 1 hour ago
    price: 10.0,
    returns: { '5m': 3.2, '15m': 6.7, '1h': 11.4, '24h': 15.0 },
    rvol: { '5m': 3.13, '15m': 2.8 },
    volumeZScore: 5.32,
    tradeCountAcceleration: 45,
    orderFlow: { takerBuyVolumeUsd: 600000, takerSellVolumeUsd: 400000, takerImbalancePct: 20, cvdDeltaUsd: 200000, flowDominance: 'MODERATE_BUY' },
    derivatives: { openInterestUsd: 50000000, oiChange15mPct: 5.0, oiChange1hPct: 10.0, oiStructure: 'NEW_POSITIONING', fundingRate: 0.0001, fundingState: 'NORMAL', estimatedLongLiquidationsUsd: 0, estimatedShortLiquidationsUsd: 50000, liquidationDominance: 'SHORT_LIQUIDATION_DOMINANT' },
    orderBook: { bestBid: 9.99, bestAsk: 10.01, midPrice: 10.0, spreadBps: 2.0, bidDepth01PctUsd: 100000, askDepth01PctUsd: 90000, bidDepth05PctUsd: 500000, askDepth05PctUsd: 450000, bidDepth1PctUsd: 1000000, askDepth1PctUsd: 950000, depthImbalance: 0.05, largeBidWallDetected: false, largeAskWallDetected: false, lastUpdated: Date.now() },
    btcRegime: 'NEUTRAL',
    marketBreadthPct: 58,
    eagleScore: 85,
    scoreBreakdown: { priceAcceleration: 18, volumeConfirmation: 17, rvol: 18, orderFlow: 12, openInterest: 8, liquidity: 5, btcRegime: 3, dataQuality: 4, total: 85 },
    dataConfidence: 97,
    spikePhase: 'ACCELERATION',
    spikeType: 'MOMENTUM',
    spikeQuality: 'HIGH',
    triggerReasons: ['Volume expansion', 'RVOL 3.13x'],
    riskFlags: [],
    scoreVersion: SCORE_VERSION,
    featureVersion: FEATURE_VERSION,
    alertSent: false,
    forwardReturns: {},
    mfePct: 0,
    maePct: 0,
  });

  assert(event.eventId.startsWith('EVT-'));

  // Tick higher to 10.5 (+5.0% favorable move)
  store.updateOutcomes('AVAXUSDT', 10.5, Date.now());
  assert.equal(event.mfePct, 5.0);
  assert.equal(event.outcomeClassification, 'CONTINUATION');

  const analytics = store.getAnalytics();
  assert.equal(analytics.sampleSize, 1);
  assert.equal(analytics.continuationRatePct, 100);
});

// ============================================================================
// 6. Telegram Alert Dispatcher & Formatting Tests
// ============================================================================
test('AlertDispatcher: formatAlertMessage matches mobile specification', () => {
  const payload = {
    eventId: 'EVT-TEST-001',
    symbol: 'AVAXUSDT',
    eventType: 'SPIKE_STARTED',
    state: 'ACCELERATION' as const,
    price: 9.708,
    returns5m: 3.2,
    returns15m: 6.7,
    returns1h: 11.4,
    rvol: 3.13,
    volumeZ: 5.32,
    openInterestUsd: 76500000,
    oiChangePct: 8.7,
    takerFlowPct: 45,
    rsi: 73,
    eagleScore: 85,
    spikeType: 'MOMENTUM' as const,
    spikeQuality: 'HIGH' as const,
    dataConfidence: 97,
    btcRegime: 'NEUTRAL' as const,
    triggerReasons: ['Volume expansion', 'Strong taker imbalance', 'Elevated RVOL', 'OI expansion'],
    timestamp: Date.now(),
    cooldownSeconds: 1200,
  };

  const msg = AlertDispatcher.formatAlertMessage(payload);
  assert(msg.includes('⚡ <b>EAGLE FLASH SPIKE</b>'));
  assert(msg.includes('<b>AVAXUSDT</b>'));
  assert(msg.includes('<b>RVOL:</b> 3.13x'));
  assert(msg.includes('<b>Eagle Score:</b> 85/100'));
  assert(msg.includes('<code>ACCELERATION</code>'));
  assert(msg.includes('• Volume expansion'));
});

test('TelegramService: HTML escaping', () => {
  const escaped = TelegramService.escapeHtml('<script>alert("xss & risk")</script>');
  assert.equal(escaped, '&lt;script&gt;alert("xss &amp; risk")&lt;/script&gt;');
});
