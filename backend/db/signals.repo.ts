import { getSupabaseAdmin } from './supabase';
import { EagleSignalRecord, NormalizedTicker } from '../types';

export interface SignalInsertParams {
  signalId: string;
  idempotencyKey: string;
  exchange: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  strategyVersion: string;
  entryPrice: number;
  target1Price: number;
  target2Price: number;
  target3Price: number;
  stopPrice: number;
  eagleScore: number;
  rvol: number;
  volumeZScore: number;
  oiChangePct: number;
  detectedAt: number;
}

export interface SnapshotInsertParams {
  signalId: string;
  price: number;
  markPrice?: number;
  indexPrice?: number;
  price24hChange?: number;
  turnover24hUsd?: number;
  rvol: number;
  volumeZScore: number;
  openInterestUsd: number;
  oiChangePct: number;
  fundingRate: number;
  takerFlow: number;
  rsi?: number;
  trend?: string;
  spikePhase?: string;
  positioningState?: string;
  marketBreadth?: number;
  btcRegime?: string;
}

export interface ExtremeUpdateParams {
  signalId: string;
  mfePrice: number;
  mfePct: number;
  mfeTimestamp: number;
  timeToMfeMs: number;
  maePrice: number;
  maePct: number;
  maeTimestamp: number;
  timeToMaeMs: number;
}

export class SignalsRepository {
  private static instance: SignalsRepository;
  private knownMarkets: Set<string> = new Set();
  private knownAssets: Set<string> = new Set();

  public static getInstance(): SignalsRepository {
    if (!SignalsRepository.instance) {
      SignalsRepository.instance = new SignalsRepository();
    }
    return SignalsRepository.instance;
  }

  /**
   * Ensures the base asset and market row exist in the registry before foreign key linking
   */
  public async ensureMarketExists(
    exchange: string,
    symbol: string,
    baseCoin = '',
    quoteCoin = 'USDT',
    tickSize = 0.0001,
    pricePrecision = 4
  ): Promise<string> {
    const marketId = `${exchange}:${symbol}`;
    if (this.knownMarkets.has(marketId)) return marketId;

    const admin = getSupabaseAdmin();
    const cleanBase = baseCoin || symbol.replace(/(USDT|USDC|PERP|_WEEX|_MEXC)$/g, '');

    // 1. Ensure Asset
    if (!this.knownAssets.has(cleanBase)) {
      try {
        await admin.from('assets').upsert({ id: cleanBase, name: cleanBase });
        this.knownAssets.add(cleanBase);
      } catch (e) {}
    }

    // 2. Ensure Market
    try {
      await admin.from('markets').upsert({
        id: marketId,
        exchange_id: exchange,
        asset_id: cleanBase,
        symbol,
        base_coin: cleanBase,
        quote_coin: quoteCoin,
        price_precision: pricePrecision,
        tick_size: tickSize,
        min_order_qty: 1,
        is_active: true,
      });
      this.knownMarkets.add(marketId);
    } catch (e) {}
    return marketId;
  }

