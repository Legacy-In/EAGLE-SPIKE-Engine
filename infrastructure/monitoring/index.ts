/**
 * SIGMA — Observability, Data Health & Cross-Source Anomaly Engine
 */

import { CrossSourceComparison, DataQualityGrade, SourceHealthStatus } from '../../packages/types';
import { failsafeController } from '../failsafe';

export interface DataHealthSummary {
  overallDataQualityPct: number;
  sources: SourceHealthStatus[];
  crossSourceComparison: CrossSourceComparison;
  activeAnomalies: string[];
  lastChecked: number;
}

class MonitoringService {
  private sources: Map<string, SourceHealthStatus> = new Map();
  private primaryPrice = 70000;
  private secondaryPrice = 70010;
  private tertiaryPrice = 69995;

  constructor() {
    this.initializeDefaultSources();
  }

  private initializeDefaultSources() {
    const defaults: SourceHealthStatus[] = [
      {
        id: 'binance-ws',
        name: 'Binance WebSocket L1/L2',
        sourceType: 'WEBSOCKET',
        status: 'ONLINE',
        latencyMs: 85,
        lastHeartbeat: Date.now(),
        freshnessMs: 120,
        confidenceScore: 99,
        quality: 'LIVE',
        errorCount24h: 0,
      },
      {
        id: 'okx-orderbook',
        name: 'OKX Orderbook Stream',
        sourceType: 'WEBSOCKET',
        status: 'ONLINE',
        latencyMs: 110,
        lastHeartbeat: Date.now(),
        freshnessMs: 240,
        confidenceScore: 98,
        quality: 'LIVE',
        errorCount24h: 0,
      },
      {
        id: 'coinbase-spot',
        name: 'Coinbase Spot API',
        sourceType: 'REST_API',
        status: 'ONLINE',
        latencyMs: 145,
        lastHeartbeat: Date.now(),
        freshnessMs: 450,
        confidenceScore: 97,
        quality: 'LIVE',
        errorCount24h: 0,
      },
      {
        id: 'derivatives-funding',
        name: 'Binance / Bybit Funding & OI',
        sourceType: 'REST_API',
        status: 'ONLINE',
        latencyMs: 130,
        lastHeartbeat: Date.now(),
        freshnessMs: 800,
        confidenceScore: 96,
        quality: 'LIVE',
        errorCount24h: 0,
      },
      {
        id: 'onchain-rpc',
        name: 'Bitcoin Node & Glassnode Proxy',
        sourceType: 'ONCHAIN_RPC',
        status: 'ONLINE',
        latencyMs: 320,
        lastHeartbeat: Date.now(),
        freshnessMs: 1800000, // 30 min old
        confidenceScore: 94,
        quality: 'VERIFIED',
        errorCount24h: 0,
      },
      {
        id: 'macro-yields',
        name: 'US Treasury & FRED Rates',
        sourceType: 'MACRO_FEED',
        status: 'ONLINE',
        latencyMs: 250,
        lastHeartbeat: Date.now(),
        freshnessMs: 3600000, // 1 hour old
        confidenceScore: 95,
        quality: 'VERIFIED',
        errorCount24h: 0,
      },
      {
        id: 'etf-flows',
        name: 'Farside / Bitbo Verified ETF Flows',
        sourceType: 'REST_API',
        status: 'ONLINE',
        latencyMs: 400,
        lastHeartbeat: Date.now(),
        freshnessMs: 14400000, // 4 hours old
        confidenceScore: 91,
        quality: 'DELAYED',
        errorCount24h: 0,
      },
      {
        id: 'sentiment-fng',
        name: 'Alternative.me Sentiment Feed',
        sourceType: 'REST_API',
        status: 'ONLINE',
        latencyMs: 190,
        lastHeartbeat: Date.now(),
        freshnessMs: 7200000, // 2 hours old
        confidenceScore: 95,
        quality: 'VERIFIED',
        errorCount24h: 0,
      },
    ];

    for (const s of defaults) {
      this.sources.set(s.id, s);
    }
  }

  public recordHeartbeat(sourceId: string, latencyMs: number, quality: DataQualityGrade = 'LIVE') {
    const s = this.sources.get(sourceId);
    if (s) {
      s.lastHeartbeat = Date.now();
      s.freshnessMs = Math.max(10, latencyMs);
      s.latencyMs = latencyMs;
      s.quality = quality;
      s.status = 'ONLINE';
    }
  }

  public recordFeedError(sourceId: string, errorMsg: string) {
    const s = this.sources.get(sourceId);
    if (s) {
      s.errorCount24h++;
      s.message = errorMsg;
      s.quality = 'UNAVAILABLE';
      s.status = 'OFFLINE';
      s.confidenceScore = 0;
    }
  }

  public updatePrices(binance: number, okx: number, coinbase: number) {
    this.primaryPrice = binance;
    this.secondaryPrice = okx;
    this.tertiaryPrice = coinbase;
  }

  public getHealthSummary(): DataHealthSummary {
    const sourcesList = Array.from(this.sources.values());
    const now = Date.now();

    // Check freshness
    let activeAnomalies: string[] = [];
    let weightedQualitySum = 0;

    for (const s of sourcesList) {
      const ageMs = now - s.lastHeartbeat;
      if (s.sourceType === 'WEBSOCKET' && ageMs > 15000) {
        s.status = 'STALE';
        s.quality = 'STALE';
        s.confidenceScore = Math.max(0, s.confidenceScore - 40);
        activeAnomalies.push(`Critical WebSocket ${s.name} stale (${Math.round(ageMs / 1000)}s since heartbeat)`);
      }
      weightedQualitySum += s.confidenceScore;
    }

    const overallDataQualityPct = Math.round(weightedQualitySum / sourcesList.length);

    // Cross-source comparison
    const maxP = Math.max(this.primaryPrice, this.secondaryPrice, this.tertiaryPrice);
    const minP = Math.min(this.primaryPrice, this.secondaryPrice, this.tertiaryPrice);
    const deviationBps = Number((((maxP - minP) / this.primaryPrice) * 10000).toFixed(1));

    let compStatus: 'NORMAL' | 'ELEVATED_SPREAD' | 'ANOMALY_DETECTED' = 'NORMAL';
    if (deviationBps > 50) {
      compStatus = 'ANOMALY_DETECTED';
      activeAnomalies.push(`Cross-source price deviation extreme: ${deviationBps} bps spread between Binance, OKX, Coinbase`);
      failsafeController.triggerSafeMode(`Cross-source price deviation extreme: ${deviationBps} bps`);
    } else if (deviationBps > 15) {
      compStatus = 'ELEVATED_SPREAD';
    }

    if (overallDataQualityPct < 60) {
      failsafeController.triggerSafeMode(`Overall Data Quality critical (${overallDataQualityPct}% < 60%)`);
    }

    return {
      overallDataQualityPct,
      sources: sourcesList,
      crossSourceComparison: {
        metric: 'BTC/USDT Spot Price',
        primaryValue: this.primaryPrice,
        primarySource: 'Binance Spot',
        secondaryValue: this.secondaryPrice,
        secondarySource: 'OKX Spot',
        tertiaryValue: this.tertiaryPrice,
        tertiarySource: 'Coinbase Spot',
        maxDeviationBps: deviationBps,
        status: compStatus,
        timestamp: now,
      },
      activeAnomalies,
      lastChecked: now,
    };
  }
}

export const monitoringService = new MonitoringService();
