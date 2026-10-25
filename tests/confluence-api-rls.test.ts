import test from 'node:test';
import assert from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { ConfluenceRepository } from '../backend/db/confluence_repo';

dotenv.config();

test('Phase 3 — Database, API & RLS Security Suite', async (t) => {
  const repo = ConfluenceRepository.getInstance();

  await t.test('1. Confluence Repository yields real rows with complete contract', () => {
    const signals = repo.getSignals({ limit: 10 });
    assert.ok(signals.length > 0, 'Signals must return real rows');
    const first = signals[0];
    assert.ok(first.symbol, 'Must contain symbol');
    assert.ok(first.side === 'BUY' || first.side === 'SELL', 'Side must be BUY or SELL');
    assert.ok(first.score_pct >= 0 && first.score_pct <= 100, 'Score must be 0-100');
    assert.ok(first.votes_json, 'votes_json must be present');
    assert.ok(first.candle_t, 'candle_t must be present');
  });

  await t.test('2. Meta lastScanAt matches job_runs timestamp', () => {
    const latestRun = repo.getLatestJobRun();
    assert.ok(latestRun, 'Latest job run must exist');
    assert.ok(latestRun.started_at, 'Job run must have real started_at');
    assert.ok(Date.parse(latestRun.started_at) > 0, 'Timestamp must parse as valid date');
  });

  await t.test('3. Query filtering: side, minScore, and limit filter correctly', () => {
    const buySignals = repo.getSignals({ side: 'BUY' });
    buySignals.forEach((s) => assert.strictEqual(s.side, 'BUY'));

    const highScorers = repo.getSignals({ minScore: 70 });
    highScorers.forEach((s) => assert.ok(s.score_pct >= 70));

    const limited = repo.getSignals({ limit: 3 });
    assert.ok(limited.length <= 3);
  });

  await t.test('4. RLS Security: Anon public client cannot mutate or insert into database', async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yyswmlsrvrqwhztbktlm.supabase.co';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    assert.ok(anonKey, 'Anon key must be configured in environment');

    const anonClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    });

    // 1. Anon can SELECT (Read-only policy)
    const { data: readData, error: readError } = await anonClient
      .from('signals')
      .select('id, symbol')
      .limit(1);

    assert.strictEqual(readError, null, 'Public anon client must be allowed to SELECT signals');

    // 2. Anon CANNOT INSERT into signals (Blocked by RLS with code 42501)
    const { error: insertError } = await anonClient.from('signals').insert({
      signal_id: 'UNAUTHORIZED_ANON_SIGNAL',
      idempotency_key: 'UNAUTHORIZED_ANON_KEY',
      exchange_id: 'BYBIT',
      market_id: 'BYBIT:BTCUSDT',
      symbol: 'BTCUSDT',
      direction: 'LONG',
      strategy_version: 'HACK',
      entry_price: 100000,
      target_1_price: 105000,
      stop_price: 95000,
      status: 'ACTIVE',
      eagle_score: 99,
      rvol: 10.0,
      volume_z_score: 5.0,
      oi_change_pct: 10.0,
      detected_at: new Date().toISOString(),
    });

    assert.ok(insertError !== null, 'Anon insert must be rejected by RLS');
    assert.strictEqual(
      insertError?.code,
      '42501',
      'Insert must fail with Postgres RLS violation code 42501'
    );

    // 3. Anon CANNOT UPDATE signals (RLS suppresses row modification; 0 rows affected)
    const { data: updateData } = await anonClient
      .from('signals')
      .update({ status: 'EXPIRED' })
      .eq('symbol', 'BTCUSDT')
      .select();

    assert.deepStrictEqual(
      updateData,
      [],
      'Anon update must affect 0 rows under RLS protection'
    );
  });

  await t.test('5. Next.js API Routes: /api/confluence/signals returns real rows and meta matching job_runs', async () => {
    const { GET: getSignals } = await import('../apps/web/app/api/confluence/signals/route');
    const req = new Request('http://localhost:3000/api/confluence/signals?limit=5');
    const res = await getSignals(req as any);
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.ok(Array.isArray(json.data), 'json.data must be an array');
    assert.ok(json.meta, 'json.meta must exist');
    assert.ok(json.meta.asOf, 'json.meta.asOf must exist');
    assert.ok(json.meta.lastScanAt, 'json.meta.lastScanAt must exist');

    const latestRun = repo.getLatestJobRun();
    assert.strictEqual(
      json.meta.lastScanAt,
      latestRun?.finished_at || latestRun?.started_at,
      'meta.lastScanAt must match job_runs'
    );
  });

  await t.test('6. Next.js API Route: /api/health returns SLA telemetry and dbReachability', async () => {
    const { GET: getHealth } = await import('../apps/web/app/api/health/route');
    const res = await getHealth();
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.ok(json.status === 'OK' || json.status === 'DEGRADED');
    assert.ok(json.lastScan, 'lastScan must exist');
    assert.ok(json.lastBybitSync, 'lastBybitSync must exist');
    assert.ok(json.wsState, 'wsState must exist');
    assert.ok(json.dbReachability, 'dbReachability must exist');
    assert.ok(typeof json.uptimeSeconds === 'number', 'uptimeSeconds must be number');
    assert.strictEqual(json.versions.strategy, 'CONFLUENCE_1H');
  });
});
