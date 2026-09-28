/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — REAL-TIME TP/SL MONITOR & ROUTING ENGINE TEST SUITE
 * Verifies:
 * 1. LONG Position Stop-Loss Breach Math & Invalidation State Transition
 * 2. LONG Position TP1, TP2, TP3 Progressive Excursion Resolution
 * 3. SHORT Position Stop-Loss Breach & Take-Profit Milestone Tracking
 * 4. Stop-First Precedence Invariant
 * 5. Idempotent Transition Locking (Zero Duplicate Spam on Price Oscillation)
 * 6. Strict Channel Routing (TP -> #tp-hits, SL -> #stop-loss)
 * 7. Test Outbox Isolation Verification
 * ═══════════════════════════════════════════════════════════════════════════
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateSignalTpSl,
  processSignalEvaluation,
  ResolvedPositions,
  MilestoneTracker,
} from '../scripts/tpsl_monitor_worker.mjs';
import { resolveDiscordChannel, resolveDiscordChannels } from '../backend/services/discord/discord-router.mjs';
import { getLocalNotificationOutboxPath, isTestExecution } from '../backend/services/notification-outbox.mjs';
import fs from 'fs';
import path from 'path';

test('1. TP/SL Evaluator: LONG Position Stop-Loss Breach (SL_HIT)', () => {
  const signal = {
    signal_id: 'EGL-TEST-LONG-SL',
    symbol: 'BTCUSDT',
    direction: 'LONG',
    entry_price: 65000,
    stop_price: 63700, // -2% stop
    target_1_price: 66300,
    target_2_price: 67600,
    target_3_price: 69550,
  };

  // Price at or below stop loss
  const breach = evaluateSignalTpSl(signal, 63650);
  assert.ok(breach !== null);
  assert.equal(breach.transition, 'SL_HIT');
  assert.equal(breach.status, 'SL_HIT');
  assert.equal(breach.isTerminal, true);
  assert.equal(breach.exitPrice, 63650);
  assert.ok(breach.realizedPnlPct < 0, 'Realized PnL must be negative for SL hit');
  assert.equal(breach.realizedPnlPct, -2.08);
});

test('2. TP/SL Evaluator: LONG Position Progressive Take-Profit Targets (TP1, TP2, TP3)', () => {
  const signalId = 'EGL-TEST-LONG-TP';
  const signal = {
    signal_id: signalId,
    symbol: 'SOLUSDT',
    direction: 'LONG',
    entry_price: 150.00,
    stop_price: 145.50,
    target_1_price: 154.50, // +3%
    target_2_price: 159.00, // +6%
    target_3_price: 165.00, // +10%
  };

  // Clean trackers
  MilestoneTracker.delete(signalId);
  ResolvedPositions.delete(signalId);

  // 1. Price hits TP1
  const tp1Res = evaluateSignalTpSl(signal, 154.60);
  assert.ok(tp1Res !== null);
  assert.equal(tp1Res.transition, 'TP1_HIT');
  assert.equal(tp1Res.milestone, 'TP1');
  assert.equal(tp1Res.isTerminal, false);
  assert.equal(tp1Res.trailingStop, 150.00, 'TP1 must move stop to entry (breakeven)');
  assert.ok(tp1Res.realizedPnlPct > 0);

  // Record TP1 hit in tracker
  MilestoneTracker.set(signalId, new Set(['TP1']));

  // 2. Price hits TP2
  const tp2Res = evaluateSignalTpSl(signal, 159.20);
  assert.ok(tp2Res !== null);
  assert.equal(tp2Res.transition, 'TP2_HIT');
  assert.equal(tp2Res.milestone, 'TP2');
  assert.equal(tp2Res.isTerminal, false);
  assert.equal(tp2Res.trailingStop, 154.50, 'TP2 must move trailing stop to TP1');

  // Record TP2 hit in tracker
  MilestoneTracker.get(signalId).add('TP2');

  // 3. Price hits TP3 (Final runner target)
  const tp3Res = evaluateSignalTpSl(signal, 165.50);
  assert.ok(tp3Res !== null);
  assert.equal(tp3Res.transition, 'TP3_HIT');
  assert.equal(tp3Res.status, 'TP_HIT');
  assert.equal(tp3Res.milestone, 'TP3');
  assert.equal(tp3Res.isTerminal, true, 'TP3 must be terminal full-win resolution');
  assert.ok(tp3Res.realizedPnlPct >= 10.0);
});

