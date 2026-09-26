/**
 * 🦅 EAGLE FLASH — Strategy Combination & Dynamic TP/SL Engine
 * Production Institutional Module:
 * - Detects 12 Strategy Archetypes from quantitative market microstructure
 * - Resolves deterministic priority (primary + secondary combinations)
 * - Evaluates Entry Quality & Chase Risk independently from Eagle Score
 * - Calculates ATR + Structural Stop Loss clamped to [2.0%, 3.5%]
 * - Derives Risk Unit R = |ENTRY - SL| > 0
 * - Generates Dynamic TP1, TP2, TP3 from R * strategy multiplier + confluence adjustment
 * - Rounds all levels to exact contract tick size
 * - Guarantees strict property invariants (SL < ENTRY < TP1 < TP2 < TP3 for LONG, reversed for SHORT)
 */

import { TPSL_CONFIG } from '../config/tp-sl.mjs';

/**
 * Rounds a price value to the exact exchange tick size.
 * Handles micro-prices (e.g. PEPE $0.000004439 with tick 0.00000001) and macro-prices (BTC $85000 with tick 0.1).
 */
export function roundToTick(price, tickSize = 0.01) {
  const num = parseFloat(price);
  if (isNaN(num)) return 0;
  if (!tickSize || tickSize <= 0) return num;

  const decimals = Math.max(0, -Math.floor(Math.log10(tickSize)));
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(num / tickSize) * tickSize;
  return parseFloat(rounded.toFixed(decimals));
}

/**
 * Evaluates all 12 strategy conditions against quantitative market data.
 * Returns an array of all detected strategy categories.
 */
export function detectStrategies(marketData = {}, candidate = {}) {
  const p5m = parseFloat(candidate.returns5m ?? candidate.priceChange5m ?? 0);
  const p15m = parseFloat(candidate.returns15m ?? candidate.priceChange15m ?? (p5m * 1.6));
  const p24h = parseFloat(candidate.price24hChange ?? candidate.priceChange24h ?? 0);
  const rvol = parseFloat(candidate.rvol ?? candidate.relativeVolume ?? 1.0);
  const volZ = parseFloat(candidate.volumeZScore ?? candidate.volumeZ ?? 0);
  const oiDelta = parseFloat(candidate.oiChangePct ?? candidate.oiDelta ?? 0);
  const funding = parseFloat(candidate.fundingRate ?? 0.0001);
  const takerImbalance = parseFloat(candidate.takerFlow ?? candidate.takerImbalance ?? 0);
  const rsi = parseFloat(candidate.rsi ?? 50);
  const isNearHigh = Boolean(candidate.isNear24hHigh || (p24h >= 6.0));
  const isNearLow = Boolean(candidate.isNear24hLow || (p24h <= -6.0));
  const isRetest = Boolean(candidate.isRetest || candidate.spikeType === 'BREAKOUT_RETEST');

  const detected = new Set();

  // 1. EXHAUSTION
  // Extreme price extension with RSI extreme, or price extension with stalling/negative OI (blow-off)
  if (
    ((rsi >= 82 || rsi <= 18 || Math.abs(funding) >= 0.001) && rvol >= 2.0) ||
    (Math.abs(p15m) >= 8.0 && oiDelta <= 0.5 && rvol >= 2.2)
  ) {
    detected.add('EXHAUSTION');
  }

  // 2. REVERSAL_WATCH
  // Counter-trend impulse after heavy 24h trend
  if ((p24h <= -5.0 && p5m >= 1.5) || (p24h >= 5.0 && p5m <= -1.5)) {
    detected.add('REVERSAL_WATCH');
  }

  // 3. SHORT_SQUEEZE
  // Price surging up + OI contracting/short liquidations + negative or neutral funding
  if (p5m >= 1.5 && (oiDelta <= -1.5 || funding < -0.0002) && rvol >= 1.8) {
    detected.add('SHORT_SQUEEZE');
  }

  // 4. LONG_SQUEEZE
  // Price falling + OI contracting + positive elevated funding
  if (p5m <= -1.5 && (oiDelta <= -1.5 || funding > 0.0006) && rvol >= 1.8) {
    detected.add('LONG_SQUEEZE');
  }

  // 5. BREAKOUT_RETEST
  if (isRetest || (candidate.spikePhase === 'RETEST')) {
    detected.add('BREAKOUT_RETEST');
  }

  // 6. BREAKOUT
  // Price pushing near 24h high/low with strong volume and OI expansion
  if ((isNearHigh || isNearLow || Math.abs(p24h) >= 5.0) && rvol >= 1.8 && oiDelta >= 0.8) {
    detected.add('BREAKOUT');
  }

  // 7. QUICK_PUMP
  // Rapid 5M velocity, RVOL spike, and aggressive taker flow
  if (Math.abs(p5m) >= 1.8 && rvol >= 2.0 && Math.abs(takerImbalance) >= 15) {
    detected.add('QUICK_PUMP');
  }

  // 8. EARLY_IGNITION
  // Price momentum initiating, OI growing, volume building
  if (Math.abs(p5m) >= 0.8 && oiDelta >= 1.5 && rvol >= 1.4) {
    detected.add('EARLY_IGNITION');
  }

  // 9. ACCUMULATION
  // High volume and OI expansion during tight price compression
  if (rvol >= 1.8 && Math.abs(p5m) < 0.8 && oiDelta >= 2.0) {
    detected.add('ACCUMULATION');
  }

  // 10. LEVERAGE_EXPANSION
  // Strong open interest buildup with directional bias
  if (oiDelta >= 3.0 || (Math.abs(p5m) >= 1.0 && oiDelta >= 2.0)) {
    detected.add('LEVERAGE_EXPANSION');
  }

  // 11. VOLUME_EXPLOSION
  // Statistical volume anomaly (Z-Score >= 2.5 + RVOL >= 2.5)
  if (rvol >= 2.5 && volZ >= 2.5) {
    detected.add('VOLUME_EXPLOSION');
  }

  // 12. OI_DIVERGENCE
  // Price pushing but OI diverging or falling without squeeze profile
  if ((Math.abs(p5m) >= 1.5 && oiDelta <= -2.0) && !detected.has('SHORT_SQUEEZE') && !detected.has('LONG_SQUEEZE')) {
    detected.add('OI_DIVERGENCE');
  }

  // If candidate has an explicit spikeType from upstream scanner, honour it
  if (candidate.spikeType && TPSL_CONFIG.strategyProfiles[candidate.spikeType]) {
    detected.add(candidate.spikeType);
  }

  // Fallback default if market conditions triggered a signal
  if (detected.size === 0) {
    if (Math.abs(p5m) >= 1.5) detected.add('QUICK_PUMP');
    else if (oiDelta >= 1.5) detected.add('LEVERAGE_EXPANSION');
    else detected.add('EARLY_IGNITION');
  }

  return Array.from(detected);
}

