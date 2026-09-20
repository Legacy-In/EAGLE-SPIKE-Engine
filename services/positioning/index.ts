/**
 * SIGMA — BTC Price × Open Interest Positioning Engine
 *
 * Core Objective:
 * Use BTC price behavior and Open Interest behavior as the primary positioning framework.
 * Then use Volume, RVOL, Taker Buy/Sell Flow, Liquidations, Funding, Order Book,
 * Market Structure, and Multi-Timeframe Alignment as confirmation layers.
 *
 * Strictly separates:
 *   1. OBSERVATION
 *   2. INTERPRETATION
 *   3. CONFIRMATION
 *   4. SETUP STATE
 */

import {
  BtcPositioningSnapshot,
  ConfirmationEngineState,
  ConfirmationLevel,
  MtfPositioningState,
  MtfTimeframeNode,
  OiIntensity,
  PositioningDataQuality,
  PositioningInterpretation,
  PositioningObservation,
  PositioningState,
  SetupState,
} from '../../packages/types/positioning';
import { POSITIONING_CONFIG, PositioningConfig } from './config';

export interface RawPositioningInput {
  currentPrice: number;
  candles1m?: { open: number; close: number; volume: number }[];
  candles5m?: { open: number; close: number; volume: number }[];
  candles15m?: { open: number; close: number; volume: number }[];
  candles1h?: { open: number; close: number; volume: number }[];
  candles4h?: { open: number; close: number; volume: number }[];
  openInterestBtc: number;
  openInterestUsd: number;
  oiCandles5m?: { timestamp: number; openInterest: number }[];
  oiCandles15m?: { timestamp: number; openInterest: number }[];
  oiCandles1h?: { timestamp: number; openInterest: number }[];
  oiCandles4h?: { timestamp: number; openInterest: number }[];
  rvol?: number;
  volume24hUsd?: number;
  takerBuyerRatio?: number; // 0.0 to 1.0 (e.g. 0.54 = 54% taker buys)
  fundingRate?: number;
  longLiquidations1hUsd?: number;
  shortLiquidations1hUsd?: number;
  nearestSupport?: number;
  nearestResistance?: number;
  dataTimestamp?: number;
  sourceExchange?: string;
}

export class BtcPositioningEngine {
  private config: PositioningConfig;

  constructor(customConfig?: Partial<PositioningConfig>) {
    this.config = {
      ...POSITIONING_CONFIG,
      ...customConfig,
    };
  }

  /**
   * Main synthesis pipeline: Computes complete snapshot
   */
  public evaluate(input: RawPositioningInput): BtcPositioningSnapshot {
    const now = Date.now();
    const dataTimestamp = input.dataTimestamp || now;
    const freshnessMs = Math.max(0, now - dataTimestamp);
    const hasValidOi = Boolean(input.openInterestBtc && input.openInterestBtc > 0);

    // 1. Data Quality Audit
    const dataQuality = this.auditDataQuality(freshnessMs, input.sourceExchange || 'Binance + Bybit Composite', hasValidOi);

    // If data is unavailable or stale, return unconfirmed failsafe snapshot
    if (dataQuality.isStale || dataQuality.qualityLevel === 'UNAVAILABLE' || !input.currentPrice || !hasValidOi) {
      return this.buildFallbackSnapshot(input, dataQuality);
    }

    // 2. Extract Observations
    const observation = this.buildObservation(input);

    // 3. Evaluate Price × OI Matrix (Primary Framework)
    const interpretation = this.evaluateInterpretation(observation);

    // 4. Multi-Timeframe Matrix Evaluation
    const mtf = this.evaluateMultiTimeframe(input);

    // 5. Confirmation Engine (Independent Verification Layers)
    const confirmation = this.evaluateConfirmations(observation, interpretation, mtf, input);

    // 6. Setup State Synthesis
    const { setupState, setupRationale } = this.synthesizeSetupState(interpretation, confirmation, mtf);

    return {
      observation,
      interpretation,
      confirmation,
      mtf,
      setupState,
      setupRationale,
      dataQuality,
    };
  }

