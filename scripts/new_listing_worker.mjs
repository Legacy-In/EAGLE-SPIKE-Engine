#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — AUTOMATED NEW COIN LISTING ALERT WORKER
 *
 * Monitors new token and perpetual listings across target exchanges:
 * - Bybit Linear Perpetuals
 * - Binance Futures (USDT-M)
 * - MEXC Perpetual Contracts
 * - Aster API / DEX (Configurable via ASTER_LISTING_API_URL)
 *
 * Compares against persistent state cache (data/known_listings.json),
 * deduplicates with exact-once delivery semantics, and queues rich
 * Discord embed alerts to #new-listing-alert / #market-alerts.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { queueNotificationAlerts, isTestExecution } from '../backend/services/notification-outbox.mjs';
import { getNewListingsChannel, getMarketAlertsChannel } from '../backend/services/discord/discord-router.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}

export function getKnownListingsPath() {
  const fileName = isTestExecution() ? 'test_known_listings.json' : 'known_listings.json';
  return path.join(DATA_DIR, fileName);
}

// Configurable constants
export const DEFAULT_POLL_INTERVAL_MS = 45000;
const FETCH_TIMEOUT_MS = 8000;

export const ListingTelemetry = {
  pollsTotal: 0,
  listingsDetectedTotal: 0,
  lastPollTime: null,
  lastError: null,
};

// ═══════════════════════════════════════════════════════════════════════════
// 1. STATE STORE (LOAD & SAVE)
// ═══════════════════════════════════════════════════════════════════════════

export function loadKnownListings(filePath = getKnownListingsPath()) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.exchanges) {
        return parsed;
      }
    }
  } catch (e) {}

  return {
    version: 1,
    last_updated: null,
    exchanges: {
      BYBIT: [],
      BINANCE: [],
      MEXC: [],
      ASTER: [],
    },
    history: [],
  };
}

export function saveKnownListings(data, filePath = getKnownListingsPath()) {
  try {
    data.last_updated = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[LISTING_WORKER] Error writing known listings file:', err.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. EXCHANGE CONNECTORS & POLLING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch Bybit Linear Perpetuals
 */
export async function fetchBybitListings() {
  const url = 'https://api.bybit.com/v5/market/instruments-info?category=linear&limit=1000';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return [];
    const json = await res.json();
    const list = json?.result?.list;
    if (!Array.isArray(list)) return [];

    return list
      .filter(item => item.status === 'Trading' || item.status === 'Settling')
      .map(item => ({
        symbol: String(item.symbol).toUpperCase(),
        exchange: 'BYBIT',
        baseCoin: item.baseCoin || item.symbol.replace(/USDT$/, ''),
        quoteCoin: item.quoteCoin || 'USDT',
        contractType: 'LINEAR_PERPETUAL',
        launchTime: item.launchTime ? parseInt(item.launchTime, 10) : null,
        tradeUrl: `https://www.bybit.com/trade/usdt/${item.symbol}`,
      }));
  } catch (err) {
    console.warn('[LISTING_WORKER] Bybit fetch warning:', err.message);
    return [];
  }
}

/**
 * Fetch Binance USDT-M Futures
 */
export async function fetchBinanceListings() {
  const url = 'https://fapi.binance.com/fapi/v1/exchangeInfo';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return [];
    const json = await res.json();
    const list = json?.symbols;
    if (!Array.isArray(list)) return [];

    return list
      .filter(item => (item.status === 'TRADING' || item.status === 'SETTLING') && item.quoteAsset === 'USDT')
      .map(item => ({
        symbol: String(item.symbol).toUpperCase(),
        exchange: 'BINANCE',
        baseCoin: item.baseAsset || item.symbol.replace(/USDT$/, ''),
        quoteCoin: item.quoteAsset || 'USDT',
        contractType: item.contractType || 'PERPETUAL',
        launchTime: item.onboardDate ? parseInt(item.onboardDate, 10) : null,
        tradeUrl: `https://www.binance.com/en/futures/${item.symbol}`,
      }));
  } catch (err) {
    console.warn('[LISTING_WORKER] Binance fetch warning:', err.message);
    return [];
  }
}

/**
 * Fetch MEXC Perpetual Contracts
 */
