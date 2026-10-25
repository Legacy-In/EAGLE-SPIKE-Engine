import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

interface SignalRecord {
  id: string;
  signal_key: string;
  strategy: string;
  symbol: string;
  exchange: string;
  timeframe: string;
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
  candle_t: string;
  detected_at: string;
  status: string;
  skip_reason?: string | null;
  config_version: string;
}

interface JobRunRecord {
  id: number;
  job_name: string;
  started_at: string;
  finished_at?: string | null;
  status: string;
  symbols_scanned: number;
  signals_emitted: number;
  error?: string | null;
}

function loadData() {
  const root = process.cwd();
  // Support running from repo root or apps/web
  const candidates = [
    path.resolve(root, 'data'),
    path.resolve(root, '..', '..', 'data'),
  ];
  let dataDir = candidates[0];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      dataDir = c;
      break;
    }
  }

  const signalsFile = path.join(dataDir, 'confluence_signals.json');
  const jobRunsFile = path.join(dataDir, 'job_runs.json');

  let signals: SignalRecord[] = [];
  let jobRuns: JobRunRecord[] = [];

  if (fs.existsSync(signalsFile)) {
    try {
      signals = JSON.parse(fs.readFileSync(signalsFile, 'utf-8'));
    } catch (e) {}
  }
  if (fs.existsSync(jobRunsFile)) {
    try {
      jobRuns = JSON.parse(fs.readFileSync(jobRunsFile, 'utf-8'));
    } catch (e) {}
  }
  return { signals, jobRuns };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const side = searchParams.get('side')?.toUpperCase();
    const minScoreParam = searchParams.get('minScore');
    const freshParam = searchParams.get('fresh');
    const limitParam = searchParams.get('limit');
    const cursor = searchParams.get('cursor');

    const minScore = minScoreParam ? parseInt(minScoreParam, 10) : undefined;
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 100) : 50;
    const freshOnly = freshParam === 'true';

    const { signals, jobRuns } = loadData();

    // Filter signals
    let filtered = signals.filter((s) => s.strategy === 'CONFLUENCE_1H');

    if (side && (side === 'BUY' || side === 'SELL')) {
      filtered = filtered.filter((s) => s.side === side);
    }

    if (minScore !== undefined && !isNaN(minScore)) {
      filtered = filtered.filter((s) => s.score_pct >= minScore);
    }

    if (freshOnly) {
      filtered = filtered.filter((s) => {
        const ages = s.ages_json;
        if (!ages) return false;
        return (
          (ages.emaCross !== null && ages.emaCross <= 3) ||
          (ages.macd !== null && ages.macd <= 3) ||
          (ages.qqe !== null && ages.qqe <= 3)
        );
      });
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.candle_t).getTime() - new Date(a.candle_t).getTime());

    // Cursor-based pagination if cursor provided (cursor is timestamp or id)
    if (cursor) {
      const cursorTime = isNaN(+cursor) ? new Date(cursor).getTime() : +cursor;
      filtered = filtered.filter((s) => new Date(s.candle_t).getTime() < cursorTime);
    }

    const data = filtered.slice(0, limit);

    // Latest scan meta from job_runs
    const hourlyRuns = jobRuns.filter((r) => r.job_name.includes('confluence'));
    const latestRun = hourlyRuns.length ? hourlyRuns[hourlyRuns.length - 1] : null;

    const asOf = new Date().toISOString();
    const lastScanAt = latestRun ? latestRun.finished_at || latestRun.started_at : null;
    const scanStatus = latestRun ? latestRun.status : 'IDLE';

    return NextResponse.json({
      data,
      meta: {
        asOf,
        lastScanAt,
        scanStatus,
        total: filtered.length,
        limit,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: err.message },
      { status: 500 }
    );
  }
}
