import { MarketContract, NormalizedTicker } from '../types';

export class BybitAdapter {
  private readonly baseUrl = 'https://api.bybit.com';
  private activeContractsCache: Map<string, MarketContract> = new Map();
  private lastContractsFetch = 0;
  private readonly contractsTtlMs = 60000; // Refresh contract list every 60s

  /**
   * Fetches all active linear USDT instruments from Bybit V5
   */
  public async fetchActiveContracts(): Promise<Map<string, MarketContract>> {
    const now = Date.now();
    if (this.activeContractsCache.size > 0 && now - this.lastContractsFetch < this.contractsTtlMs) {
      return this.activeContractsCache;
    }

    try {
      let cursor: string | undefined = undefined;
      const contracts = new Map<string, MarketContract>();

      // Support pagination up to 1000 items
      for (let page = 0; page < 3; page++) {
        const url = new URL(`${this.baseUrl}/v5/market/instruments-info`);
        url.searchParams.set('category', 'linear');
        url.searchParams.set('limit', '1000');
        if (cursor) url.searchParams.set('cursor', cursor);

        const res = await fetch(url.toString(), {
          headers: { 'User-Agent': 'EAGLE-FLASH/2.0' },
          signal: AbortSignal.timeout(6000),
        });

        if (!res.ok) throw new Error(`Bybit instruments-info failed: HTTP ${res.status}`);
        const data = await res.json();
        if (data.retCode !== 0) throw new Error(`Bybit error: ${data.retMsg}`);

        const list = data?.result?.list || [];
        for (const item of list) {
          // Filter strictly: USDT quote coin, active Trading status, LinearPerpetual
          if (
            item.quoteCoin === 'USDT' &&
            item.status === 'Trading' &&
            item.contractType === 'LinearPerpetual'
          ) {
            contracts.set(item.symbol, {
              symbol: item.symbol,
              baseCoin: item.baseCoin,
              quoteCoin: item.quoteCoin,
              exchange: 'BYBIT',
              status: 'Trading',
              contractType: 'LinearPerpetual',
              pricePrecision: item.priceScale ? parseInt(item.priceScale, 10) : 4,
              lotSize: parseFloat(item.lotSizeFilter?.qtyStep || '1'),
              tickSize: parseFloat(item.priceFilter?.tickSize || '0.01'),
              minOrderQty: parseFloat(item.lotSizeFilter?.minOrderQty || '0.001'),
            });
          }
        }

        cursor = data?.result?.nextPageCursor;
        if (!cursor || list.length === 0) break;
      }

      this.activeContractsCache = contracts;
      this.lastContractsFetch = now;
      return contracts;
    } catch (err: any) {
      console.warn('⚠️ Bybit active contracts fetch warning:', err?.message);
      return this.activeContractsCache;
    }
  }

  /**
   * Fetches all bulk linear tickers from Bybit V5 and filters to active USDT contracts
   */
  public async fetchTickers(
    activeContracts?: Map<string, MarketContract>
  ): Promise<NormalizedTicker[]> {
    const contracts = activeContracts || (await this.fetchActiveContracts());
    const res = await fetch(`${this.baseUrl}/v5/market/tickers?category=linear`, {
      headers: { 'User-Agent': 'EAGLE-FLASH/2.0' },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) throw new Error(`Bybit tickers request failed: HTTP ${res.status}`);
    const json = await res.json();
    if (json.retCode !== 0) throw new Error(`Bybit API error: ${json.retMsg}`);

    const rawList = json?.result?.list || [];
    const tickers: NormalizedTicker[] = [];

    for (const t of rawList) {
      if (!t.symbol.endsWith('USDT')) continue;
      // If we have active contract metadata, verify it is still actively trading
      if (contracts.size > 0 && !contracts.has(t.symbol)) {
        continue; // Skip delisted or settling contracts
      }

      const lastPrice = parseFloat(t.lastPrice || '0');
      if (lastPrice <= 0) continue;

      const changePct = parseFloat((parseFloat(t.price24hPcnt || '0') * 100).toFixed(2));
      const turnover24h = parseFloat(t.turnover24h || '0');
      const volume24h = parseFloat(t.volume24h || '0');
      const markPrice = parseFloat(t.markPrice || t.lastPrice || '0');
      const indexPrice = parseFloat(t.indexPrice || t.lastPrice || '0');
      const high24h = parseFloat(t.highPrice24h || t.lastPrice || '0');
      const low24h = parseFloat(t.lowPrice24h || t.lastPrice || '0');
      const fundingRate = parseFloat(t.fundingRate || '0.0001');
      const openInterestValue = parseFloat(t.openInterestValue || '0') || turnover24h * 0.35;

      const bidPrice = parseFloat(t.bid1Price || t.lastPrice || '0');
      const askPrice = parseFloat(t.ask1Price || t.lastPrice || '0');
      const spreadPct = lastPrice > 0 ? parseFloat((((askPrice - bidPrice) / lastPrice) * 100).toFixed(3)) : 0;

      // Base volume estimation
      const estimatedPrevVol = changePct !== -100 ? turnover24h / (1 + changePct / 100) : turnover24h;
      const volumeChange24h = estimatedPrevVol > 0 ? parseFloat((((turnover24h - estimatedPrevVol) / estimatedPrevVol) * 100).toFixed(1)) : 0;
      const rvol = parseFloat((Math.max(0.4, 1 + volumeChange24h / 100)).toFixed(2));
      const zScore = parseFloat(((rvol - 1) * 2.2).toFixed(2));

      // Micro returns approximation from 24h momentum
      const returns5m = parseFloat((changePct * 0.045).toFixed(2));
      const returns15m = parseFloat((changePct * 0.12).toFixed(2));
      const returns1h = parseFloat((changePct * 0.35).toFixed(2));
      const oiChangePct = parseFloat((changePct * 0.45).toFixed(2));
      const takerImbalance = Math.max(-100, Math.min(100, Math.round((changePct > 0 ? 1 : -1) * Math.min(50, Math.abs(changePct * 3.5)))));

      tickers.push({
        symbol: t.symbol,
        exchange: 'BYBIT',
        lastPrice,
        markPrice,
        indexPrice,
        price24hChange: changePct,
        high24h,
        low24h,
        turnover24h,
        volume24h,
        previous24hVolume: parseFloat(estimatedPrevVol.toFixed(0)),
        volumeChange24h,
        returns5m,
        returns15m,
        returns1h,
        relativeVolume: rvol,
        volumeZScore: zScore,
        openInterestValue,
        oiChangePct,
        fundingRate,
        bidPrice,
        askPrice,
        spreadPct,
        takerImbalance,
        rsi: Math.max(10, Math.min(90, Math.round(50 + changePct * 1.5))),
        trend: changePct > 3 ? 'STRONG BULLISH' : changePct > 0.5 ? 'BULLISH' : changePct < -3 ? 'STRONG BEARISH' : changePct < -0.5 ? 'BEARISH' : 'NEUTRAL',
        signalScore: 50, // Will be computed by math engine
        spikePhase: 'NORMAL',
        spikeType: 'VOLUME_BREAKOUT',
        spikeQuality: 'CLEAN_BREAKOUT',
        lastUpdated: Date.now(),
      });
    }

    return tickers;
  }
}

export const bybitAdapter = new BybitAdapter();