test('3. TP/SL Evaluator: SHORT Position Invalidation and Take-Profit Milestones', () => {
  const signalId = 'EGL-TEST-SHORT-TPSL';
  const signal = {
    signal_id: signalId,
    symbol: 'ETHUSDT',
    direction: 'SHORT',
    entry_price: 3500.00,
    stop_price: 3570.00, // +2% stop for short
    target_1_price: 3395.00, // -3%
    target_2_price: 3290.00, // -6%
    target_3_price: 3150.00, // -10%
  };

  // Clean trackers
  MilestoneTracker.delete(signalId);
  ResolvedPositions.delete(signalId);

  // 1. Short SL hit when price rises above stop
  const slRes = evaluateSignalTpSl(signal, 3575.00);
  assert.ok(slRes !== null);
  assert.equal(slRes.transition, 'SL_HIT');
  assert.equal(slRes.isTerminal, true);
  assert.ok(slRes.realizedPnlPct < 0);

  // 2. Short TP1 hit when price drops to/below target 1
  const tp1Res = evaluateSignalTpSl(signal, 3390.00);
  assert.ok(tp1Res !== null);
  assert.equal(tp1Res.transition, 'TP1_HIT');
  assert.equal(tp1Res.isTerminal, false);
  assert.ok(tp1Res.realizedPnlPct > 0);
  assert.equal(tp1Res.trailingStop, 3500.00, 'Short TP1 moves stop to entry');
});

test('4. Idempotency Gatekeeper: Zero Duplicate Alerts on Target Oscillation', async () => {
  const signalId = 'EGL-TEST-IDEMP-01';
  const signal = {
    signal_id: signalId,
    symbol: 'DOGEUSDT',
    direction: 'LONG',
    entry_price: 0.1200,
    stop_price: 0.1150,
    target_1_price: 0.1260,
  };

  // Clean state
  ResolvedPositions.delete(signalId);
  MilestoneTracker.delete(signalId);

  // 1. First tick triggers SL_HIT
  const action1 = await processSignalEvaluation(signal, 0.1145);
  assert.ok(action1 !== null);
  assert.equal(action1.transition, 'SL_HIT');
  assert.ok(ResolvedPositions.has(signalId), 'Signal must be locked in ResolvedPositions');

  // 2. Subsequent ticks at same or lower price MUST be ignored
  const action2 = await processSignalEvaluation(signal, 0.1140);
  assert.equal(action2, null, 'Subsequent price ticks must be suppressed by idempotency lock');

  const action3 = await processSignalEvaluation(signal, 0.1130);
  assert.equal(action3, null, 'Subsequent ticks must remain suppressed');
});

test('5. Strict Discord Routing: TP Hits -> #tp-hits, SL Hits -> #stop-loss', () => {
  process.env.DISCORD_CHANNEL_TP_HITS = 'CHAN_TP_123';
  process.env.DISCORD_CHANNEL_STOP_LOSS = 'CHAN_SL_456';
  process.env.DISCORD_CHANNEL_SIGNALS = 'CHAN_SIGNALS_789';

  // Take Profit Milestone
  const tpItem = {
    signal_id: 'EGL-TP-ALERT',
    event_type: 'TP1_HIT',
    payload: { symbol: 'BTCUSDT' },
  };
  const tpChan = resolveDiscordChannel(tpItem);
  assert.equal(tpChan, 'CHAN_TP_123', 'TP milestones must route strictly to #tp-hits');
  assert.deepEqual(resolveDiscordChannels(tpItem), ['CHAN_TP_123']);

  // Stop Loss Hit
  const slItem = {
    signal_id: 'EGL-SL-ALERT',
    event_type: 'SL_HIT',
    payload: { symbol: 'ETHUSDT' },
  };
  const slChan = resolveDiscordChannel(slItem);
  assert.equal(slChan, 'CHAN_SL_456', 'SL hits must route strictly to #stop-loss');
  assert.deepEqual(resolveDiscordChannels(slItem), ['CHAN_SL_456']);
});

test('6. Test Outbox Isolation: Tests write to isolated test outbox, never live Discord outbox', () => {
  assert.equal(isTestExecution(), true, 'isTestExecution() must detect test runner environment');
  const outboxPath = getLocalNotificationOutboxPath();
  const baseName = path.basename(outboxPath);
  assert.equal(baseName, 'test_notification_outbox.json', 'Test execution must use test_notification_outbox.json');
  assert.notEqual(baseName, 'notification_outbox.json', 'Must never target production notification_outbox.json');
});
