import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ScannerMathEngine } from '../backend/engine/math';

test('ATR Math: Standard 15m ATR14 Long and Short Targets & Stops', () => {
  const entryPrice = 100.00;
  const atr14 = 1.80;

  // 1. LONG Calculation
  const longResult = ScannerMathEngine.calculateAtrStopsAndTargets({
    entryPrice,
    atr14,
    direction: 'LONG',
    tickSize: 0.01,
  });

  // Raw stop = 1.5 * 1.8 = 2.70 (2.7%), which is within [2.0%, 3.5%]
  assert.equal(longResult.stopPrice, 97.30);
  assert.equal(longResult.target1Price, 102.16); // 100 + 1.2 * 1.8 = 102.16
  assert.equal(longResult.target2Price, 104.50); // 100 + 2.5 * 1.8 = 104.50
  assert.equal(longResult.target3Price, 109.00); // 100 + 5.0 * 1.8 = 109.00
  assert.equal(longResult.stopLossPct, 2.70);

  // 2. SHORT Calculation
  const shortResult = ScannerMathEngine.calculateAtrStopsAndTargets({
    entryPrice,
    atr14,
    direction: 'SHORT',
    tickSize: 0.01,
  });

  assert.equal(shortResult.stopPrice, 102.70);
  assert.equal(shortResult.target1Price, 97.84);  // 100 - 1.2 * 1.8 = 97.84
  assert.equal(shortResult.target2Price, 95.50);  // 100 - 2.5 * 1.8 = 95.50
  assert.equal(shortResult.target3Price, 91.00);  // 100 - 5.0 * 1.8 = 91.00
  assert.equal(shortResult.stopLossPct, 2.70);
});

test('ATR Math: Clamp Bounds (2.0% minimum and 3.5% maximum)', () => {
  const entryPrice = 100.00;

  // Low volatility: raw stop = 1.5 * 0.5 = 0.75 (0.75% < 2.0%) -> clamped to 2.0%
  const lowVol = ScannerMathEngine.calculateAtrStopsAndTargets({
    entryPrice,
    atr14: 0.5,
    direction: 'LONG',
    tickSize: 0.01,
  });
  assert.equal(lowVol.stopPrice, 98.00); // 100 - 2.0%
  assert.equal(lowVol.stopLossPct, 2.00);

  // High volatility: raw stop = 1.5 * 5.0 = 7.50 (7.5% > 3.5%) -> clamped to 3.5%
  const highVol = ScannerMathEngine.calculateAtrStopsAndTargets({
    entryPrice,
    atr14: 5.0,
    direction: 'LONG',
    tickSize: 0.01,
  });
  assert.equal(highVol.stopPrice, 96.50); // 100 - 3.5%
  assert.equal(highVol.stopLossPct, 3.50);
});

test('ATR Math: Tick-size rounding precision', () => {
  // BTC with 0.1 tick size
  const btcResult = ScannerMathEngine.calculateAtrStopsAndTargets({
    entryPrice: 65432.10,
    atr14: 854.33,
    direction: 'LONG',
    tickSize: 0.1,
  });

  // Verify prices round to 1 decimal place (0.1 tick size)
  assert.equal(btcResult.stopPrice, Number(btcResult.stopPrice.toFixed(1)));
  assert.equal(btcResult.target1Price, Number(btcResult.target1Price.toFixed(1)));
  assert.equal(btcResult.target2Price, Number(btcResult.target2Price.toFixed(1)));
  assert.equal(btcResult.target3Price, Number(btcResult.target3Price.toFixed(1)));
});
