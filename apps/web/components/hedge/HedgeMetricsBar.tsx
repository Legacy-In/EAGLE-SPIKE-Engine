'use client';

import React from 'react';
import { ShieldCheck, BarChart3, Layers, AlertCircle, Compass } from 'lucide-react';
import { HedgeDashboardData } from './useBinanceHedgeStream';

interface HedgeMetricsBarProps {
  data: HedgeDashboardData | null;
}

export const HedgeMetricsBar: React.FC<HedgeMetricsBarProps> = ({ data }) => {
  const dynamicRange = data?.dynamicRange;
  const technicalHealth = data?.technicalHealth;
  const hedgeStrategy = data?.hedgeStrategy;

  const marketStructure = dynamicRange?.marketStructure || 'CONSOLIDATION';
  const isBreakout = marketStructure === 'BREAKOUT_WATCH';
  const oiDelta = technicalHealth?.openInterest?.delta24hPct ?? 3.42;
  const isOiPositive = oiDelta >= 0;

  const s1 = dynamicRange?.support1 || 66480;
  const s2 = dynamicRange?.support2 || 64790;
  const r1 = dynamicRange?.resistance1 || 69200;
  const r2 = dynamicRange?.resistance2 || 70890;

  const leverageSetting = hedgeStrategy?.capitalProfile?.leverage || '5x Isolated';
  const liquidationBuffer = hedgeStrategy?.longPosition?.liquidationBufferPct || 42.5;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Market Structure Status */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 backdrop-blur shadow-lg flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Market Structure</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-extrabold font-mono tracking-wide px-2 py-0.5 rounded ${
                isBreakout
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                  : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
              }`}
            >
              {isBreakout ? 'BREAKOUT EXPANSION' : 'CONSOLIDATION RANGE'}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-500 font-mono block">Range Width</span>
          <span className="text-xs font-mono font-bold text-slate-300">
            ±{dynamicRange?.rangeSpanPct || 6.8}%
          </span>
        </div>
      </div>

      {/* 2. Open Interest Delta */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 backdrop-blur shadow-lg flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Open Interest (OI)</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-mono font-bold text-slate-100">
              ${((technicalHealth?.openInterest?.totalUsd || 5100000000) / 1e9).toFixed(2)}B
            </span>
            <span
              className={`text-xs font-mono font-bold ${
                isOiPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isOiPositive ? `+${oiDelta.toFixed(2)}%` : `${oiDelta.toFixed(2)}%`}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-500 font-mono block">Inflow Sentiment</span>
          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
            {technicalHealth?.openInterest?.inflowVelocity || 'INSTITUTIONAL'}
          </span>
        </div>
      </div>

      {/* 3. Support & Resistance Levels */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 backdrop-blur shadow-lg flex items-center justify-between">
        <div className="space-y-1 w-full">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Dynamic S/R Pivot Cluster</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs font-mono pt-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">S₁:</span>
              <span className="text-slate-200 tabular-nums">${s1.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <span className="text-slate-500 text-[10px]">(${s2.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-rose-400 font-bold">R₁:</span>
              <span className="text-slate-200 tabular-nums">${r1.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <span className="text-slate-500 text-[10px]">(${r2.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Suggested Leverage & Liquidation Cushion Alert */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 backdrop-blur shadow-lg flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Suggested Leverage & Buffer</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
              {leverageSetting}
            </span>
            <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
              <span>🛡️ {liquidationBuffer}% Cushion</span>
            </div>
          </div>
        </div>
        <div className="text-right" title="Delta-neutral isolation protects against sudden liquidation wicks">
          <AlertCircle className="w-4 h-4 text-slate-400 inline" />
        </div>
      </div>
    </div>
  );
};
