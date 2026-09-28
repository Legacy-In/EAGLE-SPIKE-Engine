/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — DISCORD NOTIFICATION & EMBED UNIT TESTS
 * Verifies embed construction, strategy routing, milestone formatting,
 * rate limit exponential backoff, and invalid signal rejection.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNewSignalDiscordEmbed,
  buildTpMilestoneDiscordEmbed,
  buildStopHitDiscordEmbed,
  buildWhaleRadarDiscordEmbed,
  buildBlockchainProofDiscordEmbed,
  getPhaseBadge,
  getStrategyTypeBadge,
} from '../backend/services/discord/discord-message-builder.mjs';
import { resolveDiscordChannel, resolveDiscordChannels } from '../backend/services/discord/discord-router.mjs';
import { getNotificationBackoffMs } from '../backend/services/notification-outbox.mjs';
import { DiscordNotificationService } from '../backend/services/discord/discord-notification-service.mjs';
import {
  buildSignalSignature,
  isSignatureInCooldown,
  recordSignatureDispatch,
} from '../backend/services/signal-dedup.mjs';

test('1. Discord Embed Builder: NEW_SIGNAL LONG color and fields', () => {
  const signal = {
    signal_id: 'EGL-20260928-BYBIT-BTCUSDT-TEST',
    symbol: 'BTCUSDT',
    exchange: 'BYBIT',
    direction: 'LONG',
    entry_price: 65000,
    current_price: 65200,
    stop_price: 63500,
    target_1_price: 66500,
    target_2_price: 68000,
    target_3_price: 70000,
    risk_r: 1500,
    eagle_score: 90,
    primary_strategy: 'BREAKOUT',
    entry_quality: 'HIGH',
    chase_risk: 'LOW',
    data_confidence: 'HIGH',
    price_age_ms: 120,
  };

  const res = buildNewSignalDiscordEmbed(signal);
  assert.ok(res.embeds && res.embeds.length === 1);
  const embed = res.embeds[0];

  assert.equal(embed.color, 0x00FF88, 'LONG embed color must be neon green (0x00FF88)');
  assert.ok(embed.description.includes('LONG — BTCUSDT'));

  const fields = embed.fields;
  assert.equal(fields.length, 15, 'Discord embed must have 15 structured audit fields');
  assert.ok(fields.some(f => f.name === 'ENTRY' && f.value.includes('$65,000.00')));
  assert.ok(fields.some(f => f.name === 'STOP LOSS' && f.value.includes('$63,500.00')));
  assert.ok(fields.some(f => f.name === 'TP1 (Target 1)' && f.value.includes('$66,500.00')));
  assert.ok(fields.some(f => f.name === 'Eagle Score' && f.value.includes('90/100')));
});

test('2. Discord Embed Builder: NEW_SIGNAL SHORT color', () => {
  const signal = {
    signal_id: 'EGL-20260928-BYBIT-ETHUSDT-SHORT',
    symbol: 'ETHUSDT',
    exchange: 'BYBIT',
    direction: 'SHORT',
    entry_price: 3400,
    current_price: 3380,
    stop_price: 3480,
    target_1_price: 3320,
    eagle_score: 82,
    primary_strategy: 'SHORT_SQUEEZE',
  };

  const res = buildNewSignalDiscordEmbed(signal);
  const embed = res.embeds[0];
  assert.equal(embed.color, 0xFF3366, 'SHORT embed color must be coral red (0xFF3366)');
  assert.ok(embed.description.includes('SHORT — ETHUSDT'));
});

test('3. Discord Embed Builder: TP1_HIT Milestone Alert', () => {
  const milestoneItem = {
    signal_id: 'EGL-TEST-TP1',
    event_type: 'TP1_HIT',
    payload: {
      symbol: 'SOLUSDT',
      direction: 'LONG',
      entry_price: 145.00,
      current_price: 152.00,
      target_1_price: 152.00,
      current_roi_pct: 4.83,
      mfe_pct: 5.10,
      mae_pct: -0.40,
    },
  };

  const res = buildTpMilestoneDiscordEmbed(milestoneItem, 'TP1');
  const embed = res.embeds[0];

  assert.equal(embed.title, '🦅 EAGLE FLASH — TP1 HIT');
  assert.equal(embed.color, 0x00E5FF, 'Milestone embed must be cyan (0x00E5FF)');
  assert.ok(embed.fields.some(f => f.name === 'Realized ROI' && f.value.includes('+4.83%')));
  assert.ok(embed.fields.some(f => f.name === 'Risk Action' && f.value.includes('STOP MOVED TO ENTRY')));
});

