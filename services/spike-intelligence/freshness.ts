/**
 * 🦅 EAGLE FLASH — Data Freshness & Confidence Engine
 * Evaluates data provenance, detects stale feeds, and computes objective confidence scores.
 */

import { DataFreshnessStatus } from './types';

export interface FreshnessConfig {
  freshThresholdMs: number;    // Default: 5000ms (5s)
  delayedThresholdMs: number;  // Default: 30000ms (30s)
  maxAcceptableLatencyMs: number; // Default: 1500ms
}

export const DEFAULT_FRESHNESS_CONFIG: FreshnessConfig = {
  freshThresholdMs: 5000,
  delayedThresholdMs: 30000,
  maxAcceptableLatencyMs: 1500,
};

export class FreshnessEngine {
  private config: FreshnessConfig;

  constructor(config: Partial<FreshnessConfig> = {}) {
    this.config = { ...DEFAULT_FRESHNESS_CONFIG, ...config };
  }

  /**
   * Evaluates freshness status for a given timestamp
   */
  public evaluateStatus(timestamp: number, now: number = Date.now()): DataFreshnessStatus {
    if (!timestamp || timestamp <= 0) return 'INSUFFICIENT_DATA';
    const age = Math.max(0, now - timestamp);
    if (age <= this.config.freshThresholdMs) return 'FRESH';
    if (age <= this.config.delayedThresholdMs) return 'DELAYED';
    return 'STALE';
  }

  /**
   * Calculates Data Confidence Score (0 to 100%)
   * Does NOT incorporate trading signals — strictly evaluates underlying market data health.
   */
  public calculateDataConfidence(params: {
    wsConnected: boolean;
    tickerFreshnessMs: number;
    hasOrderBook: boolean;
    hasDerivatives: boolean;
    restLatencyMs: number;
    missingFieldsCount?: number;
  }): number {
    let score = 0;

    // 1. WebSocket Live Connection (25 pts)
    if (params.wsConnected) {
      score += 25;
    } else if (params.restLatencyMs < 1000) {
      // Fallback REST is responsive
      score += 15;
    }

    // 2. Ticker Freshness (30 pts)
    if (params.tickerFreshnessMs <= 2000) {
      score += 30;
    } else if (params.tickerFreshnessMs <= 5000) {
      score += 22;
    } else if (params.tickerFreshnessMs <= 15000) {
      score += 12;
    } else if (params.tickerFreshnessMs <= 30000) {
      score += 5;
    }

    // 3. Order Book Presence (15 pts)
    if (params.hasOrderBook) {
      score += 15;
    }

    // 4. Derivatives (OI / Funding) Presence (15 pts)
    if (params.hasDerivatives) {
      score += 15;
    }

    // 5. Latency Health (15 pts)
    if (params.restLatencyMs <= 250) {
      score += 15;
    } else if (params.restLatencyMs <= 600) {
      score += 10;
    } else if (params.restLatencyMs <= 1500) {
      score += 5;
    }

    // Penalty for missing critical fields
    if (params.missingFieldsCount && params.missingFieldsCount > 0) {
      score = Math.max(10, score - params.missingFieldsCount * 8);
    }

    return Math.min(100, Math.max(0, score));
  }
}

export const freshnessEngine = new FreshnessEngine();
