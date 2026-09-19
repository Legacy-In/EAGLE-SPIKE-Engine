import test from 'node:test';
import assert from 'node:assert/strict';

// Normal CDF approximation
function normalCdf(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * y);
}

// Dynamic Stops & Targets
function calculateDynamicStopsAndTargets({ side, entryPrice, atr, structuralInvalidationPrice, atrMultiplier = 1.8 }) {
  const atrDistance = atr * atrMultiplier;
  const structuralDistance = Math.abs(entryPrice - structuralInvalidationPrice);
  const stopDistanceUsd = Math.max(atrDistance, structuralDistance, entryPrice * 0.008);

  let stopLossPrice, target1, target2, target3;
  if (side === 'LONG') {
    stopLossPrice = Number((entryPrice - stopDistanceUsd).toFixed(2));
    target1 = Number((entryPrice + stopDistanceUsd * 1.5).toFixed(2));
    target2 = Number((entryPrice + stopDistanceUsd * 2.5).toFixed(2));
    target3 = Number((entryPrice + stopDistanceUsd * 4.0).toFixed(2));
  } else {
    stopLossPrice = Number((entryPrice + stopDistanceUsd).toFixed(2));
    target1 = Number((entryPrice - stopDistanceUsd * 1.5).toFixed(2));
    target2 = Number((entryPrice - stopDistanceUsd * 2.5).toFixed(2));
    target3 = Number((entryPrice - stopDistanceUsd * 4.0).toFixed(2));
  }

  return { stopLossPrice, stopDistanceUsd, target1, target2, target3, riskRewardRatio: 1.5 };
}

// Position Sizing Math
function calculatePositionSize({ accountEquityUsd, entryPrice, stopLossPrice, riskPct = 0.5, maxLeverage = 3.0 }) {
  const riskCapital = accountEquityUsd * (riskPct / 100);
  const stopDistance = Math.abs(entryPrice - stopLossPrice);
  assert(stopDistance > 0, 'Stop distance must be positive');

  const baseUnits = riskCapital / stopDistance;
  const notional = baseUnits * entryPrice;
  const maxNotional = accountEquityUsd * maxLeverage;
  const cappedNotional = Math.min(notional, maxNotional);
  const finalUnits = Number((cappedNotional / entryPrice).toFixed(4));
  const effectiveLeverage = Number((cappedNotional / accountEquityUsd).toFixed(2));

  return { riskCapital, stopDistance, baseUnits, finalUnits, effectiveLeverage };
}

// Order Book Imbalance Calculation
function computeOrderBookImbalance(bidQty, askQty) {
  const total = bidQty + askQty;
  return total > 0 ? Number(((bidQty - askQty) / total).toFixed(3)) : 0;
}

// Cross-Source Price Anomaly Check
function checkCrossSourceSpread(p1, p2, p3) {
  const maxP = Math.max(p1, p2, p3);
  const minP = Math.min(p1, p2, p3);
  const devBps = ((maxP - minP) / p1) * 10000;
  return {
    deviationBps: Number(devBps.toFixed(1)),
    isAnomaly: devBps > 50,
  };
}

// Failsafe State Machine simulation
function simulateFailsafe({ isKillSwitch, isSafeMode, dailyLossPct, maxDailyLoss = 2.0 }) {
  if (isKillSwitch) return { tradingAllowed: false, reason: 'KILL_SWITCH_ACTIVE' };
  if (isSafeMode) return { tradingAllowed: false, reason: 'SAFE_MODE_ACTIVE' };
  if (dailyLossPct >= maxDailyLoss) return { tradingAllowed: false, reason: 'DAILY_LOSS_EXCEEDED' };
  return { tradingAllowed: true, reason: 'SYSTEM_NORMAL' };
}

test('Probability Distribution & Normal CDF', () => {
  assert(Math.abs(normalCdf(0) - 0.5) < 1e-6, 'normalCdf(0) must be ~0.5');
  assert(normalCdf(1.96) > 0.974 && normalCdf(1.96) < 0.976, 'Z=1.96 should be ~97.5%');
  assert(normalCdf(-1.96) > 0.024 && normalCdf(-1.96) < 0.026, 'Z=-1.96 should be ~2.5%');
});