test('4. Discord Embed Builder: STOP_HIT Invalidation Alert', () => {
  const stopItem = {
    signal_id: 'EGL-TEST-STOP',
    event_type: 'STOP_HIT',
    payload: {
      symbol: 'DOGEUSDT',
      direction: 'LONG',
      entry_price: 0.1250,
      stop_price: 0.1210,
      exit_price: 0.1208,
      realized_roi_pct: -3.36,
    },
  };

  const res = buildStopHitDiscordEmbed(stopItem);
  const embed = res.embeds[0];

  assert.equal(embed.title, '🦅 EAGLE FLASH — STOP LOSS HIT');
  assert.equal(embed.color, 0xFF3366, 'Stop loss embed must be red (0xFF3366)');
  assert.ok(embed.fields.some(f => f.name === 'Realized ROI' && f.value.includes('-3.36%')));
});

test('5. Discord Embed Builder: WHALE_RADAR Alert', () => {
  const whaleItem = {
    signal_id: 'WHALE-ETH-TRANSFER-01',
    event_type: 'WHALE_ALERT',
    payload: {
      symbol: 'ETH',
      amount_usd: 5400000,
      exchange: 'BINANCE_HOT_WALLET',
      direction: 'SHORT',
    },
  };

  const res = buildWhaleRadarDiscordEmbed(whaleItem);
  const embed = res.embeds[0];

  assert.equal(embed.title, '🐋 EAGLE FLASH — WHALE RADAR ALERT');
  assert.equal(embed.color, 0xFFD700, 'Whale alert embed must be gold (0xFFD700)');
  assert.ok(embed.fields.some(f => f.name === 'Estimated USD' && f.value.includes('$5,400,000')));
});

test('6. Discord Event Router: Strategy and Event Channel Mapping', () => {
  process.env.DISCORD_CHANNEL_SIGNALS = '111111111111111111';
  process.env.DISCORD_CHANNEL_QUICK_PUMP = '222222222222222222';
  process.env.DISCORD_CHANNEL_TP_HITS = '333333333333333333';
  process.env.DISCORD_CHANNEL_STOP_LOSS = '444444444444444444';
  process.env.DISCORD_CHANNEL_WHALES = '555555555555555555';

  // Strategy QUICK_PUMP -> quick pump channel
  const pumpItem = { event_type: 'NEW_SIGNAL', payload: { primary_strategy: 'QUICK_PUMP' } };
  assert.equal(resolveDiscordChannel(pumpItem), '222222222222222222');

  // Generic strategy -> signals channel
  const breakoutItem = { event_type: 'NEW_SIGNAL', payload: { primary_strategy: 'ACCUMULATION' } };
  assert.equal(resolveDiscordChannel(breakoutItem), '111111111111111111');

  // TP1_HIT -> tp hits channel
  const tpHitItem = { event_type: 'TP1_HIT', payload: {} };
  assert.equal(resolveDiscordChannel(tpHitItem), '333333333333333333');

  // STOP_HIT -> stop loss channel
  const stopItem = { event_type: 'STOP_HIT', payload: {} };
  assert.equal(resolveDiscordChannel(stopItem), '444444444444444444');

  // WHALE_ALERT -> whales channel
  const whaleItem = { event_type: 'WHALE_ALERT', payload: {} };
  assert.equal(resolveDiscordChannel(whaleItem), '555555555555555555');
});

test('7. Discord Exponential Backoff Progression', () => {
  assert.equal(getNotificationBackoffMs(1), 2000, 'Attempt 1 must back off 2s');
  assert.equal(getNotificationBackoffMs(2), 5000, 'Attempt 2 must back off 5s');
  assert.equal(getNotificationBackoffMs(3), 15000, 'Attempt 3 must back off 15s');
  assert.equal(getNotificationBackoffMs(4), 30000, 'Attempt 4 must back off 30s');
  assert.equal(getNotificationBackoffMs(5), 60000, 'Attempt 5+ must back off 60s');
});

