import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  generateDeterministicFallbackKlines,
  fetchHistoricalKlines,
  runHedgeBacktest,
  executeHistoricalBacktest
} from '../backend/services/btc-backtest-engine.mjs';

describe('🧪 BTC Perpetual Hedge Historical Backtesting Engine Test Suite', () => {

  // Test 1: Deterministic Fallback Dataset Generation
  test('1. Fallback Dataset: generates mathematically valid 1h candles with proper OHLC bounds', () => {
    const klines7d = generateDeterministicFallbackKlines(7);
    assert.strictEqual(klines7d.length, 7 * 24, '7 days must equal exactly 168 hours');

    const klines15d = generateDeterministicFallbackKlines(15);
    assert.strictEqual(klines15d.length, 15 * 24, '15 days must equal exactly 360 hours');

    const klines30d = generateDeterministicFallbackKlines(30);
    assert.strictEqual(klines30d.length, 30 * 24, '30 days must equal exactly 720 hours');

    // Check OHLC integrity
    for (const k of klines15d) {
      assert.ok(k.high >= Math.max(k.open, k.close), 'High must be >= max(open, close)');
      assert.ok(k.low <= Math.min(k.open, k.close), 'Low must be <= min(open, close)');
      assert.ok(k.volume > 0, 'Volume must be positive');
      assert.ok(typeof k.time === 'number', 'Time must be a number');
    }
  });

  // Test 2: Resilient Kline Fetching with Rate-Limit Protection
  test('2. Resilient Kline Fetcher: returns valid candle series and handles API limits gracefully', async () => {
    const { klines, isFallback } = await fetchHistoricalKlines(15);

    assert.ok(Array.isArray(klines), 'Klines must be an array');
    assert.ok(klines.length >= 100, 'Must have at least 100 candles for backtesting');
    assert.ok(typeof isFallback === 'boolean', 'isFallback must be boolean');
  });

  // Test 3: Backtest Simulation Execution & Fee/Slippage Mechanics
  test('3. Simulation Loop: starts with $1,000, applies slippage & exchange fees, and logs trades', () => {
    const klines = generateDeterministicFallbackKlines(15);
    const result = runHedgeBacktest(klines, { initialCapital: 1000.0, includeSlippage: true });

    // 1. Initial State
    assert.strictEqual(result.initialCapital, 1000.0);
    assert.ok(typeof result.finalCapital === 'number');
    assert.ok(typeof result.totalNetProfitUsd === 'number');
    assert.strictEqual(
      result.totalNetProfitUsd,
      Number((result.finalCapital - 1000.0).toFixed(2)),
      'Net profit must equal finalCapital - 1000'
    );

    // 2. Fee & Slippage Verification
    assert.ok(result.totalFeesAndSlippageUsd > 0, 'Total fees and slippage must be accounted for');

    // 3. Trade Metrics
    assert.ok(result.totalTrades >= 0, 'Total trades must be >= 0');
    if (result.totalTrades > 0) {
      assert.strictEqual(
        result.totalTrades,
        result.winningTrades + result.losingTrades,
        'Total trades must equal winning + losing trades'
      );
      assert.ok(result.winRatePct >= 0 && result.winRatePct <= 100, 'Win rate must be between 0 and 100%');
      assert.ok(result.profitFactor >= 0, 'Profit factor must be non-negative');
    }

    // 4. Equity Curve
    assert.ok(result.equityCurve.length >= 2, 'Equity curve must have at least 2 points');
    assert.strictEqual(result.equityCurve[0].equity, 1000.0, 'First equity point must be exactly $1,000.00');
    assert.ok(result.maxDrawdownPct >= 0, 'Max Drawdown % must be non-negative');

    // 5. Trade Log Structure
    if (result.trades.length > 0) {
      const sample = result.trades[0];
      assert.ok(sample.id, 'Trade must have an id');
      assert.ok(['RANGE_HARVEST', 'BREAKOUT_EVENT'].includes(sample.type));
      assert.ok(typeof sample.pnlUsd === 'number');
      assert.ok(typeof sample.slippageUsd === 'number');
      assert.ok(typeof sample.feesUsd === 'number');
      assert.ok(sample.reason.length > 0, 'Trade must have a trigger reason');
    }
  });

  // Test 4: Slippage Impact Comparison
  test('4. Slippage Impact: including slippage realistically reduces gross profit compared to zero-slippage', () => {
    const klines = generateDeterministicFallbackKlines(15);
    const withSlippage = runHedgeBacktest(klines, { initialCapital: 1000.0, includeSlippage: true });
    const withoutSlippage = runHedgeBacktest(klines, { initialCapital: 1000.0, includeSlippage: false });

    assert.ok(
      withSlippage.totalNetProfitUsd <= withoutSlippage.totalNetProfitUsd,
      'Net profit with slippage must be <= net profit without slippage'
    );
    assert.ok(
      withSlippage.totalFeesAndSlippageUsd >= withoutSlippage.totalFeesAndSlippageUsd,
      'Fees + Slippage total must be higher when slippage is enabled'
    );
  });

  // Test 5: Full Workflow Execution for 7d, 15d, 30d
  test('5. Execute Historical Backtest: produces complete telemetry contract across timeframes', async () => {
    for (const days of [7, 15, 30]) {
      const response = await executeHistoricalBacktest(days);
      assert.strictEqual(response.success, true);
      assert.strictEqual(response.days, days);
      assert.ok(['BINANCE_FUTURES_HISTORICAL', 'DETERMINISTIC_OFFLINE_CACHE'].includes(response.dataSource));
      assert.ok(response.metrics !== null);
      assert.strictEqual(response.metrics.initialCapital, 1000.0);
      assert.ok(Array.isArray(response.equityCurve));
      assert.ok(Array.isArray(response.trades));
    }
  });

});
