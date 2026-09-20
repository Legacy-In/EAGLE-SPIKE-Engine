/**
 * 🦅 EAGLE FLASH — Multi-Dimensional Market Anomaly Engine & Sector Clustering
 */

import { SIGNAL_MODEL_CONFIG } from './config';

export type AnomalyType =
  | 'PRICE-LED'
  | 'VOLUME-LED'
  | 'OI-LED'
  | 'FLOW-LED'
  | 'LIQUIDATION-LED'
  | 'VOLATILITY-LED'
  | 'MULTI-FACTOR';

export type LiquidityTier = 'HIGH' | 'MEDIUM' | 'LOW';

export interface AnomalyMetrics {
  symbol: string;
  exchange: 'BYBIT' | 'MEXC' | 'WEEX';
  sector: string;
  priceChangePct: number;
  timeframe: string;
  priceSigma: number;
  volumeSigma: number;
  rvol: number;
  tradeActivityPct: number;
  oiChangePct: number;
  takerFlowPct: number;
  volatilitySigma: number;
  anomalyScore: number;       // 0 - 100
  anomalyPercentile: number;  // 0 - 100th percentile
  anomalyType: AnomalyType;
  liquidity: LiquidityTier;
  liquidityWarning: boolean;
  crossExchange: {
    ratio: string;            // e.g. "3/3 CONFIRMED", "2/3", "1/3", "N/A"
    confirmedCount: number;
    totalAvailable: number;
    bybitChangePct?: number;
    mexcChangePct?: number;
    weexChangePct?: number;
  };
  eagleScore: number;
  spikePhase: string;
  spikeType: string;
  spikeQuality: string;
  dataConfidence: number;
  turnover24h: number;
  spreadPct: number;
  lastUpdated: number;
}

export interface SpikeCluster {
  sector: string;
  name: string;
  symbolsCount: number;
  symbols: string[];
  avgPriceChange: number;
  avgRvol: number;
  avgAnomalyScore: number;
  primaryDrivers: string[];
}

export interface MarketBreadth {
  advancingPct: number;
  decliningPct: number;
  unchangedPct: number;
  volumeAboveBaselinePct: number;
  oiExpandingPct: number;
  volumeRegime: 'NORMAL' | 'ELEVATED' | 'EXTREME';
  marketVolatility: 'NORMAL' | 'ELEVATED' | 'EXTREME';
  signalEnvironment: 'LOW OPPORTUNITY' | 'SELECTIVE' | 'ACTIVE' | 'EXTREME';
  btcRegime: string;
  totalTracked: number;
}

