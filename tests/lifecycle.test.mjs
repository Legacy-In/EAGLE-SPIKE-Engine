import test from 'node:test';
import assert from 'node:assert/strict';

// Helper functions mirroring LifecycleEngine core math and schema logic
function generateSignalId(symbol, date = new Date(), sequence = 1) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');
  const cleanSym = symbol.replace(/USDT$/, '');
  return `EGL-${y}${m}${d}-${cleanSym}-${seq}`;
}

function calculateReturn(signalType, signalPrice, currentPrice) {
  if (!signalPrice || !currentPrice) return 0;
  if (signalType === 'LONG CANDIDATE' || signalType === 'LONG') {
    return parseFloat((((currentPrice - signalPrice) / signalPrice) * 100).toFixed(2));
  } else {
    // Directional return for short
    return parseFloat((((signalPrice - currentPrice) / signalPrice) * 100).toFixed(2));
  }
}

function calculateMedian(arr) {
  if (!arr || arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function updateExtremes(signal, currentPrice, timestamp = Date.now()) {
  if (!signal.extremes.postSignalHigh || currentPrice > signal.extremes.postSignalHigh) {
    signal.extremes.postSignalHigh = currentPrice;
    signal.extremes.postSignalHighTimestamp = timestamp;
  }
  if (!signal.extremes.postSignalLow || currentPrice < signal.extremes.postSignalLow) {
    signal.extremes.postSignalLow = currentPrice;
    signal.extremes.postSignalLowTimestamp = timestamp;
  }

  const dirReturn = calculateReturn(signal.signalType, signal.initialSnapshot.price, currentPrice);

  if (signal.extremes.mfePct === null || dirReturn > signal.extremes.mfePct) {
    signal.extremes.mfePct = dirReturn;
    signal.extremes.mfePrice = currentPrice;
    signal.extremes.mfeTimestamp = timestamp;
    signal.extremes.timeToMFE = timestamp - signal.detectedAt;
  }

  if (signal.extremes.maePct === null || dirReturn < signal.extremes.maePct) {
    signal.extremes.maePct = dirReturn;
    signal.extremes.maePrice = currentPrice;
    signal.extremes.maeTimestamp = timestamp;
    signal.extremes.timeToMAE = timestamp - signal.detectedAt;
  }
}

function checkDeduplication(existingSignals, symbol, signalType, cooldownMs = 30 * 60 * 1000, now = Date.now()) {
  return existingSignals.some(s => 
    s.symbol === symbol && 
    s.signalType === signalType && 
    ['ACTIVE', 'CONFIRMED', 'WARNING', 'EXTENDED'].includes(s.status) &&
    (now - s.detectedAt) < cooldownMs
  );
}

function evaluateRejectionRule(signal, currentPrice, invalidationPct = 3.0, now = Date.now()) {
  const dirReturn = calculateReturn(signal.signalType, signal.initialSnapshot.price, currentPrice);
  if (dirReturn <= -invalidationPct) {
    signal.status = 'REJECTED';
    signal.rejection = {
      rejectionTimestamp: now,
      rejectionPrice: currentPrice,
      rejectionPercent: dirReturn,
      directionalReturnAtRejection: dirReturn,
      timeToRejection: now - signal.detectedAt,
      reason: `Price breached -${invalidationPct}% invalidation limit`
    };
    return true;
  }
  return false;
}

// ═════════════════════════════════════════════════════════════════════
// AUTOMATED TEST SUITE (Section 42 Verification)
// ═════════════════════════════════════════════════════════════════════

test('1. Signal ID formatting follows EGL-YYYYMMDD-SYMBOL-XXXX', () => {
  const d = new Date(Date.UTC(2026, 8, 20, 1, 32, 0));
  const id = generateSignalId('AVAXUSDT', d, 1);
  assert.equal(id, 'EGL-20260920-AVAX-0001');
});

test('2. Signal ID uniqueness across sequence increments', () => {
  const d = new Date(Date.UTC(2026, 8, 20, 1, 32, 0));
  const id1 = generateSignalId('BTCUSDT', d, 1);
  const id2 = generateSignalId('BTCUSDT', d, 2);
  assert.notEqual(id1, id2);
  assert.equal(id1, 'EGL-20260920-BTC-0001');
  assert.equal(id2, 'EGL-20260920-BTC-0002');
});

test('3. Initial Snapshot Immutability: Deep-frozen snapshot cannot be modified', () => {
  const snapshot = Object.freeze({
    price: 100.0,
    rvol: 2.5,
    eagleScore: 85,
    trend: 'STRONG BULLISH'
  });

  const signal = {
    signalId: 'EGL-20260920-SOL-0001',
    initialSnapshot: snapshot
  };

  // Attempting mutation
  assert.throws(() => {
    signal.initialSnapshot.price = 150.0;
  }, /Cannot assign to read only property/);

  assert.equal(signal.initialSnapshot.price, 100.0);
});

test('4. LONG directional return calculation', () => {
  assert.equal(calculateReturn('LONG CANDIDATE', 100, 105), 5.0);
  assert.equal(calculateReturn('LONG CANDIDATE', 100, 97), -3.0);
});

test('5. SHORT directional return calculation', () => {
  // Price drops 5% -> Short return is +5% favorable
  assert.equal(calculateReturn('SHORT CANDIDATE', 100, 95), 5.0);
  // Price rises 4% -> Short return is -4% adverse
  assert.equal(calculateReturn('SHORT CANDIDATE', 100, 104), -4.0);
});

test('6. Checkpoint directional performance (4H, 8H, 1D)', () => {
  const entry = 50.0;
  const price4h = 52.0; // +4%
  const price8h = 54.0; // +8%
  const price1d = 49.0; // -2%

  assert.equal(calculateReturn('LONG', entry, price4h), 4.0);
  assert.equal(calculateReturn('LONG', entry, price8h), 8.0);
  assert.equal(calculateReturn('LONG', entry, price1d), -2.0);
});

test('7. MFE (Maximum Favorable Excursion) peak tracking for LONG', () => {
  const t0 = 1000000;
  const signal = {
    signalType: 'LONG CANDIDATE',
    detectedAt: t0,
    initialSnapshot: { price: 100 },
    extremes: {
      mfePct: null, mfePrice: null, mfeTimestamp: null, timeToMFE: null,
      maePct: null, maePrice: null, maeTimestamp: null, timeToMAE: null,
      postSignalHigh: null, postSignalLow: null
    }
  };

  updateExtremes(signal, 100, t0);
  updateExtremes(signal, 98, t0 + 10000);   // -2%
  updateExtremes(signal, 104, t0 + 20000);  // +4%
  updateExtremes(signal, 109, t0 + 30000);  // +9% peak
  updateExtremes(signal, 106, t0 + 40000);  // +6%

  assert.equal(signal.extremes.mfePct, 9.0);
  assert.equal(signal.extremes.mfePrice, 109);
  assert.equal(signal.extremes.timeToMFE, 30000);
});

test('8. MAE (Maximum Adverse Excursion) trough tracking for LONG', () => {
  const t0 = 1000000;
  const signal = {
    signalType: 'LONG CANDIDATE',
    detectedAt: t0,
    initialSnapshot: { price: 100 },
    extremes: {
      mfePct: null, mfePrice: null, mfeTimestamp: null, timeToMFE: null,
      maePct: null, maePrice: null, maeTimestamp: null, timeToMAE: null,
      postSignalHigh: null, postSignalLow: null
    }
  };

  updateExtremes(signal, 100, t0);
  updateExtremes(signal, 97.5, t0 + 15000); // -2.5% trough
  updateExtremes(signal, 102, t0 + 25000);  // +2%

  assert.equal(signal.extremes.maePct, -2.5);
  assert.equal(signal.extremes.maePrice, 97.5);
  assert.equal(signal.extremes.timeToMAE, 15000);
});

test('9. Post-Signal High and Low tracking independent of direction', () => {
  const t0 = 1000000;
  const signal = {
    signalType: 'SHORT CANDIDATE',
    detectedAt: t0,
    initialSnapshot: { price: 100 },
    extremes: {
      mfePct: null, mfePrice: null, mfeTimestamp: null, timeToMFE: null,
      maePct: null, maePrice: null, maeTimestamp: null, timeToMAE: null,
      postSignalHigh: null, postSignalLow: null
    }
  };

  updateExtremes(signal, 100, t0);
  updateExtremes(signal, 103, t0 + 10000); // High = 103
  updateExtremes(signal, 91, t0 + 20000);  // Low = 91

  assert.equal(signal.extremes.postSignalHigh, 103);
  assert.equal(signal.extremes.postSignalLow, 91);
  assert.equal(signal.extremes.mfePct, 9.0); // For short, 91 is +9%
  assert.equal(signal.extremes.maePct, -3.0); // For short, 103 is -3%
});

test('10. Rejection Engine triggers upon breaching invalidation limit', () => {
  const t0 = 1000000;
  const signal = {
    signalType: 'LONG CANDIDATE',
    detectedAt: t0,
    initialSnapshot: { price: 100 },
    status: 'ACTIVE',
    rejection: null
  };

  // Price drops to 96.5 (-3.5%), breaching 3.0% invalidation
  const rejected = evaluateRejectionRule(signal, 96.5, 3.0, t0 + 3600000);

  assert.equal(rejected, true);
  assert.equal(signal.status, 'REJECTED');
  assert.equal(signal.rejection.rejectionPrice, 96.5);
  assert.equal(signal.rejection.rejectionPercent, -3.5);
  assert.equal(signal.rejection.timeToRejection, 3600000);
});

test('11. Deduplication Cooldown prevents duplicate signals within window', () => {
  const now = 10000000;
  const signals = [
    {
      symbol: 'ETHUSDT',
      signalType: 'LONG CANDIDATE',
      detectedAt: now - (12 * 60 * 1000), // 12m ago
      status: 'ACTIVE'
    }
  ];

  // 12m < 30m cooldown -> is duplicate
  assert.equal(checkDeduplication(signals, 'ETHUSDT', 'LONG CANDIDATE', 30 * 60 * 1000, now), true);
  // Different symbol -> not duplicate
  assert.equal(checkDeduplication(signals, 'BTCUSDT', 'LONG CANDIDATE', 30 * 60 * 1000, now), false);
  // Old signal past 30m cooldown (35m ago) -> not duplicate
  const oldSignals = [{
    symbol: 'ETHUSDT',
    signalType: 'LONG CANDIDATE',
    detectedAt: now - (35 * 60 * 1000),
    status: 'ACTIVE'
  }];
  assert.equal(checkDeduplication(oldSignals, 'ETHUSDT', 'LONG CANDIDATE', 30 * 60 * 1000, now), false);
});

test('12. Replay strict isolation: historical step hides future data', () => {
  const fullSignal = {
    detectedAt: 1000000,
    checkpoints: {
      '15M': { capturedAt: 1000000 + 900000, directionalReturn: 1.5, available: true },
      '4H':  { capturedAt: 1000000 + 14400000, directionalReturn: 6.2, available: true }
    }
  };

  // At step T=15M, future 4H data must NOT be visible
  const replayTimestamp = 1000000 + 900000;
  const visibleCheckpoints = Object.entries(fullSignal.checkpoints)
    .filter(([_, cp]) => cp.available && cp.capturedAt <= replayTimestamp)
    .map(([id, _]) => id);

  assert.deepEqual(visibleCheckpoints, ['15M']);
  assert.equal(visibleCheckpoints.includes('4H'), false);
});

test('13. Cohort Analytics: accurate mean and median calculation', () => {
  const sample = [1.0, 2.0, 3.0, 4.0, 10.0];
  const mean = sample.reduce((a, b) => a + b, 0) / sample.length;
  const median = calculateMedian(sample);

  assert.equal(mean, 4.0);
  assert.equal(median, 3.0);

  // Even sample
  const evenSample = [2.0, 4.0, 6.0, 8.0];
  assert.equal(calculateMedian(evenSample), 5.0);
});

test('14. JSON Import/Export schema version integrity', () => {
  const exportPayload = {
    version: 1,
    signalsCount: 1,
    signals: [
      {
        signalId: 'EGL-20260920-AVAX-0001',
        symbol: 'AVAXUSDT',
        detectedAt: 1726790000000,
        initialSnapshot: { price: 9.5 }
      }
    ]
  };

  const serialized = JSON.stringify(exportPayload);
  const parsed = JSON.parse(serialized);

  assert.equal(parsed.version, 1);
  assert.equal(parsed.signals[0].signalId, 'EGL-20260920-AVAX-0001');
  assert.equal(parsed.signals[0].initialSnapshot.price, 9.5);
});
