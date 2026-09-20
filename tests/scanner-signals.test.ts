import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ScannerMathEngine } from '../backend/engine/math';
import { StatefulSignalEngine } from '../backend/engine/signals';
import { NormalizedTicker } from '../backend/types';

test('Scanner Math: RVOL and Z-Score calculation', () => {
  const rvol = ScannerMathEngine.calculateRvol(5000000, 2000000);
  assert.equal(rvol, 2.5);

  const z = ScannerMathEngine.calculateZScore(6000000, 2000000, 1000000);
  assert.equal(z, 4.0);
});

test('Scanner Math: Standardized Eagle Score bounds and factor weighting', () => {
  const highConvictionTicker: NormalizedTicker = {
    symbol: 'SOLUSDT',
    exchange: 'BYBIT',
    lastPrice: 180,
    markPrice: 180,
    indexPrice: 180,
    price24hChange: 8.5,
    high24h: 185,
    low24h: 165,
    turnover24h: 45000000,
    volume24h: 250000,
    previous24hVolume: 20000000,
    volumeChange24h: 125,
    returns5m: 2.1,
    returns15m: 4.5,
    returns1h: 6.8,
    relativeVolume: 3.2,
    volumeZScore: 3.5,
    openInterestValue: 80000000,
    oiChangePct: 6.2,
    fundingRate: 0.0002,
    bidPrice: 180.0,
    askPrice: 180.02,
    spreadPct: 0.01,
    takerImbalance: 42,
    rsi: 68,
    trend: 'STRONG BULLISH',
    signalScore: 50,
    spikePhase: 'NORMAL',
    spikeType: 'VOLUME_BREAKOUT',
    spikeQuality: 'HIGH_CONVICTION',
    lastUpdated: Date.now(),
  };

  const score = ScannerMathEngine.calculateEagleScore(highConvictionTicker);
  assert.ok(score >= 75, `Expected score >= 75, got ${score}`);
  assert.ok(score <= 99, `Score must not exceed 99, got ${score}`);
});

test('Stateful Signal Engine: Emits when Eagle Score >= 65 AND RVOL >= 2.0x AND OI Δ > +3%', () => {
  const engine = new StatefulSignalEngine();
  engine.reset();

  const qualifyingTicker: NormalizedTicker = {
    symbol: 'AVAXUSDT',
    exchange: 'BYBIT',
    lastPrice: 28.5,
    markPrice: 28.5,
    indexPrice: 28.5,
    price24hChange: 5.2,
    high24h: 29.0,
    low24h: 26.5,
    turnover24h: 15000000,
    volume24h: 500000,
    previous24hVolume: 8000000,
    volumeChange24h: 87.5,
    returns5m: 1.8,
    returns15m: 3.2,
    returns1h: 4.5,
    relativeVolume: 2.4, // >= 2.0x
    volumeZScore: 2.2,
    openInterestValue: 12000000,
    oiChangePct: 4.5,    // > +3%
    fundingRate: 0.0001,
    bidPrice: 28.49,
    askPrice: 28.51,
    spreadPct: 0.07,
    takerImbalance: 30,
    rsi: 64,
    trend: 'BULLISH',
    signalScore: 72,      // >= 65
    spikePhase: 'ACCELERATION',
    spikeType: 'VOLUME_BREAKOUT',
    spikeQuality: 'CLEAN_BREAKOUT',
    lastUpdated: Date.now(),
  };

  const signal = engine.evaluateTicker(qualifyingTicker);
  assert.ok(signal !== null, 'Signal must be emitted for qualifying ticker');
  assert.equal(signal?.symbol, 'AVAXUSDT');
  assert.equal(signal?.direction, 'LONG');
  assert.equal(signal?.triggerPrice, 28.5);
  assert.equal(signal?.status, 'ACTIVE');
  assert.equal(signal?.eagleScore, 72);
});