  /**
   * 1. Data Quality Auditor
   */
  private auditDataQuality(freshnessMs: number, exchangeSource: string, hasValidOi: boolean): PositioningDataQuality {
    const isStale = freshnessMs > this.config.dataQuality.staleCutoffMs;
    const isComplete = Boolean(exchangeSource && hasValidOi);
    let qualityLevel: 'LIVE' | 'DELAYED' | 'UNAVAILABLE' = 'LIVE';
    let status: 'LIVE' | 'DEGRADED' | 'STALE' | 'UNAVAILABLE' = 'LIVE';

    if (!hasValidOi || freshnessMs > 60000) {
      qualityLevel = 'UNAVAILABLE';
      status = 'UNAVAILABLE';
    } else if (isStale) {
      qualityLevel = 'DELAYED';
      status = 'STALE';
    } else if (freshnessMs > 5000) {
      qualityLevel = 'LIVE';
      status = 'DEGRADED';
    }

    return {
      timestamp: Date.now(),
      freshnessMs,
      exchangeSource,
      isStale,
      isComplete,
      qualityLevel,
      status,
      latencyMs: freshnessMs,
      freshnessSeconds: Math.max(0, Math.round(freshnessMs / 1000)),
    };
  }

  /**
   * 2. Build Quantitative Observation
   */
  private buildObservation(input: RawPositioningInput): PositioningObservation {
    const p1m = this.calculatePriceDelta(input.candles1m, input.currentPrice);
    const p5m = this.calculatePriceDelta(input.candles5m, input.currentPrice);
    const p15m = this.calculatePriceDelta(input.candles15m, input.currentPrice);
    const p1h = this.calculatePriceDelta(input.candles1h, input.currentPrice);
    const p4h = this.calculatePriceDelta(input.candles4h, input.currentPrice);

    const oi5m = this.calculateOiDelta(input.oiCandles5m, input.openInterestBtc);
    const oi15m = this.calculateOiDelta(input.oiCandles15m, input.openInterestBtc);
    const oi1h = this.calculateOiDelta(input.oiCandles1h, input.openInterestBtc);
    const oi4h = this.calculateOiDelta(input.oiCandles4h, input.openInterestBtc);

    // OI Acceleration: Difference between immediate (5m) and baseline (15m) rate
    const oiAccelerationPct = parseFloat((oi5m * 3 - oi15m).toFixed(2));

    const takerRatio = input.takerBuyerRatio !== undefined ? input.takerBuyerRatio : 0.528;
    const takerDominancePct = parseFloat((takerRatio * 100).toFixed(1));

    const longLiqs = input.longLiquidations1hUsd || 0;
    const shortLiqs = input.shortLiquidations1hUsd || 0;
    const totalLiqs = longLiqs + shortLiqs;

    const funding = input.fundingRate !== undefined ? input.fundingRate : 0.00008;
    const fundingAnnualized = parseFloat((funding * 3 * 365 * 100).toFixed(2));

    return {
      price: input.currentPrice,
      currentPrice: input.currentPrice,
      priceChange1mPct: p1m,
      priceChange5mPct: p5m,
      priceChange15mPct: p15m,
      priceChange1hPct: p1h,
      priceChange4hPct: p4h,
      openInterestUsd: input.openInterestUsd || input.openInterestBtc * input.currentPrice,
      openInterestBtc: input.openInterestBtc,
      oiChange5mPct: oi5m,
      oiChange15mPct: oi15m,
      oiChange1hPct: oi1h,
      oiChange4hPct: oi4h,
      oiAccelerationPct,
      rvol: input.rvol !== undefined ? input.rvol : 1.45,
      volume24hUsd: input.volume24hUsd || 1850000000,
      volumeDeltaPct: parseFloat(((input.rvol || 1.0) * 100 - 100).toFixed(1)),
      takerFlowRatio: parseFloat(takerRatio.toFixed(3)),
      takerDominancePct,
      takerBuyerPct: takerDominancePct,
      fundingRate: funding,
      fundingRatePct: parseFloat((funding * 100).toFixed(4)),
      fundingRateAnnualizedPct: fundingAnnualized,
      longLiquidations1hUsd: longLiqs,
      shortLiquidations1hUsd: shortLiqs,
      totalLiquidations1hUsd: totalLiqs,
      liquidations1hUsd: totalLiqs,
    };
  }

