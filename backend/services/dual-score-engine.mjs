/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — DUAL-SCORE DECISION ENGINE & 4-STATE MARKET CLASSIFIER
 *
 * Implements:
 * 1. PREP_SCORE (0–100): Pre-Breakout / Accumulation Potential
 *    - Volatility Compression (VCI & BBWidth contraction): 25p
 *    - Passive Bid Absorption: 25p
 *    - Volume Accumulation (Elevated RVOL + low range): 20p
 *    - Normalized OI Structure: 15p
 *    - Funding Context (Neutral / negative Z-score): 15p
 *
 * 2. CONFIRMATION_SCORE (0–100): Breakout Trigger Potential
 *    - Breakout Structure & Price Efficiency (>0.65): 30p
 *    - RVOL Expansion & Volume Z-score: 25p
 *    - Aggressive Taker CVD Delta: 20p
 *    - Short Liquidation Cascade: 15p
 *    - Multi-Timeframe Return Alignment: 10p
 *
 * 3. 4-STATE MARKET STATUS (Independent Lifecycle Staging):
 *    - NEUTRAL: Baseline market condition
 *    - PREP: Accumulation coiling (Watchlist / Audit candidate)
 *    - READY: Pre-breakout conditions strongly aligned (Early warning radar)
 *    - CONFIRMED: Verified breakout trigger (Canonical actionable signal)
 *
 * 4. INDEPENDENT CHASE RISK SHIELD:
 *    - Evaluated as an independent risk overlay (LOW, MEDIUM, HIGH)
 *    - Extension Ratio = (Current Price - Base Price) / ATR_15m
 *    - If HIGH: Actionable order execution is blocked / flagged with shield alert
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Calculates the PREP_SCORE (0–100)
 * Evaluates the quality and maturity of pre-breakout accumulation.
 */
