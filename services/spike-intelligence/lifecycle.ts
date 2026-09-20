/**
 * 🦅 EAGLE FLASH — Spike Lifecycle State Machine
 * Implements 9 deterministic lifecycle states with anti-flicker hysteresis, confirmation windows,
 * and dynamic invalidation tracking.
 */

import { SpikeLifecycleState } from './types';

export interface LifecycleTransitionContext {
  rvol5m: number;
  volumeZ: number;
  returns5m: number;
  returns15m: number;
  takerImbalancePct: number;
  rsi: number;
  spreadPct: number;
  currentPrice: number;
  peakPrice: number;
  troughPrice: number;
  currentState: SpikeLifecycleState;
  stateEnteredTimestamp: number;
  direction?: 'LONG' | 'SHORT';
  now: number;
}

export interface LifecycleEvaluationResult {
  nextState: SpikeLifecycleState;
  stateChanged: boolean;
  reason: string;
  invalidationTriggered: boolean;
}

export class SpikeLifecycleStateMachine {
  private minStateDurationMs: number;

  constructor(minStateDurationMs: number = 30000) {
    this.minStateDurationMs = minStateDurationMs;
  }

  /**
   * Deterministically evaluates the next lifecycle state.
   */
  public evaluate(ctx: LifecycleTransitionContext): LifecycleEvaluationResult {
    const timeInState = Math.max(0, ctx.now - ctx.stateEnteredTimestamp);
    const absRet5m = Math.abs(ctx.returns5m);
    const absRet15m = Math.abs(ctx.returns15m);
    const isBullishSpike = ctx.direction ? ctx.direction === 'LONG' : (ctx.returns15m >= 0 || ctx.returns5m >= 0);

    // Measure drawdown from peak (for bullish spikes) or rebound from trough (for bearish spikes)
    let adverseRetFromPeak = 0;
    if (isBullishSpike) {
      if (ctx.peakPrice > 0 && ctx.currentPrice < ctx.peakPrice) {
        adverseRetFromPeak = ((ctx.currentPrice - ctx.peakPrice) / ctx.peakPrice) * 100;
      }
    } else {
      if (ctx.troughPrice > 0 && ctx.currentPrice > ctx.troughPrice) {
        adverseRetFromPeak = -(((ctx.currentPrice - ctx.troughPrice) / ctx.troughPrice) * 100);
      }
    }

    // Check Invalidation / Reversal first
    if (['EARLY_SPIKE', 'ACCELERATION', 'EXTREME', 'EXHAUSTION', 'COOLING'].includes(ctx.currentState)) {
      // If price moved adverse by > 3.5% from peak, or adverse taker flow surged
      if (adverseRetFromPeak <= -3.5 || (isBullishSpike && ctx.takerImbalancePct < -40 && ctx.returns5m < -1.0)) {
        return {
          nextState: 'REVERSAL',
          stateChanged: ctx.currentState !== 'REVERSAL',
          reason: `Adverse price movement (${adverseRetFromPeak.toFixed(1)}%) broke structural invalidation threshold`,
          invalidationTriggered: true,
        };
      }
    }

    // State Transitions
    switch (ctx.currentState) {
      case 'NORMAL': {
        // Condition for PRE_SPIKE: Volume anomaly building before massive price expansion
        if (ctx.rvol5m >= 1.8 && ctx.volumeZ >= 1.8 && absRet5m < 1.5) {
          return { nextState: 'PRE_SPIKE', stateChanged: true, reason: 'Elevated volume accumulation detected prior to price breakout', invalidationTriggered: false };
        }
        // Direct EARLY_SPIKE trigger
        if (ctx.rvol5m >= 2.2 && absRet5m >= 1.5) {
          return { nextState: 'EARLY_SPIKE', stateChanged: true, reason: 'Simultaneous volume expansion and directional price displacement', invalidationTriggered: false };
        }
        return { nextState: 'NORMAL', stateChanged: false, reason: 'Within baseline scanning parameters', invalidationTriggered: false };
      }

      case 'PRE_SPIKE': {
        if (ctx.rvol5m >= 2.2 && absRet5m >= 1.5) {
          return { nextState: 'EARLY_SPIKE', stateChanged: true, reason: 'Breakout impulse confirmed from pre-spike accumulation', invalidationTriggered: false };
        }
        // If volume fades without price moving
        if (timeInState > this.minStateDurationMs && ctx.rvol5m < 1.4) {
          return { nextState: 'NORMAL', stateChanged: true, reason: 'Pre-spike volume anomaly subsided without breakout', invalidationTriggered: false };
        }
        return { nextState: 'PRE_SPIKE', stateChanged: false, reason: 'Pre-spike volume compression active', invalidationTriggered: false };
      }

      case 'EARLY_SPIKE': {
        // Transition to ACCELERATION if velocity and taker flow expand
        if (ctx.rvol5m >= 2.8 && absRet5m >= 2.5 && Math.abs(ctx.takerImbalancePct) >= 20) {
          return { nextState: 'ACCELERATION', stateChanged: true, reason: 'Order flow and velocity accelerating across multi-timeframe horizons', invalidationTriggered: false };
        }
        // Direct jump to EXTREME
        if (ctx.rvol5m >= 5.0 || ctx.volumeZ >= 4.5 || ctx.rsi >= 82 || ctx.rsi <= 18) {
          return { nextState: 'EXTREME', stateChanged: true, reason: 'Statistical outlier: extreme volume and momentum expansion', invalidationTriggered: false };
        }
        // Cooling if momentum stalls
        if (timeInState > this.minStateDurationMs && ctx.rvol5m < 1.8 && absRet5m < 0.8) {
          return { nextState: 'COOLING', stateChanged: true, reason: 'Early spike momentum normalized into range consolidation', invalidationTriggered: false };
        }
        return { nextState: 'EARLY_SPIKE', stateChanged: false, reason: 'Early spike wave in progress', invalidationTriggered: false };
      }

      case 'ACCELERATION': {
        // Transition to EXTREME
        if (ctx.rvol5m >= 4.5 || ctx.volumeZ >= 4.0 || ctx.rsi >= 80 || ctx.rsi <= 20) {
          return { nextState: 'EXTREME', stateChanged: true, reason: 'Volume Z-Score and RSI reached climax thresholds', invalidationTriggered: false };
        }
        // Transition to EXHAUSTION: Delta divergence or high wicks
        if (timeInState > this.minStateDurationMs) {
          const deltaDivergence = (isBullishSpike && ctx.takerImbalancePct < -15) || (!isBullishSpike && ctx.takerImbalancePct > 15);
          if (deltaDivergence || (ctx.rvol5m >= 3.0 && absRet5m < 0.5)) {
            return { nextState: 'EXHAUSTION', stateChanged: true, reason: 'Volume climax with stalled price progress (Delta Divergence)', invalidationTriggered: false };
          }
        }
        // Cooling
        if (timeInState > this.minStateDurationMs && ctx.rvol5m < 2.0 && absRet5m < 1.0) {
          return { nextState: 'COOLING', stateChanged: true, reason: 'Acceleration wave completed; entered cooling phase', invalidationTriggered: false };
        }
        return { nextState: 'ACCELERATION', stateChanged: false, reason: 'Strong velocity and momentum expansion ongoing', invalidationTriggered: false };
      }

      case 'EXTREME': {
        // From EXTREME, either EXHAUSTION or COOLING
        if (timeInState > this.minStateDurationMs) {
          if (adverseRetFromPeak <= -1.8 || (isBullishSpike && ctx.takerImbalancePct < -20)) {
            return { nextState: 'EXHAUSTION', stateChanged: true, reason: 'Climax reached; seller absorption detected at top', invalidationTriggered: false };
          }
          if (ctx.rvol5m < 3.0) {
            return { nextState: 'COOLING', stateChanged: true, reason: 'Extreme velocity tapering down into cooling phase', invalidationTriggered: false };
          }
        }
        return { nextState: 'EXTREME', stateChanged: false, reason: 'Climax volatility state active', invalidationTriggered: false };
      }

      case 'EXHAUSTION': {
        if (timeInState > this.minStateDurationMs) {
          if (adverseRetFromPeak <= -3.0) {
            return { nextState: 'REVERSAL', stateChanged: true, reason: 'Exhaustion resolved into aggressive counter-trend reversal', invalidationTriggered: true };
          }
          if (ctx.rvol5m < 1.8 && absRet5m < 1.0) {
            return { nextState: 'COOLING', stateChanged: true, reason: 'Exhaustion subsided into calm consolidation', invalidationTriggered: false };
          }
        }
        return { nextState: 'EXHAUSTION', stateChanged: false, reason: 'Exhaustion absorption ongoing', invalidationTriggered: false };
      }

      case 'COOLING': {
        // Transition to CONTINUATION: Secondary breakout in original trend
        if (timeInState > 20000 && ctx.rvol5m >= 2.2 && ((isBullishSpike && ctx.returns5m >= 1.5) || (!isBullishSpike && ctx.returns5m <= -1.5))) {
          return { nextState: 'CONTINUATION', stateChanged: true, reason: 'Secondary impulse resumed following consolidation', invalidationTriggered: false };
        }
        // Return to NORMAL after prolonged cooling
        if (timeInState > 120000 && ctx.rvol5m < 1.3 && absRet5m < 0.6) {
          return { nextState: 'NORMAL', stateChanged: true, reason: 'Cooling cycle finished; symbol returned to baseline', invalidationTriggered: false };
        }
        return { nextState: 'COOLING', stateChanged: false, reason: 'Orderly consolidation and volatility contraction', invalidationTriggered: false };
      }

      case 'CONTINUATION': {
        if (ctx.rvol5m >= 3.5 || ctx.volumeZ >= 3.5) {
          return { nextState: 'ACCELERATION', stateChanged: true, reason: 'Continuation expanded into secondary acceleration wave', invalidationTriggered: false };
        }
        if (timeInState > this.minStateDurationMs && ctx.rvol5m < 1.6) {
          return { nextState: 'COOLING', stateChanged: true, reason: 'Continuation wave consolidated', invalidationTriggered: false };
        }
        return { nextState: 'CONTINUATION', stateChanged: false, reason: 'Continuation trend active', invalidationTriggered: false };
      }

      case 'REVERSAL': {
        if (timeInState > 90000 && ctx.rvol5m < 1.3) {
          return { nextState: 'NORMAL', stateChanged: true, reason: 'Reversal impulse stabilized back to normal market baseline', invalidationTriggered: false };
        }
        return { nextState: 'REVERSAL', stateChanged: false, reason: 'Counter-trend reversal state active', invalidationTriggered: true };
      }
    }

    return { nextState: ctx.currentState, stateChanged: false, reason: 'Holding state', invalidationTriggered: false };
  }
}

export const spikeLifecycleEngine = new SpikeLifecycleStateMachine();
