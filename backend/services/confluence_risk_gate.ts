import { InstrumentSpecs } from '../adapters/bybit_demo.ts';

export interface RiskGateConfig {
  riskPerTradePct: number;       // default 0.01 (1.0%)
  maxConcurrentPositions: number;// default 5
  maxLeverage: number;           // default 3
  minStopLossPct: number;        // default 1.5%
  maxStopLossPct: number;        // default 5.0%
  atrMultiplier: number;         // default 1.5
  tpMultipleR: number;           // default 2.0 (2R)
  maxChasePriceMovePct: number;  // default 0.5%
  maxSignalAgeSeconds: number;   // default 60s
  dailyLossLimitPct: number;     // default -3.0%
  timeStopCandles: number;       // default 12 candles
  configVersion: string;         // '1.0.0'
}

export const DEFAULT_RISK_CONFIG: RiskGateConfig = {
  riskPerTradePct: 0.01,
  maxConcurrentPositions: 5,
  maxLeverage: 3,
  minStopLossPct: 1.5,
  maxStopLossPct: 5.0,
  atrMultiplier: 1.5,
  tpMultipleR: 2.0,
  maxChasePriceMovePct: 0.5,
  maxSignalAgeSeconds: 60,
  dailyLossLimitPct: -3.0,
  timeStopCandles: 12,
  configVersion: '1.0.0',
};

export interface OrderSizingPlan {
  allowed: boolean;
  rejectReason?: string;
  qty: string;
  notionalUsd: number;
  marginUsd: number;
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  stopLossPct: number;
  takeProfitPct: number;
  riskAmountUsd: number;
  rMultiple: number;
  leverage: number;
}

export class ConfluenceRiskGate {
  private cfg: RiskGateConfig;

  constructor(cfg: Partial<RiskGateConfig> = {}) {
    this.cfg = { ...DEFAULT_RISK_CONFIG, ...cfg };
  }

  /**
   * Clamps stop loss percentage: clamp(1.5 * atrPct, 1.5%, 5%)
   */
  public calculateStopLossPct(atrPct: number | null | undefined): number {
    const rawSl = (atrPct && atrPct > 0) ? atrPct * this.cfg.atrMultiplier : 2.0;
    return Math.min(Math.max(rawSl, this.cfg.minStopLossPct), this.cfg.maxStopLossPct);
  }

