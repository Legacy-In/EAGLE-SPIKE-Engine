import { MarketContract, NormalizedTicker } from '../types';

export class BinanceAdapter {
  private readonly baseUrl = 'https://fapi.binance.com';
  private activeContractsCache: Map<string, MarketContract> = new Map();
  private lastContractsFetch = 0;
  private readonly contractsTtlMs = 60000; // 60s TTL

  /**
   * Fetches all active linear USDT-M contracts from Binance Futures
   */
  public async fetchActiveContracts(): Promise<Map<string, MarketContract>> {
    const now = Date.now();
    if (this.activeContractsCache.size > 0 && now - this.lastContractsFetch < this.contractsTtlMs) {
      return this.activeContractsCache;
    }

    try {
      const res = await fetch(`${this.baseUrl}/fapi/v1/exchangeInfo`, {
        headers: { 'User-Agent': 'EAGLE-FLASH/2.0' },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) throw new Error(`Binance exchangeInfo failed: HTTP ${res.status}`);
      const data = await res.json();
      const symbols = data?.symbols || [];
      const contracts = new Map<string, MarketContract>();

      for (const item of symbols) {
        if (
          item.quoteAsset === 'USDT' &&
          item.status === 'TRADING' &&
          item.contractType === 'PERPETUAL'
        ) {
          const priceFilter = item.filters?.find((f: any) => f.filterType === 'PRICE_FILTER');
          const lotFilter = item.filters?.find((f: any) => f.filterType === 'LOT_SIZE');

          contracts.set(item.symbol, {
            symbol: item.symbol,
            baseCoin: item.baseAsset,
            quoteCoin: item.quoteAsset,
            exchange: 'BINANCE',
            status: 'Trading',
            contractType: 'LinearPerpetual',
            pricePrecision: item.pricePrecision || 4,
            lotSize: lotFilter?.stepSize ? parseFloat(lotFilter.stepSize) : 1,
            tickSize: priceFilter?.tickSize ? parseFloat(priceFilter.tickSize) : 0.0001,
            minOrderQty: lotFilter?.minQty ? parseFloat(lotFilter.minQty) : 0.001,
          });
        }
      }

      this.activeContractsCache = contracts;
      this.lastContractsFetch = now;
      return contracts;
    } catch (err) {
      console.warn('BinanceAdapter: fetchActiveContracts failed, using cached fallback:', err);
      return this.activeContractsCache;
    }
  }

  /**
   * Ingests bulk 24hr tickers and converts to NormalizedTicker
   */
  public async fetchTickers(
    contractsMap?: Map<string, MarketContract>
  ): Promise<NormalizedTicker[]> {
    const activeContracts = contractsMap || (await this.fetchActiveContracts());

    try {
      const [tickerRes, premiumRes] = await Promise.all([
        fetch(`${this.baseUrl}/fapi/v1/ticker/24hr`, {
          headers: { 'User-Agent': 'EAGLE-FLASH/2.0' },
          signal: AbortSignal.timeout(7000),
        }),
        fetch(`${this.baseUrl}/fapi/v1/premiumIndex`, {
          headers: { 'User-Agent': 'EAGLE-FLASH/2.0' },
          signal: AbortSignal.timeout(7000),
        }).catch(() => null),
      ]);

      if (!tickerRes.ok) throw new Error(`Binance 24hr tickers failed: HTTP ${tickerRes.status}`);
      const tickerList = await tickerRes.json();
      const premiumMap = new Map<string, any>();

      if (premiumRes && premiumRes.ok) {
        const premiumList = await premiumRes.json();
        if (Array.isArray(premiumList)) {
          for (const p of premiumList) {
            premiumMap.set(p.symbol, p);
          }
        }
      }

      const normalized: NormalizedTicker[] = [];
      const now = Date.now();

      if (Array.isArray(tickerList)) {
        for (const raw of tickerList) {
          const contract = activeContracts.get(raw.symbol);
          if (!contract) continue;

          const lastPrice = parseFloat(raw.lastPrice || '0');
          if (lastPrice <= 0) continue;

          const premium = premiumMap.get(raw.symbol);
          const markPrice = premium?.markPrice ? parseFloat(premium.markPrice) : lastPrice;
          const indexPrice = premium?.indexPrice ? parseFloat(premium.indexPrice) : lastPrice;
          const fundingRate = premium?.lastFundingRate ? parseFloat(premium.lastFundingRate) : 0;

          const priceChangePercent = parseFloat(raw.priceChangePercent || '0');
          const volume24h = parseFloat(raw.volume || '0');
          const turnover24h = parseFloat(raw.quoteVolume || '0');
          const high24h = parseFloat(raw.highPrice || lastPrice.toString());
          const low24h = parseFloat(raw.lowPrice || lastPrice.toString());
          const openPrice = parseFloat(raw.openPrice || lastPrice.toString());

          normalized.push({
            symbol: raw.symbol,
            exchange: 'BINANCE',
            lastPrice,
            markPrice,
            indexPrice,
            price24hChange: parseFloat(priceChangePercent.toFixed(2)),
            high24h,
            low24h,
            turnover24h: Math.round(turnover24h),
            volume24h: Math.round(volume24h),
            previous24hVolume: Math.round(turnover24h * 0.95),
            volumeChange24h: 0,
            returns5m: 0,
            returns15m: 0,
            returns1h: 0,
            relativeVolume: 1.0,
            volumeZScore: 0.0,
            openInterestValue: 0,
            oiChangePct: 0.0,
            fundingRate,
            bidPrice: lastPrice,
            askPrice: lastPrice,
            spreadPct: 0.02,
            takerImbalance: 0,
            rsi: 50,
            trend: priceChangePercent >= 5 ? 'STRONG BULLISH' : priceChangePercent >= 1 ? 'BULLISH' : priceChangePercent <= -5 ? 'STRONG BEARISH' : priceChangePercent <= -1 ? 'BEARISH' : 'NEUTRAL',
            signalScore: 50,
            spikePhase: 'NORMAL',
            spikeType: 'VOLUME_BREAKOUT',
            spikeQuality: 'CLEAN_BREAKOUT',
            lastUpdated: now,
          });
        }
      }

      return normalized;
    } catch (err) {
      console.warn('BinanceAdapter: fetchTickers failed:', err);
      return [];
    }
  }

  /**
   * Fetches historical 15m klines for OHLCV ring buffer seeding
   */
  public async fetchHistoricalKlines(
    symbol: string,
    interval = '15m',
    limit = 100
  ): Promise<any[]> {
    try {
      const url = new URL(`${this.baseUrl}/fapi/v1/klines`);
      url.searchParams.set('symbol', symbol);
      url.searchParams.set('interval', interval);
      url.searchParams.set('limit', limit.toString());

      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'EAGLE-FLASH/2.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }
}

export const binanceAdapter = new BinanceAdapter();