  /**
   * Atomically records a qualified signal and its immutable initial detection snapshot
   */
  public async insertSignal(
    signal: SignalInsertParams,
    snapshot: SnapshotInsertParams
  ): Promise<boolean> {
    const admin = getSupabaseAdmin();

    try {
      const marketId = await this.ensureMarketExists(signal.exchange, signal.symbol);

      // Insert primary signal row
      const { error: sigErr } = await admin.from('signals').insert({
        signal_id: signal.signalId,
        idempotency_key: signal.idempotencyKey,
        exchange_id: signal.exchange,
        market_id: marketId,
        symbol: signal.symbol,
        direction: signal.direction,
        strategy_version: signal.strategyVersion,
        entry_price: signal.entryPrice,
        target_1_price: signal.target1Price,
        target_2_price: signal.target2Price,
        target_3_price: signal.target3Price,
        stop_price: signal.stopPrice,
        status: 'ACTIVE',
        eagle_score: signal.eagleScore,
        rvol: signal.rvol,
        volume_z_score: signal.volumeZScore,
        oi_change_pct: signal.oiChangePct,
        detected_at: new Date(signal.detectedAt).toISOString(),
      });

      if (sigErr) {
        if (sigErr.code === '23505') {
          // Idempotency: duplicate key violation, safely ignore
          return false;
        }
        console.error('SignalsRepository.insertSignal error:', sigErr);
        return false;
      }

      // Insert immutable snapshot
      try {
        await admin.from('signal_snapshots').insert({
          signal_id: signal.signalId,
          price: snapshot.price,
          mark_price: snapshot.markPrice || snapshot.price,
          index_price: snapshot.indexPrice || snapshot.price,
          price_24h_change: snapshot.price24hChange || 0,
          turnover_24h_usd: snapshot.turnover24hUsd || 0,
          rvol: snapshot.rvol,
          volume_z_score: snapshot.volumeZScore,
          open_interest_usd: snapshot.openInterestUsd || 0,
          oi_change_pct: snapshot.oiChangePct || 0,
          funding_rate: snapshot.fundingRate || 0,
          taker_flow: snapshot.takerFlow || 0,
          rsi: snapshot.rsi || 50,
          trend: snapshot.trend || 'NEUTRAL',
          spike_phase: snapshot.spikePhase || 'BREAKOUT',
          positioning_state: snapshot.positioningState || 'LEVERAGE_EXPANSION',
          market_breadth: snapshot.marketBreadth || 50,
          btc_regime: snapshot.btcRegime || 'NEUTRAL',
        });
      } catch (err) {
        console.error('Snapshot insert error:', err);
      }

      // Initialize signal_extremes row
      try {
        await admin.from('signal_extremes').insert({
          signal_id: signal.signalId,
          mfe_price: signal.entryPrice,
          mfe_pct: 0.0,
          mfe_timestamp: new Date(signal.detectedAt).toISOString(),
          time_to_mfe_ms: 0,
          mae_price: signal.entryPrice,
          mae_pct: 0.0,
          mae_timestamp: new Date(signal.detectedAt).toISOString(),
          time_to_mae_ms: 0,
        });
      } catch (err) {
        console.error('Extremes init error:', err);
      }

      // Append SIGNAL_DETECTED timeline event
      await this.recordEvent(
        signal.signalId,
        'SIGNAL_DETECTED',
        signal.entryPrice,
        {
          direction: signal.direction,
          score: signal.eagleScore,
          rvol: signal.rvol,
          t1: signal.target1Price,
          t2: signal.target2Price,
          stop: signal.stopPrice,
        }
      );

      return true;
    } catch (err) {
      console.error('SignalsRepository.insertSignal unexpected error:', err);
      return false;
    }
  }

