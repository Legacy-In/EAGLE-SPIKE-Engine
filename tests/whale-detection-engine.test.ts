/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧪 WHALE TRACKING & MANIPULATION DETECTOR SUITE
 * Unit & Integration verification for:
 * 1. Whale Block Filtering ($10k+ alts, $100k+ big caps)
 * 2. Rolling Net Large Flow Math
 * 3. Whale Accumulation / Distribution Engine (70%+ flow, tight consolidation)
 * 4. Pump & Dump / Exit Scam Risk (>15% pump with taker dump)
 * 5. Orderbook Spoofing & Phantom Walls (<60s cancellations without execution)
 * 6. Concentration Index Dominance (>65% volume)
 * 7. Telegram Outbox Integration for Critical/High alerts
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSymbol,
  isWhaleBlock,
  computeNetFlow,
  detectWhaleAccumulation,
  detectPumpAndDumpRisk,
  trackOrderbookWall,
  detectSpoofing,
  computeConcentrationIndex,
  createManipulationAlert,
  recordWhaleTrade,
  WhaleMemoryStore,
  ALT_WHALE_MIN_USD,
  BIG_CAP_MIN_USD
} from '../backend/services/whale-detector.mjs';

describe('🐋 Whale Tracking & Manipulation Detection Engine', () => {

  test('1. Normalizes crypto symbols cleanly', () => {
    assert.equal(normalizeSymbol('ake_usdt'), 'AKEUSDT');
    assert.equal(normalizeSymbol('lab-usdt'), 'LABUSDT');
    assert.equal(normalizeSymbol('btc/usdt'), 'BTCUSDT');
    assert.equal(normalizeSymbol('SOLUSDT'), 'SOLUSDT');
  });

  test('2. Filters out retail noise and qualifies true Whale Blocks', () => {
    // Altcoin threshold ($10,000 USD)
    assert.equal(isWhaleBlock('AKEUSDT', 5000), false, 'Retail noise $5k should be filtered');
    assert.equal(isWhaleBlock('AKEUSDT', 9999), false, '$9.99k should be filtered');
    assert.equal(isWhaleBlock('AKEUSDT', 10000), true, '$10k qualifies as Whale Block');
    assert.equal(isWhaleBlock('LABUSDT', 45000), true, '$45k qualifies as Whale Block');

    // Big cap threshold ($100,000 USD)
    assert.equal(isWhaleBlock('BTCUSDT', 50000), false, '$50k on BTC is not a whale block');
    assert.equal(isWhaleBlock('BTCUSDT', 99000), false, '$99k on BTC is not a whale block');
    assert.equal(isWhaleBlock('BTCUSDT', 100000), true, '$100k on BTC qualifies as Whale Block');
    assert.equal(isWhaleBlock('SOLUSDT', 150000), true, '$150k on SOL qualifies as Whale Block');
  });

  test('3. Computes rolling Net Large Flow accurately', () => {
    const now = Date.now();
    const trades = [
      { detected_at: new Date(now - 60000).toISOString(), side: 'BUY', amount_usdt: 50000 },
      { detected_at: new Date(now - 120000).toISOString(), side: 'BUY', amount_usdt: 30000 },
      { detected_at: new Date(now - 180000).toISOString(), side: 'SELL', amount_usdt: 20000 },
      { detected_at: new Date(now - 30 * 60000).toISOString(), side: 'BUY', amount_usdt: 100000 } // outside 15m
    ];

    const flow15m = computeNetFlow(trades, 15 * 60 * 1000, now);
    assert.equal(flow15m.count, 3);
    assert.equal(flow15m.buyVol, 80000);
    assert.equal(flow15m.sellVol, 20000);
    assert.equal(flow15m.totalVol, 100000);
    assert.equal(flow15m.netFlow, 60000);
    assert.equal(flow15m.netFlowRatio, 0.80); // 80% buy ratio
    assert.equal(flow15m.netFlowPct, 60);

    const flow1h = computeNetFlow(trades, 60 * 60 * 1000, now);
    assert.equal(flow1h.count, 4);
    assert.equal(flow1h.buyVol, 180000);
    assert.equal(flow1h.sellVol, 20000);
    assert.equal(flow1h.netFlow, 160000);
  });

  test('4. Identifies Whale Accumulation when net flow >= 70% in tight consolidation', () => {
    const now = Date.now();
    const accumTrades = [
      { detected_at: new Date(now - 60000).toISOString(), side: 'BUY', amount_usdt: 120000 },
      { detected_at: new Date(now - 120000).toISOString(), side: 'BUY', amount_usdt: 180000 },
      { detected_at: new Date(now - 200000).toISOString(), side: 'SELL', amount_usdt: 40000 }
    ]; // Total = 340k, Buys = 300k (88.2% buy ratio)

    // Scenario A: Price is tight (0.8% change) -> SHOULD FLAG ACCUMULATION
    const resTight = detectWhaleAccumulation(accumTrades, 0.0480, 0.0484, 15 * 60 * 1000, now);
    assert.equal(resTight.detected, true);
    assert.equal(resTight.alert_type, 'WHALE_ACCUMULATION');
    assert.ok(resTight.confidence >= 85);
    assert.equal(resTight.metrics.net_flow_ratio_pct, 88.2);

    // Scenario B: Price already surged wildly (+8.0%) -> SHOULD NOT FLAG ACCUMULATION (Already expanding)
    const resExpanding = detectWhaleAccumulation(accumTrades, 0.0480, 0.0518, 15 * 60 * 1000, now);
    assert.equal(resExpanding.detected, false);

    // Scenario C: Heavy selling (only 30% buys) -> SHOULD NOT FLAG ACCUMULATION
    const sellTrades = [
      { detected_at: new Date(now - 60000).toISOString(), side: 'BUY', amount_usdt: 30000 },
      { detected_at: new Date(now - 120000).toISOString(), side: 'SELL', amount_usdt: 90000 }
    ];
    const resSell = detectWhaleAccumulation(sellTrades, 0.0480, 0.0481, 15 * 60 * 1000, now);
    assert.equal(resSell.detected, false);
  });

  test('5. Detects Pump & Dump / Exit Scam Risk (>15% pump with aggressive taker selling)', () => {
    const now = Date.now();
    const dumpTrades = [
      { detected_at: new Date(now - 60000).toISOString(), side: 'SELL', amount_usdt: 180000 },
      { detected_at: new Date(now - 120000).toISOString(), side: 'SELL', amount_usdt: 120000 },
      { detected_at: new Date(now - 180000).toISOString(), side: 'BUY', amount_usdt: 40000 }
    ]; // Taker sell dominance = 300k / 340k = 88.2%

    // Scenario A: Price spiked from 0.100 to 0.122 (+22% in 15m) + heavy sell dump -> CRITICAL PUMP & DUMP
    const resPnd = detectPumpAndDumpRisk(dumpTrades, 0.100, 0.122, 15 * 60 * 1000, now);
    assert.equal(resPnd.detected, true);
    assert.equal(resPnd.alert_type, 'PUMP_AND_DUMP_RISK');
    assert.equal(resPnd.severity, 'CRITICAL');
    assert.equal(resPnd.metrics.price_expansion_15m_pct, 22);
    assert.equal(resPnd.metrics.taker_sell_dominance_pct, 88.2);

    // Scenario B: Normal gradual movement (+3% price change) -> NO PUMP & DUMP
    const resNormal = detectPumpAndDumpRisk(dumpTrades, 0.100, 0.103, 15 * 60 * 1000, now);
    assert.equal(resNormal.detected, false);
  });

  test('6. Detects Orderbook Spoofing when phantom wall is pulled without trades', () => {
    const activeWalls = new Map();
    const now = Date.now();

    // 1. Place a $150k bid wall at price $0.0450 25 seconds ago
    trackOrderbookWall(activeWalls, 'AKEUSDT', 'BID', 0.0450, 150000, now - 25000);

    // 2. Wall disappears 5 seconds ago (lastSeenAt was 5s ago)
    const wallKey = 'AKEUSDT_BID_0.0450';
    assert.ok(activeWalls.has(wallKey));
    const wall = activeWalls.get(wallKey);
    wall.lastSeenAt = now - 5000;

    // 3. Trades during this window only filled $2,000 (fill ratio = 1.3%)
    const executedTrades = [
      { execution_price: 0.0450, amount_usdt: 2000, side: 'SELL' }
    ];

    const spoofs = detectSpoofing(activeWalls, 'AKEUSDT', null, executedTrades, now);
    assert.equal(spoofs.length, 1);
    assert.equal(spoofs[0].alert_type, 'SPOOFING_DETECTED');
    assert.equal(spoofs[0].metrics.wall_side, 'BID');
    assert.equal(spoofs[0].metrics.peak_size_usdt, 150000);
    assert.equal(spoofs[0].metrics.cancellation_type, 'PHANTOM_WALL_PULLED');
    assert.ok(spoofs[0].metrics.fill_ratio_pct < 5.0);

    // Wall should be cleaned up from active tracking
    assert.equal(activeWalls.has(wallKey), false);
  });

  test('7. Does NOT flag spoofing if wall was legitimately filled', () => {
    const activeWalls = new Map();
    const now = Date.now();

    trackOrderbookWall(activeWalls, 'AKEUSDT', 'BID', 0.0450, 100000, now - 20000);
    const wallKey = 'AKEUSDT_BID_0.0450';
    activeWalls.get(wallKey).lastSeenAt = now - 5000;

    // 80% of wall was legitimately filled by market sells
    const filledTrades = [
      { execution_price: 0.0450, amount_usdt: 80000, side: 'SELL' }
    ];

    const spoofs = detectSpoofing(activeWalls, 'AKEUSDT', null, filledTrades, now);
    assert.equal(spoofs.length, 0, 'Legitimately filled wall must not be flagged as spoofing');
  });

  test('8. Calculates Concentration Index and flags High Manipulation Risk', () => {
    const now = Date.now();
    const totalMarketVol = 200000; // $200k total volume in 15m

    // Scenario A: 3 whale trades total $150k -> 75% concentration (>65% -> HIGH RISK)
    const heavyWhales = [
      { detected_at: new Date(now - 60000).toISOString(), amount_usdt: 70000 },
      { detected_at: new Date(now - 120000).toISOString(), amount_usdt: 50000 },
      { detected_at: new Date(now - 180000).toISOString(), amount_usdt: 30000 }
    ];

    const resHigh = computeConcentrationIndex(heavyWhales, totalMarketVol, 15 * 60 * 1000, now);
    assert.equal(resHigh.concentrationPct, 75.0);
    assert.equal(resHigh.isHighRisk, true);
    assert.ok(resHigh.alert != null);
    assert.equal(resHigh.alert.alert_type, 'HIGH_MANIPULATION_RISK');

    // Scenario B: Minor whale presence (only $30k of $200k = 15%) -> LOW RISK
    const minorWhales = [
      { detected_at: new Date(now - 60000).toISOString(), amount_usdt: 15000 },
      { detected_at: new Date(now - 120000).toISOString(), amount_usdt: 15000 }
    ];

    const resLow = computeConcentrationIndex(minorWhales, totalMarketVol, 15 * 60 * 1000, now);
    assert.equal(resLow.concentrationPct, 15.0);
    assert.equal(resLow.isHighRisk, false);
    assert.equal(resLow.alert, null);
  });

  test('9. Persists whale trade to memory and formats record correctly', async () => {
    const trade = await recordWhaleTrade({
      symbol: 'gtw_usdt',
      exchange: 'mexc',
      side: 'BUY',
      amount_usdt: 45000,
      execution_price: 0.00895
    });

    assert.equal(trade.symbol, 'GTWUSDT');
    assert.equal(trade.exchange, 'MEXC');
    assert.equal(trade.side, 'BUY');
    assert.equal(trade.amount_usdt, 45000);
    assert.equal(trade.execution_price, 0.00895);

    // Verify stored in memory
    assert.ok(WhaleMemoryStore.trades.length > 0);
    assert.equal(WhaleMemoryStore.trades[0].symbol, 'GTWUSDT');
  });

  test('10. Creates Manipulation Alert and verifies In-Memory Cache and ID stability', async () => {
    const alert = await createManipulationAlert(
      'LABUSDT',
      'PUMP_AND_DUMP_RISK',
      'CRITICAL',
      { price_expansion_15m_pct: 18.5, taker_sell_dominance_pct: 75.0 }
    );

    assert.equal(alert.symbol, 'LABUSDT');
    assert.equal(alert.alert_type, 'PUMP_AND_DUMP_RISK');
    assert.equal(alert.severity, 'CRITICAL');
    assert.equal(alert.status, 'ACTIVE');
    assert.ok(alert.alert_id.startsWith('WHALE_LABUSDT_PUMP_AND_DUMP_RISK_'));

    // Check in-memory store
    const found = WhaleMemoryStore.alerts.find(a => a.alert_id === alert.alert_id);
    assert.ok(found != null);
  });

});
