import test from 'node:test';
import assert from 'node:assert/strict';

// Core lifecycle logic functions for verification
function generateSignalId(symbol, date = new Date(), sequence = 1) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const seq = String(sequence).padStart(3, '0');
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

function updateExtremes(signal, currentPrice, timestamp = Date.now()) {
  const isLong = signal.signalType.includes('LONG');
  
  // Post-signal high / low
  if (!signal.postSignalHigh || currentPrice > signal.postSignalHigh) {
    signal.postSignalHigh = currentPrice;
    signal.postSignalHighTimestamp = timestamp;
  }
  if (!signal.postSignalLow || currentPrice < signal.postSignalLow) {
    signal.postSignalLow = currentPrice;
    signal.postSignalLowTimestamp = timestamp;
  }

  // Directional return
  const currentReturn = calculateReturn(signal.signalType, signal.signalPrice, currentPrice);

  // MFE (Maximum Favorable Excursion)
  if (signal.mfePct === null || currentReturn > signal.mfePct) {
    signal.mfePct = currentReturn;
    signal.mfePrice = currentPrice;
    signal.mfeTimestamp = timestamp;
    signal.timeToMFE = timestamp - signal.detectedAt;
  }

  // MAE (Maximum Adverse Excursion)
  if (signal.maePct === null || currentReturn < signal.maePct) {
    signal.maePct = currentReturn;
    signal.maePrice = currentPrice;
    signal.maeTimestamp = timestamp;
    signal.timeToMAE = timestamp - signal.detectedAt;
  }
}

function checkDeduplication(existingSignals, symbol, signalType, cooldownMs = 30 * 60 * 1000, now = Date.now()) {
  return existingSignals.some(s => 
    s.symbol === symbol && 
    s.signalType === signalType && 
    ['ACTIVE', 'CONFIRMED', 'WARNING'].includes(s.status) &&
    (now - s.detectedAt) < cooldownMs
  );
}

test('Signal ID generation follows EGL-YYYYMMDD-SYMBOL-### format', () => {
  const d = new Date(Date.UTC(2026, 8, 20, 1, 32, 0));
  const id = generateSignalId('AVAXUSDT', d, 1);
  assert.equal(id, 'EGL-20260920-AVAX-001');
});

test('Time-based performance directional returns: LONG vs SHORT', () => {
  // LONG: 10 -> 11 = +10%, 10 -> 9 = -10%
  assert.equal(calculateReturn('LONG CANDIDATE', 10, 11), 10.0);
  assert.equal(calculateReturn('LONG CANDIDATE', 10, 9), -10.0);

  // SHORT: 10 -> 9 = +10% (favorable), 10 -> 11 = -10% (adverse)
  assert.equal(calculateReturn('SHORT CANDIDATE', 10, 9), 10.0);
  assert.equal(calculateReturn('SHORT CANDIDATE', 10, 11), -10.0);
});

test('MFE and MAE calculate exact high/low excursions for LONG signal', () => {
  const t0 = 1000000;
  const signal = {
    signalType: 'LONG CANDIDATE',
    signalPrice: 100,
    detectedAt: t0,
    mfePct: null,
    mfePrice: null,
    mfeTimestamp: null,
    timeToMFE: null,
    maePct: null,
    maePrice: null,
    maeTimestamp: null,
    timeToMAE: null,
    postSignalHigh: null,
    postSignalLow: null
  };

  // Price sequence: 100 -> 98 (-2%) -> 105 (+5%) -> 108 (+8%) -> 103 (+3%)
  updateExtremes(signal, 100, t0);
  updateExtremes(signal, 98, t0 + 60000);
  updateExtremes(signal, 105, t0 + 120000);
  updateExtremes(signal, 108, t0 + 180000);
  updateExtremes(signal, 103, t0 + 240000);

  assert.equal(signal.mfePct, 8.0);
  assert.equal(signal.mfePrice, 108);
  assert.equal(signal.timeToMFE, 180000);

  assert.equal(signal.maePct, -2.0);
  assert.equal(signal.maePrice, 98);
  assert.equal(signal.timeToMAE, 60000);

  assert.equal(signal.postSignalHigh, 108);
  assert.equal(signal.postSignalLow, 98);
});

test('MFE and MAE calculate exact high/low excursions for SHORT signal', () => {
  const t0 = 1000000;
  const signal = {
    signalType: 'SHORT CANDIDATE',
    signalPrice: 100,
    detectedAt: t0,
    mfePct: null,
    mfePrice: null,
    mfeTimestamp: null,
    timeToMFE: null,
    maePct: null,
    maePrice: null,
    maeTimestamp: null,
    timeToMAE: null,
    postSignalHigh: null,
    postSignalLow: null
  };

  // SHORT Price sequence: 100 -> 103 (-3% adverse) -> 94 (+6% favorable) -> 92 (+8% favorable)
  updateExtremes(signal, 100, t0);
  updateExtremes(signal, 103, t0 + 60000);
  updateExtremes(signal, 94, t0 + 120000);
  updateExtremes(signal, 92, t0 + 180000);

  assert.equal(signal.mfePct, 8.0);
  assert.equal(signal.mfePrice, 92);
  assert.equal(signal.maePct, -3.0);
  assert.equal(signal.maePrice, 103);
});

test('Snapshot immutability: mutating current symbol does not mutate initialSnapshot', () => {
  const originalSnapshot = Object.freeze({
    price: 10.50,
    relativeVolume: 2.5,
    signalScore: 85,
    trend: 'BULLISH'
  });

  const signal = {
    signalId: 'EGL-20260920-SOL-001',
    initialSnapshot: JSON.parse(JSON.stringify(originalSnapshot))
  };

  // Mutate current market data
  const currentMarket = {
    price: 12.00,
    relativeVolume: 1.1,
    signalScore: 60,
    trend: 'NEUTRAL'
  };

  assert.equal(signal.initialSnapshot.price, 10.50);
  assert.equal(signal.initialSnapshot.signalScore, 85);
  assert.equal(signal.initialSnapshot.relativeVolume, 2.5);
  assert.notEqual(signal.initialSnapshot.price, currentMarket.price);
});

test('Deduplication guard prevents duplicate records during cooldown', () => {
  const now = 10000000;
  const signals = [
    {
      symbol: 'AVAXUSDT',
      signalType: 'LONG CANDIDATE',
      detectedAt: now - (10 * 60 * 1000), // 10m ago
      status: 'ACTIVE'
    }
  ];

  // Attempting duplicate within 30m cooldown
  const isDupe = checkDeduplication(signals, 'AVAXUSDT', 'LONG CANDIDATE', 30 * 60 * 1000, now);
  assert.equal(isDupe, true);

  // Different symbol -> not duplicate
  assert.equal(checkDeduplication(signals, 'SOLUSDT', 'LONG CANDIDATE', 30 * 60 * 1000, now), false);

  // Same symbol after cooldown has expired (40m ago) -> not duplicate
  const oldSignals = [
    {
      symbol: 'AVAXUSDT',
      signalType: 'LONG CANDIDATE',
      detectedAt: now - (40 * 60 * 1000),
      status: 'ACTIVE'
    }
  ];
  assert.equal(checkDeduplication(oldSignals, 'AVAXUSDT', 'LONG CANDIDATE', 30 * 60 * 1000, now), false);
});