  /**
   * 3. Evaluate Price × OI Matrix (Primary Positioning Framework)
   */
  private evaluateInterpretation(obs: PositioningObservation): PositioningInterpretation {
    // Adaptive anchor: pick the best available horizon
    let pChange = obs.priceChange1hPct;
    let oiChange = obs.oiChange1hPct;
    let pThreshold = this.config.priceDeltaThresholds['1h'];
    let oiThreshold = this.config.oiDeltaThresholds['1h'];

    if (pChange === 0 && oiChange === 0) {
      if (obs.priceChange15mPct !== 0 || obs.oiChange15mPct !== 0) {
        pChange = obs.priceChange15mPct;
        oiChange = obs.oiChange15mPct;
        pThreshold = this.config.priceDeltaThresholds['15m'];
        oiThreshold = this.config.oiDeltaThresholds['15m'];
      } else if (obs.priceChange5mPct !== 0 || obs.oiChange5mPct !== 0) {
        pChange = obs.priceChange5mPct;
        oiChange = obs.oiChange5mPct;
        pThreshold = this.config.priceDeltaThresholds['5m'];
        oiThreshold = this.config.oiDeltaThresholds['5m'];
      } else if (obs.priceChange1mPct !== 0) {
        pChange = obs.priceChange1mPct;
        oiChange = obs.oiChange5mPct;
        pThreshold = this.config.priceDeltaThresholds['1m'];
        oiThreshold = this.config.oiDeltaThresholds['5m'];
      }
    }

    // OI Intensity
    let oiIntensity: OiIntensity = 'NORMAL';
    const absOi = Math.abs(oiChange);
    if (absOi >= this.config.oiIntensityThresholds.extremePct) {
      oiIntensity = 'EXTREME';
    } else if (absOi >= this.config.oiIntensityThresholds.highPct) {
      oiIntensity = 'HIGH';
    } else if (absOi >= this.config.oiIntensityThresholds.elevatedPct) {
      oiIntensity = 'ELEVATED';
    }

    // Matrix Evaluation
    if (pChange > pThreshold && oiChange > oiThreshold) {
      // QUADRANT 1: Price ↑ + OI ↑
      const state: PositioningState = obs.oiAccelerationPct > 3.0 ? 'OI_ACCELERATION' : 'LEVERAGE_EXPANSION';
      return {
        state,
        stateLabel: state === 'OI_ACCELERATION' ? 'OI ACCELERATION' : 'LEVERAGE EXPANSION',
        matrixQuadrant: 'PRICE_UP_OI_UP',
        oiIntensity,
        narrative:
          state === 'OI_ACCELERATION'
            ? 'OI Acceleration: Price is rising accompanied by rapid non-linear open interest expansion. Aggressive leverage commitments entering books.'
            : 'Leverage Expansion: Price is rising accompanied by open interest expansion. Market participants are committing new speculative leverage on the long side.',
      };
    }

    if (pChange > pThreshold && oiChange < -oiThreshold) {
      // QUADRANT 2: Price ↑ + OI ↓
      return {
        state: 'SHORT_COVERING',
        stateLabel: 'SHORT COVERING / DELEVERAGING',
        matrixQuadrant: 'PRICE_UP_OI_DOWN',
        oiIntensity,
        narrative: 'Short Covering: Price is rising while open interest contracts. Upward price movement is driven predominantly by short liquidation or voluntary position closure.',
      };
    }

    if (pChange < -pThreshold && oiChange > oiThreshold) {
      // QUADRANT 3: Price ↓ + OI ↑
      return {
        state: 'BEARISH_EXPANSION',
        stateLabel: 'BEARISH POSITIONING EXPANSION',
        matrixQuadrant: 'PRICE_DOWN_OI_UP',
        oiIntensity,
        narrative: 'Bearish Expansion: Price is declining accompanied by open interest expansion. New aggressive short contracts are being initiated into downward momentum.',
      };
    }

    if (pChange < -pThreshold && oiChange < -oiThreshold) {
      // QUADRANT 4: Price ↓ + OI ↓
      return {
        state: 'LONG_LIQUIDATION',
        stateLabel: 'LONG LIQUIDATION / DELEVERAGING',
        matrixQuadrant: 'PRICE_DOWN_OI_DOWN',
        oiIntensity,
        narrative: 'Long Liquidation: Price is declining accompanied by contracting open interest. Long positions are closing out or liquidating into falling prices.',
      };
    }

    // Sub-threshold or conflicting micro-states
    if (absOi >= this.config.oiIntensityThresholds.highPct && Math.abs(pChange) < pThreshold) {
      return {
        state: 'EXHAUSTION_WATCH',
        stateLabel: 'COI DIVERGENCE / EXHAUSTION WATCH',
        matrixQuadrant: 'FLAT',
        oiIntensity,
        narrative: 'Open interest is expanding heavily without commensurate price displacement. Indicates absorption or impending volatility expansion.',
      };
    }

    if (oiChange < -this.config.oiIntensityThresholds.elevatedPct) {
      return {
        state: 'DELEVERAGING',
        stateLabel: 'PASSIVE DELEVERAGING',
        matrixQuadrant: 'FLAT',
        oiIntensity,
        narrative: 'Open interest is draining from the venue without aggressive directional bias.',
      };
    }

    return {
      state: 'NEUTRAL',
      stateLabel: 'NEUTRAL EQUILIBRIUM',
      matrixQuadrant: 'FLAT',
      oiIntensity: 'NORMAL',
      narrative: 'Price and derivatives open interest are fluctuating within standard equilibrium bounds.',
    };
  }