export function calculatePrepScore({
  vci = 1.0,
  vciPercentile = 50,
  isCompressed = false,
  absorptionScore = 0,
  rvol5m = 1.0,
  returns5m = 0,
  priceEfficiency = 0.5,
  oiAccelerationPct = 0,
  fundingZScore = 0,
  fundingPercentile = 50,
}) {
  let score = 0;

  // 1. Volatility Compression (Max 25 pts)
  if (isCompressed || vci <= 0.5 || vciPercentile <= 15) {
    score += 25;
  } else if (vci <= 0.65 || vciPercentile <= 25) {
    score += 18;
  } else if (vci <= 0.8 || vciPercentile <= 40) {
    score += 10;
  }

  // 2. Passive Order-Book Absorption (Max 25 pts)
  // absorptionScore is 0-25 from evaluateMultiFactorAbsorption
  score += Math.min(25, Math.max(0, Number(absorptionScore) || 0));

  // 3. Volume Accumulation without Breakout (Max 20 pts)
  // Hallmarks of smart money accumulation: steady volume (RVOL >= 1.2) while price stays tight (|ret| < 1.2%, efficiency < 0.40)
  if (rvol5m >= 1.5 && Math.abs(returns5m) <= 1.0 && priceEfficiency <= 0.35) {
    score += 20;
  } else if (rvol5m >= 1.2 && Math.abs(returns5m) <= 1.5) {
    score += 14;
  } else if (rvol5m >= 1.0 && Math.abs(returns5m) <= 2.0) {
    score += 8;
  }

  // 4. Normalized Open Interest Structure (Max 15 pts)
  // Steady, non-frothy capital commitment during compression
  if (oiAccelerationPct >= 0.05 && oiAccelerationPct <= 0.8) {
    score += 15;
  } else if (oiAccelerationPct > 0) {
    score += 10;
  } else if (oiAccelerationPct >= -0.05) {
    score += 5; // Neutral
  }

  // 5. Funding Regime Context (Max 15 pts)
  // Negative funding or sub-neutral Z-score favors long squeeze accumulation
  if (fundingZScore <= -1.5 || fundingPercentile <= 10) {
    score += 15; // Heavily short-skewed positioning
  } else if (fundingZScore <= 0 || fundingPercentile <= 50) {
    score += 10; // Neutral / clean
  } else if (fundingZScore <= 1.0) {
    score += 5;
  }
  // If fundingZScore > 2.0 (froth), 0 points awarded

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Calculates the CONFIRMATION_SCORE (0–100)
 * Evaluates the conviction of an active breakout trigger.
 */
export function calculateConfirmationScore({
  breakoutStructure = false,
  priceEfficiency = 0.5,
  rvol5m = 1.0,
  volumeZ = 1.0,
  takerImbalancePct = 0,
  shortLiquidationSpike = false,
  returns5m = 0,
  returns15m = 0,
  returns1h = 0,
}) {
  let score = 0;

  // 1. Breakout Structure & Price Efficiency (Max 30 pts)
  // High efficiency (>0.65) means pure directional impulse, not random chop
  if (breakoutStructure && priceEfficiency >= 0.65) {
    score += 30;
  } else if (breakoutStructure || priceEfficiency >= 0.6) {
    score += 22;
  } else if (priceEfficiency >= 0.5) {
    score += 12;
  }

  // 2. RVOL Expansion & Volume Anomaly (Max 25 pts)
  if (rvol5m >= 3.0 || volumeZ >= 3.0) {
    score += 25;
  } else if (rvol5m >= 2.0 || volumeZ >= 2.0) {
    score += 18;
  } else if (rvol5m >= 1.5 || volumeZ >= 1.5) {
    score += 10;
  }

  // 3. Aggressive Taker CVD Flow (Max 20 pts)
  // takerImbalancePct: -100 to +100
  if (takerImbalancePct >= 50) {
    score += 20;
  } else if (takerImbalancePct >= 25) {
    score += 14;
  } else if (takerImbalancePct >= 10) {
    score += 8;
  }

  // 4. Short Liquidation Cascade (Max 15 pts)
  if (shortLiquidationSpike) {
    score += 15;
  }

  // 5. Multi-Timeframe Return Alignment (Max 10 pts)
  // 5m, 15m, 1h returns all positive and expanding
  if (returns5m > 0 && returns15m > 0 && returns1h > 0) {
    if (returns5m >= returns15m / 3) {
      score += 10; // Accelerating on micro timeframe
    } else {
      score += 6;
    }
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Evaluates the Independent Chase Risk Overlay.
 * Does NOT overwrite the structural market status (PREP/READY/CONFIRMED).
 * Instead, acts as an execution barrier / protective shield.
 *
 * @param {Object} params
 * @param {number} params.currentPrice Current mark/last price
 * @param {number} params.basePrice Deterministic base price (VWAP of base window)
 * @param {number} params.atr15m ATR(15m) in quote currency
 * @param {number} params.fundingZScore Funding rate Z-score
 * @param {number} params.liquidationPercentile Liquidation volume percentile
 * @returns {{ level: 'LOW'|'MEDIUM'|'HIGH', extensionRatio: number, isBlocked: boolean, reasons: string[] }}
 */
export function evaluateChaseRisk({
  currentPrice = 0,
  basePrice = 0,
  atr15m = 1,
  fundingZScore = 0,
  liquidationPercentile = 50,
}) {
  const safeAtr = Math.max(0.000001, Number(atr15m) || 1);
  const safeBase = Number(basePrice) || Number(currentPrice) || 1;
  const priceDiff = Math.max(0, Number(currentPrice) - safeBase);

  const extensionRatio = Number((priceDiff / safeAtr).toFixed(2));
  const reasons = [];

  let isHigh = false;
  let isMedium = false;

  // Criterion 1: Price extended > 2.0x ATR above consolidation base
  if (extensionRatio >= 2.0) {
    isHigh = true;
    reasons.push(`Price overextended: ${extensionRatio}x ATR above base`);
  } else if (extensionRatio >= 1.4) {
    isMedium = true;
    reasons.push(`Moderate price extension: ${extensionRatio}x ATR above base`);
  }

  // Criterion 2: Funding Froth (Z-score > 2.2)
  if (fundingZScore >= 2.2) {
    isHigh = true;
    reasons.push(`Severe funding froth: Z-Score ${fundingZScore}σ`);
  } else if (fundingZScore >= 1.5) {
    isMedium = true;
    reasons.push(`Elevated funding rate: Z-Score ${fundingZScore}σ`);
  }

  // Criterion 3: Climax Exhaustion Liquidation
  if (liquidationPercentile >= 95) {
    isHigh = true;
    reasons.push(`Exhaustion risk: Liquidation climax (${liquidationPercentile}th percentile)`);
  }

  const level = isHigh ? 'HIGH' : isMedium ? 'MEDIUM' : 'LOW';
  const isBlocked = level === 'HIGH';

  return {
    level,
    extensionRatio,
    isBlocked,
    reasons,
  };
}

/**
 * Classifies 4-State Market Status.
 * Progressive lifecycle stages:
 * - NEUTRAL: Baseline
 * - PREP: Accumulation / compression (Watchlist / Audit candidate)
 * - READY: Pre-breakout conditions strongly aligned (Early warning radar)
 * - CONFIRMED: Breakout confirmed (Canonical actionable signal)
 *
 * @param {number} prepScore 0-100
 * @param {number} confirmationScore 0-100
 * @returns {'NEUTRAL'|'PREP'|'READY'|'CONFIRMED'}
 */
export function classifyMarketStatus(prepScore, confirmationScore) {
  const prep = Number(prepScore) || 0;
  const conf = Number(confirmationScore) || 0;

  if (conf >= 70) {
    return 'CONFIRMED';
  }

  if (prep >= 75 && conf >= 50) {
    return 'READY';
  }

  if (prep >= 65) {
    return 'PREP';
  }

  return 'NEUTRAL';
}
