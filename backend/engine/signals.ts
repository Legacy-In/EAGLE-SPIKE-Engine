import { EagleSignalRecord, NormalizedTicker } from '../types';
import { ScannerMathEngine } from './math';

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
      ticker.returns5m < 0 && (ticker.returns15m < 0 || ticker.price24hChange < 0 || ticker.trend === 'BEARISH' || ticker.trend === 'STRONG BEARISH')
        ? 'SHORT'
        : (ticker.returns5m >= 0 ? 'LONG' : (ticker.price24hChange >= 0 ? 'LONG' : 'SHORT'));

    const triggerPrice = ticker.lastPrice;
    const signalId = `SIG-${now}-${ticker.exchange}-${symbol}`;

    const canonicalSymbol = symbol.toUpperCase().replace(/[-_]/g, '');
    const exchangeSymbol = `${ticker.exchange}:${canonicalSymbol}`;

    // Compute ATR14 baseline and targets
    const atr14 = (ticker.high24h && ticker.low24h && ticker.high24h > ticker.low24h)
      ? Math.max(triggerPrice * 0.015, (ticker.high24h - ticker.low24h) / 10)
      : triggerPrice * 0.018;

    const atrLevels = ScannerMathEngine.calculateAtrStopsAndTargets({
      entryPrice: triggerPrice,
      atr14,
      direction,
    });

    const record: EagleSignalRecord = {
      signalId,
      symbol,
      canonicalSymbol,
      exchangeSymbol,
      exchange: ticker.exchange,
      direction,
      qualificationStatus: 'QUALIFIED',
      lifecycleStatus: 'ACTIVE',
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
      target1Price: atrLevels.target1Price,
      target2Price: atrLevels.target2Price,
      target3Price: atrLevels.target3Price,
      stopPrice: atrLevels.stopPrice,
      t1HitAt: null,
      t2HitAt: null,
      t3HitAt: null,
      stopHitAt: null,
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
      let isT1 = false;
      let isT2 = false;
      let isT3 = false;
      let isStop = false;

      if (record.direction === 'LONG') {
        const peakGain = ((record.highestPriceSinceTrigger - record.triggerPrice) / record.triggerPrice) * 100;
        const maxDrawdown = ((record.triggerPrice - record.lowestPriceSinceTrigger) / record.triggerPrice) * 100;
        record.mfePct = parseFloat(peakGain.toFixed(2));
        record.maePct = parseFloat(maxDrawdown.toFixed(2));

        isT1 = Boolean(record.target1Price && record.highestPriceSinceTrigger >= record.target1Price);
        isT2 = Boolean(record.target2Price && record.highestPriceSinceTrigger >= record.target2Price);
        isT3 = Boolean(record.target3Price && record.highestPriceSinceTrigger >= record.target3Price);
        isStop = Boolean(record.stopPrice && record.lowestPriceSinceTrigger <= record.stopPrice);
      } else {
        const peakGain = ((record.triggerPrice - record.lowestPriceSinceTrigger) / record.triggerPrice) * 100;
        const maxDrawdown = ((record.highestPriceSinceTrigger - record.triggerPrice) / record.triggerPrice) * 100;
        record.mfePct = parseFloat(peakGain.toFixed(2));
        record.maePct = parseFloat(maxDrawdown.toFixed(2));

        isT1 = Boolean(record.target1Price && record.lowestPriceSinceTrigger <= record.target1Price);
        isT2 = Boolean(record.target2Price && record.lowestPriceSinceTrigger <= record.target2Price);
        isT3 = Boolean(record.target3Price && record.lowestPriceSinceTrigger <= record.target3Price);
        isStop = Boolean(record.stopPrice && record.highestPriceSinceTrigger >= record.stopPrice);
      }

      const nowIso = new Date().toISOString();
      if (isT1 && !record.t1HitAt) record.t1HitAt = nowIso;
      if (isT2 && !record.t2HitAt) record.t2HitAt = nowIso;
      if (isT3 && !record.t3HitAt) record.t3HitAt = nowIso;

      if (isStop) {
        record.lifecycleStatus = 'STOP_HIT';
        record.status = 'STOP_HIT';
        if (!record.stopHitAt) record.stopHitAt = nowIso;
      } else if (record.mfePct >= 1.0) {
        record.qualificationStatus = 'CONFIRMED';
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
