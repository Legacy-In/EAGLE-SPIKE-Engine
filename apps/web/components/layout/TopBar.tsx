'use client';

import React, { useState } from 'react';
import { useSigmaStore, WorkspaceTab } from '../../store/useSigmaStore';
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Calendar,
  CheckCircle2,
  Database,
  Flame,
  Globe,
  Layers,
  Power,
  RefreshCw,
  Search,
  Shield,
  Zap,
} from 'lucide-react';

export const TopBar: React.FC = () => {
  const {
    activeWorkspace,
    setWorkspace,
    activeTimeframe,
    setTimeframe,
    setCommandPaletteOpen,
    setKillSwitchModalOpen,
    setOrderTicketOpen,
    data,
    fetchSnapshot,
    setTradingMode,
  } = useSigmaStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveConfirmOpen, setLiveConfirmOpen] = useState(false);

  const price = data?.market?.price || 79073.06;
  const change24h = data?.market?.change24hPct || 2.41;
  const regime = data?.regime?.regimeLabel || 'BULLISH RECOVERY';
  const signal = data?.signal?.decisionLabel || 'LONG';
  const confidence = data?.signal?.modelConfidence || 78;
  const dataQuality = data?.health?.overallDataQualityPct || 96;
  const isSafeMode = data?.failsafe?.safeMode;
  const isKillSwitch = data?.failsafe?.killSwitchEngaged;
  const tradingMode = data?.tradingMode || 'PAPER';

  const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '12h', '1D', '1W'] as const;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSnapshot();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const toggleTradingMode = () => {
    if (tradingMode === 'PAPER') {
      setLiveConfirmOpen(true);
    } else {
      setTradingMode('PAPER');
    }
  };

  const confirmLiveTrading = () => {
    setTradingMode('LIVE', 'CONFIRM_LIVE_TRADING_AUTH');
    setLiveConfirmOpen(false);
  };

  return (
    <>
      <header className="border-b border-sigma-border bg-sigma-surface1/95 backdrop-blur sticky top-0 z-40 px-3 py-2 select-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Market Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-sigma-purple/30 to-sigma-cyan/20 border border-sigma-purple/50 flex items-center justify-center font-bold text-lg text-sigma-textMain font-mono shadow-sm">
                Σ
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold tracking-wider text-sm text-sigma-textMain">SIGMA</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-sigma-surface3 text-sigma-textMuted border border-sigma-border font-mono">
                    INSTITUTIONAL v4.2
                  </span>
                </div>
                <div className="text-[10px] text-sigma-textDark font-mono flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-sigma-green animate-ping" />
                  <span>BTC QUANT CORE</span>
                </div>
              </div>
            </div>

            {/* Price Strip */}
            <div className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 border-l border-sigma-border">
              <div>
                <div className="text-[9px] sm:text-[10px] text-sigma-textDark font-mono flex items-center gap-1">
                  <span>BTC/USDT</span>
                  <span className="text-sigma-cyan text-[8px] sm:text-[9px]">LIVE</span>
                </div>
                <div className="flex items-baseline gap-1.5 sm:gap-2">
                  <span className="font-mono text-xs sm:text-base font-bold text-sigma-textMain tracking-tight tabular-nums">
                    ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`font-mono text-[10px] sm:text-xs font-semibold tabular-nums ${
                      change24h >= 0 ? 'text-sigma-green' : 'text-sigma-red'
                    }`}
                  >
                    {change24h >= 0 ? `+${change24h}%` : `${change24h}%`}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Badges */}
            <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-sigma-border text-xs font-mono">
              <div className="px-2 py-1 rounded bg-sigma-surface2 border border-sigma-border">
                <span className="text-sigma-textDark text-[10px] block">REGIME</span>
                <span className="text-sigma-cyan font-semibold text-[11px]">{regime}</span>
              </div>
              <div className="px-2 py-1 rounded bg-sigma-surface2 border border-sigma-border">
                <span className="text-sigma-textDark text-[10px] block">SIGNAL</span>
                <span
                  className={`font-bold text-[11px] ${
                    signal.includes('LONG')
                      ? 'text-sigma-green'
                      : signal.includes('SHORT')
                      ? 'text-sigma-red'
                      : 'text-sigma-amber'
                  }`}
                >
                  {signal} ({confidence}%)
                </span>
              </div>
              <div className="px-2 py-1 rounded bg-sigma-surface2 border border-sigma-border">
                <span className="text-sigma-textDark text-[10px] block">DATA QUALITY</span>
                <span className="text-sigma-green font-semibold text-[11px]">{dataQuality}%</span>
              </div>
            </div>
          </div>

          {/* Center Workspace Navigation Tabs (Desktop only - mobile uses bottom nav) */}
          <nav className="hidden lg:flex items-center bg-sigma-surface2 p-0.5 rounded border border-sigma-border text-xs font-medium">
            <button
              onClick={() => setWorkspace('TERMINAL')}
              className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                activeWorkspace === 'TERMINAL'
                  ? 'bg-sigma-surface3 text-sigma-textMain border border-sigma-borderFocus shadow-sm font-semibold'
                  : 'text-sigma-textMuted hover:text-sigma-textMain'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-sigma-cyan" />
              <span>Terminal</span>
            </button>
            <button
              onClick={() => setWorkspace('EAGLE_FLASH')}
              className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                activeWorkspace === 'EAGLE_FLASH'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm font-semibold'
                  : 'text-amber-400/80 hover:text-amber-300'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="font-bold">🦅 Eagle Flash</span>
              <span className="text-[9px] px-1 py-0.2 bg-amber-500/30 text-amber-300 rounded font-mono font-bold">LIVE</span>
            </button>
            <button
              onClick={() => setWorkspace('BACKTEST')}
              className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                activeWorkspace === 'BACKTEST'
                  ? 'bg-sigma-surface3 text-sigma-textMain border border-sigma-borderFocus shadow-sm font-semibold'
                  : 'text-sigma-textMuted hover:text-sigma-textMain'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-sigma-purple" />
              <span>Backtest Lab</span>
            </button>
            <button
              onClick={() => setWorkspace('RISK')}
              className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                activeWorkspace === 'RISK'
                  ? 'bg-sigma-surface3 text-sigma-textMain border border-sigma-borderFocus shadow-sm font-semibold'
                  : 'text-sigma-textMuted hover:text-sigma-textMain'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-sigma-amber" />
              <span>Risk & Exposure</span>
            </button>
            <button
              onClick={() => setWorkspace('JOURNAL')}
              className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                activeWorkspace === 'JOURNAL'
                  ? 'bg-sigma-surface3 text-sigma-textMain border border-sigma-borderFocus shadow-sm font-semibold'
                  : 'text-sigma-textMuted hover:text-sigma-textMain'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-sigma-green" />
              <span>Journal</span>
            </button>
            <button
              onClick={() => setWorkspace('HEALTH')}
              className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                activeWorkspace === 'HEALTH'
                  ? 'bg-sigma-surface3 text-sigma-textMain border border-sigma-borderFocus shadow-sm font-semibold'
                  : 'text-sigma-textMuted hover:text-sigma-textMain'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-sigma-cyan" />
              <span>Data Health</span>
            </button>
            <button
              onClick={() => setWorkspace('CALENDAR')}
              className={`hidden xl:flex px-3 py-1.5 rounded transition-colors items-center gap-1.5 ${
                activeWorkspace === 'CALENDAR'
                  ? 'bg-sigma-surface3 text-sigma-textMain border border-sigma-borderFocus shadow-sm font-semibold'
                  : 'text-sigma-textMuted hover:text-sigma-textMain'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-sigma-textDark" />
              <span>Macro Calendar</span>
            </button>
          </nav>

          {/* Right Actions: Search, Mode, Safe Mode, Kill Switch */}
          <div className="flex items-center gap-2">
            {/* Timeframe selector */}
            <div className="hidden md:flex items-center bg-sigma-surface2 rounded border border-sigma-border p-0.5 text-[11px] font-mono">
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    activeTimeframe === tf
                      ? 'bg-sigma-surface3 text-sigma-cyan font-bold border border-sigma-cyan/30'
                      : 'text-sigma-textDark hover:text-sigma-textMuted'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Command Palette Trigger */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="px-2.5 py-1.5 rounded bg-sigma-surface2 hover:bg-sigma-surface3 border border-sigma-border text-xs text-sigma-textMuted flex items-center gap-1.5 transition-colors font-mono"
              title="Command Palette (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-sigma-textDark" />
              <span className="hidden sm:inline">Ctrl+K</span>
            </button>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              className={`p-1.5 rounded bg-sigma-surface2 hover:bg-sigma-surface3 border border-sigma-border text-sigma-textMuted transition-colors ${
                isRefreshing ? 'animate-spin text-sigma-green' : ''
              }`}
              title="Refresh Market Feeds"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Trading Mode Toggle */}
            <button
              onClick={toggleTradingMode}
              className={`hidden sm:inline-flex px-2.5 py-1 rounded text-[11px] font-mono font-bold tracking-wide border transition-all ${
                tradingMode === 'PAPER'
                  ? 'bg-sigma-cyan/10 border-sigma-cyan/40 text-sigma-cyan'
                  : 'bg-sigma-red/10 border-sigma-red text-sigma-red animate-pulse'
              }`}
            >
              {tradingMode === 'PAPER' ? '● PAPER MODE' : '▲ LIVE TRADING'}
            </button>

            {/* Safe Mode Indicator */}
            {isSafeMode && (
              <span className="px-2 py-1 rounded text-[11px] font-mono bg-sigma-amber/10 border border-sigma-amber/40 text-sigma-amber flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                SAFE MODE
              </span>
            )}

            {/* Hardware Kill Switch */}
            <button
              onClick={() => setKillSwitchModalOpen(true)}
              className={`hidden sm:flex px-2.5 py-1 rounded text-[11px] font-mono font-bold border items-center gap-1 transition-all ${
                isKillSwitch
                  ? 'bg-sigma-red text-white border-sigma-red shadow-lg animate-pulse'
                  : 'bg-sigma-surface2 hover:bg-sigma-red/20 text-sigma-textMuted hover:text-sigma-red border-sigma-border hover:border-sigma-red/40'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{isKillSwitch ? 'KILL SWITCH ENGAGED' : 'KILL SWITCH'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sticky Bottom Workspace Tabs for Mobile Devices */}
      <nav
        aria-label="Sticky Bottom Workspace Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-sigma-surface1/95 backdrop-blur-xl border-t border-sigma-border px-2 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-2xl"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={() => setWorkspace('TERMINAL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
            activeWorkspace === 'TERMINAL'
              ? 'bg-sigma-cyan text-black shadow-md'
              : 'bg-sigma-surface2 text-sigma-textMuted border border-sigma-border hover:text-sigma-textMain'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Terminal</span>
        </button>

        <button
          onClick={() => setWorkspace('EAGLE_FLASH')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
            activeWorkspace === 'EAGLE_FLASH'
              ? 'bg-amber-400 text-black font-black shadow-md'
              : 'bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>🦅 Eagle Flash</span>
          <span className="text-[9px] px-1 py-0.2 bg-black/40 text-amber-200 rounded font-mono font-bold">LIVE</span>
        </button>

        <button
          onClick={() => setWorkspace('BACKTEST')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
            activeWorkspace === 'BACKTEST'
              ? 'bg-sigma-purple text-white shadow-md'
              : 'bg-sigma-surface2 text-sigma-textMuted border border-sigma-border hover:text-sigma-textMain'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5 text-sigma-purple" />
          <span>Backtest</span>
        </button>

        <button
          onClick={() => setWorkspace('RISK')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
            activeWorkspace === 'RISK'
              ? 'bg-sigma-amber text-black shadow-md'
              : 'bg-sigma-surface2 text-sigma-textMuted border border-sigma-border hover:text-sigma-textMain'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-sigma-amber" />
          <span>Risk</span>
        </button>

        <button
          onClick={() => setWorkspace('JOURNAL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
            activeWorkspace === 'JOURNAL'
              ? 'bg-sigma-green text-black shadow-md'
              : 'bg-sigma-surface2 text-sigma-textMuted border border-sigma-border hover:text-sigma-textMain'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-sigma-green" />
          <span>Journal</span>
        </button>

        <button
          onClick={() => setWorkspace('HEALTH')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
            activeWorkspace === 'HEALTH'
              ? 'bg-sigma-cyan/20 text-sigma-cyan border border-sigma-cyan font-bold shadow-md'
              : 'bg-sigma-surface2 text-sigma-textMuted border border-sigma-border hover:text-sigma-textMain'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-sigma-cyan" />
          <span>Data Health</span>
        </button>

        <button
          onClick={() => setWorkspace('CALENDAR')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
            activeWorkspace === 'CALENDAR'
              ? 'bg-sigma-surface3 text-sigma-textMain border border-sigma-borderFocus font-bold shadow-md'
              : 'bg-sigma-surface2 text-sigma-textMuted border border-sigma-border hover:text-sigma-textMain'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-sigma-textDark" />
          <span>Calendar</span>
        </button>
      </nav>

      {/* Live Trading Warning Modal */}
      {liveConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-sigma-surface2 border border-sigma-red p-5 rounded-lg max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-2 text-sigma-red font-bold text-sm mb-3">
              <AlertTriangle className="w-5 h-5" />
              <span>LIVE TRADING CONFIRMATION REQUIRED</span>
            </div>
            <p className="text-xs text-sigma-textMuted leading-relaxed mb-4">
              Switching from <strong>PAPER TRADING</strong> to <strong>LIVE TRADING</strong> routes real orders with
              monetary capital directly to connected exchange accounts.
            </p>
            <div className="bg-sigma-surface1 p-3 rounded border border-sigma-border text-xs text-sigma-textDark font-mono mb-4">
              <div>• Withdrawal permissions: DISABLED</div>
              <div>• Max leverage: 3.0x</div>
              <div>• Max risk per trade: 0.50%</div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setLiveConfirmOpen(false)}
                className="px-3 py-1.5 rounded bg-sigma-surface3 border border-sigma-border text-xs text-sigma-textMuted hover:text-sigma-textMain"
              >
                Cancel
              </button>
              <button
                onClick={confirmLiveTrading}
                className="px-4 py-1.5 rounded bg-sigma-red hover:bg-sigma-red/90 text-white font-bold text-xs"
              >
                Authorize Live Trading
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
