'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Shield, Target, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react';
import { HedgeDashboardData } from './useBinanceHedgeStream';

interface DualHedgeCardProps {
  data: HedgeDashboardData | null;
}

export const DualHedgeCard: React.FC<DualHedgeCardProps> = ({ data }) => {
  const hedgeStrategy = data?.hedgeStrategy;
  const longPos = hedgeStrategy?.longPosition;
  const shortPos = hedgeStrategy?.shortPosition;
  const capitalProfile = hedgeStrategy?.capitalProfile;
  const guidelines = hedgeStrategy?.executionGuidelines || [];

  return (
    <div className="space-y-4">
      {/* Capital Setup Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 sm:p-4 backdrop-blur shadow-xl flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-200 font-bold">CALIBRATED CAPITAL PROFILE:</span>
          <span className="text-cyan-300 font-extrabold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/80">
            $1,000 – $2,000 USDT ACCOUNT
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-slate-400">
          <div>
            Allocated Margin: <span className="text-slate-100 font-bold">${capitalProfile?.allocatedMargin || 1000} ($500/leg)</span>
          </div>
          <div>
            Reserve Buffer: <span className="text-emerald-400 font-bold">${capitalProfile?.reserveCapital || 500} ({capitalProfile?.reserveBufferPct || 33.3}%)</span>
          </div>
          <div>
            Net Exposure: <span className="text-cyan-400 font-bold">{capitalProfile?.netDeltaExposure || '0.00 BTC'}</span>
          </div>
        </div>
      </div>

      {/* Dual Box Long vs Short Execution Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LEFT BOX: LONG POSITION */}
        <div className="bg-slate-900/90 border-2 border-emerald-500/30 hover:border-emerald-500/60 transition-all rounded-xl p-5 backdrop-blur shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />

          {/* Long Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black font-mono text-slate-100 flex items-center gap-2">
                  <span>LONG HEDGE POSITION</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono font-bold">
                    BUY LIMIT
                  </span>
                </h3>
                <span className="text-[11px] font-mono text-slate-400">Lower Consolidation Demand Retest</span>
              </div>
            </div>

            <div className="text-right font-mono">
              <div className="text-xs font-bold text-emerald-400">${longPos?.marginUsd || 500} MARGIN</div>
              <div className="text-[10px] text-slate-400">{longPos?.leverage || 5}x · ${longPos?.notionalUsd || 2500} Notional</div>
            </div>
          </div>

          {/* Long Key Execution Metrics */}
          <div className="grid grid-cols-2 gap-3 my-4 font-mono text-xs relative z-10">
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-500 block uppercase">Suggested Entry Zone</span>
              <span className="text-sm font-bold text-emerald-300 tabular-nums">
                {longPos?.entryZone?.label || '$66,480 – $67,010'}
              </span>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-500 block uppercase">Position Size (BTC)</span>
              <span className="text-sm font-bold text-slate-100 tabular-nums">
                {longPos?.positionSizeBtc || 0.0368} BTC
              </span>
            </div>
          </div>

          {/* Long Take Profit Targets */}
          <div className="space-y-2 relative z-10">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-Stage Take Profit Targets</span>
            </span>

            <div className="space-y-1.5 font-mono text-xs">
              {longPos?.targets?.map((target, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/60 hover:bg-slate-950 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-900">
                      {target.label}
                    </span>
                    <span className="text-slate-200 font-bold tabular-nums">
                      ${target.price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-emerald-400 font-bold text-[11px]">{target.gainPct}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">{target.action}</span>
                </div>
              )) || (
                <div className="text-slate-500 text-xs">Loading targets...</div>
              )}
            </div>
          </div>

          {/* Long Risk Invalidation & Liquidation Cushion */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 font-mono text-xs relative z-10">
            <div className="flex items-center gap-1.5 text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>SL: ${longPos?.stopLoss?.price?.toLocaleString() || '64,270'} ({longPos?.stopLoss?.lossPct || '-2.5%'})</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-300">
              <Shield className="w-3.5 h-3.5" />
              <span>Est. Liq: ${longPos?.estLiquidation?.toLocaleString() || '54,200'} (~42% Cushion)</span>
            </div>
          </div>
        </div>

        {/* RIGHT BOX: SHORT POSITION */}
        <div className="bg-slate-900/90 border-2 border-rose-500/30 hover:border-rose-500/60 transition-all rounded-xl p-5 backdrop-blur shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all" />

          {/* Short Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold">
                <ArrowDownRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black font-mono text-slate-100 flex items-center gap-2">
                  <span>SHORT HEDGE POSITION</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-400 font-mono font-bold">
                    SELL LIMIT
                  </span>
                </h3>
                <span className="text-[11px] font-mono text-slate-400">Upper Consolidation Supply Rejection</span>
              </div>
            </div>

            <div className="text-right font-mono">
              <div className="text-xs font-bold text-rose-400">${shortPos?.marginUsd || 500} MARGIN</div>
              <div className="text-[10px] text-slate-400">{shortPos?.leverage || 5}x · ${shortPos?.notionalUsd || 2500} Notional</div>
            </div>
          </div>

          {/* Short Key Execution Metrics */}
          <div className="grid grid-cols-2 gap-3 my-4 font-mono text-xs relative z-10">
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-500 block uppercase">Suggested Entry Zone</span>
              <span className="text-sm font-bold text-rose-300 tabular-nums">
                {shortPos?.entryZone?.label || '$68,650 – $69,200'}
              </span>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-500 block uppercase">Position Size (BTC)</span>
              <span className="text-sm font-bold text-slate-100 tabular-nums">
                {shortPos?.positionSizeBtc || 0.0368} BTC
              </span>
            </div>
          </div>

          {/* Short Take Profit Targets */}
          <div className="space-y-2 relative z-10">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-rose-400" />
              <span>Multi-Stage Take Profit Targets</span>
            </span>

            <div className="space-y-1.5 font-mono text-xs">
              {shortPos?.targets?.map((target, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/60 hover:bg-slate-950 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-900">
                      {target.label}
                    </span>
                    <span className="text-slate-200 font-bold tabular-nums">
                      ${target.price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-rose-400 font-bold text-[11px]">{target.gainPct}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">{target.action}</span>
                </div>
              )) || (
                <div className="text-slate-500 text-xs">Loading targets...</div>
              )}
            </div>
          </div>

          {/* Short Risk Invalidation & Liquidation Cushion */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 font-mono text-xs relative z-10">
            <div className="flex items-center gap-1.5 text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>SL: ${shortPos?.stopLoss?.price?.toLocaleString() || '71,450'} ({shortPos?.stopLoss?.lossPct || '-2.5%'})</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-300">
              <Shield className="w-3.5 h-3.5" />
              <span>Est. Liq: ${shortPos?.estLiquidation?.toLocaleString() || '81,400'} (~42% Cushion)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Guidelines Accordion / Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 backdrop-blur shadow-xl font-mono text-xs">
        <div className="flex items-center gap-2 text-slate-200 font-bold mb-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>QUANTITATIVE DELTA-NEUTRAL EXECUTION DISCIPLINE</span>
        </div>
        <ul className="space-y-1.5 text-slate-400 list-disc list-inside bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
          {guidelines.map((g, idx) => (
            <li key={idx} className="leading-relaxed">
              <span className="text-slate-300">{g}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
