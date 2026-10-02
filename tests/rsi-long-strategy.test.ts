/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — RSI HEATMAP & HIGH-OI LONG SETUP TEST SUITE
 * 
 * Verifies:
 * 1. 7-Day RSI Math & Boundary Precision
 * 2. Mandatory Gate 1: Market Cap >= $50M
 * 3. Mandatory Gate 2: 24h Trading Volume >= $1M
 * 4. Mandatory Gate 3: 7-Day RSI Ceiling <= 55
 * 5. Mandatory Gate 4: High Open Interest Confluence (>= $3M)
 * 6. Idempotent 4-Hour Cooldown Deduplication
 * 7. Strict Discord Routing to #rsi-longs (Zero Leakage to #signals)
 * 8. Discord Embed Construction & Formatted Metrics
 * 9. Test Outbox Isolation
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRsi,
  evaluateRsiLongOpportunity,
  dispatchRsiLongAlert,
  RsiLongCooldownMap,
  RSI_LONG_CONFIG,
  isRsiLongOnCooldown,
  recordRsiLongCooldown,
} from '../backend/services/rsi_long_strategy.mjs';
import {
  resolveDiscordChannel,
  resolveDiscordChannels,
  getRsiLongsChannel,
} from '../backend/services/discord/discord-router.mjs';
import {
  buildRsiLongDiscordEmbed,
} from '../backend/services/discord/discord-message-builder.mjs';
import {
  getLocalNotificationOutboxPath,
  isTestExecution,
} from '../backend/services/notification-outbox.mjs';