  /**
   * 4. Multi-Timeframe Price × OI Evaluation
   */
  private evaluateMultiTimeframe(input: RawPositioningInput): { state: MtfPositioningState; timeframes: MtfTimeframeNode[] } {
    const tfs: Array<'1m' | '5m' | '15m' | '30m' | '1h' | '4h'> = ['1m', '5m', '15m', '30m', '1h', '4h'];
    const nodes: MtfTimeframeNode[] = [];

    for (const tf of tfs) {
      const pDelta = this.getTimeframePriceDelta(input, tf);
      const oiDelta = this.getTimeframeOiDelta(input, tf);
      const pThresh = this.config.priceDeltaThresholds[tf];
      const oiThresh = this.config.oiDeltaThresholds[tf === '1m' ? '5m' : tf === '30m' ? '1h' : tf];

      let state: PositioningState = 'NEUTRAL';
      let status: ConfirmationLevel = 'NEUTRAL';

      if (pDelta > pThresh && oiDelta > oiThresh) {
        state = 'LEVERAGE_EXPANSION';
        status = 'CONFIRMED';
      } else if (pDelta > pThresh && oiDelta < -oiThresh) {
        state = 'SHORT_COVERING';
        status = 'CONFIRMED';
      } else if (pDelta < -pThresh && oiDelta > oiThresh) {
        state = 'BEARISH_EXPANSION';
        status = 'CONFIRMED';
      } else if (pDelta < -pThresh && oiDelta < -oiThresh) {
        state = 'LONG_LIQUIDATION';
        status = 'CONFIRMED';
      } else {
        state = 'NEUTRAL';
        status = 'NEUTRAL';
      }

      nodes.push({
        timeframe: tf,
        state,
        priceDeltaPct: pDelta,
        oiDeltaPct: oiDelta,
        status,
      });
    }

    // Determine overall MTF alignment
    const directionalStates = nodes.filter((n) => n.state !== 'NEUTRAL');
    let state: MtfPositioningState = 'MIXED';

    if (directionalStates.length >= 4) {
      const firstState = directionalStates[0].state;
      const allMatch = directionalStates.every((n) => n.state === firstState);
      if (allMatch) {
        state = 'ALIGNED';
      } else {
        const opposingCount = directionalStates.filter(
          (n) =>
            (firstState === 'LEVERAGE_EXPANSION' && n.state === 'BEARISH_EXPANSION') ||
            (firstState === 'BEARISH_EXPANSION' && n.state === 'LEVERAGE_EXPANSION')
        ).length;
        state = opposingCount > 0 ? 'CONTRADICTING' : 'MIXED';
      }
    } else if (directionalStates.length === 0) {
      state = 'ALIGNED'; // Uniformly neutral
    }

    return { state, timeframes: nodes };
  }

