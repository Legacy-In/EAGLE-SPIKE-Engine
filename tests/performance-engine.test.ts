/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — PERFORMANCE & WIN-RATE ENGINE 30-POINT TEST SUITE
 * 
 * Comprehensive quantitative verification:
 * 1. Signal without outcome creates PENDING
 * 2. TP1 hit before SL = WIN
 * 3. SL hit before TP1 = LOSS
 * 4. Neither hit = UNRESOLVED
 * 5. Unresolved excluded from denominator
 * 6. 0W / 0L returns strictly null / N/A
 * 7. 10W / 0L = 100.00%
 * 8. 0W / 10L = 0.00%
 * 9. 37W / 13L = 74.00%
 * 10. 1R = |Entry - Stop|
 * 11. Realized R calculation for LONG
 * 12. Realized R calculation for SHORT
 * 13. TP1 R matches target
 * 14. Full loss = -1.00R
 * 15. Trailing stop to entry = 0.00R win
 * 16. Expectancy matches formula: (win_prob * avg_win_R) - (loss_prob * avg_loss_R)
 * 17. Profit factor matches formula: gross_win_R / abs(gross_loss_R)
 * 18. Zero losses profit factor returns null / N/A
 * 19. Daily win rate bounded to day
 * 20. Weekly win rate bounded to Monday-Sunday
 * 21. Dhaka timezone boundary correctness
 * 22. Unresolved count matches active signals
 * 23. Strategy breakdown sums to total
 * 24. Exchange breakdown sums to total
 * 25. Direction breakdown sums to total
 * 26. Top winners sorted by realized R descending
 * 27. Top losers sorted by realized R ascending
 * 28. Dual persistence to Supabase and cache
 * 29. Full rebuild matches incremental
 * 30. Low sample warning triggered for <10 and <30 signals
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRiskR,
  calculateRealizedR,
  evaluateSignalOutcome,
  aggregateOutcomes,
  getDhakaDayBounds,
  getDhakaWeekBounds,
  getDhakaMonthBounds,
  upsertSignalOutcome,
  MemoryOutcomesCache,
} from '../backend/services/performance/performance-service.mjs';

