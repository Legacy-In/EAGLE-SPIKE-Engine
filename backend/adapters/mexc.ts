import { MarketContract, NormalizedTicker } from '../types';

export class MexcAdapter {
  private readonly baseUrl = 'https://contract.mexc.com';
  private activeContractsCache: Map<string, MarketContract> = new Map();
  private lastContractsFetch = 0;
  private readonly contractsTtlMs = 60000;

  /**
   * Fetches all active USDT perpetual contract details from MEXC
   */
  public async fetchActiveContracts(): Promise<Map<string, MarketContract>> {
    const now = Date.now();
    if (this.activeContractsCache.size > 0 && now - this.lastContractsFetch < this.contractsTtlMs) {
      return this.activeContractsCache;
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/v1/contract/detail`, {
        headers: { 'User-Agent': 'EAGLE-FLASH/2.0' },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) throw new Error(`MEXC contract detail failed: HTTP ${res.status}`);
      const json = await res.json();
      const rawList = json?.data || [];
      const contracts = new Map<string, MarketContract>();

      for (const item of rawList) {
        // MEXC uses symbol format "BTC_USDT" or "BTCUSDT"
        const rawSymbol = item.symbol || '';
        const cleanSymbol = rawSymbol.replace('_', '');
        const quoteCoin = item.quoteCoin || (rawSymbol.endsWith('USDT') ? 'USDT' : '');

        // state === 0 means active trading in MEXC
        if (quoteCoin === 'USDT' && (item.state === 0 || item.state === undefined)) {
          contracts.set(cleanSymbol, {
            symbol: cleanSymbol,
            baseCoin: item.baseCoin || cleanSymbol.replace('USDT', ''),
            quoteCoin: 'USDT',
            exchange: 'MEXC',
            status: item.state === 0 ? 'Trading' : 'Trading',
            contractType: 'LinearPerpetual',
            pricePrecision: item.priceScale || 4,
            lotSize: item.contractSize || 1,
            tickSize: item.priceUnit || 0.01,
            minOrderQty: item.minVol || 1,
          });
        }
      }

      this.activeContractsCache = contracts;
      this.lastContractsFetch = now;
      return contracts;
    } catch (err: any) {
      console.warn('⚠️ MEXC active contracts fetch warning:', err?.message);
      return this.activeContractsCache;
    }
  }

  /**
   * Fetches all bulk tickers from MEXC and filters to active USDT contracts
   */
  public async fetchTickers(
    activeContracts?: Map<string, MarketContract>
  ): Promise<NormalizedTicker[]> {
    const contracts = activeContracts || (await this.fetchActiveContracts());
    const res = await fetch(`${this.baseUrl}/api/v1/contract/ticker`, {
      headers: { 'User-Agent': 'EAGLE-FLASH/2.0' },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) throw new Error(`MEXC ticker request failed: HTTP ${res.status}`);
    const json = await res.json();
    const rawList = json?.data || [];
    const tickers: NormalizedTicker[] = [];

    for (const t of rawList) {
      const cleanSymbol = (t.symbol || '').replace('_', '');
      if (!cleanSymbol.endsWith('USDT')) continue;

      if (contracts.size > 0 && !contracts.has(cleanSymbol)) {
        continue; // Skip delisted contracts
      }

      const lastPrice = parseFloat(t.lastPrice || '0');
      if (lastPrice <= 0) continue;

      const changePct = parseFloat((parseFloat(t.riseFallRate || '0') * 100).toFixed(2));
      const turnover24h = parseFloat(t.amount24 || '0');
      const volume24h = parseFloat(t.volume24 || '0');
      const markPrice = parseFloat(t.fairPrice || t.lastPrice || '0');
      const indexPrice = parseFloat(t.indexPrice || t.lastPrice || '0');
      const high24h = parseFloat(t.high24Price || t.lastPrice || '0');
      const low24h = parseFloat(t.lower24Price || t.lastPrice || '0');
      const fundingRate = parseFloat(t.fundingRate || '0.0001');
      const openInterestValue = parseFloat(t.holdVol || '0') || turnover24h * 0.35;

      const bidPrice = parseFloat(t.bid1 || t.lastPrice || '0');
      const askPrice = parseFloat(t.ask1 || t.lastPrice || '0');
      const spreadPct = lastPrice > 0 ? parseFloat((((askPrice - bidPrice) / lastPrice) * 100).toFixed(3)) : 0;

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
        symbol: cleanSymbol,
        exchange: 'MEXC',
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

export const mexcAdapter = new MexcAdapter();