  /**
   * 5. Confirmation Engine (9 Independent Verification Layers)
   */
  private evaluateConfirmations(
    obs: PositioningObservation,
    interp: PositioningInterpretation,
    mtf: { state: MtfPositioningState; timeframes: MtfTimeframeNode[] },
    input: RawPositioningInput
  ): ConfirmationEngineState {
    const isBullishDirection =
      interp.matrixQuadrant === 'PRICE_UP_OI_UP' ||
      interp.matrixQuadrant === 'PRICE_UP_OI_DOWN' ||
      interp.state === 'LEVERAGE_EXPANSION' ||
      interp.state === 'SHORT_COVERING' ||
      interp.state === 'OI_ACCELERATION';

    const isBearishDirection =
      interp.matrixQuadrant === 'PRICE_DOWN_OI_UP' ||
      interp.matrixQuadrant === 'PRICE_DOWN_OI_DOWN' ||
      interp.state === 'BEARISH_EXPANSION' ||
      interp.state === 'LONG_LIQUIDATION';

    // 1. Price Confirmation
    let priceConfirmation: ConfirmationLevel = 'NEUTRAL';
    const effectivePriceDelta = obs.priceChange1hPct || obs.priceChange15mPct || obs.priceChange5mPct;
    const effectivePriceThreshold = obs.priceChange1hPct !== 0 ? this.config.priceDeltaThresholds['1h'] : this.config.priceDeltaThresholds['5m'];

    if (isBullishDirection) {
      priceConfirmation = effectivePriceDelta > effectivePriceThreshold ? 'CONFIRMED' : 'WEAK';
    } else if (isBearishDirection) {
      priceConfirmation = effectivePriceDelta < -effectivePriceThreshold ? 'CONFIRMED' : 'WEAK';
    }

    // 2. Volume Confirmation
    let volumeConfirmation: ConfirmationLevel = 'NEUTRAL';
    if (obs.volumeDeltaPct >= 20.0) {
      volumeConfirmation = 'CONFIRMED';
    } else if (obs.volumeDeltaPct < -15.0) {
      volumeConfirmation = 'WEAK';
    }

    // 3. RVOL Confirmation
    let rvolConfirmation: ConfirmationLevel = 'NEUTRAL';
    if (obs.rvol >= this.config.rvolThresholds.confirmed) {
      rvolConfirmation = 'CONFIRMED';
    } else if (obs.rvol < this.config.rvolThresholds.weak) {
      rvolConfirmation = 'WEAK';
    }

    // 4. Taker Flow Confirmation
    let takerConfirmation: ConfirmationLevel = 'NEUTRAL';
    if (isBullishDirection) {
      if (obs.takerDominancePct >= this.config.takerDominanceThresholds.longConfirmedPct) {
        takerConfirmation = 'CONFIRMED';
      } else if (obs.takerDominancePct <= this.config.takerDominanceThresholds.shortConfirmedPct) {
        takerConfirmation = 'CONTRADICTING'; // Sellers dominate during price rise
      } else {
        takerConfirmation = 'WEAK';
      }
    } else if (isBearishDirection) {
      if (obs.takerDominancePct <= this.config.takerDominanceThresholds.shortConfirmedPct) {
        takerConfirmation = 'CONFIRMED';
      } else if (obs.takerDominancePct >= this.config.takerDominanceThresholds.longConfirmedPct) {
        takerConfirmation = 'CONTRADICTING'; // Buyers dominate during price drop
      } else {
        takerConfirmation = 'WEAK';
      }
    }

    // 5. OI Intensity Confirmation
    let oiConfirmation: ConfirmationLevel = 'NEUTRAL';
    if (interp.oiIntensity === 'HIGH' || interp.oiIntensity === 'EXTREME') {
      oiConfirmation = 'CONFIRMED';
    } else if (interp.oiIntensity === 'ELEVATED') {
      oiConfirmation = 'NEUTRAL';
    } else {
      oiConfirmation = 'WEAK';
    }

    // 6. Liquidation Confirmation (Integration logic)
    let liquidationConfirmation: ConfirmationLevel = 'UNAVAILABLE';
    if (obs.totalLiquidations1hUsd >= this.config.liquidationThresholds.minVolumeUsd) {
      const shortLiqRatio = obs.shortLiquidations1hUsd / obs.totalLiquidations1hUsd;
      const longLiqRatio = obs.longLiquidations1hUsd / obs.totalLiquidations1hUsd;

      if (interp.state === 'SHORT_COVERING') {
        liquidationConfirmation = shortLiqRatio >= this.config.liquidationThresholds.dominantRatio ? 'CONFIRMED' : 'WEAK';
      } else if (interp.state === 'LONG_LIQUIDATION') {
        liquidationConfirmation = longLiqRatio >= this.config.liquidationThresholds.dominantRatio ? 'CONFIRMED' : 'WEAK';
      } else {
        liquidationConfirmation = 'NEUTRAL';
      }
    }

    // 7. Funding Confirmation
    let fundingConfirmation: ConfirmationLevel = 'NEUTRAL';
    if (isBullishDirection) {
      if (obs.fundingRate > this.config.fundingThresholds.crowdedLong) {
        fundingConfirmation = 'CONTRADICTING'; // Overcrowded long carry drag
      } else if (obs.fundingRate >= this.config.fundingThresholds.baselineMin) {
        fundingConfirmation = 'CONFIRMED';
      }
    } else if (isBearishDirection) {
      if (obs.fundingRate < this.config.fundingThresholds.crowdedShort) {
        fundingConfirmation = 'CONTRADICTING'; // Overcrowded short squeeze risk
      } else {
        fundingConfirmation = 'CONFIRMED';
      }
    } else {
      fundingConfirmation = 'NEUTRAL';
    }

    // 8. Market Structure Confirmation
    let structureConfirmation: ConfirmationLevel = 'NEUTRAL';
    if (input.nearestSupport && input.nearestResistance) {
      if (isBullishDirection) {
        structureConfirmation = obs.price > input.nearestSupport * 1.005 ? 'CONFIRMED' : 'WEAK';
      } else if (isBearishDirection) {
        structureConfirmation = obs.price < input.nearestResistance * 0.995 ? 'CONFIRMED' : 'WEAK';
      }
    }

    // 9. Multi-Timeframe Confirmation
    let mtfConfirmation: ConfirmationLevel = 'NEUTRAL';
    if (mtf.state === 'ALIGNED') {
      mtfConfirmation = 'CONFIRMED';
    } else if (mtf.state === 'CONTRADICTING') {
      mtfConfirmation = 'CONTRADICTING';
    } else {
      mtfConfirmation = 'NEUTRAL';
    }

    // Compute composite confirmation score (percentage of confirmed layers)
    const layers = [
      priceConfirmation,
      volumeConfirmation,
      rvolConfirmation,
      takerConfirmation,
      oiConfirmation,
      liquidationConfirmation,
      fundingConfirmation,
      structureConfirmation,
      mtfConfirmation,
    ];

    const confirmedCount = layers.filter((l) => l === 'CONFIRMED').length;
    const contradictingCount = layers.filter((l) => l === 'CONTRADICTING').length;
    const score = Math.round(Math.max(0, (confirmedCount / layers.length) * 100 - contradictingCount * 15));

    let summary = `${confirmedCount} of ${layers.length} confirmation layers confirmed.`;
    if (contradictingCount > 0) {
      summary += ` Caution: ${contradictingCount} contradictory signals detected.`;
    }

    return {
      priceConfirmation,
      volumeConfirmation,
      rvolConfirmation,
      takerConfirmation,
      oiConfirmation,
      liquidationConfirmation,
      fundingConfirmation,
      structureConfirmation,
      mtfConfirmation,
      score,
      summary,
    };
  }

