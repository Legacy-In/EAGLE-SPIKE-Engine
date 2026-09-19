/**
 * SIGMA — Institutional Risk Engine & Position Sizing Service
 */

import { DEFAULT_RISK_PARAMETERS } from '../../packages/config';
import { calculatePositionSize } from '../../packages/math';
import { PositionSizeCalculation, RiskParameters } from '../../packages/types';
import { failsafeController } from '../../infrastructure/failsafe';
import { signalEngineService } from '../signals';

export interface RiskStatusReport {
  accountEquityUsd: number;
  availableMarginUsd: number;
  currentNotionalExposureUsd: number;
  currentExposurePct: number;
  dailyLossUsd: number;
  dailyLossPct: number;
  weeklyLossUsd: number;
  weeklyLossPct: number;
  maxDrawdownPct: number;
  currentLeverage: number;
  riskParameters: RiskParameters;
  tradingAllowed: boolean;
  blockReason?: string;
}

class RiskEngineService {
  private riskParams: RiskParameters = { ...DEFAULT_RISK_PARAMETERS };
  private accountEquity = 100000.0; // $100,000 Institutional Paper Capital
  private dailyLoss = 420.0; // $420 current daily loss
  private weeklyLoss = 980.0;
  private currentDrawdownPct = 1.8;

  public getRiskStatus(currentPositionsNotional = 31000.0): RiskStatusReport {
    const failsafe = failsafeController.getState();
    const currentExposurePct = Number(((currentPositionsNotional / this.accountEquity) * 100).toFixed(1));
    const currentLeverage = Number((currentPositionsNotional / this.accountEquity).toFixed(2));
    const dailyLossPct = Number(((this.dailyLoss / this.accountEquity) * 100).toFixed(2));
    const weeklyLossPct = Number(((this.weeklyLoss / this.accountEquity) * 100).toFixed(2));

    let tradingAllowed = true;
    let blockReason: string | undefined;

    if (failsafe.killSwitchEngaged) {
      tradingAllowed = false;
      blockReason = 'EMERGENCY KILL SWITCH ENGAGED';
    } else if (failsafe.safeMode) {
      tradingAllowed = false;
      blockReason = `SAFE MODE ACTIVE: ${failsafe.safeModeReason || 'Circuit breaker triggered'}`;
    } else if (dailyLossPct >= this.riskParams.maxDailyLossPct) {
      tradingAllowed = false;
      blockReason = `DAILY LOSS LIMIT REACHED (${dailyLossPct}% >= ${this.riskParams.maxDailyLossPct}%)`;
      failsafeController.triggerSafeMode(blockReason);
    } else if (this.currentDrawdownPct >= this.riskParams.maxDrawdownPct) {
      tradingAllowed = false;
      blockReason = `MAX DRAWDOWN LIMIT BREACHED (${this.currentDrawdownPct}% >= ${this.riskParams.maxDrawdownPct}%)`;
      failsafeController.triggerSafeMode(blockReason);
    } else if (currentLeverage >= this.riskParams.maxLeverage) {
      tradingAllowed = false;
      blockReason = `MAX LEVERAGE REACHED (${currentLeverage}x >= ${this.riskParams.maxLeverage}x)`;
    }

    return {
      accountEquityUsd: this.accountEquity,
      availableMarginUsd: this.accountEquity - currentPositionsNotional / this.riskParams.maxLeverage,
      currentNotionalExposureUsd: currentPositionsNotional,
      currentExposurePct,
      dailyLossUsd: this.dailyLoss,
      dailyLossPct,
      weeklyLossUsd: this.weeklyLoss,
      weeklyLossPct,
      maxDrawdownPct: this.currentDrawdownPct,
      currentLeverage,
      riskParameters: { ...this.riskParams },
      tradingAllowed,
      blockReason,
    };
  }

  public updateParameters(newParams: Partial<RiskParameters>) {
    this.riskParams = { ...this.riskParams, ...newParams };
  }

  public calculateSizingForSignal(entryPrice: number, stopLossPrice: number): PositionSizeCalculation {
    const signal = signalEngineService.getPrimarySignal();
    const regime = signalEngineService.evaluateRegime();

    return calculatePositionSize({
      accountEquityUsd: this.accountEquity,
      entryPrice,
      stopLossPrice,
      atrPct: 0.022,
      modelConfidenceScore: signal.modelConfidence,
      regimeType: regime.currentRegime,
      riskParams: this.riskParams,
    });
  }

  public getAccountEquity(): number {
    return this.accountEquity;
  }

  public updateEquity(newEquity: number) {
    this.accountEquity = newEquity;
  }
}

export const riskEngineService = new RiskEngineService();