export async function fetchMexcListings() {
  const url = 'https://contract.mexc.com/api/v1/contract/detail';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return [];
    const json = await res.json();
    const list = json?.data;
    if (!Array.isArray(list)) return [];

    return list
      .filter(item => item.state === 0) // 0 = enabled
      .map(item => ({
        symbol: String(item.symbol).toUpperCase().replace(/_/g, ''),
        rawSymbol: item.symbol,
        exchange: 'MEXC',
        baseCoin: item.baseCoin || item.symbol.replace(/_USDT$/, ''),
        quoteCoin: item.quoteCoin || 'USDT',
        contractType: 'PERPETUAL_CONTRACT',
        launchTime: null,
        tradeUrl: `https://futures.mexc.com/exchange/${item.symbol}`,
      }));
  } catch (err) {
    console.warn('[LISTING_WORKER] MEXC fetch warning:', err.message);
    return [];
  }
}

/**
 * Fetch Aster API / DEX Markets (Configurable via ASTER_LISTING_API_URL)
 */
export async function fetchAsterListings() {
  const customUrl = process.env.ASTER_LISTING_API_URL;
  if (!customUrl) {
    return [];
  }

  try {
    const res = await fetch(customUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return [];
    const json = await res.json();
    const list = Array.isArray(json) ? json : (json?.data || json?.result || json?.markets || []);
    if (!Array.isArray(list)) return [];

    return list.map(item => {
      const rawSym = item.symbol || item.market || item.name || '';
      const symbol = String(rawSym).toUpperCase().replace(/[-_/]/g, '');
      return {
        symbol,
        exchange: 'ASTER',
        baseCoin: item.baseAsset || item.base || symbol.replace(/USDT$/, ''),
        quoteCoin: item.quoteAsset || item.quote || 'USDT',
        contractType: 'DEX_PERPETUAL',
        launchTime: item.launchTime || item.createdAt ? new Date(item.launchTime || item.createdAt).getTime() : null,
        tradeUrl: item.tradeUrl || `https://app.asterdex.com/trade/${symbol}`,
      };
    });
  } catch (err) {
    console.warn('[LISTING_WORKER] Aster fetch notice:', err.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. DIFFING & DEDUPLICATION ALGORITHM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Diffs current active listings against the stored known listings.
 * Returns array of brand-new listings detected in this cycle.
 */
export function diffListings(currentSnapshot, knownState) {
  const newDiscoveries = [];

  for (const [exchange, activeList] of Object.entries(currentSnapshot)) {
    const knownSet = new Set((knownState.exchanges[exchange] || []).map(s => String(s).toUpperCase()));

    for (const item of activeList) {
      const sym = item.symbol.toUpperCase();
      if (!knownSet.has(sym)) {
        newDiscoveries.push(item);
      }
    }
  }

  return newDiscoveries;
}

/**
 * Hydrates state cache on cold start (when known listings is empty)
 * Prevents alert storms on initial worker startup.
 */
export function hydrateInitialState(currentSnapshot, knownState) {
  const totalKnown = Object.values(knownState.exchanges).reduce((acc, arr) => acc + (arr ? arr.length : 0), 0);

  if (totalKnown === 0) {
    for (const [exchange, activeList] of Object.entries(currentSnapshot)) {
      knownState.exchanges[exchange] = Array.from(new Set(activeList.map(item => item.symbol.toUpperCase())));
    }
    return true; // Was hydrated
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. ALERT DISPATCH & OUTBOX INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formats and queues newly discovered listings to notification_outbox for #new-listing-alert
 */
export async function dispatchNewListingAlerts(newListings) {
  if (!Array.isArray(newListings) || newListings.length === 0) return 0;

  const targetChannel = getNewListingsChannel() || getMarketAlertsChannel();
  const notifications = [];

  for (const item of newListings) {
    const signalId = `LISTING_${item.exchange}_${item.symbol}_${Date.now()}`;
    const payload = {
      signal_id: signalId,
      event_type: 'NEW_COIN_LISTED',
      symbol: item.symbol,
      exchange: item.exchange,
      contract_type: item.contractType || 'LINEAR_PERPETUAL',
      base_coin: item.baseCoin,
      quote_coin: item.quoteCoin,
      launch_time: item.launchTime,
      trade_url: item.tradeUrl,
      detected_at: new Date().toISOString(),
      status: 'NEW_COIN_LISTED',
    };

    notifications.push({
      signal_id: signalId,
      event_type: 'NEW_COIN_LISTED',
      channel_type: 'DISCORD',
      channel_id: targetChannel,
      payload,
      deduplication_key: `OUTBOX-LISTING-${item.exchange}-${item.symbol}-NEW_COIN_LISTED-DISCORD`,
    });

    console.log(`🚀 [NEW LISTING DISCOVERED] ${item.exchange} | ${item.symbol} (${item.contractType}) -> Queuing for #new-listing-alert`);
  }

  await queueNotificationAlerts(notifications);
  ListingTelemetry.listingsDetectedTotal += newListings.length;
  return notifications.length;
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. POLLING CYCLE EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

export async function runListingCheckCycle(knownStateFilePath = getKnownListingsPath()) {
  ListingTelemetry.pollsTotal++;
  ListingTelemetry.lastPollTime = new Date().toISOString();

  // 1. Concurrently query all exchange listing endpoints
  const [bybitItems, binanceItems, mexcItems, asterItems] = await Promise.all([
    fetchBybitListings(),
    fetchBinanceListings(),
    fetchMexcListings(),
    fetchAsterListings(),
  ]);

  const currentSnapshot = {
    BYBIT: bybitItems,
    BINANCE: binanceItems,
    MEXC: mexcItems,
    ASTER: asterItems,
  };

  // 2. Load stored known listings
  const knownState = loadKnownListings(knownStateFilePath);

  // 3. Check for cold-start hydration
  const wasHydrated = hydrateInitialState(currentSnapshot, knownState);
  if (wasHydrated) {
    const totalCount = Object.values(knownState.exchanges).reduce((acc, a) => acc + a.length, 0);
    console.log(`[LISTING_WORKER] 📦 Hydrated initial state cache with ${totalCount} active listings across 4 exchanges. No false alerts emitted.`);
    saveKnownListings(knownState, knownStateFilePath);
    return { newlyDetected: [], hydrated: true };
  }

  // 4. Diff active listings against known listings
  const newDiscoveries = diffListings(currentSnapshot, knownState);

  // 5. If new listings detected, dispatch alerts and update state
  if (newDiscoveries.length > 0) {
    await dispatchNewListingAlerts(newDiscoveries);

    for (const item of newDiscoveries) {
      if (!knownState.exchanges[item.exchange]) {
        knownState.exchanges[item.exchange] = [];
      }
      knownState.exchanges[item.exchange].push(item.symbol.toUpperCase());

      knownState.history.unshift({
        symbol: item.symbol,
        exchange: item.exchange,
        contract_type: item.contractType,
        detected_at: new Date().toISOString(),
        launch_time: item.launchTime,
        alert_sent: true,
      });

      if (knownState.history.length > 200) {
        knownState.history.pop();
      }
    }

    saveKnownListings(knownState, knownStateFilePath);
  }

  return { newlyDetected: newDiscoveries, hydrated: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. DAEMON LOOP & PROCESS SUPERVISION
// ═══════════════════════════════════════════════════════════════════════════

let isRunning = false;
let pollTimer = null;

export function startDaemon(pollIntervalMs = DEFAULT_POLL_INTERVAL_MS) {
  if (isRunning) return;
  isRunning = true;

  console.log('═════════════════════════════════════════════════════════════════');
  console.log('🚀 EAGLE FLASH — NEW COIN LISTING ALERT WORKER STARTED');
  console.log('═════════════════════════════════════════════════════════════════');
  console.log(`⏱️  Polling Interval: ${pollIntervalMs / 1000}s`);
  console.log(`📁 State Cache File: ${getKnownListingsPath()}`);
  console.log(`📢 Destination Channel: #new-listing-alert / #market-alerts\n`);

  // Initial immediate run
  runListingCheckCycle().catch(err => {
    console.error('[LISTING_WORKER] Initial cycle error:', err.message);
  });

  // Recurring polling loop
  pollTimer = setInterval(async () => {
    try {
      await runListingCheckCycle();
    } catch (err) {
      ListingTelemetry.lastError = err.message;
      console.error('[LISTING_WORKER] Polling cycle error:', err.message);
    }
  }, pollIntervalMs);

  const shutdown = () => {
    console.log('\n🛑 [LISTING_WORKER] Shutting down listing worker cleanly...');
    if (pollTimer) clearInterval(pollTimer);
    isRunning = false;
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Execute daemon if invoked directly via CLI
if (process.argv[1] && process.argv[1].endsWith('new_listing_worker.mjs')) {
  const intervalArg = process.env.POLL_INTERVAL_MS ? parseInt(process.env.POLL_INTERVAL_MS, 10) : DEFAULT_POLL_INTERVAL_MS;
  startDaemon(intervalArg);
}