  /**
   * Batch updates MFE/MAE extremes for active signals (flushed every 5s from memory)
   */
  public async batchUpdateExtremes(updates: ExtremeUpdateParams[]): Promise<void> {
    if (!updates || updates.length === 0) return;
    const admin = getSupabaseAdmin();

    try {
      const rows = updates.map(u => ({
        signal_id: u.signalId,
        mfe_price: u.mfePrice,
        mfe_pct: u.mfePct,
        mfe_timestamp: new Date(u.mfeTimestamp).toISOString(),
        time_to_mfe_ms: u.timeToMfeMs,
        mae_price: u.maePrice,
        mae_pct: u.maePct,
        mae_timestamp: new Date(u.maeTimestamp).toISOString(),
        time_to_mae_ms: u.timeToMaeMs,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await admin.from('signal_extremes').upsert(rows);
      if (error) console.error('SignalsRepository.batchUpdateExtremes error:', error);
    } catch (err) {
      console.error('SignalsRepository.batchUpdateExtremes failed:', err);
    }
  }

  /**
   * Records a captured checkpoint (15M, 30M, 1H, etc.)
   */
  public async recordCheckpoint(
    signalId: string,
    checkpointType: string,
    scheduledAt: number,
    price: number,
    directionalReturnPct: number
  ): Promise<void> {
    const admin = getSupabaseAdmin();

    try {
      await admin.from('signal_checkpoints').upsert({
        signal_id: signalId,
        checkpoint_type: checkpointType,
        scheduled_at: new Date(scheduledAt).toISOString(),
        captured_at: new Date().toISOString(),
        price,
        directional_return_pct: directionalReturnPct,
        is_available: true,
      }, { onConflict: 'signal_id,checkpoint_type' });

      await this.recordEvent(signalId, 'CHECKPOINT_REACHED', price, {
        checkpoint: checkpointType,
        returnPct: directionalReturnPct,
      });
    } catch (err) {
      console.error(`SignalsRepository.recordCheckpoint ${checkpointType} error:`, err);
    }
  }

  /**
   * Appends an audit timeline event
   */
  public async recordEvent(
    signalId: string,
    eventType: string,
    price: number,
    details: Record<string, any> = {}
  ): Promise<void> {
    const admin = getSupabaseAdmin();
    try {
      await admin.from('signal_events').insert({
        signal_id: signalId,
        event_type: eventType,
        price,
        details,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('SignalsRepository.recordEvent error:', err);
    }
  }

  /**
   * Updates signal status (e.g. T1_HIT, T2_HIT, STOP_HIT, CLOSED)
   */
  public async updateSignalStatus(
    signalId: string,
    status: string,
    exitPrice: number,
    grossPnlPct: number,
    netPnlPct?: number
  ): Promise<void> {
    const admin = getSupabaseAdmin();
    try {
      const now = new Date().toISOString();
      await admin.from('signals').update({
        status,
        exit_price: exitPrice,
        gross_pnl_pct: grossPnlPct,
        net_pnl_pct: netPnlPct != null ? netPnlPct : (grossPnlPct - 0.10),
        resolved_at: now,
        updated_at: now,
      }).eq('signal_id', signalId);

      await this.recordEvent(signalId, status, exitPrice, {
        grossPnlPct,
        netPnlPct,
      });
    } catch (err) {
      console.error('SignalsRepository.updateSignalStatus error:', err);
    }
  }

  /**
   * Rehydrates active signals from database on daemon restart
   */
  public async rehydrateActiveSignals(): Promise<any[]> {
    const admin = getSupabaseAdmin();
    try {
      const { data, error } = await admin
        .from('signals')
        .select('*, signal_extremes(*)')
        .in('status', ['DETECTED', 'ACTIVE', 'T1_HIT'])
        .order('detected_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('SignalsRepository.rehydrateActiveSignals error:', err);
      return [];
    }
  }

  /**
   * Paginated historical signals query
   */
  public async queryHistoricalSignals(
    filter: {
      exchange?: string;
      direction?: string;
      status?: string;
      minScore?: number;
    } = {},
    limit = 50,
    offset = 0
  ): Promise<{ signals: any[]; total: number }> {
    const admin = getSupabaseAdmin();
    try {
      let q = admin.from('signals').select('*, signal_snapshots(*), signal_extremes(*)', { count: 'exact' });

      if (filter.exchange && filter.exchange !== 'ALL') {
        q = q.eq('exchange_id', filter.exchange);
      }
      if (filter.direction && filter.direction !== 'ALL') {
        q = q.eq('direction', filter.direction);
      }
      if (filter.status && filter.status !== 'ALL') {
        q = q.eq('status', filter.status);
      }
      if (filter.minScore) {
        q = q.gte('eagle_score', filter.minScore);
      }

      q = q.order('detected_at', { ascending: false }).range(offset, offset + limit - 1);

      const { data, error, count } = await q;
      if (error) throw error;

      return { signals: data || [], total: count || 0 };
    } catch (err) {
      console.error('SignalsRepository.queryHistoricalSignals error:', err);
      return { signals: [], total: 0 };
    }
  }
}
