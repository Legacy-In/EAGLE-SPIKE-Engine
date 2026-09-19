'use client';

import React from 'react';
import { Activity, AlertTriangle, ArrowUpRight, Gauge, ShieldAlert, TrendingUp } from 'lucide-react';
import { DerivativesMetrics } from '../../../../packages/types';

interface DerivativesWidgetProps {
  derivatives: DerivativesMetrics;
}

export const DerivativesWidget: React.FC<DerivativesWidgetProps> = ({ derivatives }) => {
  const funding = derivatives?.fundingRate || 0.00008;
  const fundingAnnualized = derivatives?.fundingRateAnnualizedPct || 8.76;
  const oiUsd = derivatives?.openInterestUsd || 18450000000;
  const oiChange = derivatives?.oiChange24hPct || 4.2;
  const basis = derivatives?.basisAnnualizedPct || 7.15;
  const longLiq = derivatives?.longLiquidations24hUsd || 42000000;
  const shortLiq = derivatives?.shortLiquidations24hUsd || 18000000;
  const iv = derivatives?.impliedVolatility30d || 51.8;
  const skew = derivatives?.optionsSkew25Delta || -2.1;
  const interp = derivatives?.interpretation;

  return (
    <div className="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sigma-purple" />
          <h3 className="font-mono text-xs font-bold text-sigma-textMain uppercase tracking-wider">
            Derivatives & Positioning Intelligence
          </h3>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="text-sigma-textDark">OI DIVERGENCE:</span>
          <span className="text-sigma-green font-bold">ORGANIC EXPANSION</span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs font-mono">
        <div className="bg-sigma-surface2 p-2.5 rounded border border-sigma-border">
          <div className="text-[10px] text-sigma-textDark uppercase">Funding Rate (8h)</div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-bold text-sigma-green tabular-nums">
              +{(funding * 100).toFixed(3)}%
            </span>
            <span className="text-[10px] text-sigma-textDark">({fundingAnnualized}% Ann.)</span>
          </div>
        </div>

        <div className="bg-sigma-surface2 p-2.5 rounded border border-sigma-border">
          <div className="text-[10px] text-sigma-textDark uppercase">Open Interest</div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-bold text-sigma-textMain tabular-nums">
              ${(oiUsd / 1e9).toFixed(2)}B
            </span>
            <span className="text-[10px] text-sigma-green font-semibold">+{oiChange}%</span>
          </div>
        </div>

        <div className="bg-sigma-surface2 p-2.5 rounded border border-sigma-border">
          <div className="text-[10px] text-sigma-textDark uppercase">Annualized Basis</div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-bold text-sigma-cyan tabular-nums">+{basis}%</span>
            <span className="text-[10px] text-sigma-textDark">Normal Contango</span>
          </div>
        </div>

        <div className="bg-sigma-surface2 p-2.5 rounded border border-sigma-border">
          <div className="text-[10px] text-sigma-textDark uppercase">25-Delta Options Skew</div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-bold text-sigma-green tabular-nums">{skew}%</span>
            <span className="text-[10px] text-sigma-textDark">Call Premium</span>
          </div>
        </div>
      </div>

      {/* Liquidations Breakdown */}
      <div className="mb-3 bg-sigma-surface2 p-2.5 rounded border border-sigma-border">
        <div className="flex items-center justify-between text-[10px] font-mono text-sigma-textDark uppercase mb-1.5">
          <span>24h Liquidations Cascade</span>
          <span className="font-bold text-sigma-textMain">
            Total: ${((longLiq + shortLiq) / 1e6).toFixed(1)}M
          </span>
        </div>
        <div className="w-full h-2 rounded bg-sigma-surface3 overflow-hidden flex">
          <div
            className="h-full bg-sigma-red transition-all"
            style={{ width: `${(longLiq / (longLiq + shortLiq)) * 100}%` }}
          />
          <div
            className="h-full bg-sigma-green transition-all"
            style={{ width: `${(shortLiq / (longLiq + shortLiq)) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono mt-1">
          <span className="text-sigma-red font-medium">Long Liqs: ${(longLiq / 1e6).toFixed(1)}M</span>
          <span className="text-sigma-green font-medium">Short Liqs: ${(shortLiq / 1e6).toFixed(1)}M</span>
        </div>
      </div>

      {/* Institutional Interpretation Note */}
      {interp && (
        <div className="p-2.5 rounded bg-sigma-surface2/60 border border-sigma-border font-mono text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-sigma-cyan uppercase">{interp.event}</span>
            <span className="text-[10px] text-sigma-textDark">Confidence: {interp.confidence}%</span>
          </div>
          <p className="text-[11px] text-sigma-textMuted leading-relaxed">{interp.description}</p>
        </div>
      )}
    </div>
  );
};