test('8. Guard Invariant: Rejection of Signals with $0 Entry or $0 Stop', async () => {
  const corruptSignal = {
    signal_id: 'CORRUPT-DISCORD-SIGNAL',
    event_type: 'NEW_SIGNAL',
    payload: {
      symbol: 'BADUSDT',
      entry_price: 100,
      stop_price: 0, // Invalid stop loss
    },
  };

  const res = await DiscordNotificationService.dispatchOutboxItem(corruptSignal);
  assert.equal(res.success, false);
  assert.equal(res.error, 'INVALID_PRICE_GUARD');
});

test('9. Discord Embed: Phase and Strategy Type Badges & Dynamic Colors', () => {
  // Test EXTREME Phase
  const extremeSig = {
    signal_id: 'EGL-EXTREME-TEST',
    symbol: 'PEPEUSDT',
    direction: 'LONG',
    exchange: 'BYBIT',
    entry_price: 0.000012,
    current_price: 0.0000125,
    stop_price: 0.0000115,
    target_1_price: 0.000013,
    phase: 'EXTREME',
    type: 'VOLUME_EXPLOSION',
    rvol: 4.8,
  };

  const extremeRes = buildNewSignalDiscordEmbed(extremeSig);
  const extEmbed = extremeRes.embeds[0];
  assert.equal(extEmbed.color, 0xFF4500, 'EXTREME phase should use Climax Fire Red-Orange');
  assert.ok(extEmbed.fields.some(f => f.name === 'Phase' && f.value.includes('🔴 EXTREME')));
  assert.ok(extEmbed.fields.some(f => f.name === 'Strategy Type' && f.value.includes('💥 VOLUME_EXPLOSION')));
  assert.ok(extEmbed.fields.some(f => f.name === 'RVOL' && f.value.includes('4.80x')));
  assert.ok(extEmbed.fields.some(f => f.name === 'Exchange' && f.value.includes('BYBIT')));

  // Test PRE_SPIKE Phase
  const preSpikeSig = {
    signal_id: 'EGL-PRE-SPIKE-TEST',
    symbol: 'NEARUSDT',
    direction: 'LONG',
    entry_price: 4.50,
    stop_price: 4.35,
    phase: 'PRE_SPIKE',
    type: 'ACCUMULATION',
    rvol: 2.1,
  };

  const preRes = buildNewSignalDiscordEmbed(preSpikeSig);
  const preEmbed = preRes.embeds[0];
  assert.equal(preEmbed.color, 0xFFD700, 'PRE_SPIKE phase should use Gold color');
  assert.ok(preEmbed.fields.some(f => f.name === 'Phase' && f.value.includes('🟡 PRE_SPIKE')));
  assert.ok(preEmbed.fields.some(f => f.name === 'Strategy Type' && f.value.includes('📦 ACCUMULATION')));
});

