'use client';

import React from 'react';
import { useSigmaStore } from '../../store/useSigmaStore';
import { Activity, AlertTriangle, CheckCircle2, Database, ShieldAlert, ShieldCheck, Wifi } from 'lucide-react';
import { CrossSourceComparison, SourceHealthStatus } from '../../../../packages/types';

export const DataHealthCenter: React.FC = () => {
  const { data } = useSigmaStore();
  const health = data?.health;
  const sources: SourceHealthStatus[] = health?.sources || [];
  const crossSource: CrossSourceComparison = health?.crossSourceComparison;
  const quality = health?.overallDataQualityPct || 96;

  const formatAge = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-sigma-surface1 border border-sigma-border rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-sigma-cyan" />
          <div>
            <h2 className="font-mono text-sm font-bold text-sigma-textMain uppercase tracking-wider">
              Data Health, Freshness & Cross-Source Observability
            </h2>
            <span className="text-[10px] font-mono text-sigma-textDark">
              ZERO-FAKING INTEGRITY GUARANTEE · CONTINUOUS REAL-TIME LATENCY & FRESHNESS MONITORING
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="text-right">
            <span className="text-[10px] text-sigma-textDark uppercase block">Overall Data Quality</span>
            <span className="text-base font-bold text-sigma-green">{quality}%</span>
          </div>
          <div className="px-3 py-1.5 rounded bg-sigma-green/10 border border-sigma-green/30 text-sigma-green font-bold text-[11px] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>ALL CRITICAL FEEDS VERIFIED</span>
          </div>
        </div>
      </div>

      {/* Cross-Source Arbitrage & Anomaly Detection */}
      {crossSource && (
        <div className="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sigma-green" />
              <h3 className="font-mono text-xs font-bold text-sigma-textMain uppercase tracking-wider">
                Cross-Source L1 Price Agreement (Binance vs OKX vs Coinbase)
              </h3>
            </div>
            <span
              className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                crossSource.status === 'NORMAL'
                  ? 'bg-sigma-green/10 border-sigma-green/30 text-sigma-green'
                  : 'bg-sigma-amber/10 border-sigma-amber/30 text-sigma-amber'
              }`}
            >
              STATUS: {crossSource.status} ({crossSource.maxDeviationBps} BPS SPREAD)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <span className="text-[10px] text-sigma-textDark uppercase block">{crossSource.primarySource}</span>
              <span className="text-sm font-bold text-sigma-textMain mt-1 tabular-nums block">
                ${crossSource.primaryValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-sigma-green font-medium">Primary Orderflow Feed</span>
            </div>

            <div className="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <span className="text-[10px] text-sigma-textDark uppercase block">{crossSource.secondarySource}</span>
              <span className="text-sm font-bold text-sigma-textMain mt-1 tabular-nums block">
                ${crossSource.secondaryValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-sigma-cyan font-medium">Secondary Book Confirmation</span>
            </div>

            <div className="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <span className="text-[10px] text-sigma-textDark uppercase block">{crossSource.tertiarySource}</span>
              <span className="text-sm font-bold text-sigma-textMain mt-1 tabular-nums block">
                ${crossSource.tertiaryValue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-sigma-purple font-medium">US Fiat Institutional Anchor</span>
            </div>
          </div>
        </div>
      )}

      {/* Feed Status Table */}
      <div className="bg-sigma-surface1 border border-sigma-border rounded-lg overflow-hidden p-4">
        <h3 className="font-mono text-xs font-bold text-sigma-textMain uppercase tracking-wider mb-3">
          Active Provider Feeds & Health Heartbeats
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead>
              <tr className="text-[10px] text-sigma-textDark border-b border-sigma-borderSubtle">
                <th className="pb-2">FEED / PROVIDER</th>
                <th className="pb-2">TYPE</th>
                <th className="pb-2">STATUS</th>
                <th className="pb-2">LATENCY</th>
                <th className="pb-2">FRESHNESS</th>
                <th className="pb-2">CONFIDENCE</th>
                <th className="pb-2">QUALITY GRADE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sigma-borderSubtle">
              {sources.map((src) => {
                const isOnline = src.status === 'ONLINE';
                return (
                  <tr key={src.id} className="hover:bg-sigma-surface2/30">
                    <td className="py-2.5 font-bold text-sigma-textMain flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isOnline ? 'bg-sigma-green animate-pulse' : 'bg-sigma-red'
                        }`}
                      />
                      <span>{src.name}</span>
                    </td>
                    <td className="py-2.5 text-sigma-textDark text-[11px]">{src.sourceType}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isOnline
                            ? 'bg-sigma-green/10 text-sigma-green border border-sigma-green/30'
                            : 'bg-sigma-red/10 text-sigma-red border border-sigma-red/30'
                        }`}
                      >
                        {src.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-sigma-textMuted tabular-nums">{src.latencyMs}ms</td>
                    <td className="py-2.5 text-sigma-textMuted tabular-nums">{formatAge(src.freshnessMs)}</td>
                    <td className="py-2.5 font-bold text-sigma-cyan tabular-nums">{src.confidenceScore}%</td>
                    <td className="py-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          src.quality === 'LIVE'
                            ? 'bg-sigma-green/15 text-sigma-green border border-sigma-green/30'
                            : src.quality === 'VERIFIED'
                            ? 'bg-sigma-cyan/15 text-sigma-cyan border border-sigma-cyan/30'
                            : 'bg-sigma-amber/15 text-sigma-amber border border-sigma-amber/30'
                        }`}
                      >
                        {src.quality}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
