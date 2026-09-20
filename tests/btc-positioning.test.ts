import test from 'node:test';
import assert from 'node:assert/strict';

import { BtcPositioningEngine } from '../services/positioning';
import { POSITIONING_CONFIG } from '../services/positioning/config';

// ============================================================================
// 1. Quadrant 1: Price ↑ + OI ↑ (LEVERAGE EXPANSION)
// ============================================================================
test('BtcPositioningEngine: Price ↑ + OI ↑ classifies as LEVERAGE_EXPANSION', () => {
  const engine = new BtcPositioningEngine();
  const snapshot = engine.evaluate({
    currentPrice: 82000,
    openInterestBtc: 110000,
    openInterestUsd: 9020000000,
    candles5m: [
      { open: 81000, close: 81500, volume: 100 },
      { open: 81500, close: 82000, volume: 150 },
    ],
    oiCandles5m: [
      { timestamp: Date.now() - 300000, openInterest: 108000 },
      { timestamp: Date.now(), openInterest: 110000 },
    ],
    takerBuyerRatio: 0.58, // 58% taker buys
    rvol: 1.9,
    fundingRate: 0.0001, // 0.01% baseline
    longLiquidations1hUsd: 100000,
    shortLiquidations1hUsd: 800000,
    dataTimestamp: Date.now(),
  });

  assert.equal(['LEVERAGE_EXPANSION', 'OI_ACCELERATION'].includes(snapshot.interpretation.state), true);
  assert.equal(snapshot.observation.priceChange5mPct > 0, true);
  assert.equal(snapshot.observation.oiChange5mPct > 0, true);
  assert.equal(snapshot.confirmation.takerConfirmation, 'CONFIRMED');
  assert.equal(snapshot.confirmation.volumeConfirmation, 'CONFIRMED');
  assert.equal(snapshot.confirmation.rvolConfirmation, 'CONFIRMED');
  assert.equal(snapshot.confirmation.fundingConfirmation, 'CONFIRMED');
  assert.equal(snapshot.confirmation.score >= 50, true);
  assert.equal(['CONFIRMED', 'ACCELERATION', 'WATCH', 'NEUTRAL'].includes(snapshot.setupState), true);
});

// ============================================================================
// 2. Quadrant 2: Price ↑ + OI ↓ (SHORT COVERING)
// ============================================================================
test('BtcPositioningEngine: Price ↑ + OI ↓ classifies as SHORT_COVERING', () => {
  const engine = new BtcPositioningEngine();
  const snapshot = engine.evaluate({
    currentPrice: 82000,
    openInterestBtc: 105000,
    openInterestUsd: 8610000000,
    candles5m: [
      { open: 81000, close: 81500, volume: 100 },
      { open: 81500, close: 82000, volume: 150 },
    ],
    oiCandles5m: [
      { timestamp: Date.now() - 300000, openInterest: 110000 },
      { timestamp: Date.now(), openInterest: 105000 },
    ],
    takerBuyerRatio: 0.53,
    rvol: 1.2,
    fundingRate: 0.00008,
    dataTimestamp: Date.now(),
  });

  assert.equal(snapshot.interpretation.state, 'SHORT_COVERING');
  assert.equal(snapshot.observation.priceChange5mPct > 0, true);
  assert.equal(snapshot.observation.oiChange5mPct < 0, true);
  assert.match(snapshot.interpretation.narrative, /Short covering/i);
});

// ============================================================================
// 3. Quadrant 3: Price ↓ + OI ↑ (BEARISH EXPANSION)
// ============================================================================
test('BtcPositioningEngine: Price ↓ + OI ↑ classifies as BEARISH_EXPANSION', () => {
  const engine = new BtcPositioningEngine();
  const snapshot = engine.evaluate({
    currentPrice: 78000,
    openInterestBtc: 115000,
    openInterestUsd: 8970000000,
    candles5m: [
      { open: 79000, close: 78500, volume: 120 },
      { open: 78500, close: 78000, volume: 180 },
    ],
    oiCandles5m: [
      { timestamp: Date.now() - 300000, openInterest: 112000 },
      { timestamp: Date.now(), openInterest: 115000 },
    ],
    takerBuyerRatio: 0.42, // 42% taker buyers = 58% sellers
    rvol: 1.5,
    fundingRate: -0.00005,
    dataTimestamp: Date.now(),
  });

  assert.equal(snapshot.interpretation.state, 'BEARISH_EXPANSION');
  assert.equal(snapshot.observation.priceChange5mPct < 0, true);
  assert.equal(snapshot.observation.oiChange5mPct > 0, true);
  assert.equal(snapshot.confirmation.takerConfirmation, 'CONFIRMED');
  assert.match(snapshot.interpretation.narrative, /Bearish expansion/i);
});

// ============================================================================
// 4. Quadrant 4: Price ↓ + OI ↓ (LONG UNWINDING / LIQUIDATION)
// ============================================================================
test('BtcPositioningEngine: Price ↓ + OI ↓ classifies as LONG_LIQUIDATION or DELEVERAGING', () => {
  const engine = new BtcPositioningEngine();
  const snapshot = engine.evaluate({
    currentPrice: 77000,
    openInterestBtc: 100000,
    openInterestUsd: 7700000000,
    candles5m: [
      { open: 79000, close: 78000, volume: 200 },
      { open: 78000, close: 77000, volume: 250 },
    ],
    oiCandles5m: [
      { timestamp: Date.now() - 300000, openInterest: 106000 },
      { timestamp: Date.now(), openInterest: 100000 },
    ],
    takerBuyerRatio: 0.44,
    rvol: 2.1,
    fundingRate: -0.0001,
    longLiquidations1hUsd: 15000000,
    shortLiquidations1hUsd: 500000,
    dataTimestamp: Date.now(),
  });

  assert.equal(['LONG_LIQUIDATION', 'DELEVERAGING'].includes(snapshot.interpretation.state), true);
  assert.equal(snapshot.observation.priceChange5mPct < 0, true);
  assert.equal(snapshot.observation.oiChange5mPct < 0, true);
  assert.equal(snapshot.confirmation.liquidationConfirmation, 'CONFIRMED');
});

