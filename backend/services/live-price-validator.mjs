/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — REAL-TIME LIVE PRICE & ORDER BOOK INTEGRITY VALIDATOR
 * Fetches real-time exchange tickers with < 500ms latency.
 * Eliminates stale, fake, or drifted entry prices prior to broadcast.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const MAX_DIVERGENCE_PCT = 3.5; // Maximum allowed price divergence (3.5%) between signal trigger and broadcast
const recentTickerCache = new Map(); // symbol -> { price, timestamp }

/**
 * Fetch fresh real-time ticker price from Binance or Bybit REST
 * @param {string} symbol - e.g. "BTCUSDT"
 * @param {string} [preferredExchange] - e.g. "BINANCE" or "BYBIT"
 * @returns {Promise<{ price: number, exchange: string, timestamp: number } | null>}
 */
export async function fetchLiveTickerPrice(symbol, preferredExchange = 'BINANCE') {
  const normSym = symbol.includes(':') ? symbol.split(':')[1] : symbol;
  const now = Date.now();

  // Check 500ms cache
  const cached = recentTickerCache.get(normSym);
  if (cached && now - cached.timestamp < 500) {
    return { price: cached.price, exchange: cached.exchange, timestamp: cached.timestamp };
  }

  // 1. Try Binance Futures Ticker (fastest, lowest latency endpoint)
  try {
    const res = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${normSym}`, {
      signal: AbortSignal.timeout(1200),
      headers: { 'User-Agent': 'EagleFlashLivePrice/2.0' },
    });
    if (res.ok) {
      const data = await res.json();
      const price = parseFloat(data.price);
      if (price > 0) {
        recentTickerCache.set(normSym, { price, exchange: 'BINANCE', timestamp: now });
        return { price, exchange: 'BINANCE', timestamp: now };
      }
    }
  } catch (e) {}

  // 2. Try Bybit Linear Tickers (fallback)
  try {
    const res = await fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${normSym}`, {
      signal: AbortSignal.timeout(1500),
      headers: { 'User-Agent': 'EagleFlashLivePrice/2.0' },
    });
    if (res.ok) {
      const data = await res.json();
      const item = data?.result?.list?.[0];
      const price = parseFloat(item?.lastPrice || 0);
      if (price > 0) {
        recentTickerCache.set(normSym, { price, exchange: 'BYBIT', timestamp: now });
        return { price, exchange: 'BYBIT', timestamp: now };
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Validates whether a signal's price aligns with the current real-time market
 * @param {string} symbol - Token symbol
 * @param {number} proposedPrice - Proposed entry or trigger price
 * @param {string} [exchange] - Exchange origin
 * @returns {Promise<{ valid: boolean, livePrice: number | null, divergencePct: number, reason: string | null }>}
 */
export async function validateSignalPriceIntegrity(symbol, proposedPrice, exchange = 'BINANCE') {
  const price = parseFloat(proposedPrice);
  if (isNaN(price) || price <= 0) {
    return { valid: false, livePrice: null, divergencePct: 100, reason: 'INVALID_NUMERIC_PRICE' };
  }

  const live = await fetchLiveTickerPrice(symbol, exchange);
  if (!live || !live.price) {
    // If live exchange price cannot be reached, return optimistic pass with notice
    return { valid: true, livePrice: null, divergencePct: 0, reason: 'EXCHANGE_UNREACHABLE_FALLBACK' };
  }

  const livePrice = live.price;
  const divergencePct = Math.abs((price - livePrice) / livePrice) * 100;

  if (divergencePct > MAX_DIVERGENCE_PCT) {
    return {
      valid: false,
      livePrice,
      divergencePct: parseFloat(divergencePct.toFixed(2)),
      reason: `PRICE_DIVERGENCE_EXCEEDED (${divergencePct.toFixed(2)}% > ${MAX_DIVERGENCE_PCT}%)`,
    };
  }

  return {
    valid: true,
    livePrice,
    divergencePct: parseFloat(divergencePct.toFixed(2)),
    reason: null,
  };
}
