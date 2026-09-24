import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StatefulSignalEngine } from '../backend/engine/signals';
import { NormalizedTicker } from '../backend/types';

test('Synthetic Bearish Breakdown: Correctly detects SHORT candidate', () => {
  const engine = new StatefulSignalEngine();
  engine.reset();

  const syntheticBearishTicker: NormalizedTicker = {
    symbol: 'ETHUSDT',
    exchange: 'BYBIT',
    lastPrice: 2450.0,
    markPrice: 2450.0,
    indexPrice: 2450.0,
    price24hChange: -3.5, // 24h negative
    high24h: 2600.0,
    low24h: 2440.0,
    turnover24h: 85000000,
    volume24h: 35000,
    previous24hVolume: 35000000,
    volumeChange24h: 142.8,
    returns5m: -2.1,  // Sharp negative 5m drop
    returns15m: -3.8, // Sustained negative 15m drop
    returns1h: -4.5,
    relativeVolume: 2.8, // >= 2.0x threshold
    volumeZScore: 3.1,
    openInterestValue: 120000000,
    oiChangePct: 5.4,    // Open interest surging on breakdown (> +3%)
    fundingRate: 0.0003,
    bidPrice: 2449.8,
    askPrice: 2450.0,
    spreadPct: 0.01,
    takerImbalance: -45, // Heavy taker sell pressure
    rsi: 28,             // Oversold momentum breakdown
    trend: 'BEARISH',
    signalScore: 78,     // >= 65 qualifying score
    spikePhase: 'ACCELERATION',
    spikeType: 'VOLUME_BREAKOUT',
    spikeQuality: 'CLEAN_BREAKOUT',
    lastUpdated: Date.now(),
  };

  console.log('\n--- INPUT: Synthetic Bearish Breakdown Ticker ---');
  console.log(JSON.stringify({
    symbol: syntheticBearishTicker.symbol,
    returns5m: syntheticBearishTicker.returns5m,
    returns15m: syntheticBearishTicker.returns15m,
    rvol: syntheticBearishTicker.relativeVolume,
    oiChangePct: syntheticBearishTicker.oiChangePct,
    signalScore: syntheticBearishTicker.signalScore,
    spikePhase: syntheticBearishTicker.spikePhase,
  }, null, 2));

  const signal = engine.evaluateTicker(syntheticBearishTicker);

  console.log('\n--- OUTPUT: Detected Signal Result ---');
  console.log(JSON.stringify(signal, null, 2));

  assert.ok(signal !== null, 'Signal must be emitted for qualifying breakdown');
  assert.equal(signal?.direction, 'SHORT', 'Signal direction must be SHORT');
  assert.equal(signal?.symbol, 'ETHUSDT');
  assert.equal(signal?.status, 'ACTIVE');
  assert.equal(signal?.triggerPrice, 2450.0);
  assert.ok((signal?.eagleScore || 0) >= 70);
});

test('Synthetic Bearish Breakdown (Counter-trend dump with 24h green): Correctly detects SHORT', () => {
  const engine = new StatefulSignalEngine();
  engine.reset();

  // Price was +1.2% over 24h, but is dumping hard right now (-1.8% 5m)
  const counterTrendBearTicker: NormalizedTicker = {
    symbol: 'SOLUSDT',
    exchange: 'BYBIT',
    lastPrice: 145.0,
    markPrice: 145.0,
    indexPrice: 145.0,
    price24hChange: 1.2, // Still green on 24h
    high24h: 155.0,
    low24h: 140.0,
    turnover24h: 60000000,
    volume24h: 400000,
    previous24hVolume: 25000000,
    volumeChange24h: 140,
    returns5m: -2.4,  // Aggressive rejection / dump
    returns15m: -3.1,
    returns1h: -1.5,
    relativeVolume: 3.0,
    volumeZScore: 2.8,
    openInterestValue: 90000000,
    oiChangePct: 4.8,
    fundingRate: -0.0001,
    bidPrice: 144.95,
    askPrice: 145.05,
    spreadPct: 0.07,
    takerImbalance: -38,
    rsi: 32,
    trend: 'BEARISH',
    signalScore: 74,
    spikePhase: 'ACCELERATION',
    spikeType: 'VOLUME_BREAKOUT',
    spikeQuality: 'CLEAN_BREAKOUT',
    lastUpdated: Date.now(),
  };

  const signal = engine.evaluateTicker(counterTrendBearTicker);

  assert.ok(signal !== null, 'Signal must be emitted for counter-trend breakdown');
  assert.equal(signal?.direction, 'SHORT', 'Counter-trend dump must classify as SHORT, not LONG');
});
