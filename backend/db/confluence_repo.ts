import fs from 'fs';
import path from 'path';
import { getSupabaseAdmin } from './supabase.ts';
import { ConfluenceEvaluation } from '../engine/confluenceStrategy.ts';

export interface ConfluenceSignalRecord {
  id?: string;
  signal_key: string;            // symbol|strategy|side|candle_t (idempotency)
  strategy: string;              // 'CONFLUENCE_1H'
  symbol: string;                // normalized BASEUSDT
  exchange: string;              // 'BYBIT'
  timeframe: string;             // '1h'
  side: 'BUY' | 'SELL';
  strength: string | null;
  votes_bull: number;
  votes_bear: number;
  score_pct: number;
  votes_json: any;
  ages_json: any;
  indicators_json: any;
  oi_available: boolean;
  price: number;
  atr: number | null;
  candle_t: string;              // ISO timestamp
  detected_at?: string;          // ISO timestamp
  status: 'ACTIVE' | 'CLOSED' | 'SKIPPED';
  skip_reason?: string | null;
  config_version: string;
}

export interface JobRunRecord {
  id: number;
  job_name: string;
  started_at: string;
  finished_at?: string | null;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'INTERRUPTED';
  symbols_scanned: number;
  signals_emitted: number;
  error?: string | null;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SIGNALS_FILE = path.join(DATA_DIR, 'confluence_signals.json');
const JOB_RUNS_FILE = path.join(DATA_DIR, 'job_runs.json');
const LOCK_FILE = path.join(DATA_DIR, 'confluence_worker.lock');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export class ConfluenceRepository {
  private static instance: ConfluenceRepository;

  public static getInstance(): ConfluenceRepository {
    if (!ConfluenceRepository.instance) {
      ConfluenceRepository.instance = new ConfluenceRepository();
    }
    return ConfluenceRepository.instance;
  }

  // ---------- ADVISORY / SINGLE-FLIGHT LOCK ----------
  public acquireLock(): boolean {
    if (fs.existsSync(LOCK_FILE)) {
      try {
        const content = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8'));
        const ageMs = Date.now() - (content.timestamp || 0);
        // If lock is older than 25 minutes, treat as stale crashed process
        if (ageMs < 25 * 60 * 1000) {
          return false;
        }
      } catch (e) {
        // Corrupt lock file, overwrite
      }
    }
    try {
      fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, timestamp: Date.now() }));
      return true;
    } catch (e) {
      return false;
    }
  }

  public releaseLock(): void {
    if (fs.existsSync(LOCK_FILE)) {
      try {
        fs.unlinkSync(LOCK_FILE);
      } catch (e) {}
    }
  }

  // ---------- JOB RUNS ----------
  public async startJobRun(jobName = 'confluence_1h_hourly'): Promise<number> {
    const startedAt = new Date().toISOString();
    const runs = this.loadLocalJobRuns();
    const nextId = runs.length ? Math.max(...runs.map((r) => r.id)) + 1 : 1;

    const runRecord: JobRunRecord = {
      id: nextId,
      job_name: jobName,
      started_at: startedAt,
      finished_at: null,
      status: 'RUNNING',
      symbols_scanned: 0,
      signals_emitted: 0,
      error: null,
    };

    runs.push(runRecord);
    this.saveLocalJobRuns(runs);

    // Try Supabase insert
    try {
      const admin = getSupabaseAdmin();
      await admin.from('job_runs').insert({
        job_name: jobName,
        started_at: startedAt,
        status: 'RUNNING',
        symbols_scanned: 0,
        signals_emitted: 0,
      });
    } catch (e) {}

    return nextId;
  }

  public async finishJobRun(
    runId: number,
    status: 'SUCCESS' | 'FAILED' | 'INTERRUPTED',
    symbolsScanned: number,
    signalsEmitted: number,
    error: string | null = null
  ): Promise<void> {
    const finishedAt = new Date().toISOString();
    const runs = this.loadLocalJobRuns();
    const target = runs.find((r) => r.id === runId);
    if (target) {
      target.finished_at = finishedAt;
      target.status = status;
      target.symbols_scanned = symbolsScanned;
      target.signals_emitted = signalsEmitted;
      target.error = error;
      this.saveLocalJobRuns(runs);
    }

    // Try Supabase update
    try {
      const admin = getSupabaseAdmin();
      await admin
        .from('job_runs')
        .update({
          finished_at: finishedAt,
          status,
          symbols_scanned: symbolsScanned,
          signals_emitted: signalsEmitted,
          error,
        })
        .eq('id', runId);
    } catch (e) {}
  }

  public getLatestJobRun(jobName = 'confluence_1h_hourly'): JobRunRecord | null {
    const runs = this.loadLocalJobRuns().filter((r) => r.job_name === jobName);
    return runs.length ? runs[runs.length - 1] : null;
  }

  // ---------- SIGNALS PERSISTENCE & IDEMPOTENCY ----------
  public async insertSignal(signal: ConfluenceSignalRecord): Promise<{ inserted: boolean; isDuplicate: boolean }> {
    const localSignals = this.loadLocalSignals();

    // Check idempotency by unique signal_key
    const existing = localSignals.find((s) => s.signal_key === signal.signal_key);
    if (existing) {
      return { inserted: false, isDuplicate: true };
    }

    signal.id = signal.id || this.generateUuid();
    signal.detected_at = signal.detected_at || new Date().toISOString();

    localSignals.push(signal);
    this.saveLocalSignals(localSignals);

    // Try Supabase confluence_signals insert
    try {
      const admin = getSupabaseAdmin();
      const { error } = await admin.from('confluence_signals').insert(signal);
      if (error && error.code === '23505') {
        return { inserted: false, isDuplicate: true };
      }
    } catch (e) {}

    // Backwards-compatible insert into `signals` table for ACTIVE tradable signals
    if (signal.status === 'ACTIVE' && !signal.skip_reason) {
      try {
        const admin = getSupabaseAdmin();
        const direction = signal.side === 'BUY' ? 'LONG' : 'SHORT';
        const entry = signal.price;
        const atrVal = signal.atr || (entry * 0.02);
        const slDist = Math.min(Math.max(1.5 * atrVal, entry * 0.015), entry * 0.05);
        const tpDist = slDist * 2.0;

        await admin.from('signals').insert({
          signal_id: `CONF-${signal.symbol}-${Date.parse(signal.candle_t)}`,
          idempotency_key: signal.signal_key,
          exchange_id: 'BYBIT',
          market_id: `BYBIT:${signal.symbol}`,
          symbol: signal.symbol,
          direction,
          strategy_version: signal.strategy,
          entry_price: entry,
          target_1_price: direction === 'LONG' ? entry + tpDist : entry - tpDist,
          stop_price: direction === 'LONG' ? entry - slDist : entry + slDist,
          status: 'ACTIVE',
          eagle_score: signal.score_pct,
          rvol: signal.indicators_json?.rvol || 1.0,
          volume_z_score: 1.0,
          oi_change_pct: signal.indicators_json?.oiPct || 0,
          detected_at: signal.detected_at,
        });
      } catch (e) {}
    }

    return { inserted: true, isDuplicate: false };
  }

  public getSignals(filter: { side?: string; minScore?: number; limit?: number } = {}): ConfluenceSignalRecord[] {
    let list = this.loadLocalSignals();
    if (filter.side) {
      list = list.filter((s) => s.side === filter.side);
    }
    if (filter.minScore) {
      list = list.filter((s) => s.score_pct >= (filter.minScore || 0));
    }
    list.sort((a, b) => new Date(b.detected_at || 0).getTime() - new Date(a.detected_at || 0).getTime());
    if (filter.limit) {
      list = list.slice(0, filter.limit);
    }
    return list;
  }

  public hasActiveSignal(symbol: string, strategy = 'CONFLUENCE_1H'): boolean {
    const list = this.loadLocalSignals();
    return list.some((s) => s.symbol === symbol && s.strategy === strategy && s.status === 'ACTIVE');
  }

  public getLastSignalCandleTime(symbol: string, strategy = 'CONFLUENCE_1H'): number | null {
    const list = this.loadLocalSignals().filter((s) => s.symbol === symbol && s.strategy === strategy);
    if (!list.length) return null;
    list.sort((a, b) => new Date(b.candle_t).getTime() - new Date(a.candle_t).getTime());
    return new Date(list[0].candle_t).getTime();
  }

  // ---------- LOCAL FILE HELPERS ----------
  private loadLocalSignals(): ConfluenceSignalRecord[] {
    if (!fs.existsSync(SIGNALS_FILE)) return [];
    try {
      return JSON.parse(fs.readFileSync(SIGNALS_FILE, 'utf-8'));
    } catch (e) {
      return [];
    }
  }

  private saveLocalSignals(signals: ConfluenceSignalRecord[]): void {
    const tmp = `${SIGNALS_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(signals, null, 2));
    fs.renameSync(tmp, SIGNALS_FILE);
  }

  private loadLocalJobRuns(): JobRunRecord[] {
    if (!fs.existsSync(JOB_RUNS_FILE)) return [];
    try {
      return JSON.parse(fs.readFileSync(JOB_RUNS_FILE, 'utf-8'));
    } catch (e) {
      return [];
    }
  }

  private saveLocalJobRuns(runs: JobRunRecord[]): void {
    const tmp = `${JOB_RUNS_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(runs, null, 2));
    fs.renameSync(tmp, JOB_RUNS_FILE);
  }

  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
