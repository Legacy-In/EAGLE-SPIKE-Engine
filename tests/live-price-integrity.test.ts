import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { LivePriceService } from '../backend/engine/live-prices.js';

describe('Signal Journal Live Price & Market Integrity Test Suite', () => {
  // Requirement 14: Invariant Test
  test('Invariant: Current ROI must strictly match calculateROI(direction, entry, current)', () => {
    // Test Long
    const entryLong = 148.5;
    const currentLong = 120.77;
    const roiLong = LivePriceService.calculateROI('LONG', entryLong, currentLong);
    const expectedLong = parseFloat((((currentLong - entryLong) / entryLong) * 100).toFixed(2));
    assert.equal(roiLong, expectedLong);
    assert.equal(roiLong, -18.67);

    // Test Short
    const entryShort = 6.45;
    const currentShort = 1.932;
    const roiShort = LivePriceService.calculateROI('SHORT', entryShort, currentShort);
    const expectedShort = parseFloat((((entryShort - currentShort) / entryShort) * 100).toFixed(2));
    assert.equal(roiShort, expectedShort);
    assert.equal(roiShort, 70.05);

    // Zero disagreement invariant: If current equals entry, ROI must be exactly 0
    assert.equal(LivePriceService.calculateROI('LONG', 28.40, 28.40), 0);
    assert.equal(LivePriceService.calculateROI('SHORT', 28.40, 28.40), 0);
  });

  // Requirement 15: Cross-Exchange Verification
  test('Cross-Exchange Quote Resolution: SOL, AVAX, NEAR, RENDER, PEPE', async () => {
    // 1. Bybit Linear: SOLUSDT
    const solQuote = await LivePriceService.getLivePrice('BYBIT', 'SOLUSDT');
    assert.ok(solQuote.price !== null && solQuote.price > 50 && solQuote.price < 300, `SOL price out of reasonable bounds: ${solQuote.price}`);
    assert.equal(solQuote.exchange, 'BYBIT');
    assert.equal(solQuote.marketId, 'BYBIT:SOLUSDT');

    // 2. Bybit Linear: AVAXUSDT
    const avaxQuote = await LivePriceService.getLivePrice('BYBIT', 'AVAXUSDT');
    assert.ok(avaxQuote.price !== null && avaxQuote.price > 5 && avaxQuote.price < 50, `AVAX price out of reasonable bounds: ${avaxQuote.price}`);
    assert.equal(avaxQuote.exchange, 'BYBIT');

    // 3. Binance Futures: NEARUSDT
    const nearQuote = await LivePriceService.getLivePrice('BINANCE', 'NEARUSDT');
    assert.ok(nearQuote.price !== null && nearQuote.price > 1 && nearQuote.price < 20, `NEAR price out of reasonable bounds: ${nearQuote.price}`);
    assert.equal(nearQuote.exchange, 'BINANCE');

    // 4. MEXC Contract: RENDER_USDT
    const renderQuote = await LivePriceService.getLivePrice('MEXC', 'RENDERUSDT');
    assert.ok(renderQuote.price !== null && renderQuote.price > 0.5 && renderQuote.price < 15, `RENDER price out of reasonable bounds: ${renderQuote.price}`);
    assert.equal(renderQuote.exchange, 'MEXC');

    // 5. WEEX / 1000PEPE scaled: PEPEUSDT
    const pepeQuote = await LivePriceService.getLivePrice('WEEX', 'PEPEUSDT');
    assert.ok(pepeQuote.price !== null && pepeQuote.price > 0.0000001 && pepeQuote.price < 0.001, `PEPE price out of reasonable bounds: ${pepeQuote.price}`);
    assert.equal(pepeQuote.exchange, 'WEEX');
  });

  // Requirement 16: Stale-Price Classification Test
  test('Data Quality Tiers: Classify LIVE, FRESH, DEGRADED, STALE, UNAVAILABLE', () => {
    // <= 5s -> LIVE
    assert.equal(LivePriceService.classifyQuality(3000), 'LIVE');
    // <= 30s -> FRESH
    assert.equal(LivePriceService.classifyQuality(15000), 'FRESH');
    // <= 60s -> DEGRADED
    assert.equal(LivePriceService.classifyQuality(45000), 'DEGRADED');
    // <= 300s -> STALE
    assert.equal(LivePriceService.classifyQuality(120000), 'STALE');
    // > 300s -> UNAVAILABLE
    assert.equal(LivePriceService.classifyQuality(400000), 'UNAVAILABLE');
    assert.equal(LivePriceService.classifyQuality(-1), 'UNAVAILABLE');
    assert.equal(LivePriceService.classifyQuality(NaN), 'UNAVAILABLE');
  });

  // Requirement 17: Wrong-Symbol & Micro-Asset Test
  test('Symbol Disambiguation: RENDER vs RNDR & PEPE scaling', async () => {
    // Ensure MEXC contract resolves RENDER_USDT
    const renderQuote = await LivePriceService.getLivePrice('MEXC', 'RENDERUSDT');
    assert.ok(renderQuote.price !== null);
    // RENDER perpetual trades near ~$1.9, distinct from obsolete RNDR ticker
    assert.ok(renderQuote.price < 10.0, `Expected RENDER perpetual < $10, got ${renderQuote.price}`);

    // Ensure PEPE scaling (1/1000 for 1000PEPE contracts)
    const pepeQuote = await LivePriceService.getLivePrice('WEEX', 'PEPEUSDT');
    assert.ok(pepeQuote.price !== null);
    assert.ok(pepeQuote.price < 0.0001, `PEPE should be sub-cent micro asset (< $0.0001), got ${pepeQuote.price}`);
  });

  // Requirement 18: Anti-Fallback Guard Test
  test('Anti-Fallback Guard: current_price must NEVER fall back to historical entry or exit price', async () => {
    const historicalEntry = 28.40;
    const historicalExit = 30.60;
    const quote = await LivePriceService.getLivePrice('BYBIT', 'AVAXUSDT');

    // Live price must be the authentic market price, not historical entry/exit
    assert.notEqual(quote.price, historicalEntry, 'Live market quote should not match static historical entry');
    assert.notEqual(quote.price, historicalExit, 'Live market quote should not match static historical exit');
    assert.ok(quote.price !== null && quote.price > 0);
  });

  // Formatting Test: Micro-Asset dynamic decimals
  test('Dynamic Decimal Formatting: PEPE must never display $0.0000', () => {
    assert.equal(LivePriceService.formatPrice(0.00000445), '$0.00000445');
    assert.notEqual(LivePriceService.formatPrice(0.00000445), '$0.0000');
    assert.equal(LivePriceService.formatPrice(0.005432), '$0.005432');
    assert.equal(LivePriceService.formatPrice(1.932), '$1.93');
    assert.equal(LivePriceService.formatPrice(120.77), '$120.77');
    assert.equal(LivePriceService.formatPrice(65432.1), '$65,432.10');
  });
});
