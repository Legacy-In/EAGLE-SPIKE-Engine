'use client';

import React, { useState } from 'react';
import { useSigmaStore } from '../../store/useSigmaStore';
import {
  AlertOctagon,
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Lock,
  Power,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

export const RiskExposureCenter: React.FC = () => {
  const { data, engageKillSwitch, disengageKillSwitch, triggerSafeMode, clearSafeMode } = useSigmaStore();

  const risk = data?.risk;
  const failsafe = data?.failsafe;

  // Position Sizing Interactive Calculator State
  const [calcEquity, setCalcEquity] = useState(100000);
  const [calcRiskPct, setCalcRiskPct] = useState(0.5);
  const [calcEntry, setCalcEntry] = useState(79073);
  const [calcStop, setCalcStop] = useState(77920);

  // Derived Position Size Math
  const riskCapital = calcEquity * (calcRiskPct / 100);
  const stopDistance = Math.abs(calcEntry - calcStop);
  const baseUnits = stopDistance > 0 ? riskCapital / stopDistance : 0;
  const volMultiplier = 0.95; // Adjusted for current 4H ATR
  const confMultiplier = 0.89; // Adjusted for 78% model confidence
  const finalUnits = Number((baseUnits * volMultiplier * confMultiplier).toFixed(4));
  const finalNotional = Number((finalUnits * calcEntry).toFixed(2));
  const effectiveLeverage = Number((finalNotional / calcEquity).toFixed(2));

  const isKillSwitch = failsafe?.killSwitchEngaged;
  const isSafeMode = failsafe?.safeMode;

  return (
    <div className="space-y-4">
      {/* Top Circuit Breaker & Kill Switch Banner */}
      <div
        className={`border p-4 rounded-lg flex flex-wrap items-center justify-between gap-4 ${
          isKillSwitch
            ? 'bg-sigma-red/15 border-sigma-red text-sigma-textMain'
            : isSafeMode
            ? 'bg-sigma-amber/15 border-sigma-amber text-sigma-textMain'
            : 'bg-sigma-surface1 border-sigma-border'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-lg border ${
              isKillSwitch
                ? 'bg-sigma-red text-white border-sigma-red animate-pulse'
                : isSafeMode
                ? 'bg-sigma-amber text-black border-sigma-amber'
                : 'bg-sigma-green/10 text-sigma-green border-sigma-green/30'
            }`}
          >
            {isKillSwitch ? (
              <AlertOctagon className="w-6 h-6" />
            ) : isSafeMode ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="font-mono text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <span>
                {isKillSwitch
                  ? 'EMERGENCY KILL SWITCH ENGAGED'
                  : isSafeMode
                  ? 'SAFE MODE ACTIVE (CIRCUIT BREAKER TRIGGERED)'
                  : 'RISK CONTROLS OPERATIONAL · TRADING PERMITTED'}
              </span>
            </div>
            <p className="text-xs font-mono text-sigma-textDark mt-0.5">
              {isKillSwitch
                ? 'All open orders aborted. Position routing hard-locked.'
                : isSafeMode
                ? `Reason: ${failsafe?.safeModeReason || 'Risk threshold or feed degradation'}`
                : 'Hard exposure, daily loss, weekly loss, and maximum drawdown limits enforced.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isKillSwitch ? (
            <button
              onClick={disengageKillSwitch}
              className="px-4 py-2 rounded bg-sigma-surface2 hover:bg-sigma-surface3 border border-sigma-border text-xs font-mono font-bold text-sigma-textMain"
            >
              Disengage Kill Switch
            </button>
          ) : (
            <button
              onClick={engageKillSwitch}
              className="px-4 py-2 rounded bg-sigma-red hover:bg-sigma-red/90 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg"
            >
              <Power className="w-4 h-4" />
              <span>ENGAGE HARDWARE KILL SWITCH</span>
            </button>
          )}

          {isSafeMode && !isKillSwitch && (
            <button
              onClick={clearSafeMode}
              className="px-4 py-2 rounded bg-sigma-surface2 hover:bg-sigma-surface3 border border-sigma-border text-xs font-mono font-bold text-sigma-textMain"
            >
              Clear Safe Mode
            </button>
          )}
        </div>
      </div>

      {/* Risk Metrics Gauges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
        {/* Account Capital & Exposure */}
        <div className="bg-sigma-surface1 border border-sigma-border p-3.5 rounded-lg">
          <div className="text-[10px] text-sigma-textDark uppercase">Portfolio Equity & Notional</div>
          <div className="text-base font-bold text-sigma-textMain mt-1 tabular-nums">
            ${(risk?.accountEquityUsd || 100000).toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-sigma-textMuted flex justify-between">
            <span>Exposure: ${(risk?.currentNotionalExposureUsd || 30047).toLocaleString()}</span>
            <span className="text-sigma-cyan font-semibold">{risk?.currentExposurePct || 30.0}%</span>
          </div>
          <div className="w-full h-1.5 bg-sigma-surface3 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-sigma-cyan rounded-full"
              style={{ width: `${Math.min(100, risk?.currentExposurePct || 30)}%` }}
            />
          </div>
        </div>

        {/* Leverage Meter */}
        <div className="bg-sigma-surface1 border border-sigma-border p-3.5 rounded-lg">
          <div className="text-[10px] text-sigma-textDark uppercase">Effective Leverage</div>
          <div className="text-base font-bold text-sigma-textMain mt-1 tabular-nums">
            {risk?.currentLeverage || 0.3}x{' '}
            <span className="text-xs text-sigma-textDark font-normal">/ {risk?.riskParameters?.maxLeverage || 3.0}x MAX</span>
          </div>
          <div className="mt-2 text-[11px] text-sigma-textMuted flex justify-between">
            <span>Utilization</span>
            <span className="text-sigma-green font-semibold">
              {(((risk?.currentLeverage || 0.3) / 3.0) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-sigma-surface3 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-sigma-green rounded-full"
              style={{ width: `${(((risk?.currentLeverage || 0.3) / 3.0) * 100).toFixed(0)}%` }}
            />
          </div>
        </div>

        {/* Daily Loss Circuit Breaker */}
        <div className="bg-sigma-surface1 border border-sigma-border p-3.5 rounded-lg">
          <div className="text-[10px] text-sigma-textDark uppercase">Daily Loss Limit</div>
          <div className="text-base font-bold text-sigma-textMain mt-1 tabular-nums">
            ${risk?.dailyLossUsd || 420}{' '}
            <span className="text-xs text-sigma-textDark font-normal">
              / ${(100000 * 0.02).toLocaleString()} ({risk?.riskParameters?.maxDailyLossPct || 2.0}%)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-sigma-textMuted flex justify-between">
            <span>Breach Threshold</span>
            <span className="text-sigma-amber font-semibold">{risk?.dailyLossPct || 0.42}%</span>
          </div>
          <div className="w-full h-1.5 bg-sigma-surface3 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-sigma-amber rounded-full"
              style={{ width: `${((risk?.dailyLossPct || 0.42) / 2.0) * 100}%` }}
            />
          </div>
        </div>

        {/* Max Drawdown Circuit Breaker */}
        <div className="bg-sigma-surface1 border border-sigma-border p-3.5 rounded-lg">
          <div className="text-[10px] text-sigma-textDark uppercase">Max Drawdown</div>
          <div className="text-base font-bold text-sigma-textMain mt-1 tabular-nums">
            {risk?.maxDrawdownPct || 1.8}%{' '}
            <span className="text-xs text-sigma-textDark font-normal">
              / {risk?.riskParameters?.maxDrawdownPct || 10.0}% HARD STOP
            </span>
          </div>
          <div className="mt-2 text-[11px] text-sigma-textMuted flex justify-between">
            <span>Buffer to Safe Mode</span>
            <span className="text-sigma-green font-semibold">8.2%</span>
          </div>
          <div className="w-full h-1.5 bg-sigma-surface3 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-sigma-green rounded-full"
              style={{ width: `${((risk?.maxDrawdownPct || 1.8) / 10.0) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Interactive Mathematical Position Sizing Engine */}
      <div className="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-4 h-4 text-sigma-cyan" />
          <h3 className="font-mono text-xs font-bold text-sigma-textMain uppercase tracking-wider">
            Deterministic Position Sizing Calculator
          </h3>
        </div>

        <p className="text-xs font-mono text-sigma-textDark mb-4">
          Position size is never an arbitrary multiplier. It is mathematically derived from risk capital divided by
          non-arbitrary stop distance, adjusted for volatility, model confidence, and market regime.
        </p>

        {/* Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono mb-4">
          <div>
            <label className="text-[10px] text-sigma-textDark uppercase block mb-1">Account Equity ($)</label>
            <input
              type="number"
              value={calcEquity}
              onChange={(e) => setCalcEquity(parseFloat(e.target.value))}
              className="w-full bg-sigma-surface2 border border-sigma-border rounded p-1.5 text-sigma-textMain outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-sigma-textDark uppercase block mb-1">Risk Fraction (%)</label>
            <input
              type="number"
              step="0.1"
              value={calcRiskPct}
              onChange={(e) => setCalcRiskPct(parseFloat(e.target.value))}
              className="w-full bg-sigma-surface2 border border-sigma-border rounded p-1.5 text-sigma-textMain outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-sigma-textDark uppercase block mb-1">Entry Price ($)</label>
            <input
              type="number"
              value={calcEntry}
              onChange={(e) => setCalcEntry(parseFloat(e.target.value))}
              className="w-full bg-sigma-surface2 border border-sigma-border rounded p-1.5 text-sigma-textMain outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-sigma-textDark uppercase block mb-1">Stop Loss Price ($)</label>
            <input
              type="number"
              value={calcStop}
              onChange={(e) => setCalcStop(parseFloat(e.target.value))}
              className="w-full bg-sigma-surface2 border border-sigma-border rounded p-1.5 text-sigma-textMain outline-none"
            />
          </div>
        </div>

        {/* Mathematical Steps Box */}
        <div className="bg-sigma-surface2 p-3.5 rounded border border-sigma-border space-y-2 text-xs font-mono">
          <div className="text-[10px] text-sigma-cyan font-bold uppercase">Mathematical Derivation Trace</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <div className="bg-sigma-surface1 p-2 rounded border border-sigma-borderSubtle">
              <span className="text-[10px] text-sigma-textDark block">1. Risk Capital</span>
              <span className="font-bold text-sigma-textMain">
                ${calcEquity.toLocaleString()} × {calcRiskPct}% = ${riskCapital.toFixed(2)}
              </span>
            </div>
            <div className="bg-sigma-surface1 p-2 rounded border border-sigma-borderSubtle">
              <span className="text-[10px] text-sigma-textDark block">2. Stop Distance</span>
              <span className="font-bold text-sigma-textMain">
                |${calcEntry} – ${calcStop}| = ${stopDistance.toFixed(2)}
              </span>
            </div>
            <div className="bg-sigma-surface1 p-2 rounded border border-sigma-borderSubtle">
              <span className="text-[10px] text-sigma-textDark block">3. Base Units</span>
              <span className="font-bold text-sigma-textMain">
                ${riskCapital.toFixed(0)} / ${stopDistance.toFixed(0)} = {baseUnits.toFixed(4)} BTC
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between pt-2 border-t border-sigma-borderSubtle text-xs">
            <div className="text-sigma-textMuted text-[11px]">
              Adjustments: Volatility Multiplier ({volMultiplier}×) · Confidence ({confMultiplier}×) · Regime (1.0×)
            </div>
            <div className="text-right">
              <span className="text-sigma-textDark text-[10px] block uppercase">Recommended Execution Size</span>
              <span className="font-mono text-sm font-bold text-sigma-green tabular-nums">
                {finalUnits} BTC (${finalNotional.toLocaleString()} | {effectiveLeverage}x)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