describe('RSI Heatmap & High-OI Long Strategy Engine', () => {
  test('1. calculateRsi produces accurate Wilder-smoothed RSI', () => {
    // 15 days of steadily rising closes
    const risingCloses = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    const highRsi = calculateRsi(risingCloses, 7);
    assert.ok(highRsi > 90, `RSI for continuous gains must be >90, got: ${highRsi}`);

    // 15 days of steadily falling closes
    const fallingCloses = [24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10];
    const lowRsi = calculateRsi(fallingCloses, 7);
    assert.ok(lowRsi < 10, `RSI for continuous drops must be <10, got: ${lowRsi}`);

    // Balanced closes oscillating around 50
    const oscillating = [100, 102, 101, 103, 102, 104, 103, 102, 101, 102, 101, 100, 101, 102, 101];
    const midRsi = calculateRsi(oscillating, 7);
    assert.ok(midRsi >= 40 && midRsi <= 60, `RSI for oscillating prices must be near 50, got: ${midRsi}`);
  });

  test('2. Gate 1: Rejects coins with Market Cap < $50,000,000', () => {
    const microCapCandidate = {
      symbol: 'MICROUSDT',
      exchange: 'BYBIT',
      lastPrice: 0.05,
      turnover24h: 3_000_000,       // $3M volume (passes vol)
      rsi7d: 42.0,                  // 42 RSI (passes RSI)
      openInterestValue: 5_000_000, // $5M OI (passes OI)
      marketCap: 12_000_000,        // $12M Market Cap (FAILS < $50M)
    };

    RsiLongCooldownMap.delete('MICROUSDT');
    const result = evaluateRsiLongOpportunity(microCapCandidate);
    assert.equal(result.qualifies, false);
    assert.ok(result.reasons.some(r => r.includes('Market Cap')));
  });

  test('3. Gate 2: Rejects coins with 24h Volume < $1,000,000', () => {
    const lowVolCandidate = {
      symbol: 'LOWVOLUSDT',
      exchange: 'BYBIT',
      lastPrice: 1.50,
      turnover24h: 450_000,         // $450k volume (FAILS < $1M)
      rsi7d: 38.0,                  // 38 RSI (passes RSI)
      openInterestValue: 4_000_000, // $4M OI (passes OI)
      marketCap: 150_000_000,       // $150M Cap (passes cap)
    };

    RsiLongCooldownMap.delete('LOWVOLUSDT');
    const result = evaluateRsiLongOpportunity(lowVolCandidate);
    assert.equal(result.qualifies, false);
    assert.ok(result.reasons.some(r => r.includes('24h Volume')));
  });

  test('4. Gate 3: Rejects coins with 7-Day RSI > 55 (Overextended)', () => {
    const overboughtCandidate = {
      symbol: 'OVERBOUGHTUSDT',
      exchange: 'BYBIT',
      lastPrice: 25.0,
      turnover24h: 12_000_000,      // $12M volume (passes vol)
      rsi7d: 68.5,                  // 68.5 RSI (FAILS > 55)
      openInterestValue: 8_000_000, // $8M OI (passes OI)
      marketCap: 500_000_000,       // $500M Cap (passes cap)
    };

    RsiLongCooldownMap.delete('OVERBOUGHTUSDT');
    const result = evaluateRsiLongOpportunity(overboughtCandidate);
    assert.equal(result.qualifies, false);
    assert.ok(result.reasons.some(r => r.includes('7D RSI')));
  });

  test('5. Gate 4: Rejects coins with low Open Interest (< $3,000,000)', () => {
    const lowOiCandidate = {
      symbol: 'LOWOIUSDT',
      exchange: 'BYBIT',
      lastPrice: 10.0,
      turnover24h: 5_000_000,       // $5M volume (passes vol)
      rsi7d: 46.0,                  // 46 RSI (passes RSI)
      openInterestValue: 1_200_000, // $1.2M OI (FAILS < $3M)
      marketCap: 200_000_000,       // $200M Cap (passes cap)
    };

    RsiLongCooldownMap.delete('LOWOIUSDT');
    const result = evaluateRsiLongOpportunity(lowOiCandidate);
    assert.equal(result.qualifies, false);
    assert.ok(result.reasons.some(r => r.includes('Open Interest')));
  });

  test('6. Complete Setup Approval: Approves candidate meeting all 4 criteria', () => {
    const qualifiedCandidate = {
      symbol: 'SUIUSDT',
      exchange: 'BYBIT',
      lastPrice: 2.15,
      turnover24h: 45_000_000,      // $45M 24h Vol (>= $1M)
      rsi7d: 48.2,                  // 48.2 7D RSI (<= 55)
      openInterestValue: 28_000_000,// $28M OI (>= $3M)
      oiDeltaPct: 4.8,              // Positive OI expansion
      takerImbalance: 12.5,         // Positive aggressive buyer flow
      marketCap: 6_200_000_000,     // $6.2B Cap (>= $50M)
    };

    RsiLongCooldownMap.delete('SUIUSDT');
    const result = evaluateRsiLongOpportunity(qualifiedCandidate);
    assert.equal(result.qualifies, true, 'SUIUSDT must qualify for RSI Long setup');
    assert.equal(result.reasons.length, 0);
    assert.equal(result.metrics.symbol, 'SUIUSDT');
    assert.equal(result.metrics.rsi7d, 48.2);
  });

  test('7. Deduplication Guard: Enforces 4-Hour Cooldown per symbol', () => {
    const symbol = 'AVAXUSDT';
    RsiLongCooldownMap.delete(symbol);

    const now = Date.now();
    assert.equal(isRsiLongOnCooldown(symbol, now), false);

    // Record alert
    recordRsiLongCooldown(symbol, now);
    assert.equal(isRsiLongOnCooldown(symbol, now + 1000), true);
    assert.equal(isRsiLongOnCooldown(symbol, now + 2 * 3600 * 1000), true);

    // After 4 hours + 1 minute, cooldown expires
    assert.equal(isRsiLongOnCooldown(symbol, now + 4 * 3600 * 1000 + 60000), false);
  });

  test('8. Dedicated Discord Channel Routing: Strictly routes to #rsi-longs', () => {
    process.env.DISCORD_CHANNEL_RSI_LONGS = 'CHAN_RSI_LONGS_12345';
    process.env.DISCORD_CHANNEL_SIGNALS = 'CHAN_FALLBACK_SIGNALS_99999';

    assert.equal(getRsiLongsChannel(), 'CHAN_RSI_LONGS_12345');

    const rsiItem = {
      signal_id: 'RSI-LONG-20261003-BYBIT-SUIUSDT-ABC1',
      event_type: 'RSI_LONG_SETUP',
      payload: {
        symbol: 'SUIUSDT',
        strategy_type: 'RSI_HEATMAP_LONG',
      },
    };

    const targetChannel = resolveDiscordChannel(rsiItem);
    assert.equal(targetChannel, 'CHAN_RSI_LONGS_12345', 'Must route strictly to #rsi-longs');
    assert.deepEqual(resolveDiscordChannels(rsiItem), ['CHAN_RSI_LONGS_12345']);

    // Ensure zero leakage: if channel is not configured, strict null prevents falling back into #signals
    delete process.env.DISCORD_CHANNEL_RSI_LONGS;
    delete process.env.DISCORD_CHANNEL_RSI_HEATMAP_SETUP;
    delete process.env.DISCORD_RSI_LONGS_CHANNEL_ID;
    delete process.env.DISCORD_CHANNEL_MOMENTUM_LONGS;
    const unconfiguredRoute = resolveDiscordChannel(rsiItem);
    assert.equal(unconfiguredRoute, null, 'Must return null instead of leaking into #signals when #rsi-longs is not set');
  });

  test('9. Discord Embed Construction: Formats rich embed with all 4 required fields', () => {
    const payload = {
      signal_id: 'RSI-LONG-20261003-BYBIT-NEARUSDT-4A1B',
      symbol: 'NEARUSDT',
      exchange: 'BYBIT',
      rsi_7d: 44.5,
      market_cap: 5_400_000_000,
      volume_24h: 38_000_000,
      open_interest_usd: 16_500_000,
      oi_delta_pct: 3.25,
      price: 4.82,
    };

    const embedResult = buildRsiLongDiscordEmbed({ payload });
    assert.ok(embedResult.embeds && embedResult.embeds.length === 1);
    const embed = embedResult.embeds[0];

    assert.equal(embed.title, '📈 RSI HEATMAP LONG SETUP');
    assert.ok(embed.description.includes('NEARUSDT'));

    const fields = embed.fields;
    const rsiField = fields.find(f => f.name.includes('7D RSI'));
    assert.ok(rsiField);
    assert.ok(rsiField.value.includes('44.5'));

    const capField = fields.find(f => f.name.includes('Market Cap'));
    assert.ok(capField);
    assert.ok(capField.value.includes('5.40B') || capField.value.includes('5.4B'));

    const volField = fields.find(f => f.name.includes('24h Volume'));
    assert.ok(volField);
    assert.ok(volField.value.includes('38.00M') || volField.value.includes('38M'));

    const oiField = fields.find(f => f.name.includes('Open Interest'));
    assert.ok(oiField);
    assert.ok(oiField.value.includes('16.50M') || oiField.value.includes('16.5M'));
  });

  test('10. Test Outbox Isolation: dispatchRsiLongAlert targets test outbox', async () => {
    assert.equal(isTestExecution(), true);
    const candidate = {
      symbol: 'APTUSDT',
      exchange: 'BYBIT',
      lastPrice: 8.50,
      turnover24h: 22_000_000,
      rsi7d: 41.0,
      openInterestValue: 12_000_000,
      oiDeltaPct: 2.1,
      marketCap: 4_200_000_000,
    };

    RsiLongCooldownMap.delete('APTUSDT');
    const dispatchRes = await dispatchRsiLongAlert(candidate);
    assert.ok(dispatchRes && dispatchRes.success);
    assert.ok(dispatchRes.signalId.includes('APTUSDT'));

    const outboxPath = getLocalNotificationOutboxPath();
    assert.ok(outboxPath.includes('test_notification_outbox.json'), 'Must write to test outbox');
  });
});
