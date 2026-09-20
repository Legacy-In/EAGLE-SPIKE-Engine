/**
 * 🦅 EAGLE FLASH — Historical Event Store & Forward Outcome Tracking Engine
 * Preserves initial spike snapshots and continuously records objective forward returns (+1m..+4h),
 * MFE, MAE, and continuation vs reversal resolutions.
 */

import { SpikeEventRecord } from './types';

export class SpikeEventStore {
  private events: Map<string, SpikeEventRecord> = new Map();
  private maxStoredEvents: number;

  constructor(maxStoredEvents: number = 2000) {
    this.maxStoredEvents = maxStoredEvents;
  }

  /**
   * Records a new spike event snapshot into the event store.
   */
  public recordEvent(event: SpikeEventRecord): SpikeEventRecord {
    // Generate eventId if not present
    if (!event.eventId) {
      const d = new Date(event.timestamp || Date.now());
      const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = d.toISOString().slice(11, 19).replace(/:/g, '');
      event.eventId = `EVT-${dateStr}-${event.symbol}-${timeStr}`;
    }

    // Initialize forward returns and extremes
    event.forwardReturns = event.forwardReturns || {};
    event.mfePct = event.mfePct ?? 0;
    event.maePct = event.maePct ?? 0;
    event.outcomeClassification = event.outcomeClassification || 'PENDING';

    this.events.set(event.eventId, event);

    // Evict oldest if exceeding capacity
    if (this.events.size > this.maxStoredEvents) {
      const oldestKey = this.events.keys().next().value;
      if (oldestKey) this.events.delete(oldestKey);
    }

    return event;
  }

  /**
   * Updates forward outcomes for active events on each market tick.
   */
  public updateOutcomes(symbol: string, currentPrice: number, now: number = Date.now()): void {
    if (!currentPrice || currentPrice <= 0) return;

    for (const event of this.events.values()) {
      if (event.symbol !== symbol || event.outcomeClassification !== 'PENDING') continue;

      const elapsedSeconds = Math.floor((now - event.timestamp) / 1000);
      const isBull = event.returns['5m'] >= 0;

      // Calculate directional return
      const rawReturn = ((currentPrice - event.price) / event.price) * 100;
      const dirReturn = isBull ? rawReturn : -rawReturn;

      // Update MFE & MAE
      if (dirReturn > (event.mfePct ?? 0)) {
        event.mfePct = parseFloat(dirReturn.toFixed(2));
      }
      if (dirReturn < (event.maePct ?? 0)) {
        event.maePct = parseFloat(dirReturn.toFixed(2));
      }

      // Record standard forward horizon milestones
      if (elapsedSeconds >= 60 && event.forwardReturns['1m'] === undefined) {
        event.forwardReturns['1m'] = parseFloat(dirReturn.toFixed(2));
      }
      if (elapsedSeconds >= 300 && event.forwardReturns['5m'] === undefined) {
        event.forwardReturns['5m'] = parseFloat(dirReturn.toFixed(2));
      }
      if (elapsedSeconds >= 900 && event.forwardReturns['15m'] === undefined) {
        event.forwardReturns['15m'] = parseFloat(dirReturn.toFixed(2));
      }
      if (elapsedSeconds >= 1800 && event.forwardReturns['30m'] === undefined) {
        event.forwardReturns['30m'] = parseFloat(dirReturn.toFixed(2));
      }
      if (elapsedSeconds >= 3600 && event.forwardReturns['1h'] === undefined) {
        event.forwardReturns['1h'] = parseFloat(dirReturn.toFixed(2));
      }
      if (elapsedSeconds >= 14400 && event.forwardReturns['4h'] === undefined) {
        event.forwardReturns['4h'] = parseFloat(dirReturn.toFixed(2));
      }

      // Objective Outcome Resolution
      // 1. Reversal: Adverse move exceeds 3.5%
      if ((event.maePct ?? 0) <= -3.5) {
        event.outcomeClassification = 'REVERSAL';
        event.resolvedAt = now;
      }
      // 2. Continuation: Favorable move exceeds 3.0% with positive forward returns
      else if ((event.mfePct ?? 0) >= 3.0 && (event.maePct ?? 0) > -2.0) {
        event.outcomeClassification = 'CONTINUATION';
        event.resolvedAt = now;
      }
      // 3. Expiration after 4h
      else if (elapsedSeconds >= 14400) {
        event.outcomeClassification = (event.mfePct ?? 0) > Math.abs(event.maePct ?? 0) ? 'CONTINUATION' : 'CHOP_CONSOLIDATION';
        event.resolvedAt = now;
      }
    }
  }

  /**
   * Retrieves all events matching query filters.
   */
  public queryEvents(filters: {
    symbol?: string;
    exchange?: string;
    minScore?: number;
    phase?: string;
    type?: string;
    quality?: string;
    limit?: number;
  }): SpikeEventRecord[] {
    let list = Array.from(this.events.values());

    if (filters.symbol) {
      const q = filters.symbol.toUpperCase();
      list = list.filter((e) => e.symbol.includes(q));
    }
    if (filters.exchange) {
      list = list.filter((e) => e.exchange === filters.exchange);
    }
    if (filters.minScore !== undefined) {
      list = list.filter((e) => e.eagleScore >= (filters.minScore ?? 0));
    }
    if (filters.phase) {
      list = list.filter((e) => e.spikePhase === filters.phase);
    }
    if (filters.type) {
      list = list.filter((e) => e.spikeType === filters.type);
    }
    if (filters.quality) {
      list = list.filter((e) => e.spikeQuality === filters.quality);
    }

    // Sort newest first
    list.sort((a, b) => b.timestamp - a.timestamp);

    return list.slice(0, filters.limit || 100);
  }

  /**
   * Computes aggregate historical performance analytics with sample sizes.
   */
  public getAnalytics(filters: { minScore?: number; quality?: string } = {}) {
    const list = this.queryEvents({ minScore: filters.minScore, quality: filters.quality, limit: 1000 });
    if (list.length === 0) {
      return { sampleSize: 0, median15m: 0, median1h: 0, medianMfe: 0, medianMae: 0, continuationRatePct: 0, reversalRatePct: 0 };
    }

    const ret15m = list.map((e) => e.forwardReturns['15m']).filter((v): v is number => v !== undefined);
    const ret1h = list.map((e) => e.forwardReturns['1h']).filter((v): v is number => v !== undefined);
    const mfes = list.map((e) => e.mfePct).filter((v): v is number => v !== null);
    const maes = list.map((e) => e.maePct).filter((v): v is number => v !== null);

    const median = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const s = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    };

    const resolved = list.filter((e) => e.outcomeClassification && e.outcomeClassification !== 'PENDING');
    const continuations = resolved.filter((e) => e.outcomeClassification === 'CONTINUATION').length;
    const reversals = resolved.filter((e) => e.outcomeClassification === 'REVERSAL').length;

    return {
      sampleSize: list.length,
      median15m: parseFloat(median(ret15m).toFixed(2)),
      median1h: parseFloat(median(ret1h).toFixed(2)),
      medianMfe: parseFloat(median(mfes).toFixed(2)),
      medianMae: parseFloat(median(maes).toFixed(2)),
      continuationRatePct: resolved.length > 0 ? Math.round((continuations / resolved.length) * 100) : 0,
      reversalRatePct: resolved.length > 0 ? Math.round((reversals / resolved.length) * 100) : 0,
    };
  }
}

export const spikeEventStore = new SpikeEventStore();
