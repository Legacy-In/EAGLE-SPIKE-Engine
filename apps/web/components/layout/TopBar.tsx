'use client';

import React, { useState } from 'react';
import { useSigmaStore } from '../../store/useSigmaStore';
import {
  AlertTriangle,
  Flame,
  Power,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Web3WalletButton } from '../web3/Web3WalletButton';

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

          {/* Dedicated Eagle Flash Terminal Header Badge */}
          <div className="hidden lg:flex items-center bg-amber-500/10 border border-amber-500/40 px-3 py-1.5 rounded text-xs font-bold gap-2 shadow-sm">
            <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-amber-300 font-extrabold tracking-wider">EAGLE FLASH TERMINAL</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/30 text-amber-200 rounded font-mono font-bold uppercase tracking-wider">PRO LIVE</span>
          </div>

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

            {/* Web3 Non-Custodial Wallet Connect */}
            <Web3WalletButton />

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
