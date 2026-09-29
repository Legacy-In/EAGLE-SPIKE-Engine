/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — MULTI-FACTOR ORDER-BOOK ABSORPTION & PERSISTENCE ENGINE
 *
 * Implements:
 * 1. Multi-Factor Passive Bid Absorption Model:
 *    - Aggressive Taker Sell Flow vs Executed Bid Depth
 *    - Price Slippage Response relative to ATR/Spread
 *    - Bid Replenishment Behavior & Iceberg Likelihood (LOW, MEDIUM, HIGH)
 * 2. Relative Depth Spoofing Detection (Percentile-based, no fixed $100k thresholds)
 * 3. Order-Book Persistence States:
 *    - PERSISTENT, REPLENISHING, ABSORBING, DISAPPEARING, SPOOF_RISK
 * 4. Absorption Contribution Score (0–25 points) for PREP_SCORE
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Tracks and evaluates wall persistence across order book snapshots.
 */
export class OrderbookWallTracker {
  constructor() {
    this.walls = new Map(); // wallKey -> WallRecord
  }

  /**
   * Records or updates an active orderbook wall.
   * Uses relative depth percentiles rather than hardcoded dollar amounts.
   */
  updateWall(symbol, side, price, sizeUsdt, top10DepthUsdt, now = Date.now()) {
    const wallKey = `${symbol}_${side}_${price.toFixed(5)}`;
    const relativeShare = top10DepthUsdt > 0 ? sizeUsdt / top10DepthUsdt : 0;

    // Qualify as a significant wall if it constitutes >= 25% of top 10 levels depth
    const isSignificant = relativeShare >= 0.25 || sizeUsdt >= 50000;

    if (!this.walls.has(wallKey)) {
      if (isSignificant) {
        this.walls.set(wallKey, {
          symbol,
          side,
          price,
          initialSizeUsdt: sizeUsdt,
          peakSizeUsdt: sizeUsdt,
          currentSizeUsdt: sizeUsdt,
          relativeShare,
          firstSeenAt: now,
          lastSeenAt: now,
          replenishCount: 0,
          state: 'PERSISTENT',
          icebergLikelihood: 'LOW',
        });
      }
    } else {
      const record = this.walls.get(wallKey);
      record.lastSeenAt = now;
      if (sizeUsdt > record.peakSizeUsdt) record.peakSizeUsdt = sizeUsdt;

      // Detect Replenishment Behavior:
      // If previous size was depleted (e.g. dropped by >40%) and now reloads to >80% of peak
      if (record.currentSizeUsdt < record.peakSizeUsdt * 0.6 && sizeUsdt >= record.peakSizeUsdt * 0.8) {
        record.replenishCount += 1;
        record.state = 'REPLENISHING';
        record.icebergLikelihood = record.replenishCount >= 3 ? 'HIGH' : 'MEDIUM';
      }

      record.currentSizeUsdt = sizeUsdt;
      record.relativeShare = relativeShare;
    }

    return this.walls.get(wallKey) || null;
  }

  /**
   * Prunes stale walls older than 10 minutes.
   */
  prune(now = Date.now(), maxAgeMs = 600000) {
    for (const [key, wall] of this.walls.entries()) {
      if (now - wall.lastSeenAt > maxAgeMs) {
        this.walls.delete(key);
      }
    }
  }
}

// Global active wall tracker instance
export const globalWallTracker = new OrderbookWallTracker();

/**
 * Evaluates relative depth spoof risk.
 * A wall is flagged as SPOOF_RISK if:
 * 1. It constitutes >= 30% of the top 10 book depth.
 * 2. It was cancelled within < 30s when price approached within 0.15%.
 * 3. Executed fill ratio is < 10%.
 *
 * @param {Object} wall Wall record
 * @param {number} currentPrice Current mid/last price
 * @param {number} executedFillUsdt Amount executed at that price level
 * @param {number} now Current timestamp
 * @returns {{ isSpoofRisk: boolean, reason: string|null, fillRatioPct: number }}
 */
export function evaluateRelativeSpoofRisk(wall, currentPrice, executedFillUsdt = 0, now = Date.now()) {
  if (!wall) return { isSpoofRisk: false, reason: null, fillRatioPct: 0 };

  const ageMs = now - wall.firstSeenAt;
  const timeSinceSeenSec = (now - wall.lastSeenAt) / 1000;
  const fillRatio = wall.peakSizeUsdt > 0 ? executedFillUsdt / wall.peakSizeUsdt : 0;
  const fillRatioPct = Number((fillRatio * 100).toFixed(1));

  // If wall has disappeared (> 4s since last seen) and lived < 30s
  const isDisappeared = timeSinceSeenSec > 4 && ageMs <= 30000;
  const priceDistancePct = Math.abs(currentPrice - wall.price) / (currentPrice || 1);

  if (isDisappeared && wall.relativeShare >= 0.3 && priceDistancePct <= 0.0015 && fillRatio < 0.1) {
    wall.state = 'SPOOF_RISK';
    return {
      isSpoofRisk: true,
      reason: `PHANTOM_WALL_PULLED: Relative depth ${(wall.relativeShare * 100).toFixed(0)}%, age ${Math.round(ageMs / 1000)}s, fill ${fillRatioPct}%`,
      fillRatioPct,
    };
  }

  return { isSpoofRisk: false, reason: null, fillRatioPct };
}