/**
 * Resolves deterministic primary and secondary strategies using the priority hierarchy.
 */
export function resolveStrategyPriority(detectedStrategies = []) {
  if (!detectedStrategies || detectedStrategies.length === 0) {
    return {
      primaryStrategy: 'EARLY_IGNITION',
      secondaryStrategies: [],
      strategyCombination: ['EARLY_IGNITION'],
    };
  }

  // Sort by priority index in TPSL_CONFIG.strategyPriority
  const sorted = [...detectedStrategies].sort((a, b) => {
    const idxA = TPSL_CONFIG.strategyPriority.indexOf(a);
    const idxB = TPSL_CONFIG.strategyPriority.indexOf(b);
    return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
  });

  const primaryStrategy = sorted[0];
  const secondaryStrategies = sorted.slice(1);
  const strategyCombination = [primaryStrategy, ...secondaryStrategies];

  return {
    primaryStrategy,
    secondaryStrategies,
    strategyCombination,
  };
}

/**
 * Evaluates Entry Quality and Chase Risk independently from Eagle Score.
 */
export function calculateEntryQualityAndChaseRisk({
  entryPrice,
  atr,
  returns5m = 0,
  returns15m = 0,
  breakoutPrice = null,
  primaryStrategy = 'BREAKOUT',
}) {
  const abs5m = Math.abs(returns5m);
  const abs15m = Math.abs(returns15m);

  // 1. Chase Risk Evaluation
  let chaseRisk = 'LOW';
  if (abs5m >= TPSL_CONFIG.chaseRiskThresholds.highMaxPriceRunPct || abs15m >= 10.0) {
    chaseRisk = 'EXTREME';
  } else if (abs5m >= TPSL_CONFIG.chaseRiskThresholds.mediumMaxPriceRunPct || abs15m >= 6.5) {
    chaseRisk = 'HIGH';
  } else if (abs5m >= TPSL_CONFIG.chaseRiskThresholds.lowMaxPriceRunPct || abs15m >= 3.5) {
    chaseRisk = 'MEDIUM';
  } else {
    chaseRisk = 'LOW';
  }

  // 2. Entry Quality Evaluation
  // Evaluated by distance from breakout level relative to ATR
  let entryQuality = 'GOOD';
  if (atr && atr > 0 && breakoutPrice && breakoutPrice > 0) {
    const distFromBreakout = Math.abs(entryPrice - breakoutPrice);
    const atrRatio = distFromBreakout / atr;
    if (atrRatio <= TPSL_CONFIG.qualityThresholds.excellentMaxAtrDist) {
      entryQuality = 'EXCELLENT';
    } else if (atrRatio <= TPSL_CONFIG.qualityThresholds.goodMaxAtrDist) {
      entryQuality = 'GOOD';
    } else if (atrRatio <= TPSL_CONFIG.qualityThresholds.fairMaxAtrDist) {
      entryQuality = 'FAIR';
    } else {
      entryQuality = 'POOR';
    }
  } else {
    // Structural proxy when breakoutPrice is not recorded
    if (primaryStrategy === 'BREAKOUT_RETEST' || primaryStrategy === 'ACCUMULATION') {
      entryQuality = 'EXCELLENT';
    } else if (chaseRisk === 'EXTREME') {
      entryQuality = 'POOR';
    } else if (chaseRisk === 'HIGH') {
      entryQuality = 'FAIR';
    } else if (chaseRisk === 'LOW') {
      entryQuality = 'EXCELLENT';
    } else {
      entryQuality = 'GOOD';
    }
  }

  // Exhaustion signals inherently have poor entry quality and elevated chase risk
  if (primaryStrategy === 'EXHAUSTION') {
    entryQuality = 'POOR';
    if (chaseRisk === 'LOW') chaseRisk = 'MEDIUM';
  }

  return { entryQuality, chaseRisk };
}