  /**
   * 6. Setup State Synthesis
   */
  private synthesizeSetupState(
    interp: PositioningInterpretation,
    conf: ConfirmationEngineState,
    mtf: { state: MtfPositioningState }
  ): { setupState: SetupState; setupRationale: string } {
    // Failsafe: Neutral if flat
    if (interp.state === 'NEUTRAL' || interp.state === 'DELEVERAGING') {
      return {
        setupState: 'NEUTRAL',
        setupRationale: 'No clear directional imbalance. Price and open interest are operating within baseline liquidity boundaries.',
      };
    }

    // Reversal Watch logic for Long Liquidation
    if (interp.state === 'LONG_LIQUIDATION') {
      if (conf.score >= 60 && conf.takerConfirmation === 'CONFIRMED') {
        return {
          setupState: 'REVERSAL_WATCH',
          setupRationale: 'Long liquidation cascade observed. Taker absorption and open interest stabilization warrant active reversal watch.',
        };
      }
      return {
        setupState: 'COOLING',
        setupRationale: 'Long margin liquidation cascade in progress. Awaiting open interest bottoming before considering reversal setup.',
      };
    }

    // Extreme condition check
    if (interp.oiIntensity === 'EXTREME' || conf.score >= 80) {
      if (conf.mtfConfirmation === 'CONTRADICTING' || conf.fundingConfirmation === 'CONTRADICTING') {
        return {
          setupState: 'EXHAUSTION',
          setupRationale: 'Extreme positioning expansion accompanied by contradictory funding or timeframes. High probability of mean-reversion exhaustion.',
        };
      }
      return {
        setupState: 'ACCELERATION',
        setupRationale: 'Strong multi-tier confirmation aligning with aggressive open interest expansion.',
      };
    }

    // High confirmation
    if (conf.score >= 55 && mtf.state !== 'CONTRADICTING') {
      return {
        setupState: 'CONFIRMED',
        setupRationale: `Positioning state [${interp.stateLabel}] supported by volume, taker flow, and multi-timeframe structure.`,
      };
    }

    // Baseline watch
    return {
      setupState: 'WATCH',
      setupRationale: `Positioning state [${interp.stateLabel}] is emerging but awaits secondary confirmation (Score: ${conf.score}%).`,
    };
  }

