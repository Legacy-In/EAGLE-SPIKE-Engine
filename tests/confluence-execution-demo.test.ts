import test from 'node:test';
import assert from 'node:assert';
import { BybitDemoClient, BYBIT_DEMO_HOST } from '../backend/adapters/bybit_demo.ts';
import { ConfluenceRiskGate, DEFAULT_RISK_CONFIG } from '../backend/services/confluence_risk_gate.ts';
import { PaperTradesRepository } from '../backend/db/paper_trades_repo.ts';
import { ConfluenceExecutor } from '../backend/services/confluence_executor.ts';
import { ConfluenceSignalRecord } from '../backend/db/confluence_repo.ts';

test('Phase 4 — Risk Gate, Bybit Demo Execution & Sync Suite', async (t) => {
  const repo = PaperTradesRepository.getInstance();
  const executor = ConfluenceExecutor.getInstance();
  const riskGate = new ConfluenceRiskGate();

  // Reset paper account to clean $10,000 for tests
  repo.resetAccount(10000);

  await t.test('1. Demo-Only Hard Assertion: Strictly refuses execution against live/real-money URLs', () => {
    // Valid Demo host must succeed
    assert.doesNotThrow(() => {
      new BybitDemoClient({ baseUrl: 'https://api-demo.bybit.com' });
    });

    // Mainnet or arbitrary URL must throw CRITICAL SECURITY REFUSAL
    assert.throws(
      () => {
        new BybitDemoClient({ baseUrl: 'https://api.bybit.com' });
      },
      /CRITICAL SECURITY REFUSAL/,
      'Must strictly refuse to initialize or run against live api.bybit.com'
    );

    assert.throws(
      () => {
        new BybitDemoClient({ baseUrl: 'https://api.binance.com' });
      },
      /CRITICAL SECURITY REFUSAL/
    );
  });

  await t.test('2. §2 Smoke Test: Verifies URL assertion, virtual equity, orderLinkId and SL/TP', async () => {
    const res = await executor.runSmokeTest();
    assert.strictEqual(res.passed, true);
    assert.ok(res.balance >= 1000);
    assert.ok(res.specs.tickSize > 0);
    assert.ok(res.orderLinkId.startsWith('SMOKE-TEST-'));
    assert.ok(res.logs.length >= 7, 'Must generate full 7-step smoke test log');
  });

  await t.test('3. Risk Gate Sizing & Math: SL clamped between 1.5% and 5.0%, TP = 2R, 3x isolated leverage', () => {
    // Test SL clamping:
    // Low ATR (0.5% * 1.5 = 0.75%) -> Clamped to min 1.5%
    const slMin = riskGate.calculateStopLossPct(0.5);
    assert.strictEqual(slMin, 1.5, 'Low ATR must be clamped to 1.5% min');

    // Moderate ATR (2.0% * 1.5 = 3.0%) -> 3.0%
    const slMid = riskGate.calculateStopLossPct(2.0);
    assert.strictEqual(slMid, 3.0, 'Moderate ATR must remain 3.0%');

    // High ATR (6.0% * 1.5 = 9.0%) -> Clamped to max 5.0%
    const slMax = riskGate.calculateStopLossPct(6.0);
    assert.strictEqual(slMax, 5.0, 'High ATR must be clamped to 5.0% max');

    // Sizing plan check
    const plan = riskGate.evaluateOrderSizing({
      symbol: 'SOLUSDT',
      side: 'BUY',
      signalPrice: 150.0,
      currentPrice: 150.0,
      signalTimestampMs: Date.now(),
      atrPct: 2.0, // 2.0 * 1.5 = 3.0% SL
      equityUsd: 10000,
      currentOpenPositionsCount: 0,
      todayRealizedPnlPct: 0,
      specs: { symbol: 'SOLUSDT', tickSize: 0.01, qtyStep: 0.01, minOrderQty: 0.1, maxOrderQty: 10000 },
    });

    assert.strictEqual(plan.allowed, true);
    assert.strictEqual(plan.leverage, 3);
    assert.strictEqual(plan.stopLossPct, 3.0);
    assert.strictEqual(plan.takeProfitPct, 6.0); // 2R = 6.0%
    assert.strictEqual(plan.rMultiple, 2.0);
    assert.strictEqual(plan.riskAmountUsd, 100.0); // 1.0% of $10,000 = $100
  });

  await t.test('4. Chase Guard: Rejects orders when price slipped > 0.5% or signal is stale > 60s', () => {
    // Price moved 0.8%
    const priceMovedPlan = riskGate.evaluateOrderSizing({
      symbol: 'BTCUSDT',
      side: 'BUY',
      signalPrice: 80000,
      currentPrice: 80650, // 0.81% move
      signalTimestampMs: Date.now(),
      atrPct: 1.5,
      equityUsd: 10000,
      currentOpenPositionsCount: 0,
      todayRealizedPnlPct: 0,
      specs: { symbol: 'BTCUSDT', tickSize: 0.1, qtyStep: 0.001, minOrderQty: 0.001, maxOrderQty: 100 },
    });
    assert.strictEqual(priceMovedPlan.allowed, false);
    assert.ok(priceMovedPlan.rejectReason?.includes('CHASE_GUARD_PRICE_MOVED'));

    // Stale signal (80s old)
    const stalePlan = riskGate.evaluateOrderSizing({
      symbol: 'BTCUSDT',
      side: 'BUY',
      signalPrice: 80000,
      currentPrice: 80000,
      signalTimestampMs: Date.now() - 80000,
      atrPct: 1.5,
      equityUsd: 10000,
      currentOpenPositionsCount: 0,
      todayRealizedPnlPct: 0,
      specs: { symbol: 'BTCUSDT', tickSize: 0.1, qtyStep: 0.001, minOrderQty: 0.001, maxOrderQty: 100 },
    });
    assert.strictEqual(stalePlan.allowed, false);
    assert.ok(stalePlan.rejectReason?.includes('CHASE_GUARD_EXPIRED'));
  });

  await t.test('5. Idempotent Execution: One duplicate signal replay creates exactly ONE order', async () => {
    const mockSignal: ConfluenceSignalRecord = {
      signal_key: `IDEMPOTENT-TEST-${Date.now()}`,
      strategy: 'CONFLUENCE_1H',
      symbol: 'AVAXUSDT',
      exchange: 'BYBIT',
      timeframe: '1h',
      side: 'BUY',
      strength: 'STRONG',
      votes_bull: 8,
      votes_bear: 1,
      score_pct: 73,
      votes_json: [],
      ages_json: {},
      indicators_json: {},
      oi_available: true,
      price: 30.0,
      atr: 0.6,
      candle_t: new Date().toISOString(),
      status: 'ACTIVE',
      skip_reason: null,
      config_version: '1.0.0',
    };

    // First execution -> Must open trade
    const res1 = await executor.executeSignal(mockSignal);
    assert.strictEqual(res1.executed, true, 'First execution must open order');
    assert.ok(res1.trade);

    // Duplicate replay -> Must be rejected cleanly
    const res2 = await executor.executeSignal(mockSignal);
    assert.strictEqual(res2.executed, false, 'Duplicate replay must NOT create second order');
    assert.strictEqual(res2.reason, 'DUPLICATE_ORDER_LINK_ID_REJECTED');

    // Total open positions for this signal must be exactly 1
    const matchingTrades = repo.loadTrades().filter((t) => t.order_link_id === mockSignal.signal_key);
    assert.strictEqual(matchingTrades.length, 1);
  });

  await t.test('6. Exit Rules: Opposite signal on same symbol closes previous trade immediately', async () => {
    const openBefore = repo.getOpenPositions();
    const avaxTrade = openBefore.find((t) => t.symbol === 'AVAXUSDT');
    assert.ok(avaxTrade);
    assert.strictEqual(avaxTrade?.status, 'OPEN');

    // Opposite SELL signal arrives for AVAXUSDT
    const oppositeSignal: ConfluenceSignalRecord = {
      signal_key: `AVAX-REVERSAL-${Date.now()}`,
      strategy: 'CONFLUENCE_1H',
      symbol: 'AVAXUSDT',
      exchange: 'BYBIT',
      timeframe: '1h',
      side: 'SELL',
      strength: 'STRONG',
      votes_bull: 1,
      votes_bear: 8,
      score_pct: 73,
      votes_json: [],
      ages_json: {},
      indicators_json: {},
      oi_available: true,
      price: 30.2,
      atr: 0.6,
      candle_t: new Date().toISOString(),
      status: 'ACTIVE',
      skip_reason: null,
      config_version: '1.0.0',
    };

    await executor.executeSignal(oppositeSignal);

    // Previous BUY trade must now be CLOSED with reason OPPOSITE_SIGNAL
    const closedAvax = repo.getTradeByOrderLinkId(avaxTrade!.order_link_id);
    assert.strictEqual(closedAvax?.status, 'CLOSED');
    assert.strictEqual(closedAvax?.exit_reason, 'OPPOSITE_SIGNAL');
  });

  await t.test('7. WS Disconnect & Reconcile Recovery: Positions and SL/TP resolve accurately', async () => {
    // Current price of AVAX hits TP for the new SELL trade
    const prices = new Map<string, number>();
    prices.set('AVAXUSDT', 25.0); // Extreme drop hits TP on SELL

    const reconcileResult = await executor.reconcilePositions(prices);
    assert.ok(reconcileResult.closedCount >= 1, 'Reconcile must detect and close filled positions');
  });

  await t.test('8. Kill Switch: Emergency type-to-confirm closes ALL positions and disables auto-trade', async () => {
    // Open a fresh position
    const tradeKey = `KILL-TEST-${Date.now()}`;
    await repo.openTrade({
      id: tradeKey,
      signal_id: tradeKey,
      symbol: 'SOLUSDT',
      side: 'BUY',
      qty: 1,
      leverage: 3,
      entry_avg: 150,
      sl: 145,
      tp: 160,
      opened_at: new Date().toISOString(),
      closed_at: null,
      exit_price: null,
      exit_reason: null,
      gross_pnl: 0,
      fees: 0,
      funding: 0,
      net_pnl: 0,
      net_pnl_pct: 0,
      r_multiple: null,
      mfe_pct: 0,
      mae_pct: 0,
      score_at_detection: 80,
      features_json: {},
      source_exchanges: ['BYBIT'],
      config_version: '1.0.0',
      bybit_order_id: `BYBIT-${tradeKey}`,
      order_link_id: tradeKey,
      status: 'OPEN',
    });

    assert.ok(repo.getOpenPositions().length > 0);

    // Trigger Kill Switch
    const killResult = await repo.triggerKillSwitch();
    assert.ok(killResult.closedCount >= 1);

    const openAfter = repo.getOpenPositions();
    assert.strictEqual(openAfter.length, 0, 'Zero positions can remain open after Kill Switch');

    const account = repo.getAccountState();
    assert.strictEqual(account.auto_trade_enabled, false, 'Auto-trading must be disabled');
    assert.strictEqual(account.kill_switch_active, true, 'Kill switch flag must be active');
  });
});
