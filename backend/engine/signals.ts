import { EagleSignalRecord, NormalizedTicker } from '../types';

export class StatefulSignalEngine {
  private activeSignals: Map<string, EagleSignalRecord> = new Map(); // signalId -> record
  private symbolCooldowns: Map<string, number> = new Map();         // symbol -> lastTriggerTimestamp
  private readonly cooldownMs = 15 * 60 * 1000;                     // 15 minutes strict deduplication cooldown

  /**
   * Evaluates incoming ticker against signal trigger conditions:
   * Rule: Eagle Score >= 65 AND RVOL >= 2.0x AND OI Δ > +3%
   */
  public evaluateTicker(ticker: NormalizedTicker): EagleSignalRecord | null {
    const now = Date.now();
    const symbol = ticker.symbol;

    // Check strict 15-minute deduplication cooldown
    const lastTrigger = this.symbolCooldowns.get(symbol) || 0;
    if (now - lastTrigger < this.cooldownMs) {
      // Cooldown active, update any existing active signal tracking
      this.updateExistingSignal(ticker);
      return null;
    }

    const score = ticker.signalScore || 0;
    const rvol = ticker.relativeVolume || 1.0;
    const oiDelta = ticker.oiChangePct || 0;

    // TRIGGER THRESHOLDS: Score >= 65 AND RVOL >= 2.0x AND OI Δ > +3%
    const isTriggered = score >= 65 && rvol >= 2.0 && oiDelta >= 3.0;
    if (!isTriggered) {
      this.updateExistingSignal(ticker);
      return null;
    }

    const direction: 'LONG' | 'SHORT' =
      ticker.returns5m < 0 && (ticker.returns15m < 0 || ticker.price24hChange < 0 || ticker.spikePhase === 'BREAKDOWN')
        ? 'SHORT'
        : (ticker.returns5m >= 0 ? 'LONG' : (ticker.price24hChange >= 0 ? 'LONG' : 'SHORT'));

    const triggerPrice = ticker.lastPrice;
    const signalId = `SIG-${now}-${ticker.exchange}-${symbol}`;

    const record: EagleSignalRecord = {
      signalId,
      symbol,
      exchange: ticker.exchange,
      direction,
      triggerPrice,
      triggerTimestamp: now,
      eagleScore: score,
      rvol,
      oiChangePct: oiDelta,
      volumeZScore: ticker.volumeZScore || 0,
      takerFlow: ticker.takerImbalance || 0,
      spikePhase: ticker.spikePhase,
      spikeType: ticker.spikeType,
      spikeQuality: ticker.spikeQuality,
      currentPrice: triggerPrice,
      highestPriceSinceTrigger: triggerPrice,
      lowestPriceSinceTrigger: triggerPrice,
      mfePct: 0.0,
      maePct: 0.0,
      status: 'ACTIVE',
      lastUpdated: now,
    };

    this.activeSignals.set(signalId, record);
    this.symbolCooldowns.set(symbol, now);

    return record;
  }

  /**
   * Updates forward excursion (MFE / MAE) and status for active signals
   */
  public updateExistingSignal(ticker: NormalizedTicker): void {
    const symbol = ticker.symbol;
    const currentPrice = ticker.lastPrice;
    if (currentPrice <= 0) return;

    for (const record of this.activeSignals.values()) {
      if (record.symbol !== symbol) continue;

      if (currentPrice > record.highestPriceSinceTrigger) {
        record.highestPriceSinceTrigger = currentPrice;
      }
      if (currentPrice < record.lowestPriceSinceTrigger) {
        record.lowestPriceSinceTrigger = currentPrice;
      }

      record.currentPrice = currentPrice;
      record.lastUpdated = Date.now();

      // Calculate MFE & MAE based on direction
      if (record.direction === 'LONG') {
        const peakGain = ((record.highestPriceSinceTrigger - record.triggerPrice) / record.triggerPrice) * 100;
        const maxDrawdown = ((record.triggerPrice - record.lowestPriceSinceTrigger) / record.triggerPrice) * 100;
        record.mfePct = parseFloat(peakGain.toFixed(2));
        record.maePct = parseFloat(maxDrawdown.toFixed(2));

        if (record.mfePct >= 3.0) record.status = 'TARGET_HIT';
        else if (record.maePct >= 2.0) record.status = 'INVALIDATED';
        else if (record.mfePct >= 1.0) record.status = 'CONFIRMED';
      } else {
        const peakGain = ((record.triggerPrice - record.lowestPriceSinceTrigger) / record.triggerPrice) * 100;
        const maxDrawdown = ((record.highestPriceSinceTrigger - record.triggerPrice) / record.triggerPrice) * 100;
        record.mfePct = parseFloat(peakGain.toFixed(2));
        record.maePct = parseFloat(maxDrawdown.toFixed(2));

        if (record.mfePct >= 3.0) record.status = 'TARGET_HIT';
        else if (record.maePct >= 2.0) record.status = 'INVALIDATED';
        else if (record.mfePct >= 1.0) record.status = 'CONFIRMED';
      }
    }
  }

  /**
   * Returns all persisted historical and active signals (sorted most recent first)
   */
  public getSignals(limit = 100): EagleSignalRecord[] {
    const list = Array.from(this.activeSignals.values());
    return list.sort((a, b) => b.triggerTimestamp - a.triggerTimestamp).slice(0, limit);
  }

  /**
   * Resets signals and cooldowns (for test isolation)
   */
  public reset(): void {
    this.activeSignals.clear();
    this.symbolCooldowns.clear();
  }
}

export const statefulSignalEngine = new StatefulSignalEngine();