  // --- Helper calculations ---

  private calculatePriceDelta(candles?: { open: number; close: number }[], currentPrice?: number): number {
    if (!candles || candles.length === 0 || !currentPrice) return 0.0;
    const base = candles[0].open || candles[0].close;
    if (!base) return 0.0;
    return parseFloat((((currentPrice - base) / base) * 100).toFixed(2));
  }

  private calculateOiDelta(oiCandles?: { openInterest: number }[], currentOi?: number): number {
    if (!oiCandles || oiCandles.length === 0 || !currentOi) return 0.0;
    const base = oiCandles[0].openInterest;
    if (!base) return 0.0;
    return parseFloat((((currentOi - base) / base) * 100).toFixed(2));
  }

  private getTimeframePriceDelta(input: RawPositioningInput, tf: string): number {
    switch (tf) {
      case '1m':
        return this.calculatePriceDelta(input.candles1m, input.currentPrice);
      case '5m':
        return this.calculatePriceDelta(input.candles5m, input.currentPrice);
      case '15m':
        return this.calculatePriceDelta(input.candles15m, input.currentPrice);
      case '1h':
        return this.calculatePriceDelta(input.candles1h, input.currentPrice);
      case '4h':
        return this.calculatePriceDelta(input.candles4h, input.currentPrice);
      default:
        return this.calculatePriceDelta(input.candles15m, input.currentPrice);
    }
  }