test('Non-Arbitrary ATR and Structural Stop-Loss Calculation', () => {
  const entry = 79000;
  const atr = 1200;
  const structuralSupport = 77500; // 1,500 distance

  const res = calculateDynamicStopsAndTargets({
    side: 'LONG',
    entryPrice: entry,
    atr,
    structuralInvalidationPrice: structuralSupport,
    atrMultiplier: 1.8, // 2,160 distance
  });

  // ATR distance = 2160, structural = 1500 -> max is 2160
  assert.equal(res.stopDistanceUsd, 2160);
  assert.equal(res.stopLossPrice, 76840);
  assert.equal(res.target1, 79000 + 2160 * 1.5);
  assert.equal(res.target2, 79000 + 2160 * 2.5);
  assert.equal(res.target3, 79000 + 2160 * 4.0);
});

test('Position Sizing Engine with Leverage Bounds', () => {
  const equity = 100000;
  const entry = 80000;
  const stop = 78000; // $2,000 stop distance
  const res = calculatePositionSize({
    accountEquityUsd: equity,
    entryPrice: entry,
    stopLossPrice: stop,
    riskPct: 0.5, // $500 risk capital
    maxLeverage: 3.0,
  });

  // $500 / $2,000 = 0.25 BTC
  assert.equal(res.riskCapital, 500);
  assert.equal(res.stopDistance, 2000);
  assert.equal(res.finalUnits, 0.25);
  assert.equal(res.effectiveLeverage, 0.2); // 0.25 * $80,000 / $100,000 = 0.2x
});

test('Brier Score Reliability Calculation', () => {
  const forecasts = [0.7, 0.8, 0.6, 0.3];
  const outcomes = [1, 1, 0, 0];
  const brierScore = forecasts.reduce((acc, f, i) => acc + Math.pow(f - outcomes[i], 2), 0) / forecasts.length;

  assert(brierScore >= 0 && brierScore <= 1, 'Brier score must be between 0 and 1');
  assert.equal(Number(brierScore.toFixed(3)), 0.145);
});

test('Order Book Imbalance at Depth', () => {
  const imb1 = computeOrderBookImbalance(150, 50);
  assert.equal(imb1, 0.5); // (150-50)/200 = 0.50

  const imb2 = computeOrderBookImbalance(40, 160);
  assert.equal(imb2, -0.6); // (40-160)/200 = -0.60
});

test('Cross-Source Price Deviation and Anomaly Detection', () => {
  // Normal tight market (10 bps)
  const normal = checkCrossSourceSpread(79000, 79005, 78995);
  assert.equal(normal.isAnomaly, false);
  assert(normal.deviationBps < 15);

  // Extreme dislocation (60 bps spread)
  const dislocated = checkCrossSourceSpread(79000, 79500, 78950);
  assert.equal(dislocated.isAnomaly, true);
  assert(dislocated.deviationBps > 50);
});

test('Failsafe Circuit Breakers and Kill Switch', () => {
  // Normal conditions
  const normal = simulateFailsafe({ isKillSwitch: false, isSafeMode: false, dailyLossPct: 0.5 });
  assert.equal(normal.tradingAllowed, true);

  // Kill Switch engaged
  const killed = simulateFailsafe({ isKillSwitch: true, isSafeMode: false, dailyLossPct: 0.5 });
  assert.equal(killed.tradingAllowed, false);
  assert.equal(killed.reason, 'KILL_SWITCH_ACTIVE');

  // Daily loss limit breached (2.1% >= 2.0%)
  const breached = simulateFailsafe({ isKillSwitch: false, isSafeMode: false, dailyLossPct: 2.1 });
  assert.equal(breached.tradingAllowed, false);
  assert.equal(breached.reason, 'DAILY_LOSS_EXCEEDED');
});