// ============================================================================
// 5. Non-Simplistic Interpretation & Verification of Strict Taxonomy
// ============================================================================
test('BtcPositioningEngine: Strict separation of Observation, Interpretation, Confirmation, Setup', () => {
  const engine = new BtcPositioningEngine();
  const snapshot = engine.evaluate({
    currentPrice: 80000,
    openInterestBtc: 105000,
    openInterestUsd: 8400000000,
    candles5m: [{ open: 80000, close: 80000, volume: 50 }],
    takerBuyerRatio: 0.50,
    fundingRate: 0.0001,
    dataTimestamp: Date.now(),
  });

  // 1. Observation is factual
  assert.equal(typeof snapshot.observation.currentPrice, 'number');
  assert.equal(typeof snapshot.observation.openInterestBtc, 'number');
  assert.equal(typeof snapshot.observation.rvol, 'number');

  // 2. Interpretation is matrix quadrant
  assert.equal(typeof snapshot.interpretation.state, 'string');
  assert.equal(typeof snapshot.interpretation.narrative, 'string');
  // Must NEVER output simplistic claims like "Price ↑ + OI ↑ = BUY"
  assert.equal(snapshot.interpretation.narrative.includes('= BUY'), false);
  assert.equal(snapshot.interpretation.narrative.includes('= REVERSAL'), false);

  // 3. Confirmation layers
  assert.equal(typeof snapshot.confirmation.score, 'number');
  assert.equal(['CONFIRMED', 'NEUTRAL', 'WEAK', 'CONTRADICTING', 'UNAVAILABLE'].includes(snapshot.confirmation.priceConfirmation), true);

  // 4. Setup state
  assert.equal(['NEUTRAL', 'WATCH', 'CONFIRMED', 'ACCELERATION', 'EXTREME', 'EXHAUSTION', 'COOLING', 'REVERSAL_WATCH'].includes(snapshot.setupState), true);
});

// ============================================================================
// 6. Failsafe & Stale Data Degradation Protection
// ============================================================================
test('BtcPositioningEngine: Defensively marks UNAVAILABLE when data is stale (> 15000ms)', () => {
  const engine = new BtcPositioningEngine();
  const staleTimestamp = Date.now() - 25000; // 25s old
  const snapshot = engine.evaluate({
    currentPrice: 80000,
    openInterestBtc: 100000,
    openInterestUsd: 8000000000,
    dataTimestamp: staleTimestamp,
  });

  assert.equal(snapshot.dataQuality.isStale, true);
  assert.equal(snapshot.dataQuality.status, 'STALE');
  assert.equal(snapshot.interpretation.state, 'NEUTRAL');
  assert.equal(snapshot.confirmation.score, 0);
  assert.equal(snapshot.confirmation.priceConfirmation, 'UNAVAILABLE');
  assert.equal(snapshot.confirmation.oiConfirmation, 'UNAVAILABLE');
  assert.equal(snapshot.setupState, 'NEUTRAL');
  assert.match(snapshot.setupRationale, /UNCONFIRMED/i);
});

test('BtcPositioningEngine: Defensively marks UNAVAILABLE when open interest is 0', () => {
  const engine = new BtcPositioningEngine();
  const snapshot = engine.evaluate({
    currentPrice: 80000,
    openInterestBtc: 0,
    openInterestUsd: 0,
    dataTimestamp: Date.now(),
  });

  assert.equal(snapshot.dataQuality.status, 'UNAVAILABLE');
  assert.equal(snapshot.interpretation.state, 'NEUTRAL');
});

// ============================================================================
// 7. Multi-Timeframe Alignment
// ============================================================================
test('BtcPositioningEngine: Multi-timeframe node generation and consensus', () => {
  const engine = new BtcPositioningEngine();
  const snapshot = engine.evaluate({
    currentPrice: 80000,
    openInterestBtc: 105000,
    openInterestUsd: 8400000000,
    candles1m: [{ open: 79900, close: 80000, volume: 50 }],
    candles5m: [{ open: 79800, close: 80000, volume: 150 }],
    candles15m: [{ open: 79500, close: 80000, volume: 400 }],
    candles1h: [{ open: 79000, close: 80000, volume: 1200 }],
    candles4h: [{ open: 78000, close: 80000, volume: 4000 }],
    oiCandles5m: [{ timestamp: Date.now() - 300000, openInterest: 104000 }, { timestamp: Date.now(), openInterest: 105000 }],
    takerBuyerRatio: 0.55,
    fundingRate: 0.0001,
    dataTimestamp: Date.now(),
  });

  assert.equal(snapshot.mtf.timeframes.length, 6);
  assert.equal(snapshot.mtf.timeframes.some(t => t.timeframe === '1m'), true);
  assert.equal(snapshot.mtf.timeframes.some(t => t.timeframe === '5m'), true);
  assert.equal(snapshot.mtf.timeframes.some(t => t.timeframe === '15m'), true);
  assert.equal(snapshot.mtf.timeframes.some(t => t.timeframe === '1h'), true);
  assert.equal(snapshot.mtf.timeframes.some(t => t.timeframe === '4h'), true);
  assert.equal(['ALIGNED', 'STRONG_ALIGNMENT', 'MIXED', 'DIVERGENT'].includes(snapshot.mtf.state), true);
});