// Verified Sector Taxonomy mapping for crypto assets
export const SECTOR_MAP: Record<string, string> = {
  // Layer 1
  BTC: 'LAYER 1', ETH: 'LAYER 1', SOL: 'LAYER 1', AVAX: 'LAYER 1', SUI: 'LAYER 1',
  APT: 'LAYER 1', NEAR: 'LAYER 1', ADA: 'LAYER 1', DOT: 'LAYER 1', ATOM: 'LAYER 1',
  SEI: 'LAYER 1', TON: 'LAYER 1', KAS: 'LAYER 1', FTM: 'LAYER 1', ALGO: 'LAYER 1',
  HBAR: 'LAYER 1', ICP: 'LAYER 1', TRX: 'LAYER 1', BCH: 'LAYER 1', LTC: 'LAYER 1',

  // Layer 2
  ARB: 'LAYER 2', OP: 'LAYER 2', MATIC: 'LAYER 2', POL: 'LAYER 2', STRK: 'LAYER 2',
  MNT: 'LAYER 2', BLAST: 'LAYER 2', ZK: 'LAYER 2', METIS: 'LAYER 2', IMX: 'LAYER 2',

  // DeFi
  UNI: 'DEFI', AAVE: 'DEFI', CRV: 'DEFI', MKR: 'DEFI', SNX: 'DEFI',
  LDO: 'DEFI', PENDLE: 'DEFI', JUP: 'DEFI', RAY: 'DEFI', INJ: 'DEFI',
  COMP: 'DEFI', DYDX: 'DEFI', GMX: 'DEFI', RUNE: 'DEFI', ENA: 'DEFI',

  // AI
  FET: 'AI', RENDER: 'AI', TAO: 'AI', AGIX: 'AI', WLD: 'AI',
  GRT: 'AI', OCEAN: 'AI', ARKM: 'AI', IO: 'AI', AI: 'AI',

  // Meme
  DOGE: 'MEME', SHIB: 'MEME', PEPE: 'MEME', WIF: 'MEME', BONK: 'MEME',
  FLOKI: 'MEME', BOME: 'MEME', MEW: 'MEME', POPCAT: 'MEME', TURBO: 'MEME',
  BRETT: 'MEME', MOG: 'MEME', NEIRO: 'MEME', GOAT: 'MEME', ACT: 'MEME',

  // Gaming
  AXS: 'GAMING', SAND: 'GAMING', MANA: 'GAMING', GALA: 'GAMING', ILV: 'GAMING',
  BEAM: 'GAMING', RON: 'GAMING', PIXEL: 'GAMING', YGG: 'GAMING', NOT: 'GAMING',

  // Infrastructure & Oracles
  LINK: 'INFRASTRUCTURE', PYTH: 'INFRASTRUCTURE', TIA: 'INFRASTRUCTURE',
  FIL: 'INFRASTRUCTURE', AR: 'INFRASTRUCTURE', RENDER_INFRA: 'INFRASTRUCTURE',
  W: 'INFRASTRUCTURE', ZRO: 'INFRASTRUCTURE',

  // RWA (Real World Assets)
  ONDO: 'RWA', OM: 'RWA', CFG: 'RWA', TRU: 'RWA', POLYX: 'RWA',

  // Exchange Tokens
  BNB: 'EXCHANGE', OKB: 'EXCHANGE', KCS: 'EXCHANGE', MX: 'EXCHANGE', BGB: 'EXCHANGE'
};

export function getSymbolSector(symbol: string): string {
  // Strip USDT, USDC, PERP suffixes
  const base = symbol.replace(/(USDT|USDC|PERP|_WEEX|_MEXC)$/g, '');
  return SECTOR_MAP[base] || 'OTHER';
}

