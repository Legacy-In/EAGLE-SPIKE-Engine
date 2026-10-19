'use client';

import React from 'react';
import { Activity, RefreshCw, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { HedgeDashboardData } from './useBinanceHedgeStream';

interface HedgeHeaderProps {
  data: HedgeDashboardData | null;
  isConnected: boolean;
  feedMode: 'WEBSOCKET' | 'POLLING_FALLBACK';
  latencyMs: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const HedgeHeader: React.FC<HedgeHeaderProps> = ({
  data,
  isConnected,
  feedMode,
  latencyMs,
  isRefreshing,
  onRefresh
}) => {
  const price = data?.price || 67845.50;
  const change24h = data?.priceChange24h ?? 1.45;
  const high24h = data?.high24h || price * 1.025;
  const low24h = data?.low24h || price * 0.985;
  const volume24hUsd = data?.volume24hUsd || 32500000000;
  const isPositive = change24h >= 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 backdrop-blur-md shadow-2xl transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side: Brand & Live Feed Status */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/5">
            <Zap className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-wider text-slate-100 font-mono">
                EAGLE FLASH <span className="text-cyan-400">· HEDGE DESK</span>
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 font-bold">
                DERIVATIVES v4.2
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>BTC Perpetual Delta-Neutral Quantitative Harvester</span>
            </p>
          </div>

          {/* Binance Live Telemetry Pill */}
          <div className="flex items-center gap-2 pl-0 sm:pl-3 sm:border-l sm:border-slate-800 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-800">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'
                } animate-pulse`}
              />
              <span className="font-semibold text-slate-200">
                {feedMode === 'WEBSOCKET' ? 'BINANCE FUTURES WS' : 'REST AUTO-POLL'}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-400 font-mono tabular-nums">{latencyMs}ms</span>
            </div>
          </div>
        </div>

        {/* Center / Right: Live Price Ticker Strip & Refresh */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 justify-between lg:justify-end">
          {/* BTC/USDT Main Price */}
          <div className="flex items-baseline gap-2">
            <div>
              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider flex items-center gap-1">
                <span>BTC/USDT</span>
                <span className="text-cyan-400 font-bold">PERP</span>
              </div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-black font-mono text-slate-50 tracking-tight tabular-nums">
                ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div
              className={`flex items-center gap-1 text-xs sm:text-sm font-bold font-mono px-2 py-0.5 rounded ${
                isPositive
                  ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/50'
                  : 'text-rose-400 bg-rose-950/60 border border-rose-800/50'
              }`}
            >
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{isPositive ? `+${change24h.toFixed(2)}%` : `${change24h.toFixed(2)}%`}</span>
            </div>
          </div>

          {/* 24h High & Low */}
          <div className="hidden sm:flex flex-col text-right font-mono text-[11px] border-l border-slate-800 pl-4">
            <div className="text-slate-400">
              24h High: <span className="text-slate-200 font-semibold tabular-nums">${high24h.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
            </div>
            <div className="text-slate-400 mt-0.5">
              24h Low: <span className="text-slate-200 font-semibold tabular-nums">${low24h.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
            </div>
          </div>

          {/* 24h Volume */}
          <div className="hidden md:flex flex-col text-right font-mono text-[11px] border-l border-slate-800 pl-4">
            <span className="text-slate-400">24h Vol (USDT)</span>
            <span className="text-cyan-300 font-semibold tabular-nums mt-0.5">
              ${(volume24hUsd / 1e9).toFixed(2)}B
            </span>
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all shadow-sm ${
              isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Refresh Market Intelligence"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
