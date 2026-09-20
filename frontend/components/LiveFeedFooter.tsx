'use client';

import React from 'react';
import { Activity, Radio, ShieldCheck, Wifi, WifiOff } from 'lucide-react';

interface LiveFeedFooterProps {
  latencyMs: number;
  bybitCount: number;
  mexcCount: number;
  weexCount: number;
  isConnected: boolean;
  reconnectAttempts: number;
  lastUpdated: number;
}

export const LiveFeedFooter: React.FC<LiveFeedFooterProps> = ({
  latencyMs,
  bybitCount,
  mexcCount,
  weexCount,
  isConnected,
  reconnectAttempts,
  lastUpdated,
}) => {
  const isHealthyLatency = latencyMs < 50;
  const latencyColor = isHealthyLatency
    ? 'text-sigma-green'
    : latencyMs < 120
    ? 'text-sigma-amber'
    : 'text-sigma-red';

  return (
    <footer className="border-t border-sigma-border bg-sigma-surface1 px-4 py-2 text-[11px] font-mono text-sigma-textDark flex flex-wrap items-center justify-between gap-3 select-none">
      {/* Left: Stream Health & Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-sigma-green inline-block animate-ping" />
              <span className="text-sigma-textMain font-semibold">FEED ACTIVE</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-sigma-amber inline-block" />
              <span className="text-sigma-amber font-semibold">
                RECONNECTING ({reconnectAttempts})
              </span>
            </>
          )}
        </div>

        {/* Latency Ping */}
        <div className="flex items-center gap-1">
          <Activity className={`w-3.5 h-3.5 ${latencyColor}`} />
          <span>LATENCY:</span>
          <strong className={`tabular-nums ${latencyColor}`}>{latencyMs}ms</strong>
          {isHealthyLatency && (
            <span className="text-[9px] px-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              ULTRA-LOW (&lt;50ms)
            </span>
          )}
        </div>

        {/* Total Active Contracts */}
        <div className="hidden sm:flex items-center gap-1.5 border-l border-sigma-border pl-3">
          <span>UNIVERSE:</span>
          <strong className="text-sigma-cyan tabular-nums">
            {(bybitCount + mexcCount + weexCount).toLocaleString()} USDT PERPS
          </strong>
        </div>
      </div>

      {/* Right: Exchange Health Badges */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
            BYBIT: {bybitCount}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
            MEXC: {mexcCount}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
            WEEX: {weexCount}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1 text-sigma-green border-l border-sigma-border pl-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>RATE-LIMIT SAFEGUARD ACTIVE</span>
        </div>
      </div>
    </footer>
  );
};
