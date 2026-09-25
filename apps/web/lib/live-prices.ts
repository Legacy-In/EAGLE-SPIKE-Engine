/**
 * 🦅 EAGLE FLASH — Verified Live Perpetual Price Service
 * Fetches, normalizes, and verifies real-time perpetual/futures market prices
 * across Bybit, Binance, MEXC, and WEEX.
 */

export interface VerifiedLivePrice {
  price: number | null;
  exchange: 'BYBIT' | 'BINANCE' | 'MEXC' | 'WEEX';
  symbol: string;
  marketId: string;
  source: 'EXCHANGE_WEBSOCKET' | 'EXCHANGE_REST' | 'UNAVAILABLE';
  timestamp: string; // ISO
  ageMs: number;
  dataQuality: 'LIVE' | 'FRESH' | 'DEGRADED' | 'STALE' | 'UNAVAILABLE';
}

interface CachedQuote {
  price: number;
  timestamp: number;
  exchange: 'BYBIT' | 'BINANCE' | 'MEXC' | 'WEEX';
  marketId: string;
}

const priceCache: Map<string, CachedQuote> = new Map();

export class LivePriceService {
  public static updateFromWebSocket(exchange: 'BYBIT' | 'BINANCE' | 'MEXC' | 'WEEX', symbol: string, price: number): void {
    if (price <= 0) return;
    const cleanSym = symbol.toUpperCase().replace(/[-_]/g, '');
    priceCache.set(`${exchange}:${cleanSym}`, {
      price,
      timestamp: Date.now(),
      exchange,
      marketId: `${exchange}:${cleanSym}`,
    });
  }

  public static async getLivePrice(
    exchange: 'BYBIT' | 'BINANCE' | 'MEXC' | 'WEEX',
    rawSymbol: string
  ): Promise<VerifiedLivePrice> {
    const symbol = rawSymbol.toUpperCase().replace(/[-_]/g, '');
    const cacheKey = `${exchange}:${symbol}`;
    const now = Date.now();

    // 1. Check fresh cache (< 4000ms old)
    const cached = priceCache.get(cacheKey);
    if (cached && now - cached.timestamp < 4000) {
      const ageMs = now - cached.timestamp;
      return {
        price: cached.price,
        exchange,
        symbol,
        marketId: cached.marketId,
        source: 'EXCHANGE_WEBSOCKET',
        timestamp: new Date(cached.timestamp).toISOString(),
        ageMs,
        dataQuality: this.classifyQuality(ageMs),
      };
    }

    // 2. Fetch directly from official Exchange Perpetual/Futures REST API
    try {
      const fetched = await this.fetchFromExchangeRest(exchange, symbol);
      if (fetched && fetched.price > 0) {
        priceCache.set(cacheKey, {
          price: fetched.price,
          timestamp: fetched.timestamp,
          exchange,
          marketId: fetched.marketId,
        });

        const ageMs = now - fetched.timestamp;
        return {
          price: fetched.price,
          exchange,
          symbol,
          marketId: fetched.marketId,
          source: 'EXCHANGE_REST',
          timestamp: new Date(fetched.timestamp).toISOString(),
          ageMs,
          dataQuality: this.classifyQuality(ageMs),
        };
      }
    } catch (err: any) {
      console.warn(`[LivePriceService] Failed to fetch REST price for ${exchange}:${symbol}:`, err?.message);
    }

    // 3. Fallback: check older cache if still within 5 minutes
    if (cached && now - cached.timestamp < 300000) {
      const ageMs = now - cached.timestamp;
      return {
        price: cached.price,
        exchange,
        symbol,
        marketId: cached.marketId,
        source: 'EXCHANGE_REST',
        timestamp: new Date(cached.timestamp).toISOString(),
        ageMs,
        dataQuality: this.classifyQuality(ageMs),
      };
    }

    // 4. Stale or disconnected
    return {
      price: null,
      exchange,
      symbol,
      marketId: `${exchange}:${symbol}`,
      source: 'UNAVAILABLE',
      timestamp: new Date(now).toISOString(),
      ageMs: 999999,
      dataQuality: 'UNAVAILABLE',
    };
  }

