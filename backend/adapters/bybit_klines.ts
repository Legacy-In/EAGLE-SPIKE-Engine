import fs from 'fs';
import path from 'path';
import { Candle, OpenInterestPoint, fromBybitKlines, fromBybitOpenInterest } from '../engine/confluenceStrategy.ts';

export interface UniverseFilterConfig {
  minTurnoverUsd?: number;      // default $2,000,000
  maxSpreadPct?: number;        // default 0.0015 (0.15%)
  minListingAgeDays?: number;   // default 7 days
  excludeStables?: boolean;     // default true
  excludeLeveraged?: boolean;   // default true
}

export interface QualifiedSymbol {
  symbol: string;
  turnover24h: number;
  spreadPct: number;
  launchTime: number;
}

const CACHE_DIR = path.resolve(process.cwd(), 'data', 'cache', 'klines');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export class BybitDataPipeline {
  private static instance: BybitDataPipeline;
  private cache: Map<string, Candle[]> = new Map();
  private baseRestUrl: string;

  constructor(baseRestUrl = 'https://api.bybit.com') {
    this.baseRestUrl = baseRestUrl;
  }

  public static getInstance(): BybitDataPipeline {
    if (!BybitDataPipeline.instance) {
      BybitDataPipeline.instance = new BybitDataPipeline();
    }
    return BybitDataPipeline.instance;
  }

  /**
   * Resilient fetcher with exponential backoff on HTTP 429 / 403 / network limits
   */
  public async fetchWithRetry(url: string, retries = 3, delayMs = 1000): Promise<any> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.status === 429 || res.status === 403) {
          const waitTime = delayMs * Math.pow(2, attempt - 1);
          console.warn(`[BybitDataPipeline] Rate limited (${res.status}) on ${url}. Retrying in ${waitTime}ms...`);
          await new Promise((r) => setTimeout(r, waitTime));
          continue;
        }

        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        if (data.retCode !== 0) {
          // Bybit application level rate limit codes
          if (data.retCode === 10002 || data.retCode === 10006) {
            const waitTime = delayMs * Math.pow(2, attempt - 1);
            await new Promise((r) => setTimeout(r, waitTime));
            continue;
          }
          throw new Error(`Bybit API Error [${data.retCode}]: ${data.retMsg}`);
        }

        return data;
      } catch (err: any) {
        if (attempt === retries) throw err;
        const waitTime = delayMs * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, waitTime));
      }
    }
  }

  /**
   * Fetches universe of Bybit Linear USDT perpetuals qualified for scanning
   */
  public async getQualifiedUniverse(cfg: UniverseFilterConfig = {}): Promise<QualifiedSymbol[]> {
    const minTurnover = cfg.minTurnoverUsd ?? 2_000_000;
    const maxSpread = cfg.maxSpreadPct ?? 0.0015;
    const minAgeDays = cfg.minListingAgeDays ?? 7;
    const minLaunchCutoff = Date.now() - minAgeDays * 86400 * 1000;

    // 1. Fetch linear instruments
    const instUrl = `${this.baseRestUrl}/v5/market/instruments-info?category=linear&limit=1000`;
    const instData = await this.fetchWithRetry(instUrl);
    const instruments = (instData.result?.list || []).filter((i: any) => {
      if (i.status !== 'Trading') return false;
      if (i.quoteCoin !== 'USDT') return false;
      if (i.contractType !== 'LinearPerpetual') return false;
      if (i.symbol.endsWith('PERP')) return false;

      // Exclude stablecoins
      if (['USDCUSDT', 'BUSDUSDT', 'FDUSDUSDT', 'DAIUSDT', 'EURUSDT'].includes(i.symbol)) return false;

      // Exclude leveraged tokens
      if (/(?:2L|2S|3L|3S|4L|4S|5L|5S)USDT$/.test(i.symbol)) return false;

      const launchTime = +i.launchTime || 0;
      if (launchTime > 0 && launchTime > minLaunchCutoff) return false;

      return true;
    });

    // 2. Fetch 24h tickers
    const tickUrl = `${this.baseRestUrl}/v5/market/tickers?category=linear`;
    const tickData = await this.fetchWithRetry(tickUrl);
    const tickMap = new Map<string, any>();
    for (const t of tickData.result?.list || []) {
      tickMap.set(t.symbol, t);
    }

    // 3. Filter by liquidity and spread
    const qualified: QualifiedSymbol[] = [];
    for (const inst of instruments) {
      const t = tickMap.get(inst.symbol);
      if (!t) continue;

      const turnover24h = +t.turnover24h || 0;
      if (turnover24h < minTurnover) continue;

      const bid = +t.bid1Price || 0;
      const ask = +t.ask1Price || 0;
      if (bid <= 0 || ask <= 0) continue;

      const mid = (bid + ask) / 2;
      const spreadPct = (ask - bid) / mid;
      if (spreadPct > maxSpread) continue;

      qualified.push({
        symbol: inst.symbol,
        turnover24h,
        spreadPct,
        launchTime: +inst.launchTime || 0,
      });
    }

    // Sort descending by turnover
    qualified.sort((a, b) => b.turnover24h - a.turnover24h);
    return qualified;
  }

  /**
   * Fetches 300 1H klines for a symbol, utilizing disk/memory caching and incremental update
   */
  public async getKlines(symbol: string, nowMs = Date.now()): Promise<Candle[]> {
    const cached = this.loadCachedKlines(symbol);
    const intervalMs = 3600000;

    let klines: Candle[] = [];
    if (cached && cached.length >= 260) {
      // Incremental fetch: fetch only the last 10 candles
      try {
        const url = `${this.baseRestUrl}/v5/market/kline?category=linear&symbol=${symbol}&interval=60&limit=10`;
        const data = await this.fetchWithRetry(url);
        const freshClosed = fromBybitKlines(data.result?.list || [], intervalMs, nowMs);

        // Merge incremental candles
        const map = new Map<number, Candle>();
        cached.forEach((c) => map.set(c.t, c));
        freshClosed.forEach((c) => map.set(c.t, c));
        klines = Array.from(map.values()).sort((a, b) => a.t - b.t);

        // Retain max 320 closed candles
        if (klines.length > 320) {
          klines = klines.slice(klines.length - 320);
        }
      } catch (err) {
        console.warn(`[BybitDataPipeline] Incremental fetch failed for ${symbol}, falling back to full fetch:`, err);
        klines = [];
      }
    }

    if (klines.length < 260) {
      // Full fetch: 300 candles
      const url = `${this.baseRestUrl}/v5/market/kline?category=linear&symbol=${symbol}&interval=60&limit=300`;
      const data = await this.fetchWithRetry(url);
      klines = fromBybitKlines(data.result?.list || [], intervalMs, nowMs);
    }

    this.saveCachedKlines(symbol, klines);
    return klines;
  }

  /**
   * Fetches 1H open interest history for a symbol
   */
  public async getOpenInterest(symbol: string): Promise<OpenInterestPoint[]> {
    try {
      const url = `${this.baseRestUrl}/v5/market/open-interest?category=linear&symbol=${symbol}&intervalTime=1h&limit=10`;
      const data = await this.fetchWithRetry(url);
      return fromBybitOpenInterest(data.result?.list || []);
    } catch (err) {
      return [];
    }
  }

  /**
   * Parallel batch processing with concurrency limit
   */
  public async processInBatches<T, R>(
    items: T[],
    batchSize: number,
    workerFn: (item: T, idx: number) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((item, bIdx) => workerFn(item, i + bIdx))
      );
      results.push(...batchResults);
    }
    return results;
  }

  private loadCachedKlines(symbol: string): Candle[] | null {
    if (this.cache.has(symbol)) {
      return this.cache.get(symbol)!;
    }
    const filePath = path.join(CACHE_DIR, `${symbol}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.cache.set(symbol, parsed);
          return parsed;
        }
      } catch (e) {}
    }
    return null;
  }

  private saveCachedKlines(symbol: string, klines: Candle[]) {
    this.cache.set(symbol, klines);
    const filePath = path.join(CACHE_DIR, `${symbol}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(klines));
    } catch (e) {}
  }
}
