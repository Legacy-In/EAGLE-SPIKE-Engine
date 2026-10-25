import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { ConfluencePipeline } from '../backend/services/confluence_pipeline';
import { ConfluenceRepository, ConfluenceSignalRecord } from '../backend/db/confluence_repo';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SIGNALS_FILE = path.join(DATA_DIR, 'confluence_signals.json');
const JOB_RUNS_FILE = path.join(DATA_DIR, 'job_runs.json');
const LOCK_FILE = path.join(DATA_DIR, 'confluence_worker.lock');

test('Confluence Pipeline Data Suite', async (t) => {
  const repo = ConfluenceRepository.getInstance();
  const pipeline = ConfluencePipeline.getInstance();

  // Reset test artifacts before running
  repo.releaseLock();
  if (fs.existsSync(SIGNALS_FILE)) {
    try {
      const all = JSON.parse(fs.readFileSync(SIGNALS_FILE, 'utf-8'));
      const filtered = all.filter((s: any) => !s.signal_key.includes('1792951200000') && !s.signal_key.includes('1792954800000'));
      fs.writeFileSync(SIGNALS_FILE, JSON.stringify(filtered, null, 2));
    } catch (e) {}
  }

  await t.test('1. Advisory lock correctly blocks concurrent execution and releases cleanly', () => {
    assert.strictEqual(repo.acquireLock(), true, 'First lock acquire must succeed');
    assert.strictEqual(repo.acquireLock(), false, 'Second concurrent lock acquire must fail');
    repo.releaseLock();
    assert.strictEqual(repo.acquireLock(), true, 'Acquire after release must succeed');
    repo.releaseLock();
  });

  await t.test('2. Job Runs logs real timestamps, counts, and states', async () => {
    const runId = await repo.startJobRun('test_pipeline_run');
    assert.ok(runId > 0, 'Run ID must be positive integer');

    const running = repo.getLatestJobRun('test_pipeline_run');
    assert.ok(running);
    assert.strictEqual(running?.status, 'RUNNING');
    assert.ok(Date.parse(running?.started_at || '') > 0, 'started_at must be valid ISO timestamp');
    assert.strictEqual(running?.finished_at, null);

    await repo.finishJobRun(runId, 'SUCCESS', 50, 3, null);

    const finished = repo.getLatestJobRun('test_pipeline_run');
    assert.ok(finished);
    assert.strictEqual(finished?.status, 'SUCCESS');
    assert.strictEqual(finished?.symbols_scanned, 50);
    assert.strictEqual(finished?.signals_emitted, 3);
    assert.ok(Date.parse(finished?.finished_at || '') >= Date.parse(finished?.started_at || ''));
  });

  await t.test('3. Signal Idempotency: Duplicate signal keys are rejected without mutating state', async () => {
    const mockSignal: ConfluenceSignalRecord = {
      signal_key: 'SOLUSDT|CONFLUENCE_1H|BUY|1792951200000',
      strategy: 'CONFLUENCE_1H',
      symbol: 'SOLUSDT',
      exchange: 'BYBIT',
      timeframe: '1h',
      side: 'BUY',
      strength: 'STRONG',
      votes_bull: 8,
      votes_bear: 1,
      score_pct: 73,
      votes_json: [],
      ages_json: { emaCross: 1, macd: 2, qqe: 1 },
      indicators_json: { rsi: 58, adx: 24, atr: 3.5 },
      oi_available: true,
      price: 155.2,
      atr: 3.5,
      candle_t: new Date(1792951200000).toISOString(),
      status: 'ACTIVE',
      skip_reason: null,
      config_version: '1.0.0',
    };

    // First insert
    const res1 = await repo.insertSignal(mockSignal);
    assert.strictEqual(res1.inserted, true);
    assert.strictEqual(res1.isDuplicate, false);

    // Duplicate insert attempt
    const res2 = await repo.insertSignal(mockSignal);
    assert.strictEqual(res2.inserted, false);
    assert.strictEqual(res2.isDuplicate, true);
  });

  await t.test('4. Two consecutive hourly runs complete; second run creates zero duplicate signals', async () => {
    // Run 1 (scoped to small subset to avoid external rate limits)
    const run1 = await pipeline.runHourlyScan({ maxSymbols: 5 });
    assert.strictEqual(run1.status, 'SUCCESS');
    assert.ok(run1.symbolsScanned > 0);

    const countAfterRun1 = repo.getSignals().length;

    // Run 2 (immediate re-run on same hour candle)
    const run2 = await pipeline.runHourlyScan({ maxSymbols: 5 });
    assert.strictEqual(run2.status, 'SUCCESS');
    assert.ok(run2.symbolsScanned > 0);

    const countAfterRun2 = repo.getSignals().length;

    // Exactly 0 duplicate records created on the second consecutive run
    assert.strictEqual(
      countAfterRun2,
      countAfterRun1,
      'Consecutive scan on identical candles must emit 0 duplicate signals'
    );
  });

  await t.test('5. Crash recovery: Interrupted run leaves lock recoverable and subsequent run succeeds', async () => {
    // Simulate crash: acquire lock with simulated stale timestamp (> 25 mins ago)
    fs.writeFileSync(
      LOCK_FILE,
      JSON.stringify({ pid: 999999, timestamp: Date.now() - 30 * 60 * 1000 })
    );

    // Stale lock must be broken automatically
    const recovered = repo.acquireLock();
    assert.strictEqual(recovered, true, 'Stale lock from aborted run must be cleanly recovered');
    repo.releaseLock();

    // Subsequent scan must succeed without manual intervention
    const run = await pipeline.runHourlyScan({ maxSymbols: 3 });
    assert.strictEqual(run.status, 'SUCCESS');
  });

  await t.test('6. Risk Gates: Gated signals are stored with skip_reason for journal auditability', async () => {
    const gatedSignal: ConfluenceSignalRecord = {
      signal_key: 'ETHUSDT|CONFLUENCE_1H|BUY|1792954800000',
      strategy: 'CONFLUENCE_1H',
      symbol: 'ETHUSDT',
      exchange: 'BYBIT',
      timeframe: '1h',
      side: 'BUY',
      strength: 'MODERATE',
      votes_bull: 7,
      votes_bear: 2,
      score_pct: 64,
      votes_json: [],
      ages_json: { emaCross: 5, macd: 6, qqe: 4 },
      indicators_json: { rsi: 52, adx: 16, atr: 45.0 },
      oi_available: false,
      price: 2650.0,
      atr: 45.0,
      candle_t: new Date(1792954800000).toISOString(),
      status: 'SKIPPED',
      skip_reason: 'ADX_BELOW_20',
      config_version: '1.0.0',
    };

    const res = await repo.insertSignal(gatedSignal);
    assert.strictEqual(res.inserted, true);

    const stored = repo.getSignals().find((s) => s.signal_key === gatedSignal.signal_key);
    assert.ok(stored);
    assert.strictEqual(stored?.status, 'SKIPPED');
    assert.strictEqual(stored?.skip_reason, 'ADX_BELOW_20');
  });
});