test('Stateful Signal Engine: Rejects when any threshold is unmet', () => {
  const engine = new StatefulSignalEngine();
  engine.reset();

  // Low RVOL (1.4x < 2.0x)
  const lowRvolTicker: NormalizedTicker = {
    symbol: 'NEARUSDT',
    exchange: 'BYBIT',
    lastPrice: 5.2,
    markPrice: 5.2,
    indexPrice: 5.2,
    price24hChange: 4.0,
    high24h: 5.5,
    low24h: 4.8,
    turnover24h: 8000000,
    volume24h: 1500000,
    previous24hVolume: 6000000,
    volumeChange24h: 33,
    returns5m: 0.5,
    returns15m: 1.2,
    returns1h: 2.0,
    relativeVolume: 1.4, // < 2.0
    volumeZScore: 1.2,
    openInterestValue: 5000000,
    oiChangePct: 5.0,    // > 3.0
    fundingRate: 0.0001,
    bidPrice: 5.19,
    askPrice: 5.21,
    spreadPct: 0.04,
    takerImbalance: 20,
    rsi: 58,
    trend: 'BULLISH',
    signalScore: 70,      // >= 65
    spikePhase: 'NORMAL',
    spikeType: 'VOLUME_BREAKOUT',
    spikeQuality: 'CLEAN_BREAKOUT',
    lastUpdated: Date.now(),
  };

  const signal = engine.evaluateTicker(lowRvolTicker);
  assert.equal(signal, null, 'Must not trigger signal when RVOL < 2.0x');
});

test('Stateful Signal Engine: Strict 15-minute deduplication cooldown per symbol', () => {
  const engine = new StatefulSignalEngine();
  engine.reset();

  const ticker: NormalizedTicker = {
    symbol: 'SUIUSDT',
    exchange: 'BYBIT',
    lastPrice: 3.4,
    markPrice: 3.4,
    indexPrice: 3.4,
    price24hChange: 7.2,
    high24h: 3.5,
    low24h: 3.1,
    turnover24h: 25000000,
    volume24h: 7000000,
    previous24hVolume: 10000000,
    volumeChange24h: 150,
    returns5m: 2.0,
    returns15m: 4.1,
    returns1h: 6.0,
    relativeVolume: 2.8,
    volumeZScore: 2.9,
    openInterestValue: 30000000,
    oiChangePct: 5.5,
    fundingRate: 0.0002,
    bidPrice: 3.399,
    askPrice: 3.401,
    spreadPct: 0.03,
    takerImbalance: 38,
    rsi: 67,
    trend: 'STRONG BULLISH',
    signalScore: 82,
    spikePhase: 'ACCELERATION',
    spikeType: 'VOLUME_BREAKOUT',
    spikeQuality: 'HIGH_CONVICTION',
    lastUpdated: Date.now(),
  };

  // 1st evaluation -> triggers
  const firstSignal = engine.evaluateTicker(ticker);
  assert.ok(firstSignal !== null, 'First evaluation should trigger');

  // 2nd evaluation immediately -> blocked by 15m cooldown
  const secondSignal = engine.evaluateTicker(ticker);
  assert.equal(secondSignal, null, 'Immediate duplicate must be suppressed by cooldown');
});

test('Stateful Signal Engine: Forward excursion (MFE / MAE) tracking', () => {
  const engine = new StatefulSignalEngine();
  engine.reset();

  const ticker: NormalizedTicker = {
    symbol: 'DOTUSDT',
    exchange: 'BYBIT',
    lastPrice: 8.0,
    markPrice: 8.0,
    indexPrice: 8.0,
    price24hChange: 6.0,
    high24h: 8.2,
    low24h: 7.5,
    turnover24h: 12000000,
    volume24h: 1500000,
    previous24hVolume: 5000000,
    volumeChange24h: 140,
    returns5m: 2.0,
    returns15m: 3.5,
    returns1h: 5.0,
    relativeVolume: 2.5,
    volumeZScore: 2.6,
    openInterestValue: 15000000,
    oiChangePct: 4.8,
    fundingRate: 0.0001,
    bidPrice: 7.99,
    askPrice: 8.01,
    spreadPct: 0.03,
    takerImbalance: 32,
    rsi: 65,
    trend: 'BULLISH',
    signalScore: 78,
    spikePhase: 'BREAKOUT',
    spikeType: 'VOLUME_BREAKOUT',
    spikeQuality: 'CLEAN_BREAKOUT',
    lastUpdated: Date.now(),
  };

  engine.evaluateTicker(ticker);

  // Price rallies from $8.0 to $8.28 (+3.5%)
  ticker.lastPrice = 8.28;
  engine.updateExistingSignal(ticker);

  const signals = engine.getSignals();
  assert.equal(signals.length, 1);
  assert.equal(signals[0].highestPriceSinceTrigger, 8.28);
  assert.equal(signals[0].mfePct, 3.5);
  assert.equal(signals[0].status, 'TARGET_HIT');
});
