'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Target,
  DollarSign,
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink
} from 'lucide-react';

interface PaperAccount {
  id: string;
  initial_balance: number;
  current_balance: number;
  allocated_margin: number;
  free_margin: number;
  realized_pnl: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate_pct: number;
  profit_factor: number;
  equity: number;
  active_positions_count: number;
  closed_positions_count: number;
}

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
  take_profit_2: number | null;
  take_profit_3: number | null;
  stop_loss: number;
  risk_r: number | null;
  status: 'OPEN' | 'TP_HIT' | 'SL_HIT' | 'CANCELLED';
  realized_pnl_usd: number;
  realized_pnl_pct: number;
  realized_r: number;
  outcome: 'WIN' | 'LOSS' | 'UNRESOLVED' | null;
  exit_reason: string | null;
  opened_at: string;
  closed_at: string | null;
}

export const PaperTradingPanel: React.FC = () => {
  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [activeTrades, setActiveTrades] = useState<PaperTrade[]>([]);
  const [closedTrades, setClosedTrades] = useState<PaperTrade[]>([]);
  const [tradingMode, setTradingMode] = useState<'paper' | 'live'>('paper');
  const [activeSubTab, setActiveSubTab] = useState<'ACTIVE' | 'CLOSED'>('ACTIVE');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [closingTradeId, setClosingTradeId] = useState<string | null>(null);

  const fetchPaperData = useCallback(async () => {
    try {
      const res = await fetch('/api/paper-trades');
      if (!res.ok) throw new Error('Failed to fetch paper trades');
      const data = await res.json();
      if (data.success) {
        setAccount(data.account);
        setActiveTrades(data.activeTrades || []);
        setClosedTrades(data.closedTrades || []);
        if (data.tradingMode) setTradingMode(data.tradingMode);
      }
    } catch (err) {
      console.warn('Paper data fetch notice:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPaperData();
    const interval = setInterval(fetchPaperData, 4000);
    return () => clearInterval(interval);
  }, [fetchPaperData]);

  const handleManualClose = async (trade: PaperTrade) => {
    setClosingTradeId(trade.paper_trade_id);
    try {
      // Simulate close at entry or latest target
      const res = await fetch('/api/paper-trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLOSE_TRADE',
          paperTradeId: trade.paper_trade_id,
          exitPrice: trade.entry_price,
          outcome: 'WIN',
          reason: 'Manual Operator Close',
        }),
      });
      if (res.ok) {
        await fetchPaperData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClosingTradeId(null);
    }
  };

  const handleResetAccount = async () => {
    if (!window.confirm('Are you sure you want to reset your Virtual Sandbox balance back to $10,000.00? All paper trade records will be cleared.')) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch('/api/paper-trades/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialBalance: 10000 }),
      });
      if (res.ok) {
        await fetchPaperData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };

  const isNetPositive = (account?.realized_pnl ?? 0) >= 0;

  return (
    <div className="space-y-4 font-mono select-none">
      {/* Header & Mode Switcher */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 backdrop-blur shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-black tracking-wider text-slate-100 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-cyan-400" />
              <span>PAPER TRADING & SANDBOX EXECUTION ENGINE</span>
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold uppercase">
              $100 NOTIONAL SIZING
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulates live order execution on live price feeds without risking real capital. Automatic TP/SL tracking broadcast to <strong>#paper-trades</strong>.
          </p>
        </div>

        {/* Mode Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Pill Indicator */}
          <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-1 text-xs">
            <button
              onClick={() => setTradingMode('live')}
              className={`px-3 py-1 rounded transition-all font-bold ${
                tradingMode === 'live'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ▲ Live Real Trading
            </button>
            <button
              onClick={() => setTradingMode('paper')}
              className={`px-3 py-1 rounded transition-all font-bold ${
                tradingMode === 'paper'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ● Paper Sandbox
            </button>
          </div>

          {/* Reset Sandbox */}
          <button
            onClick={handleResetAccount}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs transition-all"
            title="Reset Virtual Balance back to $10,000"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reset Sandbox</span>
          </button>

          {/* Refresh */}
          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchPaperData();
            }}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-all"
            title="Refresh Paper Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Virtual Account Metrics Strip */}
      {account && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Sandbox Balance */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 backdrop-blur shadow-md space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Virtual Balance</span>
            <span className="text-base sm:text-lg font-black text-slate-50 tabular-nums">
              ${account.current_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-500 block">
              Free Margin: ${account.free_margin.toFixed(2)}
            </span>
          </div>

          {/* 2. Realized PnL */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 backdrop-blur shadow-md space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Net Realized PnL</span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-base sm:text-lg font-black tabular-nums ${
                  isNetPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isNetPositive ? `+$${account.realized_pnl}` : `-$${Math.abs(account.realized_pnl)}`}
              </span>
            </div>
            <span className={`text-[10px] font-bold ${isNetPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {account.initial_balance > 0 ? (((account.realized_pnl) / account.initial_balance) * 100).toFixed(2) : 0}% Net
            </span>
          </div>

          {/* 3. Win Rate */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 backdrop-blur shadow-md space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Win Rate</span>
            <span className="text-base sm:text-lg font-black text-cyan-300 tabular-nums">
              {account.win_rate_pct}%
            </span>
            <span className="text-[10px] text-slate-400 block">
              {account.winning_trades}W / {account.losing_trades}L
            </span>
          </div>

          {/* 4. Active Allocated Margin */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 backdrop-blur shadow-md space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Allocated Margin</span>
            <span className="text-base sm:text-lg font-black text-amber-300 tabular-nums">
              ${account.allocated_margin.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 block">
              {account.active_positions_count} Active Orders
            </span>
          </div>

          {/* 5. Profit Factor */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 backdrop-blur shadow-md space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Profit Factor</span>
            <span className="text-base sm:text-lg font-black text-slate-100 tabular-nums">
              {account.profit_factor > 0 ? `${account.profit_factor}x` : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-400 block">
              Gross Win / Loss
            </span>
          </div>

          {/* 6. Total Paper Orders */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 backdrop-blur shadow-md space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Execution History</span>
            <span className="text-base sm:text-lg font-black text-slate-50 tabular-nums">
              {account.total_trades}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {account.closed_positions_count} Closed
            </span>
          </div>
        </div>
      )}

      {/* Sub-Tab Navigation: Active Positions vs Closed History */}
      <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 p-1 rounded-xl w-fit text-xs">
        <button
          onClick={() => setActiveSubTab('ACTIVE')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
            activeSubTab === 'ACTIVE'
              ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>ACTIVE SANDBOX POSITIONS</span>
          <span className="text-[9px] px-1.5 py-0.2 bg-cyan-950 text-cyan-300 rounded border border-cyan-800 font-bold">
            {activeTrades.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('CLOSED')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
            activeSubTab === 'CLOSED'
              ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>CLOSED TRADES HISTORY</span>
          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-950 text-emerald-300 rounded border border-emerald-800 font-bold">
            {closedTrades.length}
          </span>
        </button>
      </div>

      {/* Table: Active Positions */}
      {activeSubTab === 'ACTIVE' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 backdrop-blur shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                ACTIVE VIRTUAL ORDERS ({activeTrades.length})
              </h3>
            </div>
            <span className="text-[10px] text-slate-500">
              VIRTUAL TP/SL MONITORED VIA #paper-trades
            </span>
          </div>

          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                  <th className="py-2 px-2.5">Trade ID</th>
                  <th className="py-2 px-2.5">Asset</th>
                  <th className="py-2 px-2.5">Side</th>
                  <th className="py-2 px-2.5">Entry Price</th>
                  <th className="py-2 px-2.5">TP1 Target</th>
                  <th className="py-2 px-2.5">Stop Loss</th>
                  <th className="py-2 px-2.5">Margin (Lev)</th>
                  <th className="py-2 px-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {activeTrades.length > 0 ? (
                  activeTrades.map((t) => {
                    const isLong = t.direction === 'LONG';
                    return (
                      <tr key={t.paper_trade_id} className="hover:bg-slate-950/60 transition-colors">
                        <td className="py-2 px-2.5 text-slate-400 text-[11px] whitespace-nowrap font-mono">
                          {t.paper_trade_id.slice(-14)}
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap font-bold text-slate-200">
                          {t.symbol} <span className="text-[10px] text-slate-500 font-normal">({t.exchange})</span>
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              isLong
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900'
                                : 'bg-rose-950/80 text-rose-400 border border-rose-900'
                            }`}
                          >
                            {isLong ? '🟢 LONG' : '🔴 SHORT'}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 tabular-nums text-slate-100 whitespace-nowrap">
                          ${t.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </td>
                        <td className="py-2 px-2.5 tabular-nums text-emerald-400 whitespace-nowrap">
                          ${t.take_profit_1.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </td>
                        <td className="py-2 px-2.5 tabular-nums text-rose-400 whitespace-nowrap">
                          ${t.stop_loss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </td>
                        <td className="py-2 px-2.5 tabular-nums text-slate-300 whitespace-nowrap">
                          ${t.margin_usd} ({t.leverage}x)
                        </td>
                        <td className="py-2 px-2.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleManualClose(t)}
                            disabled={closingTradeId === t.paper_trade_id}
                            className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[10px] transition-all"
                          >
                            {closingTradeId === t.paper_trade_id ? 'Closing...' : 'Close'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      {isLoading ? 'Loading sandbox trades...' : 'Zero active paper positions. Live signals will auto-execute here.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table: Closed Trades History */}
      {activeSubTab === 'CLOSED' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 backdrop-blur shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                CLOSED TRADES LEDGER ({closedTrades.length})
              </h3>
            </div>
            <span className="text-[10px] text-slate-500">
              DETERMINISTIC TP/SL RESOLUTION AUDIT
            </span>
          </div>

          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                  <th className="py-2 px-2.5">Date</th>
                  <th className="py-2 px-2.5">Asset</th>
                  <th className="py-2 px-2.5">Status</th>
                  <th className="py-2 px-2.5">Entry / Exit</th>
                  <th className="py-2 px-2.5">Realized PnL</th>
                  <th className="py-2 px-2.5">Realized R</th>
                  <th className="py-2 px-2.5 hidden md:table-cell">Exit Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {closedTrades.length > 0 ? (
                  closedTrades.map((t) => {
                    const isWin = t.outcome === 'WIN' || t.status === 'TP_HIT';
                    return (
                      <tr key={t.paper_trade_id} className="hover:bg-slate-950/60 transition-colors">
                        <td className="py-2 px-2.5 text-slate-400 text-[11px] whitespace-nowrap">
                          {t.closed_at ? new Date(t.closed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap font-bold text-slate-200">
                          {t.symbol} <span className="text-[10px] text-slate-500 font-normal">({t.direction})</span>
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                              isWin
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900'
                                : 'bg-rose-950/80 text-rose-400 border border-rose-900'
                            }`}
                          >
                            {isWin ? '🎯 TP1_HIT' : '🛑 SL_HIT'}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 tabular-nums text-slate-300 text-[11px] whitespace-nowrap">
                          ${t.entry_price.toFixed(2)} → ${t.exit_price ? t.exit_price.toFixed(2) : '—'}
                        </td>
                        <td className="py-2 px-2.5 tabular-nums whitespace-nowrap font-bold">
                          <span className={isWin ? 'text-emerald-400' : 'text-rose-400'}>
                            {t.realized_pnl_usd >= 0 ? `+$${t.realized_pnl_usd.toFixed(2)}` : `-$${Math.abs(t.realized_pnl_usd).toFixed(2)}`}
                          </span>
                          <span className={`text-[10px] ml-1 ${isWin ? 'text-emerald-500' : 'text-rose-500'}`}>
                            ({t.realized_pnl_pct >= 0 ? `+${t.realized_pnl_pct}%` : `${t.realized_pnl_pct}%`})
                          </span>
                        </td>
                        <td className="py-2 px-2.5 tabular-nums text-slate-100 font-bold whitespace-nowrap">
                          {t.realized_r >= 0 ? `+${t.realized_r.toFixed(2)}R` : `${t.realized_r.toFixed(2)}R`}
                        </td>
                        <td className="py-2 px-2.5 text-slate-400 text-[11px] hidden md:table-cell">
                          {t.exit_reason || '—'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Zero closed paper trades recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
