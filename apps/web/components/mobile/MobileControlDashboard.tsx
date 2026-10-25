'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTradingMode } from '../../context/TradingModeContext';
import { MobileSettingsModal } from './MobileSettingsModal';
import {
  FlaskConical,
  Zap,
  Play,
  Pause,
  Settings,
  RefreshCw,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Layers,
  ShieldCheck,
  Target,
  DollarSign,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Terminal,
  Cpu,
  Radio,
  ChevronRight,
  Flame,
} from 'lucide-react';

interface PaperTrade {
  paper_trade_id: string;
  signal_id: string | null;
  symbol: string;
  exchange: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  exit_price: number | null;
  position_size_usd: number;
  quantity: number;
  leverage: number;
  margin_usd: number;
  take_profit_1: number;
  stop_loss: number;
  realized_pnl_usd: number;
  realized_pnl_pct: number;
  realized_r: number;
  outcome: 'WIN' | 'LOSS' | null;
  opened_at: string;
  closed_at: string | null;
}

export const MobileControlDashboard: React.FC = () => {
  const {
    tradingMode,
    setTradingMode,
    toggleTradingMode,
    engineStatus,
    fleet,
    runningWorkers,
    totalWorkers,
    metrics,
    logs,
    startEngine,
    stopEngine,
    toggleWorker,
    resetPortfolio,
    refreshEngineStatus,
    setIsSettingsOpen,
    feedbackMessage,
  } = useTradingMode();

  const [activeTab, setActiveTab] = useState<'POSITIONS' | 'HISTORY' | 'FLEET' | 'LOGS'>('POSITIONS');
  const [activeTrades, setActiveTrades] = useState<PaperTrade[]>([]);
  const [closedTrades, setClosedTrades] = useState<PaperTrade[]>([]);
  const [balance, setBalance] = useState<number>(10000);
  const [equity, setEquity] = useState<number>(10000);
  const [realizedPnl, setRealizedPnl] = useState<number>(0);
  const [winRate, setWinRate] = useState<number>(100);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  // Fetch live paper portfolio and active positions
  const fetchPortfolioData = useCallback(async () => {
    try {
      const res = await fetch('/api/paper-trades');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.account) {
        setBalance(data.account.current_balance || 10000);
        setEquity(data.account.equity || data.account.current_balance || 10000);
        setRealizedPnl(data.account.realized_pnl || 0);
        setWinRate(data.account.win_rate_pct ?? 100);
        setActiveTrades(data.activeTrades || []);
        setClosedTrades(data.closedTrades || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchPortfolioData();
    const interval = setInterval(fetchPortfolioData, 3000);
    return () => clearInterval(interval);
  }, [fetchPortfolioData]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.allSettled([fetchPortfolioData(), refreshEngineStatus()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleClosePosition = async (tradeId: string) => {
    setClosingId(tradeId);
    try {
      const res = await fetch('/api/paper-trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', paperTradeId: tradeId, reason: 'Mobile User Manual Exit' }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchPortfolioData();
      }
    } catch {} finally {
      setClosingId(null);
    }
  };

  const isEngineLive = engineStatus === 'RUNNING';

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] font-sans flex flex-col pb-16 select-none">
      {/* ─── 1. TOP HEADER & MODE SWITCHER ─── */}
      <header className="sticky top-0 z-40 bg-[#12161A]/95 backdrop-blur-md border-b border-[#1E2329] px-4 py-3 flex items-center justify-between gap-2">
        {/* Mode Switcher Pill */}
        <div className="flex items-center bg-[#181D24] border border-[#2B313A] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setTradingMode('paper')}
            className={`min-h-[36px] px-3 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
              tradingMode === 'paper'
                ? 'bg-emerald-500/20 text-[#0ECB81] border border-emerald-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-[#0ECB81]" />
            <span>PAPER</span>
          </button>
          <button
            type="button"
            onClick={() => setTradingMode('live')}
            className={`min-h-[36px] px-3 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
              tradingMode === 'live'
                ? 'bg-amber-500/20 text-[#F0B90B] border border-amber-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-[#F0B90B]" />
            <span>LIVE</span>
          </button>
        </div>

        {/* Engine Status & Master Action */}
        <div className="flex items-center gap-2">
          {/* Master Start / Pause Engine Button */}
          <button
            type="button"
            onClick={() => (isEngineLive ? stopEngine() : startEngine())}
            className={`min-h-[38px] px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold border transition-all ${
              isEngineLive
                ? 'bg-emerald-500/10 border-emerald-500/40 text-[#0ECB81] hover:bg-emerald-500/20'
                : 'bg-[#181D24] border-[#2B313A] text-gray-400 hover:text-white'
            }`}
            title={isEngineLive ? 'Pause Engine' : 'Start Engine'}
          >
            {isEngineLive ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#0ECB81] animate-ping" />
                <Pause className="w-3.5 h-3.5" />
                <span>{runningWorkers}/11 LIVE</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-gray-500" />
                <Play className="w-3.5 h-3.5 text-[#F0B90B]" />
                <span>START</span>
              </>
            )}
          </button>

          {/* Settings Cog */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="w-10 h-10 rounded-xl bg-[#181D24] border border-[#2B313A] hover:border-gray-500 flex items-center justify-center text-gray-400 hover:text-white transition-all"
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {feedbackMessage && (
        <div className="mx-4 mt-3 p-3 bg-amber-500/10 border border-amber-500/30 text-[#F0B90B] rounded-xl text-xs flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2">
          <Activity className="w-4 h-4 shrink-0 text-[#F0B90B]" />
          <span className="font-medium">{feedbackMessage}</span>
        </div>
      )}

      {/* ─── 2. PORTFOLIO & PNL CARD (EXCHANGE-STYLE) ─── */}
      <div className="p-4">
        <div className="bg-gradient-to-br from-[#181D24] via-[#12161A] to-[#0E1216] border border-[#2B313A] rounded-2xl p-4 shadow-xl">
          {/* Header Row */}
          <div className="flex items-center justify-between text-xs text-gray-400 font-mono mb-1">
            <div className="flex items-center gap-1.5">
              <span>{tradingMode === 'paper' ? 'VIRTUAL PORTFOLIO EQUITY' : 'EXCHANGE FUTURES BALANCE'}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tradingMode === 'paper' ? 'bg-emerald-950 text-[#0ECB81]' : 'bg-amber-950 text-[#F0B90B]'}`}>
                {tradingMode === 'paper' ? '5X ISOLATED' : 'LIVE CAPITAL'}
              </span>
            </div>
            <button
              onClick={handleManualRefresh}
              className="text-gray-400 hover:text-white p-1"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#F0B90B]' : ''}`} />
            </button>
          </div>

          {/* Big Bold Equity Display */}
          <div className="flex items-baseline justify-between mb-3">
            <div className="text-3xl font-extrabold tracking-tight text-white font-mono">
              ${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-right">
              <div className="text-[10px] text-gray-400 font-mono">WIN RATE</div>
              <div className="text-xs font-bold text-[#0ECB81] font-mono">{winRate.toFixed(1)}%</div>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#232932] text-xs">
            <div>
              <span className="text-[10px] text-gray-400 block font-mono">REALIZED PNL</span>
              <span className={`font-mono font-bold text-sm flex items-center gap-1 ${realizedPnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {realizedPnl >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {realizedPnl >= 0 ? '+' : ''}${realizedPnl.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block font-mono">ACTIVE POSITIONS</span>
              <span className="font-mono font-bold text-sm text-white">
                {activeTrades.length} Leg{activeTrades.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#232932]">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="flex-1 min-h-[44px] px-3 rounded-xl bg-[#20262E] hover:bg-[#28303A] text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-[#2B313A] transition-all"
            >
              <Settings className="w-3.5 h-3.5 text-[#F0B90B]" />
              <span>Keys / Testnet</span>
            </button>
            <button
              type="button"
              onClick={() => resetPortfolio(10000)}
              className="flex-1 min-h-[44px] px-3 rounded-xl bg-[#20262E] hover:bg-[#28303A] text-gray-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-[#2B313A] transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
              <span>Reset ($10k)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 3. SEGMENTED NAVIGATION TABS ─── */}
      <div className="px-4 mb-3">
        <div className="flex items-center bg-[#12161A] border border-[#1E2329] p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('POSITIONS')}
            className={`flex-1 min-h-[40px] rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'POSITIONS'
                ? 'bg-[#1E2329] text-white shadow-sm border border-[#2B313A]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>Positions</span>
            {activeTrades.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-[#0ECB81] text-[10px] flex items-center justify-center font-mono">
                {activeTrades.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex-1 min-h-[40px] rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'HISTORY'
                ? 'bg-[#1E2329] text-white shadow-sm border border-[#2B313A]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>History</span>
          </button>
          <button
            onClick={() => setActiveTab('FLEET')}
            className={`flex-1 min-h-[40px] rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'FLEET'
                ? 'bg-[#1E2329] text-white shadow-sm border border-[#2B313A]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>Fleet ({runningWorkers})</span>
          </button>
          <button
            onClick={() => setActiveTab('LOGS')}
            className={`flex-1 min-h-[40px] rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'LOGS'
                ? 'bg-[#1E2329] text-white shadow-sm border border-[#2B313A]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>Logs</span>
          </button>
        </div>
      </div>

      {/* ─── 4. TAB CONTENT ─── */}
      <div className="px-4 flex-1">
        {/* TAB A: ACTIVE POSITIONS */}
        {activeTab === 'POSITIONS' && (
          <div className="space-y-3">
            {activeTrades.length === 0 ? (
              <div className="p-8 text-center bg-[#12161A] border border-[#1E2329] rounded-2xl">
                <Target className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <div className="text-sm font-bold text-gray-300">No Active Positions</div>
                <div className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                  The quantitative engine will open virtual positions automatically when high-probability spikes trigger.
                </div>
              </div>
            ) : (
              activeTrades.map((t) => {
                const isLong = t.direction === 'LONG';
                return (
                  <div
                    key={t.paper_trade_id}
                    className="p-4 bg-[#12161A] border border-[#1E2329] hover:border-[#2B313A] rounded-2xl space-y-3 transition-all"
                  >
                    {/* Symbol & Direction Bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white font-mono">{t.symbol}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isLong ? 'bg-emerald-500/20 text-[#0ECB81]' : 'bg-rose-500/20 text-[#F6465D]'
                          }`}
                        >
                          {t.direction} {t.leverage}x
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">{t.exchange}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {new Date(t.opened_at).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Price & Target Matrix */}
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-[#181D24] p-2.5 rounded-xl border border-[#232932]">
                      <div>
                        <span className="text-[10px] text-gray-500 block">ENTRY</span>
                        <span className="font-bold text-white">${t.entry_price.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">TARGET TP1</span>
                        <span className="font-bold text-[#0ECB81]">${t.take_profit_1.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">STOP LOSS</span>
                        <span className="font-bold text-[#F6465D]">${t.stop_loss.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Sizing & Close Trigger */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xs font-mono text-gray-400">
                        Margin: <span className="text-white font-bold">${t.margin_usd.toFixed(2)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleClosePosition(t.paper_trade_id)}
                        disabled={closingId === t.paper_trade_id}
                        className="min-h-[40px] px-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-[#F6465D] text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{closingId === t.paper_trade_id ? 'Closing...' : 'Close Position'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB B: CLOSED TRADES HISTORY */}
        {activeTab === 'HISTORY' && (
          <div className="space-y-3">
            {closedTrades.length === 0 ? (
              <div className="p-8 text-center bg-[#12161A] border border-[#1E2329] rounded-2xl">
                <Clock className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <div className="text-sm font-bold text-gray-300">No Closed Trades Yet</div>
                <div className="text-xs text-gray-500 mt-1">Completed trade settlements will appear here with audited R and PnL.</div>
              </div>
            ) : (
              closedTrades.map((t) => {
                const isWin = t.outcome === 'WIN';
                return (
                  <div
                    key={t.paper_trade_id}
                    className="p-3.5 bg-[#12161A] border border-[#1E2329] rounded-xl flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{t.symbol}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${t.direction === 'LONG' ? 'bg-emerald-950 text-[#0ECB81]' : 'bg-rose-950 text-[#F6465D]'}`}>
                          {t.direction}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${isWin ? 'bg-emerald-500/20 text-[#0ECB81]' : 'bg-rose-500/20 text-[#F6465D]'}`}>
                          {t.outcome || 'SETTLED'}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        In: ${t.entry_price} → Out: ${t.exit_price || '—'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${isWin ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                        {t.realized_pnl_usd >= 0 ? '+' : ''}${t.realized_pnl_usd.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {t.realized_r >= 0 ? '+' : ''}{t.realized_r.toFixed(2)}R
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB C: WORKER FLEET HEALTH MATRIX */}
        {activeTab === 'FLEET' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-400 font-mono px-1">
              <span>FLEET STATUS ({runningWorkers}/{totalWorkers} ACTIVE)</span>
              <span>IN-PROCESS SUPERVISOR</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {fleet.map((w) => {
                const isRunning = w.status === 'RUNNING';
                return (
                  <div
                    key={w.id}
                    className="p-3.5 bg-[#12161A] border border-[#1E2329] hover:border-[#2B313A] rounded-xl flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-[#0ECB81] animate-pulse' : 'bg-gray-600'}`} />
                      <div>
                        <div className="text-xs font-bold text-white font-mono">{w.name}</div>
                        <div className="text-[10px] text-gray-400">{w.displayName}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 font-mono">
                        {w.ticksCount > 0 ? `${w.ticksCount} ticks` : `${w.intervalMs / 1000}s`}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleWorker(w.id)}
                        className={`min-h-[32px] px-2.5 rounded-lg text-[10px] font-bold font-mono transition-all border ${
                          isRunning
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-[#0ECB81] hover:bg-emerald-500/20'
                            : 'bg-[#181D24] border-[#2B313A] text-gray-400 hover:text-white'
                        }`}
                      >
                        {isRunning ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* System Telemetry Footer */}
            {metrics && (
              <div className="mt-4 p-3 bg-[#181D24] border border-[#232932] rounded-xl text-[10px] font-mono text-gray-400 flex items-center justify-between">
                <span>MEM: {metrics.rssMb}MB (Heap: {metrics.heapUsedMb}MB)</span>
                <span>UPTIME: {Math.floor(metrics.uptimeSeconds / 60)}m</span>
                <span>CPUs: {metrics.cpuCount}</span>
              </div>
            )}
          </div>
        )}

        {/* TAB D: TERMINAL LOGS */}
        {activeTab === 'LOGS' && (
          <div className="bg-[#07090C] border border-[#1E2329] rounded-2xl p-3 font-mono text-[11px] h-96 overflow-y-auto space-y-1">
            {logs.length === 0 ? (
              <div className="text-gray-600 text-center py-10">No live logs captured yet.</div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="leading-relaxed flex items-start gap-1.5">
                  <span className="text-gray-600 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`font-bold shrink-0 ${
                      log.level === 'SUCCESS'
                        ? 'text-[#0ECB81]'
                        : log.level === 'WARN'
                        ? 'text-[#F0B90B]'
                        : log.level === 'ERROR'
                        ? 'text-[#F6465D]'
                        : 'text-[#00D2FF]'
                    }`}
                  >
                    [{log.workerId}]
                  </span>
                  <span className="text-gray-300 break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <MobileSettingsModal />
    </div>
  );
};
