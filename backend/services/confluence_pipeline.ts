import { BybitDataPipeline, QualifiedSymbol } from '../adapters/bybit_klines.ts';
import { evaluate, Candle, OpenInterestPoint, ConfluenceEvaluation } from '../engine/confluenceStrategy.ts';
import { ConfluenceRepository, ConfluenceSignalRecord } from '../db/confluence_repo.ts';

export interface PipelineRunOptions {
  nowMs?: number;
  batchSize?: number;
  maxSymbols?: number;
  dryRun?: boolean;
}

export interface PipelineRunSummary {
  runId: number;
  startedAt: string;
  finishedAt: string;
  status: 'SUCCESS' | 'FAILED' | 'INTERRUPTED';
  symbolsScanned: number;
  signalsEmitted: number;
  signalsGated: number;
  btcChange1hPct: number | null;
  error?: string | null;
}

export class ConfluencePipeline {
  private static instance: ConfluencePipeline;
  private bybit = BybitDataPipeline.getInstance();
  private repo = ConfluenceRepository.getInstance();

  public static getInstance(): ConfluencePipeline {
    if (!ConfluencePipeline.instance) {
      ConfluencePipeline.instance = new ConfluencePipeline();
    }
    return ConfluencePipeline.instance;
  }

  /**
   * Evaluates the BTC 1H market filter
   * Returns: 1H percentage change of last closed candle
   */
  public async getBtc1hChange(nowMs = Date.now()): Promise<number | null> {
    try {
      const btcKlines = await this.bybit.getKlines('BTCUSDT', nowMs);
      if (!btcKlines.length) return null;
      const last = btcKlines[btcKlines.length - 1];
      const changePct = ((last.c - last.o) / last.o) * 100;
      return changePct;
    } catch (e) {
      console.warn('[ConfluencePipeline] Could not compute BTC 1h change:', e);
      return null;
    }
  }