/**
 * Calculates Dynamic TP/SL and Risk Unit R based on:
 * - Strategy Combination
 * - Direction (LONG / SHORT)
 * - 15m ATR(14)
 * - Structural Swing Levels
 * - Safety Bounds [2.0%, 3.5%]
 * - Exact Exchange Tick Size
 */
export function calculateDynamicTpSl(params) {
  const {
    entryPrice,
    direction = 'LONG',
    atr = 0,
    high24h = 0,
    low24h = 0,
    recentSwingHigh = null,
    recentSwingLow = null,
    primaryStrategy = 'BREAKOUT',
    secondaryStrategies = [],
    tickSize = 0.01,
  } = params;

  const entry = parseFloat(entryPrice);
  if (isNaN(entry) || entry <= 0) {
    throw new Error(`Invalid entry price for Dynamic TP/SL: ${entryPrice}`);
  }

  const isLong = String(direction).toUpperCase() === 'LONG';

  // 1. Establish 15m ATR(14) Volatility Baseline
  let effectiveAtr = parseFloat(atr);
  if (!effectiveAtr || effectiveAtr <= 0) {
    if (high24h > low24h && low24h > 0) {
      effectiveAtr = Math.max(entry * 0.015, (high24h - low24h) / 10);
    } else {
      effectiveAtr = entry * 0.018; // 1.8% volatility baseline fallback
    }
  }

  // 2. Calculate ATR Stop Distance & Structural Stop Distance
  const atrStopDistance = effectiveAtr * TPSL_CONFIG.atr.stopMultiplier;

  let structuralStopDistance = 0;
  if (isLong && recentSwingLow && recentSwingLow > 0 && recentSwingLow < entry) {
    const structuralStop = recentSwingLow * (1 - TPSL_CONFIG.atr.structureBufferPct / 100);
    structuralStopDistance = entry - structuralStop;
  } else if (!isLong && recentSwingHigh && recentSwingHigh > 0 && recentSwingHigh > entry) {
    const structuralStop = recentSwingHigh * (1 + TPSL_CONFIG.atr.structureBufferPct / 100);
    structuralStopDistance = structuralStop - entry;
  }

  // Take the protective distance that respects both volatility and structure
  const rawStopDistance = Math.max(atrStopDistance, structuralStopDistance);
  const rawStopPct = (rawStopDistance / entry) * 100;

  // 3. Safety Clamp within Configured Bounds [2.0%, 3.5%]
  const clampedStopPct = Math.min(
    TPSL_CONFIG.atr.maxSlDistancePct,
    Math.max(TPSL_CONFIG.atr.minSlDistancePct, rawStopPct)
  );
  const finalStopDistance = entry * (clampedStopPct / 100);

  // 4. Compute Final Stop Loss Price
  let rawStopLossPrice = isLong ? entry - finalStopDistance : entry + finalStopDistance;
  let stopLossPrice = roundToTick(rawStopLossPrice, tickSize);

  // Strict Validation: Stop Loss Invariants
  if (isLong && stopLossPrice >= entry) {
    stopLossPrice = roundToTick(entry * (1 - TPSL_CONFIG.atr.minSlDistancePct / 100), tickSize);
  } else if (!isLong && stopLossPrice <= entry) {
    stopLossPrice = roundToTick(entry * (1 + TPSL_CONFIG.atr.minSlDistancePct / 100), tickSize);
  }

  // 5. Calculate Risk Unit R = |ENTRY - SL|
  let riskR = roundToTick(Math.abs(entry - stopLossPrice), tickSize);
  if (riskR <= 0) {
    riskR = roundToTick(entry * 0.02, tickSize);
  }

  // 6. Resolve Strategy Base Profile & Secondary Confluence Adjustments
  const profile = TPSL_CONFIG.strategyProfiles[primaryStrategy] || TPSL_CONFIG.strategyProfiles.BREAKOUT;

  let tp1R = profile.tp1R;
  let tp2R = profile.tp2R;
  let tp3R = profile.tp3R;

  // Apply deterministic combination adjustments based on secondary confirmation
  if (secondaryStrategies.includes('BREAKOUT') || secondaryStrategies.includes('BREAKOUT_RETEST')) {
    tp3R += TPSL_CONFIG.combinationAdjustments.strongBreakoutBonusR;
  }
  if (secondaryStrategies.includes('VOLUME_EXPLOSION')) {
    tp2R += 0.2;
    tp3R += TPSL_CONFIG.combinationAdjustments.volumeExplosionBonusR;
  }
  if (secondaryStrategies.includes('EXHAUSTION') || secondaryStrategies.includes('OI_DIVERGENCE')) {
    tp2R -= 0.2;
    tp3R += TPSL_CONFIG.combinationAdjustments.exhaustionPenaltyR;
  }

  // Clamp target multipliers to prevent extreme distortion
  tp1R = Math.max(TPSL_CONFIG.combinationAdjustments.minTp1R, Math.min(TPSL_CONFIG.combinationAdjustments.maxTp1R, tp1R));
  tp2R = Math.max(TPSL_CONFIG.combinationAdjustments.minTp2R, Math.min(TPSL_CONFIG.combinationAdjustments.maxTp2R, tp2R));
  tp3R = Math.max(TPSL_CONFIG.combinationAdjustments.minTp3R, Math.min(TPSL_CONFIG.combinationAdjustments.maxTp3R, tp3R));

  // Ensure strict progression: TP1 < TP2 < TP3 in terms of R distance
  if (tp2R <= tp1R) tp2R = tp1R + 0.6;
  if (tp3R <= tp2R) tp3R = tp2R + 0.8;

  // 7. Calculate Take Profit Prices (All Derived from R)
  let tp1Price = roundToTick(isLong ? entry + riskR * tp1R : entry - riskR * tp1R, tickSize);
  let tp2Price = roundToTick(isLong ? entry + riskR * tp2R : entry - riskR * tp2R, tickSize);
  let tp3Price = roundToTick(isLong ? entry + riskR * tp3R : entry - riskR * tp3R, tickSize);

  // Guarantee Strict Target Ordering Invariants
  if (isLong) {
    if (tp1Price <= entry) tp1Price = roundToTick(entry + riskR * 0.8, tickSize);
    if (tp2Price <= tp1Price) tp2Price = roundToTick(tp1Price + riskR * 0.8, tickSize);
    if (tp3Price <= tp2Price) tp3Price = roundToTick(tp2Price + riskR * 1.0, tickSize);
  } else {
    if (tp1Price >= entry) tp1Price = roundToTick(entry - riskR * 0.8, tickSize);
    if (tp2Price >= tp1Price) tp2Price = roundToTick(tp1Price - riskR * 0.8, tickSize);
    if (tp3Price >= tp2Price) tp3Price = roundToTick(tp2Price - riskR * 1.0, tickSize);
  }

  return {
    entryPrice: entry,
    stopLossPrice,
    tp1Price,
    tp2Price,
    tp3Price,
    riskR,
    atr: roundToTick(effectiveAtr, tickSize),
    atrMultiplier: TPSL_CONFIG.atr.stopMultiplier,
    stopLossPct: parseFloat(clampedStopPct.toFixed(2)),
    tp1R: parseFloat(tp1R.toFixed(2)),
    tp2R: parseFloat(tp2R.toFixed(2)),
    tp3R: parseFloat(tp3R.toFixed(2)),
    primaryStrategy,
    secondaryStrategies,
    strategyCombination: [primaryStrategy, ...secondaryStrategies],
    tpSlVersion: TPSL_CONFIG.version,
  };
}
