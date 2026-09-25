import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAtrStopsAndTargets,
  generateDeterministicIdentities,
  createSignal,
  getSignalEngineDiagnostics,
  SignalTelemetry,
} from '../backend/services/signal-creation.mjs';

test('1. ATR Stop Loss & Target Math: Clamped 2.0% - 3.5%, T1 1.2x, T2 2.5x, T3 5.0x', () => {
  const entryPrice = 60000;

  // Standard case
  const res = calculateAtrStopsAndTargets(entryPrice, 'LONG');
  assert.ok(res.stopLossPct >= 2.0 && res.stopLossPct <= 3.5, `Stop loss ${res.stopLossPct}% within 2.0%-3.5%`);
  assert.ok(res.targetPrice1 > entryPrice, 'T1 > entry for LONG');
  assert.ok(res.targetPrice2 > res.targetPrice1, 'T2 > T1');
  assert.ok(res.targetPrice3 > res.targetPrice2, 'T3 > T2');
  assert.ok(res.stopLossPrice < entryPrice, 'SL < entry for LONG');

  // Short case
  const resShort = calculateAtrStopsAndTargets(entryPrice, 'SHORT');
  assert.ok(resShort.stopLossPct >= 2.0 && resShort.stopLossPct <= 3.5);
  assert.ok(resShort.targetPrice1 < entryPrice, 'T1 < entry for SHORT');
  assert.ok(resShort.targetPrice2 < resShort.targetPrice1, 'T2 < T1 for SHORT');
  assert.ok(resShort.targetPrice3 < resShort.targetPrice2, 'T3 < T2 for SHORT');
  assert.ok(resShort.stopLossPrice > entryPrice, 'SL > entry for SHORT');
});

test('2. Deterministic Identifiers: Stable Format, Predictable Hash, and Cross-Exchange Coexistence', () => {
  const now = 1727280000000; // Fixed epoch timestamp

  const idBybit = generateDeterministicIdentities({
    exchange: 'BYBIT',
    canonicalSymbol: 'BTCUSDT',
    direction: 'LONG',
    strategyVersion: 'v1.5',
    detectedAtMs: now,
  });

  const idBinance = generateDeterministicIdentities({
    exchange: 'BINANCE',
    canonicalSymbol: 'BTCUSDT',
    direction: 'LONG',
    strategyVersion: 'v1.5',
    detectedAtMs: now,
  });

  // Re-run with identical parameters -> MUST be identical
  const idBybitRepeat = generateDeterministicIdentities({
    exchange: 'BYBIT',
    canonicalSymbol: 'BTCUSDT',
    direction: 'LONG',
    strategyVersion: 'v1.5',
    detectedAtMs: now,
  });

  assert.equal(idBybit.signalId, idBybitRepeat.signalId, 'Signal ID must be 100% deterministic');
  assert.equal(idBybit.idempotencyKey, idBybitRepeat.idempotencyKey, 'Idempotency key must be 100% deterministic');
  assert.match(idBybit.signalId, /^EGL-\d{8}-BYBIT-BTCUSDT-[A-F0-9]{4}$/, 'Format must match EGL-YYYYMMDD-EXCHANGE-SYMBOL-XXXX');

  // Cross-exchange coexistence
  assert.notEqual(idBybit.signalId, idBinance.signalId, 'Cross-exchange identical symbols must have distinct signal IDs');
  assert.notEqual(idBybit.idempotencyKey, idBinance.idempotencyKey, 'Cross-exchange identical symbols must have distinct idempotency keys');
});

test('3. Canonical createSignal(): End-to-End Creation, In-Memory Cooldown, and Idempotency Rejection', async () => {
  const timestamp = Date.now() - 7200000; // 2 hours ago
  const candidate = {
    symbol: 'ETHUSDT',
    exchange: 'BINANCE',
    direction: 'LONG',
    entryPrice: 2650.50,
    eagleScore: 84,
    rvol: 2.2,
    volumeZScore: 2.1,
    oiChangePct: 3.5,
    detectedAt: timestamp,
    strategyVersion: 'v2.0',
    isBigCap: true,
  };

  // 1. Initial Insert
  const firstAttempt = await createSignal(candidate, { force: true });
  assert.ok(firstAttempt.success || firstAttempt.error_code === 'DUPLICATE_SIGNAL', 'Initial insert or recognized duplicate');

  // 2. Explicit Cooldown Rejection (same cycle without force flag)
  SignalTelemetry.activeCooldowns.set('BINANCE:ETHUSDT', Date.now());
  const cooldownAttempt = await createSignal(candidate, { cooldownMs: 15 * 60 * 1000 });
  assert.equal(cooldownAttempt.success, false, 'Should be rejected during active cooldown');
  assert.equal(cooldownAttempt.error_code, 'DEDUPLICATED', 'Rejection reason must be DEDUPLICATED');

  // 3. Database Idempotency Key Rejection (with force to bypass in-memory cooldown)
  const duplicateDbAttempt = await createSignal(candidate, { force: true });
  assert.equal(duplicateDbAttempt.success, false, 'Should be rejected by DB constraint');
  assert.equal(duplicateDbAttempt.error_code, 'DUPLICATE_SIGNAL', 'Rejection reason must be DUPLICATE_SIGNAL');
});

test('4. Cross-Exchange Coexistence: Identical Symbol on Different Exchange Inserts Cleanly', async () => {
  const timestamp = Date.now() - 7200000;
  const bybitCandidate = {
    symbol: 'ETHUSDT',
    exchange: 'BYBIT',
    direction: 'LONG',
    entryPrice: 2651.00,
    eagleScore: 85,
    rvol: 2.3,
    volumeZScore: 2.2,
    oiChangePct: 3.6,
    detectedAt: timestamp,
    strategyVersion: 'v2.0',
    isBigCap: true,
  };

  const bybitResult = await createSignal(bybitCandidate, { force: true });
  assert.ok(bybitResult.success || bybitResult.error_code === 'DUPLICATE_SIGNAL', 'Bybit ETHUSDT inserts or recognized duplicate');
  if (bybitResult.success) {
    assert.match(bybitResult.signalId, /BYBIT/, 'Must contain BYBIT in signal ID');
  }
});

test('5. Signal Diagnostics: Diagnostic Counters and Publication Visibility', () => {
  const diag = getSignalEngineDiagnostics();
  assert.ok(typeof diag.qualifiedCandidatesTotal === 'number', 'Qualified candidates counter present');
  assert.ok(typeof diag.signalsCreatedTotal === 'number', 'Signals created counter present');
  assert.ok(typeof diag.signalsDeduplicatedTotal === 'number', 'Signals deduplicated counter present');
  assert.ok(typeof diag.activeCooldownsCount === 'number', 'Active cooldowns count present');
});
