import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  calculateEMA,
  calculateRSI,
  calculateADX,
  calculateDynamicRange,
  generateDeltaNeutralHedge,
  getBtcDerivativesIntelligence
} from '../backend/services/btc-hedge-engine.mjs';

describe('🦅 BTC Perpetual Hedge Signal & Quantitative Engine Test Suite', () => {

  // Test 1: 200 EMA Calculation
  test('1. 200 EMA: computes exponential moving average with mathematical precision', () => {
    // Generate synthetic 250 price points gradually increasing from 60000 to 70000
    const prices = [];
    for (let i = 0; i < 250; i++) {
      prices.push(60000 + (i * 40));
    }
    const ema200 = calculateEMA(prices, 200);
    assert.ok(ema200 !== null, 'EMA200 must not be null for >=200 samples');
    assert.ok(ema200 > 60000 && ema200 < 70000, `EMA (${ema200}) must be bounded within price series`);
    
    // Insufficient data returns null
    const shortPrices = [65000, 65100, 65200];
    assert.strictEqual(calculateEMA(shortPrices, 200), null, 'Insufficient samples must return null');
  });

  // Test 2: RSI 14-period Wilder's Smoothing
  test('2. RSI (14): calculates bounded momentum values (0-100) and detects extremes', () => {
    // Upward trend: should have RSI > 60
    const bullCloses = [];
    for (let i = 0; i < 50; i++) {
      bullCloses.push(60000 + i * 200);
    }
    const bullRsi = calculateRSI(bullCloses, 14);
    assert.ok(bullRsi > 60, `Bullish series should have RSI > 60, got ${bullRsi}`);
    assert.ok(bullRsi <= 100, 'RSI cannot exceed 100');

    // Downward trend: should have RSI < 40
    const bearCloses = [];
    for (let i = 0; i < 50; i++) {
      bearCloses.push(70000 - i * 200);
    }
    const bearRsi = calculateRSI(bearCloses, 14);
    assert.ok(bearRsi < 40, `Bearish series should have RSI < 40, got ${bearRsi}`);
    assert.ok(bearRsi >= 0, 'RSI cannot be below 0');

    // Insufficient samples fallback
    assert.strictEqual(calculateRSI([65000, 65100], 14), 50.0);
  });

  // Test 3: ADX 14-period Trend Strength
  test('3. ADX (14): correctly computes trend strength and directional indicators (+DI, -DI)', () => {
    const klines = [];
    for (let i = 0; i < 60; i++) {
      const base = 65000 + i * 150;
      klines.push({
        high: base + 200,
        low: base - 100,
        close: base + 100,
        volume: 1500
      });
    }

    const adxResult = calculateADX(klines, 14);
    assert.ok(typeof adxResult.adx === 'number', 'ADX must be a number');
    assert.ok(typeof adxResult.plusDI === 'number', '+DI must be a number');
    assert.ok(typeof adxResult.minusDI === 'number', '-DI must be a number');
    assert.ok(adxResult.plusDI > adxResult.minusDI, 'Upward series must have +DI > -DI');
    assert.ok(['EXTREME_TREND', 'STRONG_TREND', 'MODERATE_TREND', 'CONSOLIDATION_CHOP'].includes(adxResult.trendStrength));
  });

  // Test 4: Dynamic Range & Support/Resistance Detection
  test('4. Dynamic Range: derives local swing levels and market structure without static hardcoding', () => {
    const klines = [];
    for (let i = 0; i < 100; i++) {
      // Oscillate within a range between 64000 and 68000
      const base = 66000 + Math.sin(i / 5) * 2000;
      klines.push({
        high: base + 300,
        low: base - 300,
        close: base,
        volume: 2000
      });
    }

    const currentPrice = 66000;
    const range = calculateDynamicRange(klines, currentPrice);

    assert.ok(range.rangeHigh > range.rangeLow, 'Range High must exceed Range Low');
    assert.ok(range.resistance1 > currentPrice, `Resistance 1 (${range.resistance1}) must be above current price (${currentPrice})`);
    assert.ok(range.resistance2 > range.resistance1, 'Resistance 2 must be above Resistance 1');
    assert.ok(range.support1 < currentPrice, `Support 1 (${range.support1}) must be below current price (${currentPrice})`);
    assert.ok(range.support2 < range.support1, 'Support 2 must be below Support 1');
    assert.ok(['CONSOLIDATION', 'BREAKOUT_WATCH'].includes(range.marketStructure));
    assert.ok(range.rangeSpanPct > 0, 'Range Span % must be positive');
  });

  // Test 5: Delta-Neutral Sizing & Risk Management for $1,000–$2,000 Capital
  test('5. Delta-Neutral Sizing: allocates $500 Long / $500 Short at 5x Isolated with >40% cushion', () => {
    const currentPrice = 67500;
    const mockRange = {
      resistance2: 70800,
      resistance1: 69200,
      support1: 65800,
      support2: 64200,
      rangeHigh: 70000,
      rangeLow: 65000,
      marketStructure: 'CONSOLIDATION',
      rangeSpanPct: 7.4
    };

    const hedge = generateDeltaNeutralHedge(currentPrice, mockRange, 1500);

    // 1. Capital Profile
    assert.strictEqual(hedge.capitalProfile.totalCapital, 1500);
    assert.strictEqual(hedge.capitalProfile.allocatedMargin, 1000, 'Allocated margin must be exactly $1,000 ($500 per leg)');
    assert.strictEqual(hedge.capitalProfile.reserveCapital, 500, 'Reserve capital must be $500');
    assert.strictEqual(hedge.capitalProfile.leverage, '5x Isolated');

    // 2. Long Position
    assert.strictEqual(hedge.longPosition.marginUsd, 500);
    assert.strictEqual(hedge.longPosition.leverage, 5);
    assert.strictEqual(hedge.longPosition.notionalUsd, 2500, '5x on $500 margin must be $2,500 notional');
    assert.ok(hedge.longPosition.entryZone.min < currentPrice, 'Long entry must be below current price');
    assert.strictEqual(hedge.longPosition.targets.length, 3, 'Long must have 3 staged targets');
    assert.ok(hedge.longPosition.targets[0].price > currentPrice, 'TP1 must be higher than current price');
    assert.ok(hedge.longPosition.stopLoss.price < hedge.longPosition.entryZone.min, 'SL must be below entry');
    assert.ok(hedge.longPosition.liquidationBufferPct >= 40, 'Long liquidation buffer must exceed 40%');

    // 3. Short Position
    assert.strictEqual(hedge.shortPosition.marginUsd, 500);
    assert.strictEqual(hedge.shortPosition.leverage, 5);
    assert.strictEqual(hedge.shortPosition.notionalUsd, 2500, '5x on $500 margin must be $2,500 notional');
    assert.ok(hedge.shortPosition.entryZone.max > currentPrice, 'Short entry must be above current price');
    assert.strictEqual(hedge.shortPosition.targets.length, 3, 'Short must have 3 staged targets');
    assert.ok(hedge.shortPosition.targets[0].price < currentPrice, 'Short TP1 must be lower than current price');
    assert.ok(hedge.shortPosition.stopLoss.price > hedge.shortPosition.entryZone.max, 'Short SL must be above entry');
    assert.ok(hedge.shortPosition.liquidationBufferPct >= 40, 'Short liquidation buffer must exceed 40%');

    // 4. Parity
    assert.strictEqual(hedge.longPosition.notionalUsd, hedge.shortPosition.notionalUsd, 'Net nominal delta must be balanced');
  });

  // Test 6: getBtcDerivativesIntelligence live / offline contract
  test('6. Market Intelligence Snapshot: produces complete telemetry contract with resilient fallback', async () => {
    const snapshot = await getBtcDerivativesIntelligence();

    assert.ok(['ONLINE', 'FALLBACK_CACHED'].includes(snapshot.status));
    assert.strictEqual(snapshot.symbol, 'BTCUSDT');
    assert.ok(snapshot.price > 10000, 'BTC price must be realistic');
    assert.ok(snapshot.technicalHealth !== null);
    assert.ok(typeof snapshot.technicalHealth.ema200 === 'number');
    assert.ok(typeof snapshot.technicalHealth.rsi14 === 'number');
    assert.ok(typeof snapshot.technicalHealth.adx === 'number');
    assert.ok(typeof snapshot.technicalHealth.fundingRate.ratePct === 'number');
    assert.ok(typeof snapshot.technicalHealth.openInterest.delta24hPct === 'number');
    assert.ok(snapshot.dynamicRange !== null);
    assert.ok(snapshot.hedgeStrategy !== null);
  });

});
