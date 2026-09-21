import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SignalsRepository } from '../backend/db/signals.repo';
import { getSupabaseAdmin, getSupabaseAnon } from '../backend/db/supabase';

test('Supabase Lifecycle: Verify anon and admin client configuration', async () => {
  const admin = getSupabaseAdmin();
  const anon = getSupabaseAnon();

  assert.ok(admin, 'Admin client must be initialized');
  assert.ok(anon, 'Anon client must be initialized');

  const { data, error } = await anon.from('exchanges').select('id');
  assert.equal(error, null, 'Public anon client should be allowed to read exchanges');
  assert.ok(data && data.length >= 4, 'Should contain at least 4 exchanges');
});

test('Supabase Lifecycle: Full signal persistence, excursion tracking, checkpointing, and idempotency', async () => {
  const repo = SignalsRepository.getInstance();
  const admin = getSupabaseAdmin();
  const testId = `UNIT-TEST-${Date.now()}`;
  const testIdemp = `IDEMP-${testId}`;
  const now = Date.now();

  // 1. Insert Signal
  const inserted = await repo.insertSignal({
    signalId: testId,
    idempotencyKey: testIdemp,
    exchange: 'BYBIT',
    symbol: 'BTCUSDT',
    direction: 'LONG',
    strategyVersion: 'v1.5',
    entryPrice: 91000.0,
    target1Price: 92500.0,
    target2Price: 94000.0,
    target3Price: 97000.0,
    stopPrice: 89000.0,
    eagleScore: 85,
    rvol: 2.5,
    volumeZScore: 2.8,
    oiChangePct: 4.2,
    detectedAt: now,
  }, {
    signalId: testId,
    price: 91000.0,
    turnover24hUsd: 1500000000,
    rvol: 2.5,
    volumeZScore: 2.8,
    openInterestUsd: 800000000,
    oiChangePct: 4.2,
    fundingRate: 0.0001,
    takerFlow: 35.0,
  });

  assert.equal(inserted, true, 'Signal should insert successfully');

  // 2. Idempotency test (duplicate insert with same key should fail gracefully)
  const duplicate = await repo.insertSignal({
    signalId: `${testId}-DUP`,
    idempotencyKey: testIdemp, // Same idempotency key
    exchange: 'BYBIT',
    symbol: 'BTCUSDT',
    direction: 'LONG',
    strategyVersion: 'v1.5',
    entryPrice: 91000.0,
    target1Price: 92500.0,
    target2Price: 94000.0,
    target3Price: 97000.0,
    stopPrice: 89000.0,
    eagleScore: 85,
    rvol: 2.5,
    volumeZScore: 2.8,
    oiChangePct: 4.2,
    detectedAt: now,
  }, {
    signalId: `${testId}-DUP`,
    price: 91000.0,
    rvol: 2.5,
    volumeZScore: 2.8,
    openInterestUsd: 800000000,
    oiChangePct: 4.2,
    fundingRate: 0.0001,
    takerFlow: 35.0,
  });

  assert.equal(duplicate, false, 'Duplicate idempotency key must reject cleanly');

  // 3. Batch Extremes Update (MFE / MAE)
  await repo.batchUpdateExtremes([{
    signalId: testId,
    mfePrice: 92800.0,
    mfePct: 1.98,
    mfeTimestamp: now + 60000,
    timeToMfeMs: 60000,
    maePrice: 90700.0,
    maePct: -0.33,
    maeTimestamp: now + 30000,
    timeToMaeMs: 30000,
  }]);

  const { data: extData } = await admin.from('signal_extremes').select('*').eq('signal_id', testId).single();
  assert.equal(Number(extData?.mfe_pct), 1.98, 'MFE % should match updated value');
  assert.equal(Number(extData?.mae_pct), -0.33, 'MAE % should match updated value');

  // 4. Milestone Checkpoint Capture
  await repo.recordCheckpoint(testId, '15M', now + 900000, 92500.0, 1.65);
  const { data: cpData } = await admin
    .from('signal_checkpoints')
    .select('*')
    .eq('signal_id', testId)
    .eq('checkpoint_type', '15M')
    .single();

  assert.equal(cpData?.is_available, true, 'Checkpoint 15M should be available');
  assert.equal(Number(cpData?.directional_return_pct), 1.65, 'Checkpoint return should match');

  // 5. Signal Status Transition
  await repo.updateSignalStatus(testId, 'T1_HIT', 92500.0, 1.65, 1.55);
  const { data: sigData } = await admin.from('signals').select('status, exit_price').eq('signal_id', testId).single();
  assert.equal(sigData?.status, 'T1_HIT', 'Status should transition to T1_HIT');
  assert.equal(Number(sigData?.exit_price), 92500.0, 'Exit price should update');

  // 6. Cleanup
  await admin.from('signals').delete().eq('signal_id', testId);
});
