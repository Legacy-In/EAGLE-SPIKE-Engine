'use client';

import React from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, ShieldCheck } from 'lucide-react';

interface PriceHeaderProps {
  market: any;
}

export const PriceHeader: React.FC<PriceHeaderProps> = ({ market }) => {
  const price = market?.price || 79073.06;
  const change24h = market?.change24hPct || 2.41;
  const high24h = market?.high24h || 79850.0;
  const low24h = market?.low24h || 76920.0;
  const volumeUsd = market?.volume24hUsd || 1810500000;
  const provenance = market?.provenance;

  // Format volume
  const volBillion = (volumeUsd / 1e9).toFixed(2);
  const athPrice = 108786.0;
  const athDistancePct = (((price - athPrice) / athPrice) * 100).toFixed(1);

  return (
    <div className="bg-sigma-surface1 border border-sigma-border rounded-lg p-3 sm:p-4 mb-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Main Price & Change */}
        <div className="flex items-baseline gap-4">
          <div>
            <div className="text-[10px] font-mono text-sigma-textDark flex items-center gap-1.5 mb-0.5">
              <span className="font-bold text-sigma-textMuted">BTC / USDT</span>
              <span className="px-1.5 py-0.2 rounded bg-sigma-surface3 text-sigma-cyan text-[9px] border border-sigma-border">
                PERPETUAL + SPOT COMPOSITE
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-sigma-textMain tabular-nums">
                ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <div
                className={`flex items-center text-sm sm:text-base font-bold font-mono tabular-nums ${
                  change24h >= 0 ? 'text-sigma-green' : 'text-sigma-red'
                }`}
              >
                {change24h >= 0 ? <ArrowUpRight className="w-4 h-4 mr-0.5" /> : <ArrowDownRight className="w-4 h-4 mr-0.5" />}
                {change24h >= 0 ? `+${change24h}%` : `${change24h}%`}
              </div>
            </div>
          </div>
        </div>

        {/* 24h High/Low & Volume */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 sm:gap-6 text-xs font-mono w-full sm:w-auto">
          <div>
            <div className="text-[10px] text-sigma-textDark uppercase">24h High</div>
            <div className="text-sigma-textMain font-semibold tabular-nums">
              ${high24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-sigma-textDark uppercase">24h Low</div>
            <div className="text-sigma-textMain font-semibold tabular-nums">
              ${low24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-sigma-textDark uppercase">24h Turnover</div>
            <div className="text-sigma-cyan font-semibold tabular-nums">${volBillion}B</div>
          </div>
          <div>
            <div className="text-[10px] text-sigma-textDark uppercase">vs Nov 2025 ATH</div>
            <div className="text-sigma-red font-semibold tabular-nums">{athDistancePct}%</div>
          </div>
        </div>

        {/* Data Provenance Badge */}
        <div className="bg-sigma-surface2 px-3 py-1.5 rounded border border-sigma-border text-[10px] font-mono w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-sigma-textDark mb-0.5">
            <ShieldCheck className="w-3 h-3 text-sigma-green" />
            <span>DATA PROVENANCE</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sigma-textMain font-medium">{provenance?.source || 'Binance WS L1/L2'}</span>
            <span className="text-sigma-green font-bold">LIVE ({provenance?.freshnessMs || 65}ms)</span>
            <span className="text-sigma-cyan font-bold">{provenance?.confidenceScore || 99}% Conf</span>
          </div>
        </div>
      </div>
    </div>
  );
};
