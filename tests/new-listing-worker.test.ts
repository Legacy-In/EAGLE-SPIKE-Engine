import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadKnownListings,
  saveKnownListings,
  diffListings,
  hydrateInitialState,
  dispatchNewListingAlerts,
  getKnownListingsPath,
} from '../scripts/new_listing_worker.mjs';
import { resolveDiscordChannel, getNewListingsChannel, getMarketAlertsChannel } from '../backend/services/discord/discord-router.mjs';
import { buildNewListingDiscordEmbed } from '../backend/services/discord/discord-message-builder.mjs';
import { getLocalNotificationOutboxPath } from '../backend/services/notification-outbox.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

describe('🚀 New Coin Listing Alert Worker & Channel Routing Suite', () => {
  const testListingPath = path.join(ROOT_DIR, 'data', 'test_known_listings.json');
  const testOutboxPath = getLocalNotificationOutboxPath();

  beforeEach(() => {
    process.env.DISCORD_CHANNEL_NEW_LISTINGS = '1555161614825693255';
    process.env.DISCORD_NEW_LISTINGS_CHANNEL_ID = '1555161614825693255';
    process.env.DISCORD_CHANNEL_MARKET_ALERTS = '1554054020010745869';

    // Clean up test files
    if (fs.existsSync(testListingPath)) {
      try { fs.unlinkSync(testListingPath); } catch (e) {}
    }
    if (fs.existsSync(testOutboxPath)) {
      try { fs.unlinkSync(testOutboxPath); } catch (e) {}
    }
  });

  afterEach(() => {
    if (fs.existsSync(testListingPath)) {
      try { fs.unlinkSync(testListingPath); } catch (e) {}
    }
    if (fs.existsSync(testOutboxPath)) {
      try { fs.unlinkSync(testOutboxPath); } catch (e) {}
    }
  });

  test('1. loadKnownListings returns valid default structure on missing file', () => {
    const state = loadKnownListings(testListingPath);
    assert.equal(state.version, 1);
    assert.ok(Array.isArray(state.exchanges.BYBIT));
    assert.ok(Array.isArray(state.exchanges.BINANCE));
    assert.ok(Array.isArray(state.exchanges.MEXC));
    assert.ok(Array.isArray(state.exchanges.ASTER));
    assert.ok(Array.isArray(state.history));
  });

  test('2. saveKnownListings persists state atomically to disk', () => {
    const state = loadKnownListings(testListingPath);
    state.exchanges.BYBIT.push('BTCUSDT');
    state.exchanges.BINANCE.push('ETHUSDT');

    const success = saveKnownListings(state, testListingPath);
    assert.equal(success, true);
    assert.ok(fs.existsSync(testListingPath));

    const reloaded = loadKnownListings(testListingPath);
    assert.deepEqual(reloaded.exchanges.BYBIT, ['BTCUSDT']);
    assert.deepEqual(reloaded.exchanges.BINANCE, ['ETHUSDT']);
    assert.ok(reloaded.last_updated !== null);
  });

  test('3. hydrateInitialState seeds existing universe without emitting false alert storms', () => {
    const knownState = loadKnownListings(testListingPath);
    const mockSnapshot = {
      BYBIT: [{ symbol: 'BTCUSDT' }, { symbol: 'SOLUSDT' }],
      BINANCE: [{ symbol: 'BTCUSDT' }, { symbol: 'DOGEUSDT' }],
      MEXC: [{ symbol: 'PEPEUSDT' }],
      ASTER: [{ symbol: 'ASTUSDT' }],
    };

    const wasHydrated = hydrateInitialState(mockSnapshot, knownState);
    assert.equal(wasHydrated, true, 'Cold start must return wasHydrated = true');

    // Symbols must now be in knownState
    assert.equal(knownState.exchanges.BYBIT.length, 2);
    assert.equal(knownState.exchanges.BINANCE.length, 2);
    assert.equal(knownState.exchanges.MEXC.length, 1);
    assert.equal(knownState.exchanges.ASTER.length, 1);

    // Diffs immediately after hydration must be 0
    const diffs = diffListings(mockSnapshot, knownState);
    assert.equal(diffs.length, 0, 'Initial diff must be empty after hydration');
  });

  test('4. diffListings detects newly listed token accurately across exchanges', () => {
    const knownState = {
      version: 1,
      exchanges: {
        BYBIT: ['BTCUSDT', 'ETHUSDT'],
        BINANCE: ['BTCUSDT'],
        MEXC: [],
        ASTER: [],
      },
      history: [],
    };

    const updatedSnapshot = {
      BYBIT: [
        { symbol: 'BTCUSDT', exchange: 'BYBIT', contractType: 'LINEAR_PERPETUAL' },
        { symbol: 'ETHUSDT', exchange: 'BYBIT', contractType: 'LINEAR_PERPETUAL' },
        { symbol: 'NEWCOINUSDT', exchange: 'BYBIT', contractType: 'LINEAR_PERPETUAL', baseCoin: 'NEWCOIN', quoteCoin: 'USDT' },
      ],
      BINANCE: [
        { symbol: 'BTCUSDT', exchange: 'BINANCE' },
        { symbol: 'ASTERUSDT', exchange: 'BINANCE', contractType: 'PERPETUAL', baseCoin: 'ASTER', quoteCoin: 'USDT' },
      ],
      MEXC: [],
      ASTER: [],
    };

    const discoveries = diffListings(updatedSnapshot, knownState);
    assert.equal(discoveries.length, 2, 'Must detect exactly 2 brand-new listings');

    const bybitNew = discoveries.find(d => d.symbol === 'NEWCOINUSDT');
    assert.ok(bybitNew);
    assert.equal(bybitNew.exchange, 'BYBIT');

    const binanceNew = discoveries.find(d => d.symbol === 'ASTERUSDT');
    assert.ok(binanceNew);
    assert.equal(binanceNew.exchange, 'BINANCE');
  });

  test('5. Deduplication ensures known symbol is never alerted twice', () => {
    const knownState = {
      version: 1,
      exchanges: {
        BYBIT: ['BTCUSDT', 'NEWCOINUSDT'],
        BINANCE: ['BTCUSDT', 'ASTERUSDT'],
        MEXC: [],
        ASTER: [],
      },
      history: [],
    };

    const snapshot = {
      BYBIT: [
        { symbol: 'BTCUSDT', exchange: 'BYBIT' },
        { symbol: 'NEWCOINUSDT', exchange: 'BYBIT' },
      ],
      BINANCE: [{ symbol: 'ASTERUSDT', exchange: 'BINANCE' }],
      MEXC: [],
      ASTER: [],
    };

    const discoveries = diffListings(snapshot, knownState);
    assert.equal(discoveries.length, 0, 'Already known symbols must produce 0 discoveries');
  });

  test('6. resolveDiscordChannel routes NEW_COIN_LISTED strictly to #new-listing-alert or #market-alerts', () => {
    const listingEvent = {
      signal_id: 'LISTING_BYBIT_NEWCOIN_1234',
      event_type: 'NEW_COIN_LISTED',
      payload: {
        symbol: 'NEWCOINUSDT',
        exchange: 'BYBIT',
        status: 'NEW_COIN_LISTED',
      },
    };

    const channelId = resolveDiscordChannel(listingEvent);
    const expectedChannel = getNewListingsChannel() || getMarketAlertsChannel();

    assert.ok(channelId !== null, 'Channel ID must resolve');
    assert.equal(channelId, expectedChannel, 'Must route strictly to designated listings / market alerts channel');
  });

  test('7. buildNewListingDiscordEmbed constructs compliant, rich Discord embed', () => {
    const mockItem = {
      payload: {
        symbol: 'ASTERUSDT',
        exchange: 'BYBIT',
        contract_type: 'LINEAR_PERPETUAL',
        base_coin: 'ASTER',
        quote_coin: 'USDT',
        launch_time: 1790800000000,
        trade_url: 'https://www.bybit.com/trade/usdt/ASTERUSDT',
        detected_at: '2026-10-01T12:00:00.000Z',
        status: 'NEW_COIN_LISTED',
      },
    };

    const message = buildNewListingDiscordEmbed(mockItem);
    assert.ok(message.embeds && Array.isArray(message.embeds));
    assert.equal(message.embeds.length, 1);

    const embed = message.embeds[0];
    assert.ok(embed.title.includes('NEW COIN LISTED'));
    assert.ok(embed.description.includes('ASTERUSDT'));
    assert.equal(embed.color, 0x00E5FF); // Cyber Cyan

    const fieldMap = new Map(embed.fields.map(f => [f.name, f.value]));
    assert.ok(fieldMap.get('🪙 Token / Symbol').includes('ASTERUSDT'));
    assert.ok(fieldMap.get('🏛️ Exchange Source').includes('BYBIT'));
    assert.ok(fieldMap.get('🚀 Listing Status').includes('NEW_COIN_LISTED'));
    assert.ok(fieldMap.get('🔗 Trade & Explore').includes('https://www.bybit.com/trade/usdt/ASTERUSDT'));
  });

  test('8. dispatchNewListingAlerts queues notification into outbox', async () => {
    const mockNewListings = [
      {
        symbol: 'TESTNEWUSDT',
        exchange: 'BYBIT',
        contractType: 'LINEAR_PERPETUAL',
        baseCoin: 'TESTNEW',
        quoteCoin: 'USDT',
        launchTime: Date.now(),
        tradeUrl: 'https://www.bybit.com/trade/usdt/TESTNEWUSDT',
      },
    ];

    const queuedCount = await dispatchNewListingAlerts(mockNewListings);
    assert.equal(queuedCount, 1);

    // Verify outbox file
    assert.ok(fs.existsSync(testOutboxPath));
    const outboxContent = JSON.parse(fs.readFileSync(testOutboxPath, 'utf-8'));
    assert.equal(outboxContent.length, 1);
    assert.equal(outboxContent[0].event_type, 'NEW_COIN_LISTED');
    assert.equal(outboxContent[0].payload.symbol, 'TESTNEWUSDT');
    assert.equal(outboxContent[0].channel_type, 'DISCORD');
  });
});