  /**
   * Executes a full hourly pipeline scan across the qualified Bybit universe
   */
  public async runHourlyScan(opts: PipelineRunOptions = {}): Promise<PipelineRunSummary> {
    const nowMs = opts.nowMs || Date.now();
    const batchSize = opts.batchSize || 6;

    // Acquire lock to prevent overlapping runs
    const acquired = this.repo.acquireLock();
    if (!acquired) {
      throw new Error('Another Confluence Pipeline job is currently running or lock is active.');
    }

    const runId = await this.repo.startJobRun('confluence_1h_hourly');
    let symbolsScanned = 0;
    let signalsEmitted = 0;
    let signalsGated = 0;
    let btcChangePct: number | null = null;

    try {
      // 1. Get qualified universe
      console.log('🔍 [ConfluencePipeline] Fetching qualified Bybit universe (turnover >= $2M, spread <= 0.15%, age >= 7d)...');
      let universe = await this.bybit.getQualifiedUniverse();
      if (opts.maxSymbols && opts.maxSymbols > 0) {
        universe = universe.slice(0, opts.maxSymbols);
      }
      console.log(`📊 [ConfluencePipeline] Found ${universe.length} qualified symbols.`);

      // 2. Fetch BTC 1H filter
      btcChangePct = await this.getBtc1hChange(nowMs);
      console.log(`⚡ [ConfluencePipeline] BTC 1H Close Change: ${btcChangePct !== null ? btcChangePct.toFixed(2) + '%' : 'N/A'}`);

      // 3. Process universe in concurrency-limited batches
      const processSymbol = async (item: QualifiedSymbol) => {
        try {
          const [klines, oi] = await Promise.all([
            this.bybit.getKlines(item.symbol, nowMs),
            this.bybit.getOpenInterest(item.symbol),
          ]);

          symbolsScanned++;

          if (!klines || klines.length < 260) {
            return;
          }

          const evalResult = evaluate(klines, oi);

          // Evaluate only if there is a side or signal
          if (evalResult.side === 'NEUTRAL') {
            return;
          }

          const lastCandle = klines[klines.length - 1];
          const candleIso = new Date(lastCandle.t).toISOString();
          const signalKey = `${item.symbol}|CONFLUENCE_1H|${evalResult.side}|${lastCandle.t}`;

          // Check gates
          let skipReason: string | null = null;

          // Gate 1: Must be an edge trigger / new signal
          if (!evalResult.isNew && !evalResult.fresh) {
            skipReason = 'NOT_FRESH_OR_NOT_NEW';
          }

          // Gate 2: ADX filter (>= 20)
          const adxVal = evalResult.indicators?.adx;
          if (adxVal === null || adxVal === undefined || adxVal < 20) {
            skipReason = skipReason || 'ADX_BELOW_20';
          }

          // Gate 3: BTC Market Filter (block BUY if BTC fell >= 1.5%, block SELL if BTC rose >= 1.5%)
          if (btcChangePct !== null) {
            if (evalResult.side === 'BUY' && btcChangePct <= -1.5) {
              skipReason = skipReason || 'BTC_DOWN_GE_1_5_PCT';
            } else if (evalResult.side === 'SELL' && btcChangePct >= 1.5) {
              skipReason = skipReason || 'BTC_UP_GE_1_5_PCT';
            }
          }

          // Gate 4: One ACTIVE signal per symbol
          if (this.repo.hasActiveSignal(item.symbol)) {
            skipReason = skipReason || 'EXISTING_ACTIVE_SIGNAL';
          }

          // Gate 5: Cooldown >= 6 candles
          const lastSigTime = this.repo.getLastSignalCandleTime(item.symbol);
          if (lastSigTime && (lastCandle.t - lastSigTime < 6 * 3600000)) {
            skipReason = skipReason || 'COOLDOWN_ACTIVE';
          }

          const isTradable = !skipReason && !!evalResult.signal;

          const record: ConfluenceSignalRecord = {
            signal_key: signalKey,
            strategy: 'CONFLUENCE_1H',
            symbol: item.symbol,
            exchange: 'BYBIT',
            timeframe: '1h',
            side: evalResult.side === 'BUY' ? 'BUY' : 'SELL',
            strength: evalResult.strength,
            votes_bull: evalResult.bull,
            votes_bear: evalResult.bear,
            score_pct: evalResult.scorePct,
            votes_json: evalResult.votes,
            ages_json: evalResult.ages,
            indicators_json: evalResult.indicators,
            oi_available: evalResult.oiAvailable,
            price: lastCandle.c,
            atr: evalResult.indicators?.atr || null,
            candle_t: candleIso,
            status: isTradable ? 'ACTIVE' : 'SKIPPED',
            skip_reason: skipReason,
            config_version: '1.0.0',
          };

          if (!opts.dryRun) {
            const { inserted } = await this.repo.insertSignal(record);
            if (inserted) {
              if (isTradable) {
                signalsEmitted++;
                console.log(`🎯 [TRADABLE_SIGNAL] ${item.symbol} ${evalResult.side} (${evalResult.votesLabel}) @ $${lastCandle.c}`);
              } else {
                signalsGated++;
                console.log(`🛡️ [GATED_SIGNAL] ${item.symbol} ${evalResult.side} (${evalResult.votesLabel}) Skip: ${skipReason}`);
              }
            }
          } else {
            if (isTradable) signalsEmitted++;
            else signalsGated++;
          }
        } catch (err) {
          console.warn(`[ConfluencePipeline] Error processing ${item.symbol}:`, err);
        }
      };

      await this.bybit.processInBatches(universe, batchSize, processSymbol);

      await this.repo.finishJobRun(runId, 'SUCCESS', symbolsScanned, signalsEmitted, null);
      this.repo.releaseLock();

      const finishedAt = new Date().toISOString();
      return {
        runId,
        startedAt: new Date(nowMs).toISOString(),
        finishedAt,
        status: 'SUCCESS',
        symbolsScanned,
        signalsEmitted,
        signalsGated,
        btcChange1hPct: btcChangePct,
      };
    } catch (err: any) {
      await this.repo.finishJobRun(runId, 'FAILED', symbolsScanned, signalsEmitted, err.message);
      this.repo.releaseLock();
      throw err;
    }
  }
}