export class AnomalyEngine {
  /**
   * Calculate multi-dimensional anomaly scores and metadata for an instrument universe
   */
  public static calculateAnomalies(
    symbolsData: any[],
    timeframe: string = '15m'
  ): AnomalyMetrics[] {
    if (!symbolsData || symbolsData.length === 0) return [];

    // Calculate cross-market baseline distributions
    const priceChanges: number[] = [];
    const rvolValues: number[] = [];
    const zScores: number[] = [];

    symbolsData.forEach(s => {
      const chg = this.getTimeframeReturn(s, timeframe);
      priceChanges.push(chg);
      rvolValues.push(s.relativeVolume || 1.0);
      zScores.push(s.volumeZScore || 0);
    });

    const priceStats = this.computeMeanStd(priceChanges);
    const rvolStats = this.computeMeanStd(rvolValues);

    // Map each symbol to AnomalyMetrics
    const rawAnomalies = symbolsData.map(s => {
      const priceChg = this.getTimeframeReturn(s, timeframe);
      const priceSigma = priceStats.std > 0 ? (priceChg - priceStats.mean) / priceStats.std : 0;
      const volSigma = s.volumeZScore !== undefined ? s.volumeZScore : (rvolStats.std > 0 ? (s.relativeVolume - rvolStats.mean) / rvolStats.std : 0);
      const rvol = s.relativeVolume || 1.0;
      const tradeAct = s.tradeCountAcceleration || ((rvol - 1.0) * 45);
      const oiChg = s.oiChangePct || 0;
      const takerFlow = s.takerImbalance || 0;
      const volaSigma = Math.abs(priceSigma);

      // Liquidity Evaluation
      const turnover = s.turnover24h || 0;
      const spread = s.spreadPct || 0.05;
      let liquidity: LiquidityTier = 'LOW';
      if (turnover >= 3000000 && spread <= 0.05) liquidity = 'HIGH';
      else if (turnover >= 500000 && spread <= 0.12) liquidity = 'MEDIUM';
      const liquidityWarning = liquidity === 'LOW';

      // Anomaly Score Calculation (0 - 100)
      // Weighted combination of price sigma, volume sigma, RVOL, and order flow
      let rawScore = (Math.abs(priceSigma) * 22) + (Math.max(0, volSigma) * 24) + ((rvol - 1.0) * 16) + (Math.abs(takerFlow) * 0.35) + (Math.abs(oiChg) * 1.5);
      if (liquidityWarning) rawScore *= 0.75; // de-weight thin books
      const anomalyScore = Math.min(100, Math.max(0, Math.round(rawScore)));

      // Anomaly Type Classification
      let anomalyType: AnomalyType = 'MULTI-FACTOR';
      const absPriceSig = Math.abs(priceSigma);
      if (volSigma >= 3.0 && absPriceSig < 1.5) anomalyType = 'VOLUME-LED';
      else if (absPriceSig >= 3.0 && volSigma < 1.8) anomalyType = 'PRICE-LED';
      else if (Math.abs(oiChg) >= 5.0 && volSigma < 2.0) anomalyType = 'OI-LED';
      else if (Math.abs(takerFlow) >= 35 && absPriceSig < 1.5) anomalyType = 'FLOW-LED';
      else if (s.spikeType === 'SHORT_SQUEEZE' || s.spikeType === 'LONG_SQUEEZE') anomalyType = 'LIQUIDATION-LED';
      else if (volaSigma >= 3.5) anomalyType = 'VOLATILITY-LED';

      // Cross-Exchange Matching
      const crossExchange = this.evaluateCrossExchange(s.symbol, symbolsData, timeframe);

      const sector = getSymbolSector(s.symbol);

      return {
        symbol: s.symbol,
        exchange: s.exchange || 'BYBIT',
        sector,
        priceChangePct: parseFloat(priceChg.toFixed(2)),
        timeframe,
        priceSigma: parseFloat(priceSigma.toFixed(2)),
        volumeSigma: parseFloat(volSigma.toFixed(2)),
        rvol: parseFloat(rvol.toFixed(2)),
        tradeActivityPct: parseFloat(tradeAct.toFixed(1)),
        oiChangePct: parseFloat(oiChg.toFixed(1)),
        takerFlowPct: parseFloat(takerFlow.toFixed(1)),
        volatilitySigma: parseFloat(volaSigma.toFixed(2)),
        anomalyScore,
        anomalyPercentile: 50, // will compute rank percentile below
        anomalyType,
        liquidity,
        liquidityWarning,
        crossExchange,
        eagleScore: s.signalScore || 50,
        spikePhase: s.spikePhase || 'NORMAL',
        spikeType: s.spikeType || 'UNKNOWN',
        spikeQuality: s.spikeQuality || 'LOW',
        dataConfidence: s.dataConfidence || 85,
        turnover24h: turnover,
        spreadPct: spread,
        lastUpdated: s.lastUpdated || Date.now()
      };
    });

    // Compute empirical percentiles for anomalyScore
    const sorted = [...rawAnomalies].sort((a, b) => a.anomalyScore - b.anomalyScore);
    const n = sorted.length;
    sorted.forEach((item, idx) => {
      item.anomalyPercentile = Math.round(((idx + 1) / n) * 100);
    });

    return rawAnomalies;
  }

