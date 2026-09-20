import { EventEmitter } from 'events';
import { bybitAdapter } from './adapters/bybit';
import { mexcAdapter } from './adapters/mexc';
import { weexAdapter } from './adapters/weex';
import { ScannerMathEngine } from './engine/math';
import { statefulSignalEngine } from './engine/signals';
import { NormalizedTicker, ScannerSnapshotPayload } from './types';

export class ScannerAggregator extends EventEmitter {
  private cachedSnapshot: ScannerSnapshotPayload | null = null;
  private lastIngestTimestamp = 0;
  private isIngesting = false;
  private timer: NodeJS.Timeout | null = null;
  private readonly refreshIntervalMs = 4000; // 4s continuous background aggregation

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  /**
   * Starts background aggregation loop
   */
  public start(): void {
    if (this.timer) return;
    this.runIngestionCycle();
    this.timer = setInterval(() => {
      this.runIngestionCycle();
    }, this.refreshIntervalMs);
    console.log('🦅 Eagle Flash Aggregator started. Ingesting Bybit, MEXC, and WEEX...');
  }

  /**
   * Stops background aggregation loop
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Runs an ingestion cycle across Bybit, MEXC, and WEEX
   */
  public async runIngestionCycle(): Promise<ScannerSnapshotPayload> {
    if (this.isIngesting && this.cachedSnapshot) {
      return this.cachedSnapshot;
    }

    this.isIngesting = true;
    const startTime = Date.now();

    try {
      // Concurrently fetch active tickers from all 3 exchanges
      const [bybitTickers, mexcTickers, weexTickers] = await Promise.all([
        bybitAdapter.fetchTickers().catch((e) => {
          console.warn('Bybit tickers fetch failed:', e.message);
          return [] as NormalizedTicker[];
        }),
        mexcAdapter.fetchTickers().catch((e) => {
          console.warn('MEXC tickers fetch failed:', e.message);
          return [] as NormalizedTicker[];
        }),
        weexAdapter.fetchTickers().catch((e) => {
          console.warn('WEEX tickers fetch failed:', e.message);
          return [] as NormalizedTicker[];
        }),
      ]);

      const allTickers: NormalizedTicker[] = [];
      const seenSymbols = new Set<string>();

      // Ingest Bybit first (Primary reference)
      for (const t of bybitTickers) {
        this.enrichTicker(t);
        allTickers.push(t);
        seenSymbols.add(t.symbol);
      }

      // Ingest MEXC (Add if unique or append exchange tag)
      for (const t of mexcTickers) {
        this.enrichTicker(t);
        allTickers.push(t);
      }

      // Ingest WEEX
      for (const t of weexTickers) {
        this.enrichTicker(t);
        allTickers.push(t);
      }

      // Calculate Market-Wide Aggregates
      const activeSpikes = allTickers.filter((t) => t.relativeVolume >= 1.5);
      const longCandidates = allTickers.filter((t) => t.signalScore >= 70 && t.price24hChange >= 0);
      const shortCandidates = allTickers.filter((t) => t.signalScore >= 70 && t.price24hChange < 0);
      const advancingCount = allTickers.filter((t) => t.price24hChange > 0).length;
      const marketBreadthPct =
        allTickers.length > 0 ? parseFloat(((advancingCount / allTickers.length) * 100).toFixed(1)) : 50;

      // Extract BTC reference
      const btc = allTickers.find((t) => t.symbol === 'BTCUSDT' && t.exchange === 'BYBIT');
      const btcPrice = btc?.lastPrice || 81450;
      const btcChange24h = btc?.price24hChange || 0.8;

      const latencyMs = Date.now() - startTime;
      const recentSignals = statefulSignalEngine.getSignals(50);

      const snapshot: ScannerSnapshotPayload = {
        timestamp: Date.now(),
        latencyMs,
        totalContracts: allTickers.length,
        activeContracts: allTickers.length,
        bybitCount: bybitTickers.length,
        mexcCount: mexcTickers.length,
        weexCount: weexTickers.length,
        activeSpikesCount: activeSpikes.length,
        longCandidatesCount: longCandidates.length,
        shortCandidatesCount: shortCandidates.length,
        marketBreadthPct,
        btcPrice,
        btcChange24h,
        tickers: allTickers,
        recentSignals,
      };

      this.cachedSnapshot = snapshot;
      this.lastIngestTimestamp = Date.now();
      this.emit('snapshot', snapshot);

      return snapshot;
    } finally {
      this.isIngesting = false;
    }
  }

  /**
   * Enriches raw ticker with math scores and checks for signal emission
   */
  private enrichTicker(t: NormalizedTicker): void {
    t.signalScore = ScannerMathEngine.calculateEagleScore(t);
    t.spikePhase = ScannerMathEngine.classifySpikePhase(t);
    t.spikeType = ScannerMathEngine.classifySpikeType(t);
    t.spikeQuality = ScannerMathEngine.classifySpikeQuality(t);

    // Evaluate stateful signal trigger rule
    const newSignal = statefulSignalEngine.evaluateTicker(t);
    if (newSignal) {
      this.emit('signal', newSignal);
    }
  }

  /**
   * Returns instantaneous snapshot (from cache if fresh, otherwise runs cycle)
   */
  public async getSnapshot(): Promise<ScannerSnapshotPayload> {
    const now = Date.now();
    if (this.cachedSnapshot && now - this.lastIngestTimestamp < 3000) {
      return this.cachedSnapshot;
    }
    return this.runIngestionCycle();
  }
}

export const scannerAggregator = new ScannerAggregator();
