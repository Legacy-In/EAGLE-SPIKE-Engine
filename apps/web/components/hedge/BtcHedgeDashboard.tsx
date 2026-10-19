'use client';

import React from 'react';
import { useBinanceHedgeStream } from './useBinanceHedgeStream';
import { HedgeHeader } from './HedgeHeader';
import { HedgeMetricsBar } from './HedgeMetricsBar';
import { DualHedgeCard } from './DualHedgeCard';
import { TechnicalHealthSidebar } from './TechnicalHealthSidebar';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface BtcHedgeDashboardProps {
  showBackToTerminal?: boolean;
}

export const BtcHedgeDashboard: React.FC<BtcHedgeDashboardProps> = ({ showBackToTerminal = false }) => {
  const {
    data,
    isConnected,
    feedMode,
    latencyMs,
    isRefreshing,
    manualRefresh
  } = useBinanceHedgeStream();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none p-3 sm:p-5 lg:p-6 space-y-4 max-w-[1720px] mx-auto">
      {/* Optional Top Bar for standalone /hedge page navigation */}
      {showBackToTerminal && (
        <div className="flex items-center justify-between pb-1 font-mono text-xs">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>Back to Eagle Flash Terminal</span>
          </Link>

          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Delta-Neutral Volatility Engine Active</span>
          </div>
        </div>
      )}

      {/* 1. Header Section */}
      <HedgeHeader
        data={data}
        isConnected={isConnected}
        feedMode={feedMode}
        latencyMs={latencyMs}
        isRefreshing={isRefreshing}
        onRefresh={manualRefresh}
      />

      {/* 2. Top Metrics Bar */}
      <HedgeMetricsBar data={data} />

      {/* 3. Main Body: Dual-Box Hedge Card (Left 7-8 cols) + Technical Health Sidebar (Right 4-5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Main Hedge Signal & Dual Card Execution Area */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-4">
          <DualHedgeCard data={data} />
        </div>

        {/* Technical Health & Derivatives Intelligence Sidebar */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-4">
          <TechnicalHealthSidebar data={data} />
        </div>
      </div>

      {/* Footer Info Strip */}
      <footer className="pt-2 border-t border-slate-900 text-slate-500 font-mono text-[10px] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span>EAGLE FLASH QUANTITATIVE ARCHITECTURE</span>
          <span>·</span>
          <span>BINANCE FUTURES USDT-M DERIVATIVES FEED</span>
          <span>·</span>
          <span className="text-cyan-400">DELTA-NEUTRAL ALGO v4.2</span>
        </div>
        <div>
          CAPITAL RISK MODEL: STRICT 5X ISOLATED · ZERO LIQUIDATION ZONE
        </div>
      </footer>
    </div>
  );
};

export default BtcHedgeDashboard;
