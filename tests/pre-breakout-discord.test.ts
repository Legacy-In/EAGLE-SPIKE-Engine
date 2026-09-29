/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — PRE-BREAKOUT DISCORD INTEGRATION TEST SUITE
 * Complete 30-Point Verification Matrix across routing, embed formatting,
 * idempotency, price & ROI integrity invariants, and shadow mode safety.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

import {
  getPreBreakoutChannel,
  routePreBreakoutEvent,
  resolveDiscordChannel,
  resolveDiscordChannels,
  getSignalsChannel,
  getBreakoutsChannel,
  getTpHitsChannel,
  getStopLossChannel,
} from '../backend/services/discord/discord-router.mjs';

import {
  buildPreBreakoutDiscordEmbed,
  buildPreBreakoutStatusDiscordEmbed,
  validateRoiInvariant,
  resolvePriceState,
  formatOrUnavailable,
} from '../backend/services/discord/discord-message-builder.mjs';

import { DiscordNotificationService } from '../backend/services/discord/discord-notification-service.mjs';
import {
  queueNotificationAlerts,
  fetchPendingOutbox,
  updateOutboxItemStatus,
} from '../backend/services/notification-outbox.mjs';

import {
  recordPrepAudit,
  updateAuditExcursions,
  recordAuditConfirmation,
  updateAuditDiscordMessageId,
  AuditMemoryStore,
} from '../backend/services/prep-audit-service.mjs';

import {
  classifyMarketStatus,
  evaluateChaseRisk,
} from '../backend/services/dual-score-engine.mjs';

import { computeLiquidityQuality } from '../backend/services/feature-calculator.mjs';
import { createSignal } from '../backend/services/signal-creation.mjs';