  /**
   * Evaluates order feasibility, sizing, and risk parameters
   */
  public evaluateOrderSizing(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    signalPrice: number;
    currentPrice: number;
    signalTimestampMs: number;
    atrPct: number | null | undefined;
    equityUsd: number;
    currentOpenPositionsCount: number;
    todayRealizedPnlPct: number;
    specs: InstrumentSpecs;
  }): OrderSizingPlan {
    const {
      symbol, side, signalPrice, currentPrice, signalTimestampMs,
      atrPct, equityUsd, currentOpenPositionsCount, todayRealizedPnlPct, specs
    } = params;

    // 1. Daily Loss Limit Guard (realized <= -3%)
    if (todayRealizedPnlPct <= this.cfg.dailyLossLimitPct) {
      return {
        allowed: false,
        rejectReason: `DAILY_LOSS_LIMIT_REACHED (today: ${todayRealizedPnlPct.toFixed(2)}% <= ${this.cfg.dailyLossLimitPct}%)`,
        qty: '0', notionalUsd: 0, marginUsd: 0, entryPrice: currentPrice,
        stopLossPrice: 0, takeProfitPrice: 0, stopLossPct: 0, takeProfitPct: 0,
        riskAmountUsd: 0, rMultiple: this.cfg.tpMultipleR, leverage: this.cfg.maxLeverage,
      };
    }

    // 2. Max Concurrent Positions Guard (<= 5)
    if (currentOpenPositionsCount >= this.cfg.maxConcurrentPositions) {
      return {
        allowed: false,
        rejectReason: `MAX_POSITIONS_REACHED (${currentOpenPositionsCount}/${this.cfg.maxConcurrentPositions})`,
        qty: '0', notionalUsd: 0, marginUsd: 0, entryPrice: currentPrice,
        stopLossPrice: 0, takeProfitPrice: 0, stopLossPct: 0, takeProfitPct: 0,
        riskAmountUsd: 0, rMultiple: this.cfg.tpMultipleR, leverage: this.cfg.maxLeverage,
      };
    }

    // 3. Signal Age Guard (<= 60s)
    const ageSeconds = (Date.now() - signalTimestampMs) / 1000;
    if (ageSeconds > this.cfg.maxSignalAgeSeconds) {
      return {
        allowed: false,
        rejectReason: `CHASE_GUARD_EXPIRED (${ageSeconds.toFixed(1)}s > ${this.cfg.maxSignalAgeSeconds}s)`,
        qty: '0', notionalUsd: 0, marginUsd: 0, entryPrice: currentPrice,
        stopLossPrice: 0, takeProfitPrice: 0, stopLossPct: 0, takeProfitPct: 0,
        riskAmountUsd: 0, rMultiple: this.cfg.tpMultipleR, leverage: this.cfg.maxLeverage,
      };
    }

    // 4. Chase Price Movement Guard (<= 0.5% slippage from signal price)
    const priceMovePct = Math.abs(currentPrice - signalPrice) / signalPrice * 100;
    if (priceMovePct > this.cfg.maxChasePriceMovePct) {
      return {
        allowed: false,
        rejectReason: `CHASE_GUARD_PRICE_MOVED (${priceMovePct.toFixed(2)}% > ${this.cfg.maxChasePriceMovePct}%)`,
        qty: '0', notionalUsd: 0, marginUsd: 0, entryPrice: currentPrice,
        stopLossPrice: 0, takeProfitPrice: 0, stopLossPct: 0, takeProfitPct: 0,
        riskAmountUsd: 0, rMultiple: this.cfg.tpMultipleR, leverage: this.cfg.maxLeverage,
      };
    }

    // 5. SL and TP Math
    const slPct = this.calculateStopLossPct(atrPct);
    const tpPct = slPct * this.cfg.tpMultipleR; // 2R

    let slPrice: number;
    let tpPrice: number;

    if (side === 'BUY') {
      slPrice = currentPrice * (1 - slPct / 100);
      tpPrice = currentPrice * (1 + tpPct / 100);
    } else {
      slPrice = currentPrice * (1 + slPct / 100);
      tpPrice = currentPrice * (1 - tpPct / 100);
    }

    // Round SL and TP to tick size
    const tickDecimals = Math.max(0, Math.round(-Math.log10(specs.tickSize)));
    slPrice = parseFloat(slPrice.toFixed(tickDecimals));
    tpPrice = parseFloat(tpPrice.toFixed(tickDecimals));

    // 6. Position Sizing
    const riskAmount = equityUsd * this.cfg.riskPerTradePct;
    const slDistance = Math.abs(currentPrice - slPrice);
    if (slDistance <= 0) {
      return {
        allowed: false,
        rejectReason: 'INVALID_SL_DISTANCE',
        qty: '0', notionalUsd: 0, marginUsd: 0, entryPrice: currentPrice,
        stopLossPrice: 0, takeProfitPrice: 0, stopLossPct: 0, takeProfitPct: 0,
        riskAmountUsd: 0, rMultiple: this.cfg.tpMultipleR, leverage: this.cfg.maxLeverage,
      };
    }

    const rawQty = riskAmount / slDistance;
    // Step rounding: round down to nearest qtyStep
    const stepDecimals = Math.max(0, Math.round(-Math.log10(specs.qtyStep)));
    const steppedQty = Math.floor(rawQty / specs.qtyStep) * specs.qtyStep;
    const finalQty = Math.max(specs.minOrderQty, parseFloat(steppedQty.toFixed(stepDecimals)));

    const notional = finalQty * currentPrice;
    const margin = notional / this.cfg.maxLeverage;

    // Sizing guard: single position notional margin should not exceed 35% of total equity
    if (margin > equityUsd * 0.35) {
      return {
        allowed: false,
        rejectReason: `MARGIN_EXCEEDS_CAP ($${margin.toFixed(2)} > 35% of $${equityUsd})`,
        qty: '0', notionalUsd: notional, marginUsd: margin, entryPrice: currentPrice,
        stopLossPrice: slPrice, takeProfitPrice: tpPrice, stopLossPct: slPct,
        takeProfitPct: tpPct, riskAmountUsd: riskAmount, rMultiple: this.cfg.tpMultipleR,
        leverage: this.cfg.maxLeverage,
      };
    }

    return {
      allowed: true,
      qty: finalQty.toString(),
      notionalUsd: parseFloat(notional.toFixed(2)),
      marginUsd: parseFloat(margin.toFixed(2)),
      entryPrice: currentPrice,
      stopLossPrice: slPrice,
      takeProfitPrice: tpPrice,
      stopLossPct: parseFloat(slPct.toFixed(2)),
      takeProfitPct: parseFloat(tpPct.toFixed(2)),
      riskAmountUsd: parseFloat(riskAmount.toFixed(2)),
      rMultiple: this.cfg.tpMultipleR,
      leverage: this.cfg.maxLeverage,
    };
  }
}