test('10. Discord Router: Dynamic Phase & Type Multi-Channel Matrix', () => {
  process.env.DISCORD_CHANNEL_SIGNALS = 'CHAN_SIGNALS';
  process.env.DISCORD_CHANNEL_QUICK_PUMP = 'CHAN_PUMP';
  process.env.DISCORD_CHANNEL_BREAKOUTS = 'CHAN_BREAKOUTS';
  process.env.DISCORD_CHANNEL_SQUEEZES = 'CHAN_SQUEEZES';
  process.env.DISCORD_CHANNEL_BIG_CAP = 'CHAN_BIGCAP';

  // 1. VOLUME_EXPLOSION or EXTREME -> #quick-pump + #signals
  const pumpItem = {
    event_type: 'NEW_SIGNAL',
    payload: { symbol: 'TAOUSDT', type: 'VOLUME_EXPLOSION', phase: 'NORMAL' },
  };
  const pumpChannels = resolveDiscordChannels(pumpItem);
  assert.ok(pumpChannels.includes('CHAN_PUMP'), 'VOLUME_EXPLOSION must route to #quick-pump');
  assert.ok(pumpChannels.includes('CHAN_SIGNALS'), 'Signals must include main channel');

  const extremeItem = {
    event_type: 'NEW_SIGNAL',
    payload: { symbol: 'FETUSDT', type: 'MOMENTUM', phase: 'EXTREME' },
  };
  const extremeChannels = resolveDiscordChannels(extremeItem);
  assert.ok(extremeChannels.includes('CHAN_PUMP'), 'EXTREME phase must route to #quick-pump');

  // 2. BREAKOUT -> #breakouts + #signals
  const breakoutItem = {
    event_type: 'NEW_SIGNAL',
    payload: { symbol: 'INJUSDT', type: 'BREAKOUT', phase: 'BREAKOUT' },
  };
  const breakoutChannels = resolveDiscordChannels(breakoutItem);
  assert.ok(breakoutChannels.includes('CHAN_BREAKOUTS'), 'BREAKOUT type must route to #breakouts');

  // 3. ACCUMULATION or PRE_SPIKE -> #squeezes + #signals
  const accumItem = {
    event_type: 'NEW_SIGNAL',
    payload: { symbol: 'RUNEUSDT', type: 'ACCUMULATION', phase: 'NORMAL' },
  };
  const accumChannels = resolveDiscordChannels(accumItem);
  assert.ok(accumChannels.includes('CHAN_SQUEEZES'), 'ACCUMULATION type must route to #squeezes');

  const preSpikeItem = {
    event_type: 'NEW_SIGNAL',
    payload: { symbol: 'ARUSDT', type: 'MOMENTUM', phase: 'PRE_SPIKE' },
  };
  const preSpikeChannels = resolveDiscordChannels(preSpikeItem);
  assert.ok(preSpikeChannels.includes('CHAN_SQUEEZES'), 'PRE_SPIKE phase must route to #squeezes');

  // 4. Big Cap (BTC, ETH, SOL) -> #big-cap + #signals
  const btcItem = {
    event_type: 'NEW_SIGNAL',
    payload: { symbol: 'BTCUSDT', type: 'BREAKOUT', phase: 'NORMAL' },
  };
  const btcChannels = resolveDiscordChannels(btcItem);
  assert.ok(btcChannels.includes('CHAN_BIGCAP'), 'BTCUSDT must route to #big-cap');
  assert.ok(btcChannels.includes('CHAN_BREAKOUTS'), 'BTCUSDT BREAKOUT also routes to #breakouts');
  assert.ok(btcChannels.includes('CHAN_SIGNALS'), 'BTCUSDT routes to #signals');

  // 5. Default qualified signal -> #signals
  const defaultItem = {
    event_type: 'NEW_SIGNAL',
    payload: { symbol: 'ATOMUSDT', type: 'MOMENTUM', phase: 'NORMAL' },
  };
  const defaultChannels = resolveDiscordChannels(defaultItem);
  assert.deepEqual(defaultChannels, ['CHAN_SIGNALS'], 'Default signal routes only to #signals');
});

test('11. Deduplication Engine: SYMBOL:DIRECTION:TYPE composite signatures', () => {
  const sym = 'SUIUSDT';
  const dir = 'LONG';
  const type1 = 'VOLUME_EXPLOSION';
  const type2 = 'BREAKOUT';
  const customCooldownMs = 30 * 60 * 1000;

  // Signature check
  assert.equal(buildSignalSignature(sym, dir, type1), 'SUIUSDT:LONG:VOLUME_EXPLOSION');
  assert.equal(buildSignalSignature(sym, dir, type2), 'SUIUSDT:LONG:BREAKOUT');
  assert.equal(buildSignalSignature(sym, dir), 'SUIUSDT:LONG');

  // Record dispatch for VOLUME_EXPLOSION
  recordSignatureDispatch(sym, dir, type1);

  // Exact type in cooldown
  assert.equal(isSignatureInCooldown(sym, dir, customCooldownMs, type1), true);

  // Base symbol is also locked
  assert.equal(isSignatureInCooldown(sym, dir, customCooldownMs), true);
});
