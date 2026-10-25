import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  openPaperTrade,
  closePaperTrade,
  getActivePaperTrades,
  getAllPaperTrades,
  getPaperAccountSummary,
  resetPaperAccount,
  generatePaperTradeId,
  isPaperTradingActive,
} from '../backend/services/paper_trading_executor.mjs';
import {
  evaluatePaperTradeOutcome,
  normalizeSymbol,
} from '../scripts/paper_monitor_worker.mjs';

describe('🧪 Eagle Flash Paper Trading & Sandbox Execution Engine Test Suite', () => {

  beforeEach(async () => {
    // Reset account before each test
    await resetPaperAccount(10000.0);
  });

  // Test 1: ID Generation & Symbol Normalization
  test('1. Trade ID & Normalization: formats canonical PPT prefix and cleans exchange symbols', () => {
    const id = generatePaperTradeId('BTCUSDT', 'BYBIT');
    assert.match(id, /^PPT-\d{8}-BYBIT-BTCUSDT-[A-F0-9]{6}$/);

    assert.strictEqual(normalizeSymbol('BTC-USDT'), 'BTCUSDT');
    assert.strictEqual(normalizeSymbol('eth_usdt_perp'), 'ETHUSDT');
    assert.strictEqual(normalizeSymbol('sol'), 'SOLUSDT');
  });

  // Test 2: Trading Mode Environment Switch
  test('2. Environment Mode: evaluates TRADING_MODE (paper vs live)', () => {
    const orig = process.env.TRADING_MODE;
    try {
      process.env.TRADING_MODE = 'paper';
      assert.strictEqual(isPaperTradingActive(), true);

      process.env.TRADING_MODE = 'live';
      assert.strictEqual(isPaperTradingActive(), false);
    } finally {
      process.env.TRADING_MODE = orig;
    }
  });

  // Test 3: Open Paper Trade with $100 Margin at 5x Leverage
  test('3. Open Position Sizing: allocates $100 margin at 5x isolated leverage and locks margin', async () => {
    const signal = {
      signal_id: 'EGL-TEST-PAPER-01',
      symbol: 'BTCUSDT',
      exchange: 'BYBIT',
      direction: 'LONG',
      entry_price: 65000.0,
      stop_loss_price: 63700.0,
      target_1_price: 66950.0,
      target_2_price: 68250.0,
      target_3_price: 70200.0,
    };

    const trade = await openPaperTrade(signal, { marginUsd: 100.0, leverage: 5 });

    assert.ok(trade.paper_trade_id.startsWith('PPT-'));
    assert.strictEqual(trade.status, 'OPEN');
    assert.strictEqual(trade.margin_usd, 100.0);
    assert.strictEqual(trade.leverage, 5);
    assert.strictEqual(trade.position_size_usd, 500.0); // $100 * 5x = $500 notional
    assert.strictEqual(trade.entry_price, 65000.0);
    assert.strictEqual(trade.take_profit_1, 66950.0);
    assert.strictEqual(trade.stop_loss, 63700.0);

    const summary = getPaperAccountSummary();
    assert.strictEqual(summary.account.allocated_margin, 100.0);
    assert.strictEqual(summary.account.free_margin, 9900.0);
    assert.strictEqual(summary.account.active_positions_count, 1);
  });

  // Test 4: Pure Mathematical Evaluator for TP/SL Resolutions
  test('4. TP/SL Evaluator: deterministically identifies TP1 win and SL loss for LONG & SHORT', () => {
    const longTrade = {
      status: 'OPEN',
      direction: 'LONG',
      entry_price: 65000.0,
      take_profit_1: 67000.0,
      stop_loss: 63500.0,
    };

    // Long Price reaches TP1
    const longWin = evaluatePaperTradeOutcome(longTrade, 67050.0);
    assert.ok(longWin);
    assert.strictEqual(longWin.outcome, 'WIN');
    assert.strictEqual(longWin.status, 'TP_HIT');

    // Long Price reaches Stop Loss
    const longLoss = evaluatePaperTradeOutcome(longTrade, 63400.0);
    assert.ok(longLoss);
    assert.strictEqual(longLoss.outcome, 'LOSS');
    assert.strictEqual(longLoss.status, 'SL_HIT');

    // Long Price within range -> Unresolved
    const longNeutral = evaluatePaperTradeOutcome(longTrade, 65500.0);
    assert.strictEqual(longNeutral, null);

    const shortTrade = {
      status: 'OPEN',
      direction: 'SHORT',
      entry_price: 65000.0,
      take_profit_1: 63000.0,
      stop_loss: 66500.0,
    };

    // Short Price drops to TP1
    const shortWin = evaluatePaperTradeOutcome(shortTrade, 62900.0);
    assert.ok(shortWin);
    assert.strictEqual(shortWin.outcome, 'WIN');
    assert.strictEqual(shortWin.status, 'TP_HIT');

    // Short Price spikes to Stop Loss
    const shortLoss = evaluatePaperTradeOutcome(shortTrade, 66600.0);
    assert.ok(shortLoss);
    assert.strictEqual(shortLoss.outcome, 'LOSS');
    assert.strictEqual(shortLoss.status, 'SL_HIT');
  });

  // Test 5: Close Paper Trade on TP1 Hit (WIN Resolution)
  test('5. Close WIN: credits realized profit, calculates positive R-multiple, releases margin', async () => {
    const signal = {
      symbol: 'SOLUSDT',
      exchange: 'BYBIT',
      direction: 'LONG',
      entry_price: 150.0,
      stop_loss_price: 145.0, // 1R = $5.00
      target_1_price: 160.0,  // Target = +$10.00 = +2.00R
    };

    const trade = await openPaperTrade(signal, { marginUsd: 100.0, leverage: 5 }); // Notional = $500.00
    // Exit at $160.00 (+6.67% price move * $500 notional = +$33.33 profit)
    const closed = await closePaperTrade(trade.paper_trade_id, 160.0, 'WIN', 'Target TP1 Milestone Reached');

    assert.ok(closed);
    assert.strictEqual(closed.status, 'TP_HIT');
    assert.strictEqual(closed.outcome, 'WIN');
    assert.ok(closed.realized_pnl_usd > 30.0, `Expected PnL > $30, got ${closed.realized_pnl_usd}`);
    assert.strictEqual(closed.realized_r, 2.0); // ($160 - $150) / $5 = 2.00R

    const summary = getPaperAccountSummary();
    assert.strictEqual(summary.account.allocated_margin, 0.0); // Margin released
    assert.ok(summary.account.current_balance > 10000.0, 'Balance must have grown');
    assert.strictEqual(summary.account.winning_trades, 1);
    assert.strictEqual(summary.account.losing_trades, 0);
    assert.strictEqual(summary.account.win_rate_pct, 100.0);
  });

  // Test 6: Close Paper Trade on SL Hit (LOSS Resolution)
  test('6. Close LOSS: deducts loss from balance, records -1.00R, releases remaining margin', async () => {
    const signal = {
      symbol: 'AVAXUSDT',
      exchange: 'BYBIT',
      direction: 'LONG',
      entry_price: 30.0,
      stop_loss_price: 28.5, // 1R = $1.50 (-5% move)
      target_1_price: 33.0,
    };

    const trade = await openPaperTrade(signal, { marginUsd: 100.0, leverage: 5 }); // Notional = $500
    // Stop-loss exit at $28.50 (-$25.00 loss)
    const closed = await closePaperTrade(trade.paper_trade_id, 28.5, 'LOSS', 'Stop-Loss Breached');

    assert.ok(closed);
    assert.strictEqual(closed.status, 'SL_HIT');
    assert.strictEqual(closed.outcome, 'LOSS');
    assert.strictEqual(closed.realized_pnl_usd, -25.0);
    assert.strictEqual(closed.realized_r, -1.0); // 1R full loss

    const summary = getPaperAccountSummary();
    assert.strictEqual(summary.account.allocated_margin, 0.0);
    assert.strictEqual(summary.account.current_balance, 9975.0); // $10,000 - $25
    assert.strictEqual(summary.account.winning_trades, 0);
    assert.strictEqual(summary.account.losing_trades, 1);
    assert.strictEqual(summary.account.win_rate_pct, 0.0);
  });

  // Test 7: Reset Virtual Account
  test('7. Reset Account: clears active and closed trades and restores $10,000 baseline', async () => {
    // Open two trades
    await openPaperTrade({ symbol: 'BTCUSDT', entry_price: 65000, direction: 'LONG' });
    await openPaperTrade({ symbol: 'ETHUSDT', entry_price: 3500, direction: 'SHORT' });

    assert.strictEqual(getActivePaperTrades().length, 2);

    await resetPaperAccount(10000.0);

    assert.strictEqual(getActivePaperTrades().length, 0);
    assert.strictEqual(getAllPaperTrades().length, 0);
    const summary = getPaperAccountSummary();
    assert.strictEqual(summary.account.current_balance, 10000.0);
    assert.strictEqual(summary.account.allocated_margin, 0.0);
  });

});
