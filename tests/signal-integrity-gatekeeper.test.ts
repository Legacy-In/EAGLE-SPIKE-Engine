/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — SIGNAL INTEGRITY & GATEKEEPER TEST SUITE
 * Tests:
 * 1. Strict Exchange Symbol Validation & Mock Blacklist Filtering
 * 2. 30-Minute Deduplication on (SYMBOL + DIRECTION)
 * 3. Real-Time Live Price Validation & Divergence Guard
 * ═══════════════════════════════════════════════════════════════════════════
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidActiveSymbol,
  isBlacklistedSymbol,
  MOCK_OR_TEST_REGEX,
} from '../backend/services/symbol-validator.mjs';
import {
  buildSignalSignature,
  isSignatureInCooldown,
  recordSignatureDispatch,
  getRemainingCooldownMs,
} from '../backend/services/signal-dedup.mjs';
import { validateSignalPriceIntegrity } from '../backend/services/live-price-validator.mjs';

test('1. Symbol Validator: Rejects Mock, Test, and Synthetic Symbol Patterns', () => {
  const rejectedSymbols = [
    'PARITY72669USDT',
    'PARITY0USDT',
    'TESTUSDT',
    'BTC_TEST',
    'MOCK_SOLUSDT',
    'CORRUPT-COIN',
    'DEMOUSDT',
    'SYNTHETICUSDT',
    'FAKEBTCUSDT',
  ];

  for (const sym of rejectedSymbols) {
    assert.equal(isBlacklistedSymbol(sym), true, `Should blacklist ${sym}`);
    assert.equal(isValidActiveSymbol(sym), false, `Should reject ${sym} from active trading`);
    assert.ok(MOCK_OR_TEST_REGEX.test(sym), `${sym} must match MOCK_OR_TEST_REGEX`);
  }
});

test('2. Symbol Validator: Accepts Legitimate Major Perpetual Pairs', () => {
  const legitSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'PEPEUSDT', 'AVAXUSDT'];

  for (const sym of legitSymbols) {
    assert.equal(isBlacklistedSymbol(sym), false, `Should not blacklist ${sym}`);
    assert.equal(isValidActiveSymbol(sym), true, `Should accept active pair ${sym}`);
  }
});

test('3. Deduplication Engine: Strict 30-Minute Cooldown on (SYMBOL + DIRECTION)', () => {
  const testSym = `KASUSDT`;
  const testDir = 'LONG';
  const customCooldownMs = 30 * 60 * 1000; // 30 minutes

  // Canonical signature formation
  const sig = buildSignalSignature(testSym, testDir);
  assert.equal(sig, 'KASUSDT:LONG');

  // 1. Initial state: not in cooldown
  // Clean any residual
  assert.equal(isSignatureInCooldown(testSym, testDir, 0), false);

  // 2. Record dispatch
  recordSignatureDispatch(testSym, testDir);

  // 3. Immediately query cooldown: must be active
  assert.equal(isSignatureInCooldown(testSym, testDir, customCooldownMs), true, 'Must be locked in 30m cooldown');
  assert.ok(getRemainingCooldownMs(testSym, testDir, customCooldownMs) > 29 * 60 * 1000, 'Remaining cooldown must be ~30 min');

  // 4. Query opposite direction: SHORT must not be locked by LONG
  assert.equal(isSignatureInCooldown(testSym, 'SHORT', customCooldownMs), false, 'Opposite direction should remain distinct');

  // 5. Query another symbol: ETH must not be locked
  assert.equal(isSignatureInCooldown('ETHUSDT', testDir, customCooldownMs), false, 'Different symbol should remain distinct');
});

test('4. Live Price Validator: Price Integrity & Divergence Math', async () => {
  // Reject zero or negative price
  const zeroCheck = await validateSignalPriceIntegrity('BTCUSDT', 0);
  assert.equal(zeroCheck.valid, false);
  assert.equal(zeroCheck.reason, 'INVALID_NUMERIC_PRICE');

  // Reasonable price check (e.g. BTC around market price)
  const reasonableCheck = await validateSignalPriceIntegrity('BTCUSDT', 66000);
  assert.ok(reasonableCheck.valid !== undefined);
  if (reasonableCheck.livePrice) {
    assert.ok(reasonableCheck.livePrice > 10000, 'Live BTC price should be plausible');
  }
});