  /**
   * Helper to resolve timeframe returns
   */
  public static getTimeframeReturn(symbolObj: any, tf: string): number {
    if (tf === '1m') return symbolObj.returns1m !== undefined ? symbolObj.returns1m : (symbolObj.price24hChange || 0) * 0.05;
    if (tf === '5m') return symbolObj.returns5m !== undefined ? symbolObj.returns5m : (symbolObj.price24hChange || 0) * 0.18;
    if (tf === '15m') return symbolObj.returns15m !== undefined ? symbolObj.returns15m : (symbolObj.price24hChange || 0) * 0.38;
    if (tf === '30m') return symbolObj.returns30m !== undefined ? symbolObj.returns30m : (symbolObj.price24hChange || 0) * 0.52;
    if (tf === '1h') return symbolObj.returns1h !== undefined ? symbolObj.returns1h : (symbolObj.price24hChange || 0) * 0.65;
    if (tf === '4h') return symbolObj.returns4h !== undefined ? symbolObj.returns4h : (symbolObj.price24hChange || 0) * 0.85;
    return symbolObj.price24hChange || 0;
  }

  /**
   * Cross-Exchange Verification across Bybit, MEXC, WEEX
   */
  public static evaluateCrossExchange(
    symbol: string,
    allSymbols: any[],
    timeframe: string
  ) {
    const base = symbol.replace(/(USDT|USDC|PERP|_WEEX|_MEXC)$/g, '');
    const cleanSym = base + 'USDT';

    let bybitItem = allSymbols.find(x => x.exchange === 'BYBIT' && (x.symbol === cleanSym || x.symbol === symbol));
    let mexcItem = allSymbols.find(x => x.exchange === 'MEXC' && (x.symbol === cleanSym || x.symbol === symbol));
    let weexItem = allSymbols.find(x => x.exchange === 'WEEX' && (x.symbol === cleanSym || x.symbol === cleanSym + '_WEEX' || x.symbol === symbol));

    const totalAvailable = [bybitItem, mexcItem, weexItem].filter(Boolean).length;
    if (totalAvailable <= 1) {
      return {
        ratio: totalAvailable === 1 ? '1/1 LISTED' : 'N/A',
        confirmedCount: totalAvailable,
        totalAvailable
      };
    }

    // Check if direction is aligned across venues
    let confirmedCount = 0;
    const baseReturn = this.getTimeframeReturn(bybitItem || mexcItem || weexItem, timeframe);
    const isBull = baseReturn >= 0;

    const bybitChg = bybitItem ? this.getTimeframeReturn(bybitItem, timeframe) : undefined;
    const mexcChg = mexcItem ? this.getTimeframeReturn(mexcItem, timeframe) : undefined;
    const weexChg = weexItem ? this.getTimeframeReturn(weexItem, timeframe) : undefined;

    [bybitChg, mexcChg, weexChg].forEach(chg => {
      if (chg !== undefined) {
        if ((isBull && chg >= 0) || (!isBull && chg <= 0)) confirmedCount++;
      }
    });

    return {
      ratio: `${confirmedCount}/${totalAvailable} CONFIRMED`,
      confirmedCount,
      totalAvailable,
      bybitChangePct: bybitChg !== undefined ? parseFloat(bybitChg.toFixed(2)) : undefined,
      mexcChangePct: mexcChg !== undefined ? parseFloat(mexcChg.toFixed(2)) : undefined,
      weexChangePct: weexChg !== undefined ? parseFloat(weexChg.toFixed(2)) : undefined
    };
  }

