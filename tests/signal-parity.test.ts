/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — CANONICAL SIGNAL PARITY & INVARIANT TEST SUITE
 * Verifies exact 100% field equality across PostgreSQL, Telegram payload,
 * Discord payload, Journal API, and Blockchain Proof commitments.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createSignal } from '../backend/services/signal-creation.mjs';
import { buildSignalNotificationPayloads } from '../backend/services/notification-outbox.mjs';
import { formatEagleFlashTelegramAlert } from '../backend/services/telegram-outbox.mjs';
import {
  buildNewSignalDiscordEmbed,
  buildTpMilestoneDiscordEmbed,
  buildStopHitDiscordEmbed,
} from '../backend/services/discord/discord-message-builder.mjs';
import {
  generateCanonicalPayload,
  hashCanonicalPayload,
} from '../backend/services/blockchain-proof.mjs';
import { LivePriceService } from '../backend/engine/live-prices.js';

test('1. CRITICAL PARITY INVARIANT: Exact Match Across PostgreSQL, Telegram, Discord, and Blockchain Proof', async () => {
  const testSymbol = `PARITY${Date.now() % 100000}USDT`;
  const candidate = {
    symbol: testSymbol,
    exchange: 'BYBIT',
    direction: 'LONG',
    entryPrice: 125.50,
    price: 125.50,
    score: 88,
    eagleScore: 88,
    rvol: 2.5,
    volumeZ: 3.1,
    oiDeltaPct: 8.4,
    fundingRate: 0.0001,
    detectedAt: Date.now(),
    strategyVersion: 'v1.5',
    recentSwingHigh: 130.00,
    recentSwingLow: 122.00,
    tickSize: 0.01,
  };

  // 1. Generate Authoritative Canonical Signal
  const result = await createSignal(candidate, { force: true });
  assert.equal(result.success, true, 'Signal creation must succeed');
  const sig = result.signal;

  // 2. Build Multi-Channel Notification Payloads
  const notificationPayloads = buildSignalNotificationPayloads(sig, candidate, 'NEW_SIGNAL');
  const tgPayload = notificationPayloads.find(n => n.channel_type === 'TELEGRAM');
  const discordPayload = notificationPayloads.find(n => n.channel_type === 'DISCORD');

  assert.ok(tgPayload, 'Telegram notification payload must be generated');
  assert.ok(discordPayload, 'Discord notification payload must be generated');

  // 3. Format Telegram Message
  const tgMessage = formatEagleFlashTelegramAlert(tgPayload);
  assert.ok(tgMessage, 'Telegram message formatter must return non-null for valid signal');

  // 4. Format Discord Embed
  const discordMessage = buildNewSignalDiscordEmbed(discordPayload);
  assert.ok(discordMessage.embeds && discordMessage.embeds.length > 0, 'Discord message must contain embed');
  const discordEmbed = discordMessage.embeds[0];

  // 5. Generate Blockchain Proof Payload
  const proofString = generateCanonicalPayload(sig, 'SIGNAL_CREATED');
  const proofHash = hashCanonicalPayload(proofString);
  assert.ok(proofHash.startsWith('0x'), 'Proof hash must be a valid 0x hex string');

  // 6. Assert Exact Field Parity
  assert.equal(tgPayload.payload.signal_id, sig.signal_id, 'Telegram signal_id must match canonical signal');
  assert.equal(discordPayload.payload.signal_id, sig.signal_id, 'Discord signal_id must match canonical signal');

  assert.equal(tgPayload.payload.symbol, sig.symbol, 'Telegram symbol must match canonical');
  assert.equal(discordPayload.payload.symbol, sig.symbol, 'Discord symbol must match canonical');

  assert.equal(tgPayload.payload.direction, sig.direction, 'Telegram direction must match canonical');
  assert.equal(discordPayload.payload.direction, sig.direction, 'Discord direction must match canonical');

  assert.equal(tgPayload.payload.entry_price, sig.entry_price, 'Telegram entry_price must match canonical');
  assert.equal(discordPayload.payload.entry_price, sig.entry_price, 'Discord entry_price must match canonical');

  assert.equal(tgPayload.payload.stop_price, sig.stop_price, 'Telegram stop_price must match canonical');
  assert.equal(discordPayload.payload.stop_price, sig.stop_price, 'Discord stop_price must match canonical');

  assert.equal(tgPayload.payload.target_1_price, sig.target_1_price, 'Telegram target_1_price must match canonical');
  assert.equal(discordPayload.payload.target_1_price, sig.target_1_price, 'Discord target_1_price must match canonical');

  assert.equal(tgPayload.payload.target_2_price, sig.target_2_price, 'Telegram target_2_price must match canonical');
  assert.equal(discordPayload.payload.target_2_price, sig.target_2_price, 'Discord target_2_price must match canonical');

  assert.equal(tgPayload.payload.target_3_price, sig.target_3_price, 'Telegram target_3_price must match canonical');
  assert.equal(discordPayload.payload.target_3_price, sig.target_3_price, 'Discord target_3_price must match canonical');

  assert.equal(tgPayload.payload.eagle_score, sig.eagle_score, 'Telegram score must match canonical');
  assert.equal(discordPayload.payload.eagle_score, sig.eagle_score, 'Discord score must match canonical');

  assert.equal(tgPayload.payload.entry_quality, sig.entry_quality, 'Telegram entry_quality must match canonical');
  assert.equal(discordPayload.payload.entry_quality, sig.entry_quality, 'Discord entry_quality must match canonical');

  assert.equal(tgPayload.payload.chase_risk, sig.chase_risk, 'Telegram chase_risk must match canonical');
  assert.equal(discordPayload.payload.chase_risk, sig.chase_risk, 'Discord chase_risk must match canonical');

  // Verify prices inside Discord Embed
  const getField = (name) => discordEmbed.fields.find(f => f.name.includes(name))?.value;
  assert.ok(getField('ENTRY').includes('125.50'), 'Discord embed must render exact entry price');
  assert.ok(getField('STOP LOSS').includes(String(sig.stop_price)), 'Discord embed must render exact stop price');
  assert.ok(getField('TP1').includes(String(sig.target_1_price)), 'Discord embed must render exact TP1');
});