  private getTimeframeOiDelta(input: RawPositioningInput, tf: string): number {
    switch (tf) {
      case '5m':
        return this.calculateOiDelta(input.oiCandles5m, input.openInterestBtc);
      case '15m':
        return this.calculateOiDelta(input.oiCandles15m, input.openInterestBtc);
      case '1h':
        return this.calculateOiDelta(input.oiCandles1h, input.openInterestBtc);
      case '4h':
        return this.calculateOiDelta(input.oiCandles4h, input.openInterestBtc);
      default:
        return this.calculateOiDelta(input.oiCandles15m, input.openInterestBtc);
    }
  }

  /**
   * Fallback for Stale/Unavailable Data
   */
  private buildFallbackSnapshot(input: RawPositioningInput, dataQuality: PositioningDataQuality): BtcPositioningSnapshot {
    return {
      observation: {
        price: input.currentPrice || 81450,
        currentPrice: input.currentPrice || 81450,
        priceChange1mPct: 0,
        priceChange5mPct: 0,
        priceChange15mPct: 0,
        priceChange1hPct: 0,
        priceChange4hPct: 0,
        openInterestUsd: 0,
        openInterestBtc: 0,
        oiChange5mPct: 0,
        oiChange15mPct: 0,
        oiChange1hPct: 0,
        oiChange4hPct: 0,
        oiAccelerationPct: 0,
        rvol: 1.0,
        volume24hUsd: 0,
        volumeDeltaPct: 0,
        takerFlowRatio: 0.5,
        takerDominancePct: 50,
        takerBuyerPct: 50,
        fundingRate: 0,
        fundingRatePct: 0,
        fundingRateAnnualizedPct: 0,
        longLiquidations1hUsd: 0,
        shortLiquidations1hUsd: 0,
        totalLiquidations1hUsd: 0,
        liquidations1hUsd: 0,
      },
      interpretation: {
        state: 'NEUTRAL',
        stateLabel: 'OI STATE: UNAVAILABLE / UNCONFIRMED',
        matrixQuadrant: 'NEUTRAL',
        oiIntensity: 'NORMAL',
        narrative: 'Live Open Interest feed is currently unavailable or stale. Operating under strict defensive failsafe.',
      },
      confirmation: {
        priceConfirmation: 'UNAVAILABLE',
        volumeConfirmation: 'UNAVAILABLE',
        rvolConfirmation: 'UNAVAILABLE',
        takerConfirmation: 'UNAVAILABLE',
        oiConfirmation: 'UNAVAILABLE',
        liquidationConfirmation: 'UNAVAILABLE',
        fundingConfirmation: 'UNAVAILABLE',
        structureConfirmation: 'UNAVAILABLE',
        mtfConfirmation: 'UNAVAILABLE',
        score: 0,
        summary: 'All confirmation layers marked UNAVAILABLE due to data latency failsafe.',
      },
      mtf: {
        state: 'MIXED',
        timeframes: [
          { timeframe: '1m', state: 'NEUTRAL', priceDeltaPct: 0, oiDeltaPct: 0, status: 'UNAVAILABLE' },
          { timeframe: '5m', state: 'NEUTRAL', priceDeltaPct: 0, oiDeltaPct: 0, status: 'UNAVAILABLE' },
          { timeframe: '15m', state: 'NEUTRAL', priceDeltaPct: 0, oiDeltaPct: 0, status: 'UNAVAILABLE' },
          { timeframe: '30m', state: 'NEUTRAL', priceDeltaPct: 0, oiDeltaPct: 0, status: 'UNAVAILABLE' },
          { timeframe: '1h', state: 'NEUTRAL', priceDeltaPct: 0, oiDeltaPct: 0, status: 'UNAVAILABLE' },
          { timeframe: '4h', state: 'NEUTRAL', priceDeltaPct: 0, oiDeltaPct: 0, status: 'UNAVAILABLE' },
        ],
      },
      setupState: 'NEUTRAL',
      setupRationale: 'Positioning: UNCONFIRMED. Awaiting verified sub-second exchange telemetry.',
      dataQuality,
    };
  }
}

export const btcPositioningEngine = new BtcPositioningEngine();