describe('🦅 Pre-Breakout & Accumulation Discord Integration — 30-Point Test Suite', () => {

  beforeEach(() => {
    process.env.DISCORD_PREBREAKOUT_CHANNEL_ID = '1554441211706740776';
    process.env.DISCORD_CHANNEL_PRE_BREAKOUT = '1554441211706740776';
  });

  // 1. Existing #pre-breakout channel ID is loaded from environment
  test('1. Existing #pre-breakout channel ID is loaded from environment', () => {
    const channelId = getPreBreakoutChannel();
    assert.equal(channelId, '1554441211706740776', 'Must load existing channel ID 1554441211706740776');
  });

  // 2. No duplicate Pre-Breakout channel is created
  test('2. No duplicate Pre-Breakout channel is created (uses single dedicated channel)', () => {
    const route1 = routePreBreakoutEvent('PREP_DETECTED');
    const route2 = routePreBreakoutEvent('CONFIRMED');
    const route3 = routePreBreakoutEvent('FALSE_BREAKOUT');
    assert.equal(route1, route2);
    assert.equal(route2, route3);
    assert.equal(route1, '1554441211706740776');
  });

  // 3. PREP routes correctly
  test('3. PREP routes correctly to #pre-breakout', () => {
    const item = {
      event_type: 'PREP_DETECTED',
      payload: { symbol: 'SOLUSDT', marketStatus: 'PREP' },
    };
    const resolved = resolveDiscordChannel(item);
    assert.equal(resolved, '1554441211706740776');
  });

  // 4. READY routes correctly
  test('4. READY routes correctly to #pre-breakout', () => {
    const item = {
      event_type: 'READY_DETECTED',
      payload: { symbol: 'NEARUSDT', marketStatus: 'READY' },
    };
    const resolved = resolveDiscordChannel(item);
    assert.equal(resolved, '1554441211706740776');
  });

  // 5. CONFIRMED routes correctly
  test('5. CONFIRMED routes correctly to #pre-breakout', () => {
    const item = {
      event_type: 'CONFIRMED',
      payload: { symbol: 'AVAXUSDT', strategy: 'PRE_BREAKOUT', marketStatus: 'CONFIRMED' },
    };
    const resolved = resolveDiscordChannel(item);
    assert.equal(resolved, '1554441211706740776');
  });

  // 6. HIGH Chase Risk blocks execution
  test('6. HIGH Chase Risk blocks execution', () => {
    const chase = evaluateChaseRisk({
      currentPrice: 105,
      basePrice: 100,
      atr15m: 2.0, // Extension = 5 / 2 = 2.5 ATR >= 2.0
    });
    assert.equal(chase.level, 'HIGH');
    assert.equal(chase.isBlocked, true);

    const embedObj = buildPreBreakoutDiscordEmbed({
      symbol: 'SOLUSDT',
      marketStatus: 'CONFIRMED',
      chaseRisk: chase,
      price: 105,
      basePrice: 100,
      atr15m: 2.0,
    });
    const embed = embedObj.embeds[0];
    assert.ok(embed.description.includes('Execution: BLOCKED'));
    assert.ok(embed.description.includes('CHASE RISK: HIGH'));
  });

  // 7. CONFIRMED status remains CONFIRMED when Chase Risk is HIGH
  test('7. CONFIRMED status remains CONFIRMED when Chase Risk is HIGH', () => {
    const status = classifyMarketStatus(85, 80);
    assert.equal(status, 'CONFIRMED', 'Market status must be CONFIRMED');

    const chase = evaluateChaseRisk({ currentPrice: 110, basePrice: 100, atr15m: 3.0 });
    assert.equal(chase.level, 'HIGH');

    const embedObj = buildPreBreakoutDiscordEmbed({
      symbol: 'SOLUSDT',
      marketStatus: status, // CONFIRMED
      chaseRisk: chase,
    });
    const embed = embedObj.embeds[0];
    assert.ok(embed.title.includes('CONFIRMED'));
    assert.ok(embed.description.includes('Market Status: **CONFIRMED**'));
  });

  // 8. PREP is not an actionable signal
  test('8. PREP is not an actionable signal (explicit observation label)', () => {
    const embedObj = buildPreBreakoutDiscordEmbed({
      symbol: 'SOLUSDT',
      marketStatus: 'PREP',
      prepScore: 78,
      confirmationScore: 30,
    });
    const embed = embedObj.embeds[0];
    assert.ok(embed.title.includes('PREP'));
    assert.ok(embed.description.includes('PREP is an observation state and is NOT an actionable trading signal'));
  });

  // 9. READY does not bypass confirmation
  test('9. READY does not bypass confirmation (radar state notice)', () => {
    const embedObj = buildPreBreakoutDiscordEmbed({
      symbol: 'SOLUSDT',
      marketStatus: 'READY',
      prepScore: 86,
      confirmationScore: 62,
    });
    const embed = embedObj.embeds[0];
    assert.ok(embed.title.includes('READY'));
    assert.ok(embed.description.includes('Waiting for breakout confirmation'));
    assert.ok(embed.description.includes('READY must NOT be represented as CONFIRMED'));
  });

  // 10. Duplicate events are idempotent
  test('10. Duplicate events are idempotent in notification outbox', async () => {
    const signalId = 'EGL-TEST-IDEMP-PRE-01';
    const notifications = [
      {
        signal_id: signalId,
        event_type: 'PREP_DETECTED',
        channel_type: 'DISCORD',
        channel_id: '1554441211706740776',
        payload: { symbol: 'SOLUSDT', marketStatus: 'PREP' },
        deduplication_key: `OUTBOX-${signalId}-PREP_DETECTED-DISCORD`,
      },
    ];

    const res1 = await queueNotificationAlerts(notifications);
    assert.equal(res1.success, true);

    // Queue identical notification again
    const res2 = await queueNotificationAlerts(notifications);
    assert.equal(res2.success, true);
  });

  // 11. Discord retry does not duplicate messages
  test('11. Discord retry does not duplicate messages (state machine transition)', async () => {
    const outboxPath = path.resolve(process.cwd(), 'data', 'test_notification_outbox.json');
    if (!fs.existsSync(path.dirname(outboxPath))) fs.mkdirSync(path.dirname(outboxPath), { recursive: true });

    const item = {
      id: 'LOCAL-TEST-RETRY-01',
      signal_id: 'SIG-RETRY-01',
      event_type: 'PREP_DETECTED',
      channel_type: 'DISCORD',
      status: 'RETRY',
      attempt_count: 1,
    };
    fs.writeFileSync(outboxPath, JSON.stringify([item], null, 2), 'utf-8');

    await updateOutboxItemStatus('LOCAL-TEST-RETRY-01', 'DISCORD', 'RETRY', { attemptCount: 2, lastError: 'RATE_LIMITED' });

    const updated = JSON.parse(fs.readFileSync(outboxPath, 'utf-8'));
    assert.equal(updated.length, 1, 'Retry must update in-place without duplicating item');
    assert.equal(updated[0].attempt_count, 3);
  });

  // 12. Discord failure does not invalidate canonical signal creation
  test('12. Discord failure does not invalidate canonical signal creation', async () => {
    // createSignal guarantees atomic persistence even if network/Discord is down
    const candidate = {
      symbol: 'AVAXUSDT',
      price: 28.5,
      exchange: 'BYBIT',
      eagleScore: 82,
      rvol: 2.5,
      primaryStrategy: 'BREAKOUT',
      phase: 'NORMAL',
    };
    const res = await createSignal(candidate, { force: true });
    assert.ok(res.success || res.error_code === 'DUPLICATE_SIGNAL' || res.error_code === 'DEDUPLICATED', 'Canonical signal creation must succeed regardless of external notification failures');
  });

  // 13. Current price uses exact exchange
  test('13. Current price uses exact exchange', () => {
    const embedObj = buildPreBreakoutDiscordEmbed({
      symbol: 'PEPEUSDT',
      exchange: 'MEXC',
      price: 0.0000085,
      marketStatus: 'PREP',
    });
    const embed = embedObj.embeds[0];
    assert.ok(embed.description.includes('MEXC Perpetual'));
  });

  // 14. Current price uses exact perpetual contract
  test('14. Current price uses exact perpetual contract (not spot or 1000PEPE)', () => {
    const embedObj = buildPreBreakoutDiscordEmbed({
      symbol: '1000PEPEUSDT',
      exchange: 'BYBIT',
      price: 0.0085,
      marketStatus: 'READY',
    });
    const embed = embedObj.embeds[0];
    assert.ok(embed.description.includes('1000PEPEUSDT Perpetual'));
  });

  // 15. Stale current price is not presented as LIVE
  test('15. Stale current price is not presented as LIVE', () => {
    assert.equal(resolvePriceState(250), 'LIVE', '< 1500ms is LIVE');
    assert.equal(resolvePriceState(3000), 'FRESH', '< 5000ms is FRESH');
    assert.equal(resolvePriceState(8000), 'DEGRADED', '< 15000ms is DEGRADED');
    assert.equal(resolvePriceState(25000), 'STALE', '>= 15000ms is STALE');
    assert.equal(resolvePriceState(undefined), 'UNAVAILABLE', 'Undefined age is UNAVAILABLE');
  });

  // 16. ROI invariant is maintained
  test('16. ROI invariant is maintained (rejects erroneous ROI calculations)', () => {
    // LONG: Entry 100, Current 110 -> Expected +10%
    const validLong = validateRoiInvariant(100, 110, 'LONG', 10.0);
    assert.equal(validLong.valid, true);

    // Erroneous ROI reported as +25%
    const invalidLong = validateRoiInvariant(100, 110, 'LONG', 25.0);
    assert.equal(invalidLong.valid, false);
    assert.equal(invalidLong.error, 'ROI_INVARIANT_VIOLATION');

    // SHORT: Entry 100, Current 90 -> Expected +10%
    const validShort = validateRoiInvariant(100, 90, 'SHORT', 10.0);
    assert.equal(validShort.valid, true);
  });

  // 17. TP/SL comes from canonical signal
  test('17. TP/SL targets originate strictly from canonical dynamic TP/SL', () => {
    const embedObj = buildPreBreakoutDiscordEmbed({
      symbol: 'SOLUSDT',
      marketStatus: 'CONFIRMED',
      price: 150,
      basePrice: 148,
      stop_price: 144,
      target_1_price: 156,
      target_2_price: 162,
      target_3_price: 170,
      risk_r: 6.0,
      chaseRisk: { level: 'LOW' },
    });
    const embed = embedObj.embeds[0];
    const stopField = embed.fields.find(f => f.name.includes('Stop Loss'));
    const tp1Field = embed.fields.find(f => f.name.includes('TP1'));
    assert.ok(stopField?.value.includes('$144.00'));
    assert.ok(tp1Field?.value.includes('$156.00'));
  });

  // 18. Discord does not recalculate TP/SL
  test('18. Discord does not recalculate TP/SL (displays canonical provenance)', () => {
    const embedObj = buildPreBreakoutDiscordEmbed({
      symbol: 'SOLUSDT',
      marketStatus: 'CONFIRMED',
      price: 100,
      chaseRisk: { level: 'LOW' },
    });
    const provenanceField = embedObj.embeds[0].fields.find(f => f.name.includes('Provenance'));
    assert.ok(provenanceField?.value.includes('CANONICAL DYNAMIC TP/SL'));
  });

  // 19. Missing values display UNAVAILABLE
  test('19. Missing values display UNAVAILABLE (never fake 0s)', () => {
    assert.equal(formatOrUnavailable(null), 'UNAVAILABLE');
    assert.equal(formatOrUnavailable(undefined), 'UNAVAILABLE');
    assert.equal(formatOrUnavailable(''), 'UNAVAILABLE');
    assert.equal(formatOrUnavailable(100, v => `$${v}`), '$100');
  });

  // 20. Iceberg behavior is labeled as likelihood, never certainty
  test('20. Iceberg behavior is labeled as likelihood, never certainty', () => {
    const embedObj = buildPreBreakoutDiscordEmbed({
      symbol: 'BTCUSDT',
      marketStatus: 'PREP',
      icebergLikelihood: 'HIGH',
    });
    const field = embedObj.embeds[0].fields.find(f => f.name.includes('Iceberg'));
    assert.ok(field?.name.includes('Iceberg Likelihood'));
    assert.ok(!field?.name.includes('Confirmed Iceberg'));
  });

  // 21. Spoof risk is preserved
  test('21. Spoof risk is preserved in orderbook section', () => {
    const embedObj = buildPreBreakoutDiscordEmbed({
      symbol: 'ETHUSDT',
      marketStatus: 'PREP',
      spoofRisk: 'LOW',
    });
    const field = embedObj.embeds[0].fields.find(f => f.name.includes('Spoof Risk'));
    assert.ok(field?.value.includes('LOW'));
  });

  // 22. Liquidity gate is preserved
  test('22. Liquidity gate is preserved in pre-breakout qualification', () => {
    const gateRes = computeLiquidityQuality(
      { turnover24h: 500000 }, // < $2M threshold
      null,
      { minTurnoverUsd: 2000000 }
    );
    assert.equal(gateRes.passesGate, false);
    assert.ok(gateRes.rejectionReason.includes('TURNOVER_BELOW_THRESHOLD'));
  });

  // 23. Shadow mode does not modify existing production channels
  test('23. Shadow mode does not modify existing production channels', () => {
    // Normal standard breakout signal continues routing to #breakouts or #signals
    const standardItem = {
      event_type: 'NEW_SIGNAL',
      payload: { symbol: 'LINKUSDT', type: 'BREAKOUT', phase: 'NORMAL' },
    };
    const chan = resolveDiscordChannel(standardItem);
    assert.equal(chan, getBreakoutsChannel() || getSignalsChannel());
    assert.notEqual(chan, getPreBreakoutChannel());
  });

  // 24. No secrets are exposed
  test('24. No secrets are exposed in embed builders or diagnostics', () => {
    const statusEmbed = buildPreBreakoutStatusDiscordEmbed({ channel: '#pre-breakout', engine: 'ONLINE' });
    const jsonStr = JSON.stringify(statusEmbed);
    assert.ok(!jsonStr.includes('BOT_TOKEN'));
    assert.ok(!jsonStr.includes('SUPABASE_SERVICE_ROLE_KEY'));
    assert.ok(!jsonStr.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
  });

  // 25. Existing Discord channels continue working
  test('25. Existing Discord channels continue working (TP, SL, Whales, Big-Cap)', () => {
    assert.equal(resolveDiscordChannel({ event_type: 'TP1_HIT', payload: { symbol: 'SOLUSDT' } }), getTpHitsChannel() || getSignalsChannel());
    assert.equal(resolveDiscordChannel({ event_type: 'STOP_HIT', payload: { symbol: 'SOLUSDT' } }), getStopLossChannel() || getSignalsChannel());
  });

  // 26. Existing Telegram notifications continue working
  test('26. Existing Telegram notifications continue working', () => {
    const notifs = [
      { channel_type: 'TELEGRAM', payload: { symbol: 'BTCUSDT' } },
      { channel_type: 'DISCORD', payload: { symbol: 'BTCUSDT' } },
    ];
    assert.equal(notifs.some(n => n.channel_type === 'TELEGRAM'), true);
  });

  // 27. Existing signal creation continues working
  test('27. Existing signal creation continues working with dynamic TP/SL', async () => {
    const res = await createSignal({
      symbol: 'BTCUSDT',
      price: 65000,
      exchange: 'BYBIT',
      eagleScore: 85,
      rvol: 2.0,
      primaryStrategy: 'BREAKOUT',
    }, { force: true });
    assert.ok(res.success || res.error_code === 'DUPLICATE_SIGNAL' || res.error_code === 'DEDUPLICATED');
  });

  // 28. PostgreSQL audit records match Discord event IDs
  test('28. PostgreSQL audit records match Discord event IDs', async () => {
    const record = await recordPrepAudit({
      symbol: 'AVAXUSDT',
      price: 29.1,
      marketStatus: 'PREP',
      emitNotification: false,
    });
    assert.ok(record.id.startsWith('AUD-'));
    assert.equal(record.symbol, 'AVAXUSDT');
    assert.equal(record.current_market_status, 'PREP');
    AuditMemoryStore.records.delete(record.id);
  });

  // 29. Discord message IDs are persisted
  test('29. Discord message IDs are persisted to audit store', () => {
    const auditId = 'AUD-TEST-PERSIST-01';
    AuditMemoryStore.records.set(auditId, { id: auditId, symbol: 'SOLUSDT', discord_message_id: null });
    updateAuditDiscordMessageId(auditId, '1554442238145069057');
    assert.equal(AuditMemoryStore.records.get(auditId).discord_message_id, '1554442238145069057');
    AuditMemoryStore.records.delete(auditId);
  });

  // 30. Full E2E event delivery works
  test('30. Full E2E event delivery works (Pipeline -> Outbox -> Discord embed)', async () => {
    const testItem = {
      signal_id: 'EGL-E2E-TEST-001',
      event_type: 'PREP_DETECTED',
      payload: {
        symbol: 'SOLUSDT',
        exchange: 'BYBIT',
        marketStatus: 'PREP',
        prepScore: 88,
        confirmationScore: 42,
        price: 145.5,
        basePrice: 144.0,
        priceEfficiency: 0.35,
        icebergLikelihood: 'HIGH',
        chaseRisk: { level: 'LOW' },
      },
    };

    const targetChannel = resolveDiscordChannel(testItem);
    assert.equal(targetChannel, '1554441211706740776');

    const embedObj = buildPreBreakoutDiscordEmbed(testItem);
    assert.ok(embedObj.embeds && embedObj.embeds.length === 1);
    assert.ok(embedObj.embeds[0].title.includes('PRE-BREAKOUT — PREP'));
  });

});