  /**
   * Detect correlated spike clusters by sector
   */
  public static detectSpikeClusters(anomalies: AnomalyMetrics[]): SpikeCluster[] {
    const sectorGroups: Record<string, AnomalyMetrics[]> = {};

    anomalies.forEach(a => {
      if (a.sector !== 'OTHER' && a.anomalyScore >= 65) {
        if (!sectorGroups[a.sector]) sectorGroups[a.sector] = [];
        sectorGroups[a.sector].push(a);
      }
    });

    const clusters: SpikeCluster[] = [];

    Object.entries(sectorGroups).forEach(([sector, items]) => {
      if (items.length >= 3) {
        const avgPrice = items.reduce((s, x) => s + x.priceChangePct, 0) / items.length;
        const avgRvol = items.reduce((s, x) => s + x.rvol, 0) / items.length;
        const avgScore = items.reduce((s, x) => s + x.anomalyScore, 0) / items.length;

        const drivers: string[] = [];
        if (avgRvol >= 2.5) drivers.push('↑ Volume Expansion');
        if (Math.abs(avgPrice) >= 3.0) drivers.push(avgPrice > 0 ? '↑ Bullish Momentum' : '↓ Bearish Flush');
        drivers.push(`↑ ${items.length} Correlated Movers`);

        clusters.push({
          sector,
          name: `${sector} ACTIVITY CLUSTER`,
          symbolsCount: items.length,
          symbols: items.map(x => x.symbol),
          avgPriceChange: parseFloat(avgPrice.toFixed(2)),
          avgRvol: parseFloat(avgRvol.toFixed(2)),
          avgAnomalyScore: Math.round(avgScore),
          primaryDrivers: drivers
        });
      }
    });

    return clusters.sort((a, b) => b.symbolsCount - a.symbolsCount);
  }

  /**
   * Market-wide breadth metrics
   */
  public static calculateMarketBreadth(symbols: any[], btcRegime: string = 'NEUTRAL'): MarketBreadth {
    const total = symbols.length || 1;
    let adv = 0;
    let dec = 0;
    let unch = 0;
    let volAbove = 0;
    let oiExp = 0;
    let highVolCount = 0;

    symbols.forEach(s => {
      const chg = s.price24hChange || 0;
      if (chg > 0.1) adv++;
      else if (chg < -0.1) dec++;
      else unch++;

      if ((s.relativeVolume || 1.0) >= 1.5) volAbove++;
      if ((s.oiChangePct || 0) > 1.0) oiExp++;
      if (Math.abs(chg) >= 5.0) highVolCount++;
    });

    const advPct = Math.round((adv / total) * 100);
    const decPct = Math.round((dec / total) * 100);
    const unchPct = 100 - advPct - decPct;
    const volAbovePct = Math.round((volAbove / total) * 100);
    const oiExpPct = Math.round((oiExp / total) * 100);

    const volumeRegime = volAbovePct >= 40 ? 'EXTREME' : volAbovePct >= 20 ? 'ELEVATED' : 'NORMAL';
    const volaPct = (highVolCount / total) * 100;
    const marketVolatility = volaPct >= 25 ? 'EXTREME' : volaPct >= 12 ? 'ELEVATED' : 'NORMAL';

    let signalEnvironment: MarketBreadth['signalEnvironment'] = 'LOW OPPORTUNITY';
    if (volAbovePct >= 35 && advPct >= 60) signalEnvironment = 'ACTIVE';
    else if (volAbovePct >= 20) signalEnvironment = 'SELECTIVE';
    else if (marketVolatility === 'EXTREME') signalEnvironment = 'EXTREME';

    return {
      advancingPct: advPct,
      decliningPct: decPct,
      unchangedPct: unchPct,
      volumeAboveBaselinePct: volAbovePct,
      oiExpandingPct: oiExpPct,
      volumeRegime,
      marketVolatility,
      signalEnvironment,
      btcRegime,
      totalTracked: total
    };
  }

  /**
   * Helper: Calculate mean and sample standard deviation
   */
  public static computeMeanStd(values: number[]): { mean: number; std: number } {
    if (!values || values.length === 0) return { mean: 0, std: 0 };
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    if (values.length < 2) return { mean, std: 0 };
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
    return { mean, std: Math.sqrt(variance) };
  }
}
