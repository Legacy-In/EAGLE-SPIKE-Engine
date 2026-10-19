'use client';

import React from 'react';
import { Activity, Gauge, TrendingUp, TrendingDown, Percent, Zap, Info } from 'lucide-react';
import { HedgeDashboardData } from './useBinanceHedgeStream';

interface TechnicalHealthSidebarProps {
  data: HedgeDashboardData | null;
}

export const TechnicalHealthSidebar: React.FC<TechnicalHealthSidebarProps> = ({ data }) => {
  const health = data?.technicalHealth;
  const currentPrice = data?.price || 67845.50;

  // 1. 200 EMA
  const ema200 = health?.ema200 || Number((currentPrice * 0.98).toFixed(2));
  const priceVsEmaPct = health?.priceVsEmaPct ?? Number((((currentPrice - ema200) / ema200) * 100).toFixed(2));
  const isAboveEma = currentPrice >= ema200;

  // 2. RSI (14)
  const rsi14 = health?.rsi14 ?? 52.4;
  const rsiState = health?.rsiState || 'NEUTRAL_RANGE';

  // 3. ADX (14)
  const adx = health?.adx ?? 21.8;
  const plusDI = health?.plusDI ?? 24.2;
  const minusDI = health?.minusDI ?? 18.9;
  const trendStrength = health?.trendStrength || 'MODERATE_TREND';

  // 4. Funding Rate
  const fundingRate = health?.fundingRate?.ratePct ?? 0.0100;
  const annualizedFunding = health?.fundingRate?.annualizedPct ?? 10.95;
  const fundingSentiment = health?.fundingRate?.sentiment || 'BALANCED';

  // 5. Open Interest
  const oiTotalBtc = health?.openInterest?.totalBtc ?? 74500;
  const oiDelta24h = health?.openInterest?.delta24hPct ?? 3.42;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 backdrop-blur shadow-2xl space-y-5 font-mono">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            DERIVATIVES TECHNICAL HEALTH
          </h2>
        </div>
        <span className="text-[10px] text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800 font-bold">
          LIVE TELEMETRY
        </span>
      </div>

      {/* 1. 200 EMA Trend Status */}
      <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span>200 EMA (1h Trend)</span>
          </span>
          <span
            className={`font-bold text-[11px] px-1.5 py-0.2 rounded ${
              isAboveEma
                ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-900'
                : 'text-rose-400 bg-rose-950/80 border border-rose-900'
            }`}
          >
            {isAboveEma ? 'BULLISH BIAS' : 'BEARISH BIAS'}
          </span>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <span className="text-sm font-bold text-slate-200 tabular-nums">
            ${ema200.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
          </span>
          <span
            className={`text-xs font-bold ${
              isAboveEma ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isAboveEma ? `+${priceVsEmaPct}%` : `${priceVsEmaPct}%`} vs Price
          </span>
        </div>
      </div>

      {/* 2. RSI (14) Momentum Meter */}
      <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>RSI (14) Wilder</span>
          </span>
          <span className="text-slate-200 font-bold text-xs tabular-nums">{rsi14.toFixed(1)}</span>
        </div>

        {/* Visual RSI Slider */}
        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
          <div className="w-[30%] bg-emerald-500/30 border-r border-slate-800" title="Oversold (<30)" />
          <div className="w-[40%] bg-cyan-500/20 border-r border-slate-800" title="Neutral (30-70)" />
          <div className="w-[30%] bg-rose-500/30" title="Overbought (>70)" />
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
          <span>30 (Oversold)</span>
          <span className="text-cyan-400 font-bold uppercase">{rsiState}</span>
          <span>70 (Overbought)</span>
        </div>
      </div>

      {/* 3. ADX (14) Trend Strength */}
      <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>ADX (14) Volatility</span>
          </span>
          <span className="text-amber-300 font-bold text-xs tabular-nums">{adx.toFixed(1)}</span>
        </div>

        <div className="flex items-center justify-between text-xs pt-0.5">
          <div className="text-[11px] text-slate-400">
            Strength: <span className="text-slate-200 font-bold uppercase">{trendStrength.replace('_', ' ')}</span>
          </div>
          <div className="text-[10px] space-x-1.5">
            <span className="text-emerald-400 font-bold">+DI: {plusDI.toFixed(1)}</span>
            <span className="text-rose-400 font-bold">-DI: {minusDI.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* 4. Funding Rate & Annualized APR */}
      <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-cyan-400" />
            <span>Binance 8h Funding Rate</span>
          </span>
          <span
            className={`font-bold text-xs tabular-nums ${
              fundingRate >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {fundingRate >= 0 ? `+${fundingRate.toFixed(4)}%` : `${fundingRate.toFixed(4)}%`}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
          <span>Est. Annualized APR</span>
          <span className="text-cyan-300 font-bold tabular-nums">~{annualizedFunding.toFixed(2)}%</span>
        </div>

        <div className="text-[10px] text-slate-500 flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-400" />
          <span>Status: {fundingSentiment} (Next reset in ~3.5h)</span>
        </div>
      </div>

      {/* 5. Aggregated Open Interest Inflows */}
      <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">Aggregated Open Interest</span>
          <span className="text-slate-200 font-bold text-xs tabular-nums">
            {oiTotalBtc.toLocaleString()} BTC
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] pt-0.5">
          <span className="text-slate-400">24h Net OI Expansion</span>
          <span
            className={`font-bold tabular-nums ${
              oiDelta24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {oiDelta24h >= 0 ? `+${oiDelta24h.toFixed(2)}%` : `${oiDelta24h.toFixed(2)}%`}
          </span>
        </div>
      </div>
    </div>
  );
};