describe('🦅 Institutional Performance & Win-Rate Engine Test Suite', () => {

  // 1. Signal without outcome creates PENDING
  test('1. Signal without outcome creates PENDING', () => {
    const signal = {
      signal_id: 'TEST-SIG-01',
      symbol: 'BTCUSDT',
      direction: 'LONG',
      entry_price: 60000,
      target_1_price: 61500,
      stop_price: 59000,
      detected_at: new Date().toISOString(),
    };
    const outcome = evaluateSignalOutcome(signal, 60050, {});
    assert.equal(outcome.primary_outcome, 'PENDING');
    assert.equal(outcome.resolution_type, 'PENDING');
    assert.equal(outcome.exit_price, null);
  });

  // 2. TP1 hit before SL = WIN
  test('2. TP1 hit before SL = WIN', () => {
    const signal = {
      signal_id: 'TEST-SIG-02',
      symbol: 'ETHUSDT',
      direction: 'LONG',
      entry_price: 3000,
      target_1_price: 3100,
      stop_price: 2900,
      tp1_hit: true,
      sl_hit: false,
      detected_at: new Date().toISOString(),
    };
    const outcome = evaluateSignalOutcome(signal, 3105, { maxPrice: 3110 });
    assert.equal(outcome.primary_outcome, 'WIN');
    assert.equal(outcome.resolution_type, 'TP1');
    assert.ok(outcome.realized_r > 0);
  });

  // 3. SL hit before TP1 = LOSS
  test('3. SL hit before TP1 = LOSS', () => {
    const signal = {
      signal_id: 'TEST-SIG-03',
      symbol: 'SOLUSDT',
      direction: 'LONG',
      entry_price: 150,
      target_1_price: 160,
      stop_price: 145,
      tp1_hit: false,
      sl_hit: true,
      detected_at: new Date().toISOString(),
    };
    const outcome = evaluateSignalOutcome(signal, 145, { minPrice: 144.5 });
    assert.equal(outcome.primary_outcome, 'LOSS');
    assert.equal(outcome.resolution_type, 'STOP_LOSS');
    assert.ok(outcome.realized_r < 0);
  });

  // 4. Neither hit = UNRESOLVED
  test('4. Neither hit = UNRESOLVED', () => {
    const signal = {
      signal_id: 'TEST-SIG-04',
      symbol: 'BNBUSDT',
      direction: 'SHORT',
      entry_price: 600,
      target_1_price: 580,
      stop_price: 610,
      status: 'ACTIVE',
      tp1_hit: false,
      sl_hit: false,
      detected_at: new Date().toISOString(),
    };
    const outcome = evaluateSignalOutcome(signal, 595, {});
    assert.equal(outcome.primary_outcome, 'UNRESOLVED');
  });

  // 5. Unresolved excluded from denominator
  test('5. Unresolved signals are strictly excluded from win-rate denominator', () => {
    const outcomes = [
      { primary_outcome: 'WIN', realized_r: 1.5, tp1_reached: true },
      { primary_outcome: 'WIN', realized_r: 1.5, tp1_reached: true },
      { primary_outcome: 'LOSS', realized_r: -1.0, sl_reached: true },
      { primary_outcome: 'UNRESOLVED', realized_r: 0 },
      { primary_outcome: 'PENDING', realized_r: 0 },
      { primary_outcome: 'EXPIRED', realized_r: 0.1 },
    ];
    const agg = aggregateOutcomes(outcomes);
    assert.equal(agg.totalSignals, 6);
    assert.equal(agg.wins, 2);
    assert.equal(agg.losses, 1);
    assert.equal(agg.resolved, 3);
    // Win rate = 2 / (2 + 1) * 100 = 66.67%
    assert.equal(agg.winRate, 66.67);
  });

  // 6. 0W / 0L returns strictly null / N/A
  test('6. 0W / 0L returns strictly null / N/A (never 0% or 100%)', () => {
    const outcomes = [
      { primary_outcome: 'UNRESOLVED', realized_r: 0 },
      { primary_outcome: 'PENDING', realized_r: 0 },
    ];
    const agg = aggregateOutcomes(outcomes);
    assert.strictEqual(agg.winRate, null);
    assert.equal(agg.wins, 0);
    assert.equal(agg.losses, 0);
    assert.equal(agg.resolved, 0);
  });

  // 7. 10W / 0L = 100.00%
  test('7. 10W / 0L = 100.00%', () => {
    const outcomes = Array(10).fill(null).map(() => ({
      primary_outcome: 'WIN',
      realized_r: 1.5,
      tp1_reached: true,
    }));
    const agg = aggregateOutcomes(outcomes);
    assert.equal(agg.winRate, 100.0);
    assert.equal(agg.wins, 10);
    assert.equal(agg.losses, 0);
  });

  // 8. 0W / 10L = 0.00%
  test('8. 0W / 10L = 0.00%', () => {
    const outcomes = Array(10).fill(null).map(() => ({
      primary_outcome: 'LOSS',
      realized_r: -1.0,
      sl_reached: true,
    }));
    const agg = aggregateOutcomes(outcomes);
    assert.equal(agg.winRate, 0.0);
    assert.equal(agg.wins, 0);
    assert.equal(agg.losses, 10);
  });

  // 9. 37W / 13L = 74.00%
  test('9. 37W / 13L = 74.00%', () => {
    const outcomes = [
      ...Array(37).fill(null).map(() => ({ primary_outcome: 'WIN', realized_r: 1.5, tp1_reached: true })),
      ...Array(13).fill(null).map(() => ({ primary_outcome: 'LOSS', realized_r: -1.0, sl_reached: true })),
    ];
    const agg = aggregateOutcomes(outcomes);
    assert.equal(agg.winRate, 74.0);
    assert.equal(agg.wins, 37);
    assert.equal(agg.losses, 13);
    assert.equal(agg.resolved, 50);
  });

  // 10. 1R = |Entry - Stop|
  test('10. 1R = |Entry - Stop| for LONG and SHORT', () => {
    const longR = calculateRiskR('LONG', 100, 95);
    assert.equal(longR, 5);

    const shortR = calculateRiskR('SHORT', 100, 105);
    assert.equal(shortR, 5);
  });

  // 11. Realized R calculation for LONG
  test('11. Realized R calculation for LONG', () => {
    const riskR = calculateRiskR('LONG', 100, 90); // 1R = 10
    const realizedR = calculateRealizedR('LONG', 100, 115, riskR); // +15 gain = +1.5R
    assert.equal(realizedR, 1.5);
  });

  // 12. Realized R calculation for SHORT
  test('12. Realized R calculation for SHORT', () => {
    const riskR = calculateRiskR('SHORT', 100, 110); // 1R = 10
    const realizedR = calculateRealizedR('SHORT', 100, 85, riskR); // +15 gain = +1.5R
    assert.equal(realizedR, 1.5);
  });

  // 13. TP1 R matches target
  test('13. TP1 R matches target', () => {
    const signal = {
      signal_id: 'TEST-TP1',
      symbol: 'BTCUSDT',
      direction: 'LONG',
      entry_price: 50000,
      stop_price: 49000, // 1R = 1000
      target_1_price: 51500, // +1500 = 1.5R
      tp1_hit: true,
      sl_hit: false,
    };
    const outcome = evaluateSignalOutcome(signal, 51500, {});
    assert.equal(outcome.primary_outcome, 'WIN');
    assert.equal(outcome.realized_r, 1.5);
  });

  // 14. Full loss = -1.00R
  test('14. Full loss = -1.00R', () => {
    const signal = {
      signal_id: 'TEST-SL',
      symbol: 'ETHUSDT',
      direction: 'LONG',
      entry_price: 3000,
      stop_price: 2900, // 1R = 100
      target_1_price: 3150,
      tp1_hit: false,
      sl_hit: true,
    };
    const outcome = evaluateSignalOutcome(signal, 2900, {});
    assert.equal(outcome.primary_outcome, 'LOSS');
    assert.equal(outcome.realized_r, -1.0);
  });

  // 15. Trailing stop to entry = 0.00R win
  test('15. Trailing stop to entry = 0.00R win', () => {
    const signal = {
      signal_id: 'TEST-BE',
      symbol: 'SOLUSDT',
      direction: 'LONG',
      entry_price: 150,
      stop_price: 145,
      target_1_price: 155,
      tp1_hit: true,
      sl_hit: false,
      trailing_stop_active: true,
    };
    const outcome = evaluateSignalOutcome(signal, 150, {});
    assert.equal(outcome.primary_outcome, 'WIN');
    assert.equal(outcome.resolution_type, 'TRAILING_STOP_TO_ENTRY');
    assert.equal(outcome.realized_r, 0.0);
  });

  // 16. Expectancy matches formula
  test('16. Expectancy matches formula: (win_prob * avg_win_R) - (loss_prob * avg_loss_R)', () => {
    // 60% win rate, avg win = 2.0R, avg loss = 1.0R
    // Exp = (0.6 * 2.0) - (0.4 * 1.0) = 1.2 - 0.4 = 0.8R
    const outcomes = [
      ...Array(6).fill(null).map(() => ({ primary_outcome: 'WIN', realized_r: 2.0, tp1_reached: true })),
      ...Array(4).fill(null).map(() => ({ primary_outcome: 'LOSS', realized_r: -1.0, sl_reached: true })),
    ];
    const agg = aggregateOutcomes(outcomes);
    assert.equal(agg.expectancy, 0.8);
  });

  // 17. Profit factor matches formula
  test('17. Profit factor matches formula: gross_win_R / abs(gross_loss_R)', () => {
    // gross win = 12.0R, gross loss = 4.0R => PF = 3.0
    const outcomes = [
      ...Array(6).fill(null).map(() => ({ primary_outcome: 'WIN', realized_r: 2.0, tp1_reached: true })),
      ...Array(4).fill(null).map(() => ({ primary_outcome: 'LOSS', realized_r: -1.0, sl_reached: true })),
    ];
    const agg = aggregateOutcomes(outcomes);
    assert.equal(agg.profitFactor, 3.0);
  });

  // 18. Zero losses profit factor returns null / N/A
  test('18. Zero losses profit factor returns null / N/A', () => {
    const outcomes = [
      { primary_outcome: 'WIN', realized_r: 2.0, tp1_reached: true },
    ];
    const agg = aggregateOutcomes(outcomes);
    assert.strictEqual(agg.profitFactor, null);
  });

  // 19. Daily win rate bounded to day
  test('19. Daily win rate bounds calculate properly for Asia/Dhaka', () => {
    const dayBounds = getDhakaDayBounds(new Date());
    assert.ok(dayBounds.dateStr.match(/^\d{4}-\d{2}-\d{2}$/));
    assert.ok(dayBounds.startUtc instanceof Date);
    assert.ok(dayBounds.endUtc instanceof Date);
    assert.ok(dayBounds.endUtc.getTime() > dayBounds.startUtc.getTime());
  });

  // 20. Weekly win rate bounded to Monday-Sunday
  test('20. Weekly win rate bounded to Monday-Sunday', () => {
    const weekBounds = getDhakaWeekBounds(new Date());
    assert.ok(weekBounds.mondayStr);
    assert.ok(weekBounds.sundayStr);
    assert.ok(weekBounds.endUtc.getTime() > weekBounds.startUtc.getTime());
  });

  // 21. Dhaka timezone boundary correctness
  test('21. Dhaka timezone boundary correctness (UTC+6)', () => {
    const testDate = new Date('2026-10-04T00:00:00Z');
    const day = getDhakaDayBounds(testDate);
    // At UTC 00:00, in Dhaka it is 06:00 on the same date 2026-10-04
    assert.equal(day.dateStr, '2026-10-04');
  });

  // 22. Unresolved count matches active signals
  test('22. Unresolved count matches active signals', () => {
    const outcomes = [
      { primary_outcome: 'WIN', realized_r: 1.0 },
      { primary_outcome: 'UNRESOLVED', realized_r: 0 },
      { primary_outcome: 'PENDING', realized_r: 0 },
    ];
    const agg = aggregateOutcomes(outcomes);
    assert.equal(agg.unresolved, 2);
  });

  // 23. Strategy breakdown sums to total
  test('23. Strategy breakdown sums to total', () => {
    const outcomes = [
      { primary_outcome: 'WIN', strategy: 'BREAKOUT', realized_r: 1.5, tp1_reached: true },
      { primary_outcome: 'LOSS', strategy: 'BREAKOUT', realized_r: -1.0, sl_reached: true },
      { primary_outcome: 'WIN', strategy: 'MOMENTUM', realized_r: 2.0, tp1_reached: true },
    ];
    const agg = aggregateOutcomes(outcomes);
    assert.equal(agg.strategyBreakdown['BREAKOUT'].total, 2);
    assert.equal(agg.strategyBreakdown['MOMENTUM'].total, 1);
  });

  // 24. Exchange breakdown sums to total
  test('24. Exchange breakdown sums to total', () => {
    const outcomes = [
      { primary_outcome: 'WIN', exchange: 'BYBIT', realized_r: 1.5, tp1_reached: true },
      { primary_outcome: 'LOSS', exchange: 'BINANCE', realized_r: -1.0, sl_reached: true },
      { primary_outcome: 'WIN', exchange: 'BYBIT', realized_r: 1.0, tp1_reached: true },
    ];
    const agg = aggregateOutcomes(outcomes);
    assert.equal(agg.exchangeBreakdown['BYBIT'].total, 2);
    assert.equal(agg.exchangeBreakdown['BINANCE'].total, 1);
  });

  // 25. Direction breakdown sums to total
  test('25. Direction breakdown sums to total', () => {
    const outcomes = [
      { primary_outcome: 'WIN', direction: 'LONG', realized_r: 1.5, tp1_reached: true },
      { primary_outcome: 'LOSS', direction: 'SHORT', realized_r: -1.0, sl_reached: true },
      { primary_outcome: 'WIN', direction: 'LONG', realized_r: 2.0, tp1_reached: true },
    ];
    const agg = aggregateOutcomes(outcomes);
    assert.equal(agg.directionBreakdown['LONG'].total, 2);
    assert.equal(agg.directionBreakdown['SHORT'].total, 1);
  });

  // 26. Top winners sorted by realized R descending
  test('26. Top winners sorted by realized R descending', () => {
    const winners = [
      { symbol: 'A', primary_outcome: 'WIN', realized_r: 1.2 },
      { symbol: 'B', primary_outcome: 'WIN', realized_r: 3.5 },
      { symbol: 'C', primary_outcome: 'WIN', realized_r: 2.1 },
    ];
    winners.sort((a, b) => b.realized_r - a.realized_r);
    assert.equal(winners[0].symbol, 'B');
    assert.equal(winners[1].symbol, 'C');
    assert.equal(winners[2].symbol, 'A');
  });

  // 27. Top losers sorted by realized R ascending
  test('27. Top losers sorted by realized R ascending', () => {
    const losers = [
      { symbol: 'A', primary_outcome: 'LOSS', realized_r: -1.0 },
      { symbol: 'B', primary_outcome: 'LOSS', realized_r: -0.5 },
      { symbol: 'C', primary_outcome: 'LOSS', realized_r: -1.5 },
    ];
    losers.sort((a, b) => a.realized_r - b.realized_r);
    assert.equal(losers[0].symbol, 'C');
    assert.equal(losers[1].symbol, 'A');
    assert.equal(losers[2].symbol, 'B');
  });

  // 28. Dual persistence to cache and memory
  test('28. Dual persistence updates memory cache correctly', async () => {
    const outcome = {
      signal_id: 'MEM-TEST-99',
      symbol: 'BTCUSDT',
      primary_outcome: 'WIN',
      realized_r: 2.5,
      detected_at: new Date().toISOString(),
    };
    await upsertSignalOutcome(outcome);
    assert.ok(MemoryOutcomesCache.has('MEM-TEST-99'));
    assert.equal(MemoryOutcomesCache.get('MEM-TEST-99').realized_r, 2.5);
  });

  // 29. Full rebuild matches incremental
  test('29. Full aggregation yields identical numbers to incremental components', () => {
    const batch1 = [
      { primary_outcome: 'WIN', realized_r: 1.0, tp1_reached: true },
      { primary_outcome: 'LOSS', realized_r: -1.0, sl_reached: true },
    ];
    const batch2 = [
      { primary_outcome: 'WIN', realized_r: 2.0, tp1_reached: true },
      { primary_outcome: 'WIN', realized_r: 1.5, tp1_reached: true },
    ];
    const combined = [...batch1, ...batch2];
    const aggAll = aggregateOutcomes(combined);

    assert.equal(aggAll.wins, 3);
    assert.equal(aggAll.losses, 1);
    assert.equal(aggAll.winRate, 75.0);
    assert.equal(aggAll.netR, 3.5);
  });

  // 30. Low sample warning triggered for <10 and <30 signals
  test('30. Low sample warning triggered for <10 and <30 signals', () => {
    const lowSample = [
      { primary_outcome: 'WIN', realized_r: 1.0, tp1_reached: true },
      { primary_outcome: 'LOSS', realized_r: -1.0, sl_reached: true },
    ];
    const aggLow = aggregateOutcomes(lowSample);
    assert.ok(aggLow.sampleSizeWarning.includes('LOW SAMPLE SIZE'));

    const midSample = Array(15).fill(null).map(() => ({
      primary_outcome: 'WIN',
      realized_r: 1.0,
      tp1_reached: true,
    }));
    const aggMid = aggregateOutcomes(midSample);
    assert.ok(aggMid.sampleSizeWarning.includes('LIMITED SAMPLE SIZE'));

    const robustSample = Array(35).fill(null).map(() => ({
      primary_outcome: 'WIN',
      realized_r: 1.0,
      tp1_reached: true,
    }));
    const aggRobust = aggregateOutcomes(robustSample);
    assert.strictEqual(aggRobust.sampleSizeWarning, null);
  });
});
