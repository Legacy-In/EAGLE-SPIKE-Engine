'use client';

import React, { useState } from 'react';
import { useSigmaStore, WorkspaceTab } from '../../store/useSigmaStore';
import {
  Activity,
  BarChart2,
  Calendar,
  Database,
  Flame,
  Layers,
  Menu,
  Power,
  RefreshCw,
  Search,
  Shield,
  Sliders,
  X,
  Zap,
} from 'lucide-react';

export const MobileNavBar: React.FC = () => {
  const {
    activeWorkspace,
    setWorkspace,
    activeTimeframe,
    setTimeframe,
    setCommandPaletteOpen,
    setKillSwitchModalOpen,
    data,
    setTradingMode,
    fetchSnapshot,
  } = useSigmaStore();

  const tradingMode = data?.tradingMode || 'PAPER';

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D'] as const;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSnapshot();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const handleSelectWorkspace = (tab: WorkspaceTab) => {
    setWorkspace(tab);
    setIsDrawerOpen(false);
  };

  return (
    <>
      {/* Fixed Bottom Navigation Bar for Mobile */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sigma-surface1/95 backdrop-blur-lg border-t border-sigma-border px-2 py-1.5 flex items-center justify-around shadow-2xl"
        style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
      >
        {/* Terminal Tab */}
        <button
          onClick={() => setWorkspace('TERMINAL')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded transition-colors ${
            activeWorkspace === 'TERMINAL'
              ? 'text-sigma-cyan font-bold'
              : 'text-sigma-textMuted hover:text-sigma-textMain'
          }`}
        >
          <div className="relative">
            <Activity className="w-5 h-5" />
            {activeWorkspace === 'TERMINAL' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sigma-cyan" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Terminal</span>
        </button>

        {/* Eagle Flash Tab (Special highlight) */}
        <button
          onClick={() => setWorkspace('EAGLE_FLASH')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded transition-colors ${
            activeWorkspace === 'EAGLE_FLASH'
              ? 'text-amber-400 font-bold'
              : 'text-amber-400/70 hover:text-amber-300'
          }`}
        >
          <div className="relative">
            <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
            <span className="absolute -top-1 -right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
          </div>
          <span className="text-[10px] mt-0.5 font-bold tracking-tight text-amber-300">Eagle Flash</span>
        </button>

        {/* Backtest Lab Tab */}
        <button
          onClick={() => setWorkspace('BACKTEST')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded transition-colors ${
            activeWorkspace === 'BACKTEST'
              ? 'text-sigma-purple font-bold'
              : 'text-sigma-textMuted hover:text-sigma-textMain'
          }`}
        >
          <div className="relative">
            <BarChart2 className="w-5 h-5" />
            {activeWorkspace === 'BACKTEST' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sigma-purple" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Backtest</span>
        </button>

        {/* Risk & Exposure Tab */}
        <button
          onClick={() => setWorkspace('RISK')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded transition-colors ${
            activeWorkspace === 'RISK'
              ? 'text-sigma-amber font-bold'
              : 'text-sigma-textMuted hover:text-sigma-textMain'
          }`}
        >
          <div className="relative">
            <Shield className="w-5 h-5" />
            {activeWorkspace === 'RISK' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sigma-amber" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Risk</span>
        </button>

        {/* More Drawer Button */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded transition-colors ${
            isDrawerOpen || ['JOURNAL', 'HEALTH', 'CALENDAR'].includes(activeWorkspace)
              ? 'text-sigma-green font-bold'
              : 'text-sigma-textMuted hover:text-sigma-textMain'
          }`}
        >
          <div className="relative">
            <Menu className="w-5 h-5" />
            {['JOURNAL', 'HEALTH', 'CALENDAR'].includes(activeWorkspace) && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sigma-green" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">
            {['JOURNAL', 'HEALTH', 'CALENDAR'].includes(activeWorkspace) ? activeWorkspace : 'Menu'}
          </span>
        </button>
      </nav>

      {/* Slide-Up Mobile Workspaces & Quick Controls Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-fadeIn">
          {/* Backdrop dismiss */}
          <div className="flex-1" onClick={() => setIsDrawerOpen(false)} />

          {/* Drawer Panel */}
          <div className="bg-sigma-surface1 border-t border-sigma-border rounded-t-2xl p-4 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-sigma-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-sigma-cyan/20 border border-sigma-cyan/40 flex items-center justify-center text-xs font-mono font-bold text-sigma-cyan">
                  Σ
                </div>
                <span className="font-bold text-sm tracking-wide text-sigma-textMain">Workstation Navigation</span>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded-lg bg-sigma-surface2 text-sigma-textMuted hover:text-sigma-textMain"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Workspaces Grid */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono text-sigma-textDark uppercase tracking-wider">All Workspaces</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSelectWorkspace('TERMINAL')}
                  className={`p-3 rounded-lg border flex items-center gap-2 text-left transition-all ${
                    activeWorkspace === 'TERMINAL'
                      ? 'bg-sigma-cyan/15 border-sigma-cyan text-sigma-cyan font-bold'
                      : 'bg-sigma-surface2 border-sigma-border text-sigma-textMuted'
                  }`}
                >
                  <Activity className="w-4 h-4 text-sigma-cyan shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-sigma-textMain">Terminal</div>
                    <div className="text-[10px] text-sigma-textDark">Signal & Order Flow</div>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectWorkspace('EAGLE_FLASH')}
                  className={`p-3 rounded-lg border flex items-center gap-2 text-left transition-all ${
                    activeWorkspace === 'EAGLE_FLASH'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-sigma-surface2 border-sigma-border text-amber-400'
                  }`}
                >
                  <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-amber-300">Eagle Flash</div>
                    <div className="text-[10px] text-sigma-textDark">Bybit Vol Spikes</div>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectWorkspace('BACKTEST')}
                  className={`p-3 rounded-lg border flex items-center gap-2 text-left transition-all ${
                    activeWorkspace === 'BACKTEST'
                      ? 'bg-sigma-purple/15 border-sigma-purple text-sigma-purple font-bold'
                      : 'bg-sigma-surface2 border-sigma-border text-sigma-textMuted'
                  }`}
                >
                  <BarChart2 className="w-4 h-4 text-sigma-purple shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-sigma-textMain">Backtest Lab</div>
                    <div className="text-[10px] text-sigma-textDark">Walk-Forward Test</div>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectWorkspace('RISK')}
                  className={`p-3 rounded-lg border flex items-center gap-2 text-left transition-all ${
                    activeWorkspace === 'RISK'
                      ? 'bg-sigma-amber/15 border-sigma-amber text-sigma-amber font-bold'
                      : 'bg-sigma-surface2 border-sigma-border text-sigma-textMuted'
                  }`}
                >
                  <Shield className="w-4 h-4 text-sigma-amber shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-sigma-textMain">Risk Center</div>
                    <div className="text-[10px] text-sigma-textDark">VaR & Exposure</div>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectWorkspace('JOURNAL')}
                  className={`p-3 rounded-lg border flex items-center gap-2 text-left transition-all ${
                    activeWorkspace === 'JOURNAL'
                      ? 'bg-sigma-green/15 border-sigma-green text-sigma-green font-bold'
                      : 'bg-sigma-surface2 border-sigma-border text-sigma-textMuted'
                  }`}
                >
                  <Layers className="w-4 h-4 text-sigma-green shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-sigma-textMain">Trade Journal</div>
                    <div className="text-[10px] text-sigma-textDark">MAE/MFE Analytics</div>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectWorkspace('HEALTH')}
                  className={`p-3 rounded-lg border flex items-center gap-2 text-left transition-all ${
                    activeWorkspace === 'HEALTH'
                      ? 'bg-sigma-cyan/15 border-sigma-cyan text-sigma-cyan font-bold'
                      : 'bg-sigma-surface2 border-sigma-border text-sigma-textMuted'
                  }`}
                >
                  <Database className="w-4 h-4 text-sigma-cyan shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-sigma-textMain">Data Health</div>
                    <div className="text-[10px] text-sigma-textDark">Cross-Feed Arbitrage</div>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectWorkspace('CALENDAR')}
                  className={`p-3 rounded-lg border flex items-center gap-2 text-left transition-all col-span-2 ${
                    activeWorkspace === 'CALENDAR'
                      ? 'bg-sigma-surface3 border-sigma-borderFocus text-sigma-textMain font-bold'
                      : 'bg-sigma-surface2 border-sigma-border text-sigma-textMuted'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-sigma-textDark shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-sigma-textMain">Macro & Economic Calendar</div>
                    <div className="text-[10px] text-sigma-textDark">FOMC, CPI, NFP & Liquidity Releases</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Timeframe Switcher */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono text-sigma-textDark uppercase tracking-wider">Active Timeframe</div>
              <div className="grid grid-cols-6 gap-1 bg-sigma-surface2 p-1 rounded-lg border border-sigma-border">
                {timeframes.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`py-1.5 rounded text-xs font-mono font-bold transition-all text-center ${
                      activeTimeframe === tf
                        ? 'bg-sigma-cyan text-black shadow-sm'
                        : 'text-sigma-textMuted hover:text-sigma-textMain'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions & Controls */}
            <div className="space-y-2 pt-1 border-t border-sigma-border">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setCommandPaletteOpen(true);
                  }}
                  className="py-2.5 px-3 rounded-lg bg-sigma-surface2 hover:bg-sigma-surface3 border border-sigma-border text-xs font-mono text-sigma-textMain flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4 text-sigma-cyan" />
                  <span>Search (Ctrl+K)</span>
                </button>

                <button
                  onClick={handleRefresh}
                  className="py-2.5 px-3 rounded-lg bg-sigma-surface2 hover:bg-sigma-surface3 border border-sigma-border text-xs font-mono text-sigma-textMain flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 text-sigma-green ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh Feeds</span>
                </button>
              </div>

              {/* Hardware Kill Switch */}
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  setKillSwitchModalOpen(true);
                }}
                className="w-full py-2.5 px-3 rounded-lg bg-sigma-red/15 hover:bg-sigma-red/25 border border-sigma-red/50 text-sigma-red text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Power className="w-4 h-4" />
                <span>EMERGENCY KILL SWITCH</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
