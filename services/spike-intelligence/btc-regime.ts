/**
 * 🦅 EAGLE FLASH — Bitcoin Macro Regime Engine
 * Evaluates BTC velocity, volatility, and market-wide breadth to determine systemic risk posture.
 */

import { BtcRegime } from './types';

export interface BtcMarketContext {
  btcPrice: number;
  btcReturns5m: number;
  btcReturns15m: number;
  btcReturns1h: number;
  btcReturns24h: number;
  btcVolume24hUsd: number;
  marketAdvancingPct: number; // 0 - 100%
  volatilityIndex?: number;
}

export class BtcRegimeEngine {
  /**
   * Evaluates the BTC regime objectively.
   */
  public static evaluateRegime(ctx: BtcMarketContext): {
    regime: BtcRegime;
    summary: string;
    riskMultiplier: number;
  } {
    const abs5m = Math.abs(ctx.btcReturns5m);
    const abs1h = Math.abs(ctx.btcReturns1h);

    // 1. Extreme BTC Volatility (>1.5% in 5m or >3% in 1h) -> Dislocates altcoin spikes
    if (abs5m >= 1.5 || abs1h >= 3.0) {
      return {
        regime: 'HIGH_VOLATILITY',
        summary: `BTC experiencing high volatility (${ctx.btcReturns5m > 0 ? '+' : ''}${ctx.btcReturns5m.toFixed(2)}% in 5m); altcoin spikes carry higher tail-risk`,
        riskMultiplier: 1.5,
      };
    }

    // 2. Risk Off: BTC falling and market breadth collapsing (<35% advancing)
    if (ctx.btcReturns1h <= -1.2 && ctx.marketAdvancingPct < 35) {
      return {
        regime: 'RISK_OFF',
        summary: `Systemic Risk-Off: BTC down ${ctx.btcReturns1h.toFixed(2)}% with only ${ctx.marketAdvancingPct}% symbols advancing`,
        riskMultiplier: 1.8,
      };
    }

    // 3. Risk On: BTC advancing with strong breadth (>65% advancing)
    if (ctx.btcReturns1h >= 1.0 && ctx.marketAdvancingPct >= 65) {
      return {
        regime: 'RISK_ON',
        summary: `Broad Risk-On: BTC surging with ${ctx.marketAdvancingPct}% market-wide breadth expansion`,
        riskMultiplier: 0.8,
      };
    }

    // 4. Bullish Trend
    if (ctx.btcReturns24h > 1.5 && ctx.btcReturns1h >= 0.2) {
      return {
        regime: 'BULLISH',
        summary: `BTC structural uptrend: +${ctx.btcReturns24h.toFixed(2)}% 24h`,
        riskMultiplier: 0.9,
      };
    }

    // 5. Bearish Trend
    if (ctx.btcReturns24h < -1.5 && ctx.btcReturns1h <= -0.2) {
      return {
        regime: 'BEARISH',
        summary: `BTC structural downtrend: ${ctx.btcReturns24h.toFixed(2)}% 24h`,
        riskMultiplier: 1.4,
      };
    }

    // 6. Mixed Breadth vs BTC
    if ((ctx.btcReturns1h > 0 && ctx.marketAdvancingPct < 40) || (ctx.btcReturns1h < 0 && ctx.marketAdvancingPct > 60)) {
      return {
        regime: 'MIXED',
        summary: 'Divergence between BTC direction and altcoin market breadth',
        riskMultiplier: 1.2,
      };
    }

    // Default Neutral
    return {
      regime: 'NEUTRAL',
      summary: 'BTC consolidating within normal volatility bands; market breadth balanced',
      riskMultiplier: 1.0,
    };
  }
}
