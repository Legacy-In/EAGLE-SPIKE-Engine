'use client';

import React, { useState } from 'react';
import { useBinanceHedgeStream } from './useBinanceHedgeStream';
import { HedgeHeader } from './HedgeHeader';
import { HedgeMetricsBar } from './HedgeMetricsBar';
import { DualHedgeCard } from './DualHedgeCard';
import { TechnicalHealthSidebar } from './TechnicalHealthSidebar';
import { BacktestSimulatorPanel } from './BacktestSimulatorPanel';
import { ShieldCheck, ArrowLeft, Zap, FlaskConical } from 'lucide-react';
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

  const [activeTab, setActiveTab] = useState<'LIVE' | 'BACKTEST'>('LIVE');

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

      {/* Sub-Navigation Tabs: Live Signals vs Historical Backtester */}
      <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 p-1 rounded-xl w-fit font-mono text-xs">
        <button
          onClick={() => setActiveTab('LIVE')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
            activeTab === 'LIVE'
              ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>LIVE HEDGE EXECUTION</span>
        </button>

        <button
          onClick={() => setActiveTab('BACKTEST')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
            activeTab === 'BACKTEST'
              ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
          <span>HISTORICAL BACKTESTER</span>
          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-950 text-emerald-300 rounded border border-emerald-800 font-bold">
            15D/30D
          </span>
        </button>
      </div>

      {/* 3. Main Body: Switchable between Live Signals and Historical Simulator */}
      {activeTab === 'LIVE' ? (
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
      ) : (
        <div className="space-y-4">
          <BacktestSimulatorPanel />
        </div>
      )}

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