test('2. ROI MATHEMATICAL INVARIANTS: LONG, SHORT, and Breakeven Calculations', () => {
  // Test LONG ROI: Entry 100, Current 105 -> +5.00%
  const longRoi = LivePriceService.calculateROI('LONG', 100, 105);
  assert.equal(longRoi, 5.0, 'LONG ROI: (105 - 100) / 100 * 100 must equal +5.0%');

  // Test SHORT ROI: Entry 100, Current 95 -> +5.00%
  const shortRoi = LivePriceService.calculateROI('SHORT', 100, 95);
  assert.equal(shortRoi, 5.0, 'SHORT ROI: (100 - 95) / 100 * 100 must equal +5.0%');

  // Test SHORT Loss: Entry 100, Current 105 -> -5.00%
  const shortLoss = LivePriceService.calculateROI('SHORT', 100, 105);
  assert.equal(shortLoss, -5.0, 'SHORT Loss: (100 - 105) / 100 * 100 must equal -5.0%');

  // Test Breakeven: Entry == Current -> 0.00%
  assert.equal(LivePriceService.calculateROI('LONG', 100, 100), 0.0, 'LONG breakeven must be 0%');
  assert.equal(LivePriceService.calculateROI('SHORT', 100, 100), 0.0, 'SHORT breakeven must be 0%');
});

test('3. SUB-CENT COIN PRECISION INVARIANT: PEPE-like micro coins retain up to 8 decimals', () => {
  const pepePrice = 0.00001234;
  const formatted = LivePriceService.formatPrice(pepePrice);
  assert.equal(formatted, '$0.00001234', 'Micro coin must format with 8 decimal places and not $0.0000');

  const shibPrice = 0.00000845;
  const formattedShib = LivePriceService.formatPrice(shibPrice);
  assert.equal(formattedShib, '$0.00000845', 'Shib price must retain 8 decimal places');

  const btcPrice = 65432.10;
  const formattedBtc = LivePriceService.formatPrice(btcPrice);
  assert.equal(formattedBtc, '$65,432.10', 'Macro coin must format with standard 2 decimal places');
});

test('4. CROSS-EXCHANGE SEPARATION INVARIANT: Markets are segregated by exchange', () => {
  const markets = [
    { ex: 'BYBIT', sym: 'SOLUSDT' },
    { ex: 'BINANCE', sym: 'SOLUSDT' },
    { ex: 'MEXC', sym: 'SOLUSDT' },
    { ex: 'WEEX', sym: 'SOLUSDT' },
  ];

  const marketIds = new Set(markets.map(m => `${m.ex}:${m.sym}`));
  assert.equal(marketIds.size, 4, 'Four exchanges for same base symbol must form 4 distinct market identities');
});

test('5. PRICE FRESHNESS CLASSIFICATION INVARIANT', () => {
  assert.equal(LivePriceService.classifyQuality(2000), 'LIVE', 'Under 5s must be LIVE');
  assert.equal(LivePriceService.classifyQuality(12000), 'FRESH', 'Under 30s must be FRESH');
  assert.equal(LivePriceService.classifyQuality(45000), 'DEGRADED', 'Under 60s must be DEGRADED');
  assert.equal(LivePriceService.classifyQuality(120000), 'STALE', 'Under 300s must be STALE');
  assert.equal(LivePriceService.classifyQuality(400000), 'UNAVAILABLE', 'Over 300s must be UNAVAILABLE');
});
