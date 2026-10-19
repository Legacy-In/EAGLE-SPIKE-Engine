'use client';

import React, { useState, useEffect } from 'react';
import { useBinanceHedgeStream } from './useBinanceHedgeStream';
import { HedgeHeader } from './HedgeHeader';
import { HedgeMetricsBar } from './HedgeMetricsBar';
import { DualHedgeCard } from './DualHedgeCard';
import { TechnicalHealthSidebar } from './TechnicalHealthSidebar';
import { BacktestSimulatorPanel } from './BacktestSimulatorPanel';
import { ShieldCheck, ArrowLeft, Zap, FlaskConical, ArrowLeftRight } from 'lucide-react';
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

  // Synchronize active tab with URL hash or search params for deep linking
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const search = new URLSearchParams(window.location.search);
      const tabParam = search.get('tab')?.toLowerCase();

      if (hash.includes('backtest') || tabParam === 'backtest') {
        setActiveTab('BACKTEST');
      } else if (hash.includes('live') || tabParam === 'live') {
        setActiveTab('LIVE');
      }
    }
  }, []);

  const handleTabChange = (tab: 'LIVE' | 'BACKTEST') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const newHash = tab === 'BACKTEST' ? '#backtest' : '#live';
      window.history.replaceState(null, '', `${window.location.pathname}${newHash}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none p-3 sm:p-5 lg:p-6 space-y-4 max-w-[1720px] mx-auto">
      {/* Top Bar for standalone /hedge page navigation */}
      {showBackToTerminal && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-1 font-mono text-xs">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>Back to Eagle Flash Terminal</span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Quick Toggle in Header */}
            <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => handleTabChange('LIVE')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                  activeTab === 'LIVE'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ⚡ Live Signals
              </button>
              <button
                onClick={() => handleTabChange('BACKTEST')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                  activeTab === 'BACKTEST'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🧪 Backtester
              </button>
            </div>

            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Delta-Neutral Volatility Engine Active</span>
            </div>
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

      {/* 3. Primary Segmented Navigation Switch */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 backdrop-blur shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
        <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 w-full sm:w-auto shadow-inner">
          {/* TAB 1: LIVE HEDGE EXECUTION */}
          <button
            onClick={() => handleTabChange('LIVE')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'LIVE'
                ? 'bg-gradient-to-r from-cyan-950 to-slate-900 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Zap className={`w-4 h-4 ${activeTab === 'LIVE' ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
            <span>⚡ LIVE HEDGE EXECUTION</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                activeTab === 'LIVE'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              REAL-TIME
            </span>
          </button>

          {/* Bi-directional separator icon */}
          <div className="px-2 text-slate-600 hidden sm:block">
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </div>

          {/* TAB 2: HISTORICAL BACKTESTER (15D/30D) */}
          <button
            onClick={() => handleTabChange('BACKTEST')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'BACKTEST'
                ? 'bg-gradient-to-r from-emerald-950 to-slate-900 text-emerald-300 border border-emerald-500/50 shadow-lg shadow-emerald-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <FlaskConical className={`w-4 h-4 ${activeTab === 'BACKTEST' ? 'text-emerald-400 animate-bounce' : 'text-slate-500'}`} />
            <span>🧪 HISTORICAL BACKTESTER</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                activeTab === 'BACKTEST'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              15D / 30D
            </span>
          </button>
        </div>

        {/* Status Chip based on Active Tab */}
        <div className="flex items-center gap-2 text-xs text-slate-400 px-2">
          {activeTab === 'LIVE' ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
              <span>Monitoring Binance Futures 1h Range Dynamics</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>Slippage-Adjusted Simulation Engine Ready ($1,000 Base)</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Main Body: Switchable between Live Signals and Historical Simulator */}
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