/**
 * Multi-Factor Passive Bid Absorption Model
 * Evaluates whether aggressive taker sells are being absorbed by passive limit orders without price collapsing.
 *
 * @param {Object} params
 * @param {number} params.aggressiveSellVolumeUsdt Total taker sell volume in 5m window
 * @param {number} params.executedBidLiquidityUsdt Estimated executed volume at the best bid band
 * @param {number} params.priceDropPct Absolute price drop percentage during the sell barrage
 * @param {number} params.atrPct ATR(15m) as a percentage of current price
 * @param {number} params.replenishCount Times the bid level was reloaded
 * @returns {{
 *   absorptionScore: number,
 *   absorptionRatio: number,
 *   isPassiveAbsorption: boolean,
 *   replenishmentBehavior: string,
 *   icebergLikelihood: 'LOW'|'MEDIUM'|'HIGH',
 *   factors: Object
 * }}
 */
export function evaluateMultiFactorAbsorption({
  aggressiveSellVolumeUsdt = 0,
  executedBidLiquidityUsdt = 0,
  priceDropPct = 0,
  atrPct = 0.5,
  replenishCount = 0,
}) {
  const sellVol = Math.max(0, Number(aggressiveSellVolumeUsdt) || 0);
  const bidExec = Math.max(1, Number(executedBidLiquidityUsdt) || 1);

  // Absorption ratio = Sell Vol / Executed Bid Liquidity
  const absorptionRatio = Number((sellVol / bidExec).toFixed(2));

  // Factor 1: Sell Flow Magnitude (0-6 points)
  let sellFlowFactor = 0;
  if (sellVol >= 500000) sellFlowFactor = 6;
  else if (sellVol >= 200000) sellFlowFactor = 5;
  else if (sellVol >= 75000) sellFlowFactor = 4;
  else if (sellVol >= 25000) sellFlowFactor = 2;

  // Factor 2: Price Slippage Resistance (0-8 points)
  // Low price drop relative to ATR indicates strong absorption
  const priceResistanceRatio = atrPct > 0 ? Math.abs(priceDropPct) / atrPct : 1.0;
  let priceResistanceFactor = 0;
  if (priceResistanceRatio <= 0.25) priceResistanceFactor = 8;
  else if (priceResistanceRatio <= 0.5) priceResistanceFactor = 6;
  else if (priceResistanceRatio <= 0.8) priceResistanceFactor = 3;
  else if (priceResistanceRatio <= 1.2) priceResistanceFactor = 1;

  // Factor 3: Bid Volume Engagement (0-6 points)
  let bidExecFactor = 0;
  if (bidExec >= 400000) bidExecFactor = 6;
  else if (bidExec >= 150000) bidExecFactor = 4;
  else if (bidExec >= 50000) bidExecFactor = 2;

  // Factor 4: Replenishment Behavior & Iceberg Likelihood (0-5 points)
  let replenishmentFactor = 0;
  let icebergLikelihood = 'LOW';
  let replenishmentBehavior = 'INACTIVE';

  if (replenishCount >= 3) {
    replenishmentFactor = 5;
    icebergLikelihood = 'HIGH';
    replenishmentBehavior = 'ACTIVE_PERSISTENT';
  } else if (replenishCount >= 1) {
    replenishmentFactor = 3;
    icebergLikelihood = 'MEDIUM';
    replenishmentBehavior = 'ACTIVE_MODERATE';
  }

  const rawScore = sellFlowFactor + priceResistanceFactor + bidExecFactor + replenishmentFactor;
  const absorptionScore = Math.min(25, Math.max(0, rawScore));

  const isPassiveAbsorption = absorptionScore >= 16 && priceResistanceRatio <= 0.5;

  return {
    absorptionScore,
    absorptionRatio,
    isPassiveAbsorption,
    replenishmentBehavior,
    icebergLikelihood,
    factors: {
      sellFlowFactor,
      priceResistanceFactor,
      bidExecFactor,
      replenishmentFactor,
      priceResistanceRatio: Number(priceResistanceRatio.toFixed(2)),
    },
  };
}
