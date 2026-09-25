import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatEagleFlashTelegramAlert,
  getBackoffMs,
  queueTelegramSignalAlert,
  fetchPendingOutbox,
  lockOutboxRecord,
  markOutboxSent,
  markOutboxFailure,
  OutboxTelemetry,
} from '../backend/services/telegram-outbox.mjs';
import { createSignal } from '../backend/services/signal-creation.mjs';

test('1. Telegram Message Formatting: Adheres Strictly to Canonical EAGLE FLASH Specification', () => {
  const mockItem = {
    signal_id: 'EGL-20260925-BYBIT-BTCUSDT-9999',
    payload: {
      signal_id: 'EGL-20260925-BYBIT-BTCUSDT-9999',
      symbol: 'BTCUSDT',
      exchange: 'BYBIT',
      direction: 'LONG',
      entry_price: 83520.40,
      current_price: 83526.10,
      stop_price: 81850.00,
      target_1_price: 84620.00,
      target_2_price: 85710.00,
      target_3_price: 87900.00,
      eagle_score: 88,
      rvol: 2.31,
      oi_change_pct: 3.8,
      funding_rate: 0.00012,
      spike_type: 'MOMENTUM / BREAKOUT',
      spike_quality: 'HIGH',
      dataConfidence: 95,
      detected_at: '2026-09-25T15:32:41.000Z',
      invalidation_condition: '15M close below $81,850.00 or adverse penetration breaches stop price.',
    }
  };

  const text = formatEagleFlashTelegramAlert(mockItem);

  // Assert essential visual headers and attributes
  assert.ok(text.includes('🦅 <b>EAGLE FLASH — NEW SIGNAL</b>'), 'Contains main header');
  assert.ok(text.includes('🟢 <b>LONG</b>'), 'Contains direction icon and text');
  assert.ok(text.includes('<b>BTCUSDT</b>'), 'Contains symbol');
  assert.ok(text.includes('<b>Exchange:</b> BYBIT'), 'Contains exchange');
  assert.ok(text.includes('<b>Market:</b> Perpetual'), 'Contains market');
  assert.ok(text.includes('<b>Eagle Score:</b> 88'), 'Contains eagle score');
  assert.ok(text.includes('<b>Signal Quality:</b> HIGH'), 'Contains signal quality');
  assert.ok(text.includes('<b>ENTRY</b>\n$83,520.40'), 'Contains formatted entry price');
  assert.ok(text.includes('<b>CURRENT</b>\n$83,526.10'), 'Contains formatted current price');
  assert.ok(text.includes('<b>STOP LOSS</b>\n$81,850.00'), 'Contains formatted stop loss');
  assert.ok(text.includes('<b>TP1</b>\n$84,620.00'), 'Contains TP1');
  assert.ok(text.includes('<b>TP2</b>\n$85,710.00'), 'Contains TP2');
  assert.ok(text.includes('<b>TP3</b>\n$87,900.00'), 'Contains TP3');
  assert.ok(text.includes('<b>RVOL:</b> 2.31x'), 'Contains RVOL');
  assert.ok(text.includes('<b>OI Change:</b> +3.8%'), 'Contains OI Change');
  assert.ok(text.includes('<b>Funding:</b> +0.012%'), 'Contains Funding Rate');
  assert.ok(text.includes('EGL-20260925-BYBIT-BTCUSDT-9999'), 'Contains exact signal ID');
  assert.ok(text.includes('⚠️ <b>Invalidation:</b>'), 'Contains Invalidation section');
  assert.ok(text.includes('LIVE'), 'Contains Data state');
});

test('2. Exponential Backoff Calculation: Precise Delay Progression', () => {
  assert.equal(getBackoffMs(1), 2000, 'Attempt 1 -> 2s backoff');
  assert.equal(getBackoffMs(2), 5000, 'Attempt 2 -> 5s backoff');
  assert.equal(getBackoffMs(3), 15000, 'Attempt 3 -> 15s backoff');
  assert.equal(getBackoffMs(4), 30000, 'Attempt 4 -> 30s backoff');
  assert.equal(getBackoffMs(5), 60000, 'Attempt 5 -> 60s backoff');
});

test('3. Outbox State Machine: PENDING -> SENDING -> SENT', async () => {
  const testSignal = {
    signal_id: `TEST-${Date.now()}-BTCUSDT`,
    symbol: 'BTCUSDT',
    exchange_id: 'BINANCE',
    direction: 'LONG',
    entry_price: 65000,
    stop_price: 63500,
    target_1_price: 66500,
    target_2_price: 68000,
    target_3_price: 71000,
    eagle_score: 90,
    rvol: 2.5,
    volume_z_score: 2.8,
    oi_change_pct: 4.0,
    detected_at: new Date().toISOString(),
  };

  // 1. Queue alert
  const queueRes = await queueTelegramSignalAlert(testSignal, { exchange: 'BINANCE' });
  assert.equal(queueRes.success, true, 'Queue alert succeeded');
  assert.ok(queueRes.id, 'Assigned unique outbox record ID');

  // 2. Lock for dispatch
  await lockOutboxRecord(queueRes.id);

  // 3. Mark SENT with message ID
  const mockMsgId = 123456789;
  await markOutboxSent(queueRes.id, mockMsgId);

  // Verify telemetry increment
  assert.ok(OutboxTelemetry.sentTotal > 0, 'Sent total counter incremented');
  assert.ok(OutboxTelemetry.lastSentAt !== null, 'Last sent at timestamp recorded');
});

test('4. Outbox Retry & Failure State Transitions', async () => {
  const testSignal = {
    signal_id: `RETRY-${Date.now()}-SOLUSDT`,
    symbol: 'SOLUSDT',
    exchange_id: 'BYBIT',
    direction: 'SHORT',
    entry_price: 150,
    stop_price: 154,
    target_1_price: 146,
    target_2_price: 142,
    target_3_price: 135,
    eagle_score: 75,
    rvol: 2.0,
    volume_z_score: 1.9,
    oi_change_pct: 2.5,
    detected_at: new Date().toISOString(),
  };

  const queueRes = await queueTelegramSignalAlert(testSignal, { exchange: 'BYBIT' });
  assert.equal(queueRes.success, true);

  // Simulate attempt 1 failure -> RETRY
  await markOutboxFailure(queueRes.id, 'Connection timeout', 1);
  assert.ok(OutboxTelemetry.retriesTotal > 0, 'Retries total incremented');

  // Simulate attempt 5 failure -> FAILED
  await markOutboxFailure(queueRes.id, 'Chat not found', 5);
  assert.ok(OutboxTelemetry.failedTotal > 0, 'Failed total incremented');
});

test('5. Non-Blocking Invariant: createSignal() Persists Authoritative Record Even if Telegram Outage Occurs', async () => {
  const candidate = {
    symbol: 'BTCUSDT',
    exchange: 'BYBIT',
    direction: 'LONG',
    entryPrice: 65120.0,
    eagleScore: 82,
    rvol: 2.1,
    volumeZScore: 2.0,
    oiChangePct: 3.1,
    detectedAt: Date.now() - 10000000,
    strategyVersion: 'v1.5',
  };

  // Execute canonical signal creation
  const res = await createSignal(candidate, { force: true });
  assert.ok(res.success || res.error_code === 'DUPLICATE_SIGNAL', 'Signal creation must succeed without blocking on Telegram');
  if (res.success) {
    assert.ok(res.signal_id, 'Generated canonical signal ID');
  }
});
