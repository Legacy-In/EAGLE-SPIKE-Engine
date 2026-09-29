import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeKaufmanPriceEfficiency,
  computeNormalizedOiAcceleration,
  computeVciAndPercentile,
  computeFundingZScoreAndPercentile,
  computeLiquidityQuality,
  calculateDeterministicBasePrice,
  calculateAtr,
  calculateBbWidth,
} from '../backend/services/feature-calculator.mjs';

import {
  evaluateMultiFactorAbsorption,
  evaluateRelativeSpoofRisk,
  OrderbookWallTracker,
} from '../backend/services/orderbook-absorption.mjs';

import {
  calculatePrepScore,
  calculateConfirmationScore,
  evaluateChaseRisk,
  classifyMarketStatus,
} from '../backend/services/dual-score-engine.mjs';

import {
  recordPrepAudit,
  updateAuditExcursions,
  recordAuditConfirmation,
  computeAggregateAuditMetrics,
  AuditMemoryStore,
} from '../backend/services/prep-audit-service.mjs';

describe('Pre-Breakout & Accumulation Detection Model Test Suite', () => {
  // Test 1: Kaufman Price Efficiency Mathematical Bounds
  test('1. Kaufman Price Efficiency: bounded between 0 and 1, distinguishes chop from trend', () => {
    // Pure linear trending candles (efficiency should be close to 1.0)
    const trendCandles = [
      [1000, 100, 102, 100, 101, 1000],
      [2000, 101, 103, 101, 102, 1000],
      [3000, 102, 104, 102, 103, 1000],
      [4000, 103, 105, 103, 104, 1000],
      [5000, 104, 106, 104, 105, 1000],
    ];
    const trendEff = computeKaufmanPriceEfficiency(trendCandles, 5);
    assert.strictEqual(trendEff, 1.0, 'Pure directional move must have efficiency 1.0');

    // Choppy oscillating candles (efficiency should be low < 0.3)
    const chopCandles = [
      [1000, 100, 102, 99, 100, 1000],
      [2000, 100, 102, 99, 102, 1000],
      [3000, 102, 103, 99, 100, 1000],
      [4000, 100, 102, 99, 102, 1000],
      [5000, 102, 103, 99, 100.5, 1000],
    ];
    const chopEff = computeKaufmanPriceEfficiency(chopCandles, 5);
    assert.ok(chopEff < 0.3, `Choppy consolidation efficiency should be low, got ${chopEff}`);
    assert.ok(chopEff >= 0.0 && chopEff <= 1.0, 'Efficiency must be bounded in [0, 1]');
  });

  // Test 2: Time-Normalized Open Interest Acceleration
  test('2. Time-Normalized OI Acceleration: 5m and 15m normalized to uniform 1-minute time unit', () => {
    // 5m delta = +10,000 contracts (rate = 2,000/min)
    // 15m delta = +15,000 contracts (rate = 1,000/min)
    // Baseline = 1,000,000 contracts
    const res = computeNormalizedOiAcceleration(10000, 15000, 1000000);
    assert.strictEqual(res.oiRate5m, 2000, '5m rate must be 10,000 / 5 = 2000');
    assert.strictEqual(res.oiRate15m, 1000, '15m rate must be 15,000 / 15 = 1000');
    assert.strictEqual(res.oiAcceleration, 0.001, 'Acceleration must be (2000 - 1000) / 1,000,000 = 0.001');
    assert.strictEqual(res.oiAccelerationPct, 0.1, 'Acceleration % must be 0.1%');
  });

  // Test 3: Mandatory Liquidity-Quality Gate Filter
  test('3. Mandatory Liquidity-Quality Gate: rejects illiquid tokens and wide spreads', () => {
    const config = { minTurnoverUsd: 2000000, maxSpreadBps: 15, minDepth05Usd: 25000, maxImpactPct: 0.2 };

    // Case A: Low turnover
    const lowTurnover = { turnover24h: 800000, lastPrice: 10 };
    const gateA = computeLiquidityQuality(lowTurnover, null, config);
    assert.strictEqual(gateA.passesGate, false);
    assert.ok(gateA.rejectionReason?.includes('TURNOVER_BELOW_THRESHOLD'));

    // Case B: High turnover but wide spread
    const wideSpreadOb = {
      bids: [['10.00', '5000']],
      asks: [['10.05', '5000']], // 50 bps spread
    };
    const gateB = computeLiquidityQuality({ turnover24h: 5000000 }, wideSpreadOb, config);
    assert.strictEqual(gateB.passesGate, false);
    assert.ok(gateB.rejectionReason?.includes('SPREAD_EXCEEDS_MAX'));

    // Case C: High turnover, tight spread, deep orderbook
    const healthyOb = {
      bids: [['100.00', '500'], ['99.90', '500'], ['99.60', '500']], // > $100k depth
      asks: [['100.02', '500'], ['100.10', '500'], ['100.40', '500']], // 2 bps spread
    };
    const gateC = computeLiquidityQuality({ turnover24h: 10000000 }, healthyOb, config);
    assert.strictEqual(gateC.passesGate, true);
    assert.strictEqual(gateC.rejectionReason, null);
    assert.ok(gateC.metrics.spreadBps <= 5);
  });

  // Test 4: Deterministic Base Price Versioning
  test('4. Base Price Calculation: deterministic and versioned (base_price_v1)', () => {
    const sampleCandles = [
      [1000, 50, 52, 49, 51, 100],
      [2000, 51, 53, 50, 52, 200],
      [3000, 52, 54, 51, 53, 300],
    ];
    const baseA = calculateDeterministicBasePrice(sampleCandles, 3);
    const baseB = calculateDeterministicBasePrice(sampleCandles, 3);

    assert.strictEqual(baseA.basePrice, baseB.basePrice, 'Must be completely deterministic');
    assert.strictEqual(baseA.basePriceVersion, 'base_price_v1');
    assert.ok(baseA.basePrice > 50 && baseA.basePrice < 54);
  });

  // Test 5: Multi-Factor Absorption & Iceberg Likelihood Naming
  test('5. Multi-Factor Absorption: evaluates aggressive sell flow and assigns iceberg likelihood', () => {
    const absorptionResult = evaluateMultiFactorAbsorption({
      aggressiveSellVolumeUsdt: 600000, // Large aggressive sell flow
      executedBidLiquidityUsdt: 500000, // Large executed limit bids
      priceDropPct: -0.05,              // Barely any price drop (-0.05%)
      atrPct: 0.8,                      // ATR is 0.8%
      replenishCount: 4,                // Replenished 4 times
    });

    assert.ok(absorptionResult.absorptionScore >= 20, `Absorption score should be high, got ${absorptionResult.absorptionScore}`);
    assert.strictEqual(absorptionResult.isPassiveAbsorption, true);
    assert.strictEqual(absorptionResult.icebergLikelihood, 'HIGH');
    assert.strictEqual(absorptionResult.replenishmentBehavior, 'ACTIVE_PERSISTENT');
    // Ensure it is never labeled as confirmed iceberg accumulation
    assert.ok(!JSON.stringify(absorptionResult).includes('iceberg accumulation'));
  });

  // Test 6: Relative Depth Spoof Detection
  test('6. Relative Depth Spoof Detection: flags phantom walls pulled <30s without fill', () => {
    const wall = {
      symbol: 'BTCUSDT',
      side: 'BID',
      price: 65000,
      initialSizeUsdt: 300000,
      peakSizeUsdt: 300000,
      relativeShare: 0.40, // 40% of top 10 depth
      firstSeenAt: 10000,
      lastSeenAt: 25000,   // lived 15s
    };

    const spoofEval = evaluateRelativeSpoofRisk(wall, 65020, 10000, 32000);
    assert.strictEqual(spoofEval.isSpoofRisk, true);
    assert.ok(spoofEval.reason?.includes('PHANTOM_WALL_PULLED'));
    assert.ok(spoofEval.fillRatioPct < 10);
  });

  // Test 7: Independent Chase Risk Overlay
  test('7. Chase Risk Overlay: functions as independent risk shield without altering market status', () => {
    // A high-conviction breakout candidate
    const prepScore = 80;
    const confirmationScore = 85;
    const status = classifyMarketStatus(prepScore, confirmationScore);
    assert.strictEqual(status, 'CONFIRMED', 'High confirmation score must classify as CONFIRMED');

    // Case A: Near consolidation base -> LOW chase risk
    const chaseLow = evaluateChaseRisk({
      currentPrice: 101,
      basePrice: 100,
      atr15m: 2.0, // 0.5x ATR
      fundingZScore: 0.2,
      liquidationPercentile: 40,
    });
    assert.strictEqual(chaseLow.level, 'LOW');
    assert.strictEqual(chaseLow.isBlocked, false);

    // Case B: Price extended > 2.0x ATR above base -> HIGH chase risk blocks entry
    const chaseHigh = evaluateChaseRisk({
      currentPrice: 106,
      basePrice: 100,
      atr15m: 2.0, // (106 - 100) / 2.0 = 3.0x ATR extension
      fundingZScore: 2.5,
      liquidationPercentile: 96,
    });
    assert.strictEqual(chaseHigh.level, 'HIGH');
    assert.strictEqual(chaseHigh.isBlocked, true);
    assert.ok(chaseHigh.reasons.length >= 2);

    // Verify market status remains CONFIRMED (status is not mutated to CHASE_RISK)
    assert.strictEqual(status, 'CONFIRMED');
  });

  // Test 8: False Breakout Tracking & Time to Confirm
  test('8. Quantitative Audit Ledger: tracks time-to-confirm and false breakouts', async () => {
    // Reset audit memory for clean test
    AuditMemoryStore.records.clear();
    AuditMemoryStore.isInitialized = true;

    const candidate = {
      id: 'AUD-TEST-FALSE-BREAKOUT-01',
      symbol: 'SOLUSDT',
      exchange: 'BYBIT',
      price: 150,
      basePrice: 148,
      atr15m: 2.0,
      marketStatus: 'PREP',
      prepScore: 78,
      confirmationScore: 40,
    };

    // 1. Record PREP candidate
    await recordPrepAudit(candidate);
    const initialRecord = AuditMemoryStore.records.get(candidate.id);
    assert.ok(initialRecord, 'Audit record must be saved');
    assert.strictEqual(initialRecord.entry_market_status, 'PREP');
    assert.strictEqual(initialRecord.did_breakout, false);

    // 2. Trigger Confirmation 5 minutes later
    const confirmTime = Date.now() + 300000;
    recordAuditConfirmation('SOLUSDT', 82, confirmTime);
    const confirmedRecord = AuditMemoryStore.records.get(candidate.id);
    assert.strictEqual(confirmedRecord.did_breakout, true);
    assert.strictEqual(confirmedRecord.current_market_status, 'CONFIRMED');
    assert.strictEqual(confirmedRecord.time_to_confirm_min, 5.0);

    // 3. Price reverses and breaches initial stop loss ($145) without reaching +1R ($151)
    updateAuditExcursions('SOLUSDT', 144, confirmTime + 60000);
    const stoppedRecord = AuditMemoryStore.records.get(candidate.id);
    assert.strictEqual(stoppedRecord.stopped_out, true);
    assert.strictEqual(stoppedRecord.is_false_breakout, true);
    assert.strictEqual(stoppedRecord.status, 'STOPPED_OUT');

    // 4. Compute aggregate conversion metrics
    const agg = computeAggregateAuditMetrics();
    assert.strictEqual(agg.totalAudits, 1);
    assert.strictEqual(agg.prepToBreakoutRatePct, 100);
    assert.strictEqual(agg.falseBreakoutRatePct, 100);
    assert.strictEqual(agg.avgTimeToConfirmMin, 5.0);
  });
});