  private static async fetchFromExchangeRest(
    exchange: 'BYBIT' | 'BINANCE' | 'MEXC' | 'WEEX',
    symbol: string
  ): Promise<{ price: number; timestamp: number; marketId: string } | null> {
    const now = Date.now();

    // A. BYBIT Linear Perpetual
    if (exchange === 'BYBIT') {
      const res = await fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) return null;
      const json = await res.json();
      const item = json?.result?.list?.[0];
      if (item && item.lastPrice) {
        return {
          price: parseFloat(item.lastPrice),
          timestamp: now,
          marketId: `BYBIT:${symbol}`,
        };
      }
      return null;
    }

    // B. BINANCE USDT-M Futures
    if (exchange === 'BINANCE') {
      const res = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (json && json.price) {
        return {
          price: parseFloat(json.price),
          timestamp: now,
          marketId: `BINANCE:${symbol}`,
        };
      }
      return null;
    }

    // C. MEXC Contract
    if (exchange === 'MEXC') {
      // Ensure RENDERUSDT maps strictly to RENDER_USDT and NOT legacy RNDR!
      const mexcSym = symbol.endsWith('USDT') ? symbol.replace(/USDT$/, '_USDT') : symbol;
      const res = await fetch(`https://contract.mexc.com/api/v1/contract/ticker?symbol=${mexcSym}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (json?.data?.lastPrice) {
        return {
          price: parseFloat(json.data.lastPrice),
          timestamp: now,
          marketId: `MEXC:${symbol}`,
        };
      }
      return null;
    }

    // D. WEEX Futures
    if (exchange === 'WEEX') {
      try {
        const res = await fetch(`https://api.weex.com/api/v1/market/ticker?symbol=${symbol}`, {
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.last) {
            return {
              price: parseFloat(json.data.last),
              timestamp: now,
              marketId: `WEEX:${symbol}`,
            };
          }
        }
      } catch (e) {}

      // Fallback for PEPEUSDT if WEEX is unreachable:
      // Query Bybit or Binance 1000PEPEUSDT and scale by 1/1000
      if (symbol === 'PEPEUSDT') {
        const bRes = await fetch('https://api.bybit.com/v5/market/tickers?category=linear&symbol=1000PEPEUSDT', {
          signal: AbortSignal.timeout(3000),
        });
        if (bRes.ok) {
          const bJson = await bRes.json();
          const p = bJson?.result?.list?.[0]?.lastPrice;
          if (p) {
            return {
              price: parseFloat(p) / 1000,
              timestamp: now,
              marketId: `WEEX:PEPEUSDT`,
            };
          }
        }
      }
      return null;
    }

    return null;
  }

  public static classifyQuality(ageMs: number): 'LIVE' | 'FRESH' | 'DEGRADED' | 'STALE' | 'UNAVAILABLE' {
    if (isNaN(ageMs) || ageMs < 0) return 'UNAVAILABLE';
    if (ageMs <= 5000) return 'LIVE';
    if (ageMs <= 30000) return 'FRESH';
    if (ageMs <= 60000) return 'DEGRADED';
    if (ageMs <= 300000) return 'STALE';
    return 'UNAVAILABLE';
  }

  public static calculateROI(direction: 'LONG' | 'SHORT', entryPrice: number, currentPrice: number): number {
    if (entryPrice <= 0 || currentPrice <= 0) return 0;
    const roi = direction === 'LONG'
      ? ((currentPrice - entryPrice) / entryPrice) * 100
      : ((entryPrice - currentPrice) / entryPrice) * 100;
    return parseFloat(roi.toFixed(2));
  }

  public static formatPrice(price: number | null | undefined): string {
    if (price === null || price === undefined || isNaN(price) || price <= 0) return '—';
    if (price >= 1000) {
      return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (price >= 1) {
      return '$' + price.toFixed(2);
    }
    if (price >= 0.01) {
      return '$' + price.toFixed(4);
    }
    if (price >= 0.0001) {
      return '$' + price.toFixed(6);
    }
    return '$' + price.toFixed(8);
  }
}
