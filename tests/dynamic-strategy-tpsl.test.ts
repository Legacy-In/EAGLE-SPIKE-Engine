import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectStrategies,
  resolveStrategyPriority,
  calculateEntryQualityAndChaseRisk,
  calculateDynamicTpSl,
  roundToTick,
} from '../backend/engine/strategy-combination-engine.mjs';
import { TPSL_CONFIG } from '../backend/config/tp-sl.mjs';
import { formatEagleFlashTelegramAlert } from '../backend/services/telegram-outbox.mjs';

describe('🦅 EAGLE FLASH — Strategy Combination → Dynamic TP/SL Engine Test Suite', () => {

  // 1. Example Test from Specification (Section 33)
  test('1. Specification Example: LONG and SHORT with Entry=100, R=3, Strategy=BREAKOUT', () => {
    // A. LONG: Entry 100, SL 97, R 3 -> TP1: 103, TP2: 106, TP3: 109
    const longRes = calculateDynamicTpSl({
      entryPrice: 100,
      direction: 'LONG',
      atr: 2.0, // 2.0 * 1.5 = 3.0 stop distance -> SL = 97
      primaryStrategy: 'BREAKOUT',
      tickSize: 0.01,
    });

    assert.equal(longRes.entryPrice, 100);
    assert.equal(longRes.stopLossPrice, 97);
    assert.equal(longRes.riskR, 3);
    assert.equal(longRes.tp1Price, 103);
    assert.equal(longRes.tp2Price, 106);
    assert.equal(longRes.tp3Price, 109);

    // B. SHORT: Entry 100, SL 103, R 3 -> TP1: 97, TP2: 94, TP3: 91
    const shortRes = calculateDynamicTpSl({
      entryPrice: 100,
      direction: 'SHORT',
      atr: 2.0, // 2.0 * 1.5 = 3.0 stop distance -> SL = 103
      primaryStrategy: 'BREAKOUT',
      tickSize: 0.01,
    });

    assert.equal(shortRes.entryPrice, 100);
    assert.equal(shortRes.stopLossPrice, 103);
    assert.equal(shortRes.riskR, 3);
    assert.equal(shortRes.tp1Price, 97);
    assert.equal(shortRes.tp2Price, 94);
    assert.equal(shortRes.tp3Price, 91);
  });

  // 2. Critical Property Invariants
  test('2. Critical Property Invariants: LONG and SHORT strict monotonicity and R > 0', () => {
    const long = calculateDynamicTpSl({
      entryPrice: 85200.5,
      direction: 'LONG',
      atr: 1420.0,
      primaryStrategy: 'EARLY_IGNITION',
      tickSize: 0.1,
    });

    // Invariant: SL < ENTRY < TP1 < TP2 < TP3
    assert.ok(long.stopLossPrice < long.entryPrice, 'LONG SL < ENTRY');
    assert.ok(long.entryPrice < long.tp1Price, 'LONG ENTRY < TP1');
    assert.ok(long.tp1Price < long.tp2Price, 'LONG TP1 < TP2');
    assert.ok(long.tp2Price < long.tp3Price, 'LONG TP2 < TP3');
    assert.ok(long.riskR > 0, 'Risk unit R must be > 0');

    const short = calculateDynamicTpSl({
      entryPrice: 85200.5,
      direction: 'SHORT',
      atr: 1420.0,
      primaryStrategy: 'QUICK_PUMP',
      tickSize: 0.1,
    });

    // Invariant: TP3 < TP2 < TP1 < ENTRY < SL
    assert.ok(short.tp3Price < short.tp2Price, 'SHORT TP3 < TP2');
    assert.ok(short.tp2Price < short.tp1Price, 'SHORT TP2 < TP1');
    assert.ok(short.tp1Price < short.entryPrice, 'SHORT TP1 < ENTRY');
    assert.ok(short.entryPrice < short.stopLossPrice, 'SHORT ENTRY < SL');
    assert.ok(short.riskR > 0, 'Risk unit R must be > 0');
  });

  // 3. Stop-Loss Clamping Bounds [2.0%, 3.5%]
  test('3. Safety Clamps: Stop loss distance is bounded within [2.0%, 3.5%]', () => {
    const entry = 200.0;

    // A. Excessively small ATR (0.5% raw distance) clamped to 2.0%
    const lowVol = calculateDynamicTpSl({
      entryPrice: entry,
      direction: 'LONG',
      atr: 0.5, // 0.5 * 1.5 = 0.75 (0.375% of 200) -> clamp to 2.0% (4.0 distance)
      tickSize: 0.01,
    });
    assert.equal(lowVol.stopLossPct, 2.0);
    assert.equal(lowVol.stopLossPrice, 196.0);

    // B. Excessively large ATR (6.0% raw distance) clamped to 3.5%
    const highVol = calculateDynamicTpSl({
      entryPrice: entry,
      direction: 'LONG',
      atr: 8.0, // 8.0 * 1.5 = 12.0 (6% of 200) -> clamp to 3.5% (7.0 distance)
      tickSize: 0.01,
    });
    assert.equal(highVol.stopLossPct, 3.5);
    assert.equal(highVol.stopLossPrice, 193.0);
  });

  // 4. Structure-Based Stop Protection (Swing High / Swing Low)
  test('4. Structural Protection: Swing Low/High defines protective stop when within bounds', () => {
    const entry = 100.0;

    // Swing low at 97.5 (2.5% below entry) with 20 bps buffer -> 97.5 * 0.998 = 97.305 -> 97.31 rounded
    const res = calculateDynamicTpSl({
      entryPrice: entry,
      direction: 'LONG',
      atr: 1.0, // ATR stop would be 1.5 (1.5%) -> clamped to 2.0% (98.0)
      recentSwingLow: 97.5, // Structural stop is deeper: 97.5 * 0.998 = 97.305 (2.695% stop)
      tickSize: 0.01,
    });

    assert.equal(res.stopLossPrice, 97.31, 'Structural stop overrides ATR when providing superior invalidation');
    assert.ok(res.stopLossPct >= 2.0 && res.stopLossPct <= 3.5, 'Must remain inside safe clamp boundaries');
  });

  // 5. Strategy-Specific Profiles
  test('5. Strategy-Specific TP Multipliers: Early Ignition, Quick Pump, Accumulation, Exhaustion', () => {
    const entry = 100.0;
    const atr = 1.666667; // 2.5% stop -> R = 2.50

    // A. EARLY_IGNITION (1R / 2R / 3R)
    const early = calculateDynamicTpSl({ entryPrice: entry, direction: 'LONG', atr, primaryStrategy: 'EARLY_IGNITION', tickSize: 0.01 });
    assert.equal(early.tp1R, 1.0);
    assert.equal(early.tp2R, 2.0);
    assert.equal(early.tp3R, 3.0);
    assert.equal(early.tp1Price, 102.50);
    assert.equal(early.tp2Price, 105.00);
    assert.equal(early.tp3Price, 107.50);

    // B. QUICK_PUMP (0.8R / 1.6R / 2.5R)
    const quick = calculateDynamicTpSl({ entryPrice: entry, direction: 'LONG', atr, primaryStrategy: 'QUICK_PUMP', tickSize: 0.01 });
    assert.equal(quick.tp1R, 0.8);
    assert.equal(quick.tp2R, 1.6);
    assert.equal(quick.tp3R, 2.5);
    assert.equal(quick.tp1Price, 102.00);
    assert.equal(quick.tp2Price, 104.00);
    assert.equal(quick.tp3Price, 106.25);

    // C. ACCUMULATION (1.5R / 2.5R / 4.0R)
    const accum = calculateDynamicTpSl({ entryPrice: entry, direction: 'LONG', atr, primaryStrategy: 'ACCUMULATION', tickSize: 0.01 });
    assert.equal(accum.tp1R, 1.5);
    assert.equal(accum.tp2R, 2.5);
    assert.equal(accum.tp3R, 4.0);
    assert.equal(accum.tp1Price, 103.75);
    assert.equal(accum.tp2Price, 106.25);
    assert.equal(accum.tp3Price, 110.00);

    // D. EXHAUSTION (0.5R / 1.0R / 1.5R)
    const exhaust = calculateDynamicTpSl({ entryPrice: entry, direction: 'LONG', atr, primaryStrategy: 'EXHAUSTION', tickSize: 0.01 });
    assert.equal(exhaust.tp1R, 0.5);
    assert.equal(exhaust.tp2R, 1.0);
    assert.equal(exhaust.tp3R, 1.5);
    assert.equal(exhaust.tp1Price, 101.25);
    assert.equal(exhaust.tp2Price, 102.50);
    assert.equal(exhaust.tp3Price, 103.75);
  });

  // 6. Multi-Strategy Combination and Deterministic Priority
  test('6. Strategy Combination Engine: Deterministic Priority & Confluence Bonus', () => {
    // DASHUSDT example from prompt: Price +11.9%, OI +14.8%, RVOL 2.5x, Taker Buy +25%
    const candidate = {
      symbol: 'DASHUSDT',
      returns5m: 3.2,
      returns15m: 11.9,
      rvol: 2.8,
      volumeZ: 2.9,
      oiChangePct: 14.8,
      takerFlow: 35.0,
      price24hChange: 15.0,
      isNear24hHigh: true,
    };

    const detected = detectStrategies({}, candidate);
    assert.ok(detected.includes('QUICK_PUMP'), 'Detects QUICK_PUMP');
    assert.ok(detected.includes('BREAKOUT'), 'Detects BREAKOUT');
    assert.ok(detected.includes('LEVERAGE_EXPANSION'), 'Detects LEVERAGE_EXPANSION');
    assert.ok(detected.includes('VOLUME_EXPLOSION'), 'Detects VOLUME_EXPLOSION');

    const priority = resolveStrategyPriority(detected);
    // In priority ranking, BREAKOUT ranks above QUICK_PUMP
    assert.equal(priority.primaryStrategy, 'BREAKOUT');
    assert.ok(priority.secondaryStrategies.includes('QUICK_PUMP'));
    assert.ok(priority.secondaryStrategies.includes('LEVERAGE_EXPANSION'));

    // Dynamic TP/SL with secondary combination bonus
    const dynamic = calculateDynamicTpSl({
      entryPrice: 70.574,
      direction: 'LONG',
      atr: 1.183,
      primaryStrategy: priority.primaryStrategy,
      secondaryStrategies: priority.secondaryStrategies,
      tickSize: 0.001,
    });

    // Confluence bonus extends TP3
    assert.ok(dynamic.tp3R >= 3.0, 'Confluence bonus applied to TP3');
    assert.ok(dynamic.strategyCombination.length >= 3);
  });

  // 7. Entry Quality and Chase Risk Decoupling
  test('7. Decoupled Metrics: High Eagle Score does not prevent POOR Entry Quality or HIGH Chase Risk', () => {
    const candidate = {
      entryPrice: 100.0,
      returns5m: 6.8, // Massive 5m run -> High chase risk!
      returns15m: 14.0,
      breakoutPrice: 92.0, // 8.0 away from breakout
      atr: 2.0, // distance = 8.0 = 4.0 ATR -> POOR quality!
      eagleScore: 92, // High conviction anomaly!
    };

    const { entryQuality, chaseRisk } = calculateEntryQualityAndChaseRisk(candidate);
    assert.ok(chaseRisk === 'HIGH' || chaseRisk === 'EXTREME', 'Rapid 6.8% 5M move must be flagged as elevated chase risk');
    assert.equal(entryQuality, 'POOR', 'Entry 4.0 ATR away from breakout must be evaluated as POOR');
  });

  // 8. Dynamic Tick Size Precision Rounding
  test('8. Exchange Tick Size Precision: BTC (0.1) vs Low-Price Altcoins (0.000001)', () => {
    // BTC: Entry $83,553.20 with 0.1 tick
    const btc = calculateDynamicTpSl({
      entryPrice: 83553.20,
      direction: 'LONG',
      atr: 1200.0,
      tickSize: 0.1,
    });
    assert.equal(btc.stopLossPrice, roundToTick(btc.stopLossPrice, 0.1));
    assert.equal(btc.tp1Price, roundToTick(btc.tp1Price, 0.1));
    assert.equal(btc.riskR, roundToTick(btc.riskR, 0.1));

    // Low-price coin: Entry $0.0004523 with 0.0000001 tick
    const meme = calculateDynamicTpSl({
      entryPrice: 0.0004523,
      direction: 'LONG',
      atr: 0.0000150,
      tickSize: 0.0000001,
    });
    assert.equal(meme.stopLossPrice, roundToTick(meme.stopLossPrice, 0.0000001));
    assert.equal(meme.tp1Price, roundToTick(meme.tp1Price, 0.0000001));
    assert.equal(meme.riskR, roundToTick(meme.riskR, 0.0000001));
  });

  // 9. Telegram Alert Output Parity
  test('9. Telegram Parity: Telegram alert formatter displays exact canonical values, R, quality, and combination', () => {
    const mockItem = {
      signal_id: 'EGL-20260927-BYBIT-DASHUSDT-1234',
      payload: {
        signal_id: 'EGL-20260927-BYBIT-DASHUSDT-1234',
        symbol: 'DASHUSDT',
        exchange: 'BYBIT',
        direction: 'LONG',
        entry_price: 70.574,
        stop_price: 68.800,
        target_1_price: 72.340,
        target_2_price: 74.110,
        target_3_price: 75.880,
        risk_r: 1.774,
        eagle_score: 92,
        entry_quality: 'GOOD',
        chase_risk: 'MEDIUM',
        primary_strategy: 'QUICK_PUMP',
        strategy_combination: ['QUICK_PUMP', 'LEVERAGE_EXPANSION', 'BREAKOUT'],
        rvol: 2.8,
        oi_change_pct: 14.8,
        funding_rate: 0.0001,
      }
    };

    const text = formatEagleFlashTelegramAlert(mockItem);

    assert.ok(text.includes('QUICK_PUMP + LEVERAGE_EXPANSION + BREAKOUT'), 'Contains full strategy combination');
    assert.ok(text.includes('1R = $1.774'), 'Contains exact 1R risk unit');
    assert.ok(text.includes('<b>ENTRY</b>\n$70.574'), 'Contains entry price');
    assert.ok(text.includes('<b>STOP LOSS</b>\n$68.800'), 'Contains stop loss');
    assert.ok(text.includes('<b>TP1</b>\n$72.340'), 'Contains TP1');
    assert.ok(text.includes('<b>TP2</b>\n$74.110'), 'Contains TP2');
    assert.ok(text.includes('<b>TP3</b>\n$75.880'), 'Contains TP3');
    assert.ok(text.includes('<b>Entry Quality:</b> GOOD'), 'Contains Entry Quality');
    assert.ok(text.includes('<b>Chase Risk:</b> MEDIUM'), 'Contains Chase Risk');
  });

});
