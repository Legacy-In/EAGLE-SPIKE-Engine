/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — ACTIVE SYMBOL & EXCHANGE INSTRUMENT VALIDATOR
 * Guarantees that only authentic, active crypto perpetual contracts can generate
 * signals or be dispatched to Telegram & Discord outboxes.
 * Immediately rejects mock, test, or synthetic symbols.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Regex targeting synthetic, mock, or test symbols
export const MOCK_OR_TEST_REGEX = /(?:PARITY\d*|TEST|MOCK|CORRUPT|FAKE|SYNTHETIC|SAMPLE|DEMO)/i;

// In-memory cache of verified active symbols across exchanges
const activeSymbolsCache = new Map(); // exchange -> Set of symbols
let lastFetchTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Hardcoded institutional baseline list ensuring zero cold-start latency
const BASELINE_SYMBOLS = new Set([
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT',
  'AVAXUSDT', 'LINKUSDT', 'SUIUSDT', 'NEARUSDT', 'APTUSDT', 'PEPEUSDT', 'SHIBUSDT',
  'DOTUSDT', 'LTCUSDT', 'UNIUSDT', 'ATOMUSDT', 'RENDERUSDT', 'TAOUSDT', 'FETUSDT',
  'INJUSDT', 'ARBUSDT', 'OPUSDT', 'TIAUSDT', 'SEIUSDT', 'KASUSDT', 'TONUSDT',
  'WIFUSDT', 'FLOKIUSDT', 'BONKUSDT', 'AAVEUSDT', 'MKRUSDT', 'CRVUSDT', 'PENDLEUSDT',
  'ORDIUSDT', 'RUNEUSDT', 'FTMUSDT', 'ONDOUSDT', 'ENAUSDT', 'STXUSDT', 'GALAUSDT'
]);

// Initialize baseline
activeSymbolsCache.set('BYBIT', new Set(BASELINE_SYMBOLS));
activeSymbolsCache.set('BINANCE', new Set(BASELINE_SYMBOLS));
activeSymbolsCache.set('MEXC', new Set(BASELINE_SYMBOLS));
activeSymbolsCache.set('ALL', new Set(BASELINE_SYMBOLS));

/**
 * Fetch and update active perpetual contracts from Bybit and Binance
 */
export async function refreshActiveInstruments() {
  const now = Date.now();
  if (now - lastFetchTime < CACHE_TTL_MS && activeSymbolsCache.get('ALL')?.size > 50) {
    return activeSymbolsCache;
  }

  const bybitSet = new Set(BASELINE_SYMBOLS);
  const binanceSet = new Set(BASELINE_SYMBOLS);
  const allSet = new Set(BASELINE_SYMBOLS);

  // 1. Fetch Bybit Linear Perpetuals
  try {
    const res = await fetch('https://api.bybit.com/v5/market/instruments-info?category=linear&limit=1000', {
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'EagleFlashValidator/2.0' },
    });
    if (res.ok) {
      const data = await res.json();
      const list = data?.result?.list || [];
      for (const item of list) {
        if (item.quoteCoin === 'USDT' && item.status === 'Trading' && !MOCK_OR_TEST_REGEX.test(item.symbol)) {
          bybitSet.add(item.symbol);
          allSet.add(item.symbol);
        }
      }
    }
  } catch (err) {
    // Graceful fallback to baseline
  }

  // 2. Fetch Binance USDT-M Futures
  try {
    const res = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo', {
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'EagleFlashValidator/2.0' },
    });
    if (res.ok) {
      const data = await res.json();
      const symbols = data?.symbols || [];
      for (const item of symbols) {
        if (item.quoteAsset === 'USDT' && item.status === 'TRADING' && item.contractType === 'PERPETUAL' && !MOCK_OR_TEST_REGEX.test(item.symbol)) {
          binanceSet.add(item.symbol);
          allSet.add(item.symbol);
        }
      }
    }
  } catch (err) {
    // Graceful fallback to baseline
  }

  activeSymbolsCache.set('BYBIT', bybitSet);
  activeSymbolsCache.set('BINANCE', binanceSet);
  activeSymbolsCache.set('ALL', allSet);
  lastFetchTime = now;

  return activeSymbolsCache;
}

// Trigger initial async background load
refreshActiveInstruments().catch(() => {});

/**
 * Check if a symbol string matches mock or test patterns
 */
export function isBlacklistedSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') return true;
  const clean = symbol.trim().toUpperCase();
  return MOCK_OR_TEST_REGEX.test(clean);
}

/**
 * Validates that a symbol is a genuine, active perpetual instrument on supported exchanges
 * @param {string} symbol - e.g. "BTCUSDT" or "BYBIT:BTCUSDT"
 * @param {string} [exchange] - e.g. "BYBIT" or "BINANCE"
 * @returns {boolean}
 */
export function isValidActiveSymbol(symbol, exchange = null) {
  if (!symbol || typeof symbol !== 'string') return false;

  const raw = symbol.trim().toUpperCase();
  const cleanSymbol = raw.includes(':') ? raw.split(':')[1] : raw;

  // 1. Blacklist check
  if (MOCK_OR_TEST_REGEX.test(cleanSymbol)) {
    return false;
  }

  // 2. Must end with USDT or USDC
  if (!cleanSymbol.endsWith('USDT') && !cleanSymbol.endsWith('USDC')) {
    return false;
  }

  // 3. Minimum symbol length check (e.g. 5 chars minimum: "KASUSDT")
  if (cleanSymbol.length < 5 || cleanSymbol.length > 20) {
    return false;
  }

  // 4. Check active instruments cache
  const exKey = exchange ? exchange.toUpperCase() : 'ALL';
  const targetSet = activeSymbolsCache.get(exKey) || activeSymbolsCache.get('ALL');

  if (targetSet && targetSet.has(cleanSymbol)) {
    return true;
  }

  // 5. If cache is still cold or symbol not found in set, check all sets or baseline
  return BASELINE_SYMBOLS.has(cleanSymbol) || (activeSymbolsCache.get('ALL')?.has(cleanSymbol) ?? false);
}
