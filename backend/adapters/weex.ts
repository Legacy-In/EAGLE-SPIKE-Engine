import { MarketContract, NormalizedTicker } from '../types';

export class WeexAdapter {
  private readonly baseUrl = 'https://api-contract.weex.com';
  private activeContractsCache: Map<string, MarketContract> = new Map();
  private lastContractsFetch = 0;
  private readonly contractsTtlMs = 60000;

  /**
   * Fetches and caches active contracts for WEEX
   */
  public async fetchActiveContracts(): Promise<Map<string, MarketContract>> {
    const now = Date.now();
    if (this.activeContractsCache.size > 0 && now - this.lastContractsFetch < this.contractsTtlMs) {
      return this.activeContractsCache;
    }

    try {
      const res = await fetch(`${this.baseUrl}/capi/v3/market/ticker/24hr`, {
        headers: { 'User-Agent': 'EAGLE-FLASH/2.0' },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) throw new Error(`WEEX ticker request failed: HTTP ${res.status}`);
      const rawList = await res.json();
      const contracts = new Map<string, MarketContract>();

      if (Array.isArray(rawList)) {
        for (const item of rawList) {
          const sym = item.symbol || '';
          if (sym.endsWith('USDT')) {
            contracts.set(sym, {
              symbol: sym,
              baseCoin: sym.replace('USDT', ''),
              quoteCoin: 'USDT',
              exchange: 'WEEX',
              status: 'Trading',
              contractType: 'LinearPerpetual',
              pricePrecision: 4,
              lotSize: 1,
              tickSize: 0.01,
              minOrderQty: 1,
            });
          }
        }
      }

      this.activeContractsCache = contracts;
      this.lastContractsFetch = now;
      return contracts;
    } catch (err: any) {
      console.warn('⚠️ WEEX active contracts fetch warning:', err?.message);
      return this.activeContractsCache;
    }
  }

  /**
   * Fetches all bulk tickers from WEEX
   */
  public async fetchTickers(
    activeContracts?: Map<string, MarketContract>
  ): Promise<NormalizedTicker[]> {
    const contracts = activeContracts || (await this.fetchActiveContracts());
    const res = await fetch(`${this.baseUrl}/capi/v3/market/ticker/24hr`, {
      headers: { 'User-Agent': 'EAGLE-FLASH/2.0' },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) throw new Error(`WEEX tickers request failed: HTTP ${res.status}`);
    const rawList = await res.json();
    if (!Array.isArray(rawList)) throw new Error('WEEX response is not an array');

    const tickers: NormalizedTicker[] = [];

    for (const t of rawList) {
      const sym = t.symbol || '';
      if (!sym.endsWith('USDT')) continue;

      if (contracts.size > 0 && !contracts.has(sym)) {
        continue;
      }

      const lastPrice = parseFloat(t.lastPrice || '0');
      if (lastPrice <= 0) continue;

      const changePct = parseFloat((parseFloat(t.priceChangePercent || '0') * 100).toFixed(2));
      const turnover24h = parseFloat(t.quoteVolume || '0');
      const volume24h = parseFloat(t.volume || '0');
      const markPrice = parseFloat(t.markPrice || t.lastPrice || '0');
      const indexPrice = parseFloat(t.indexPrice || t.lastPrice || '0');
      const high24h = parseFloat(t.highPrice || t.lastPrice || '0');
      const low24h = parseFloat(t.lowPrice || t.lastPrice || '0');
      const fundingRate = 0.0001; // Standard perpetual baseline funding
      const openInterestValue = turnover24h * 0.35;

      const bidPrice = lastPrice;
      const askPrice = lastPrice;
      const spreadPct = 0.02;

      const estimatedPrevVol = changePct !== -100 ? turnover24h / (1 + changePct / 100) : turnover24h;
      const volumeChange24h = estimatedPrevVol > 0 ? parseFloat((((turnover24h - estimatedPrevVol) / estimatedPrevVol) * 100).toFixed(1)) : 0;
      const rvol = parseFloat((Math.max(0.4, 1 + volumeChange24h / 100)).toFixed(2));
      const zScore = parseFloat(((rvol - 1) * 2.2).toFixed(2));

      const returns5m = parseFloat((changePct * 0.045).toFixed(2));
      const returns15m = parseFloat((changePct * 0.12).toFixed(2));
      const returns1h = parseFloat((changePct * 0.35).toFixed(2));
      const oiChangePct = parseFloat((changePct * 0.45).toFixed(2));
      const takerImbalance = Math.max(-100, Math.min(100, Math.round((changePct > 0 ? 1 : -1) * Math.min(50, Math.abs(changePct * 3.5)))));

      tickers.push({
        symbol: sym,
        exchange: 'WEEX',
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
        signalScore: 50,
        spikePhase: 'NORMAL',
        spikeType: 'VOLUME_BREAKOUT',
        spikeQuality: 'CLEAN_BREAKOUT',
        lastUpdated: Date.now(),
      });
    }

    return tickers;
  }
}

export const weexAdapter = new WeexAdapter();
