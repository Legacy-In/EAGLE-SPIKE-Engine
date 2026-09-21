'use client';

import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Lock,
  Unlock,
  Target,
  ShieldAlert,
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Activity,
  ChevronRight,
  Database,
  CheckCircle2,
} from 'lucide-react';

interface BigCapSignal {
  id: string;
  signal_id: string;
  symbol: 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT';
  direction: 'LONG' | 'SHORT';
  best_timeframe: '5m' | '15m' | '1h';
  entry_price: number;
  stop_loss_price: number;
  target_price_1: number;
  target_price_2: number;
  current_price: number;
  realized_pnl_pct: number;
  eagle_score: number;
  rvol: number;
  z_score: number;
  oi_delta_pct: number;
  session_tag: string;
  status: 'ACTIVE' | 'TP_HIT' | 'SL_HIT' | 'INVALIDATED' | 'EXPIRED';
  rationale_json: string[];
  detected_at: string;
  closed_at?: string;
}

interface BigCapData {
  activeSignals: BigCapSignal[];
  historicalSignals: BigCapSignal[];
  stats: {
    totalLogged: number;
    activeCount: number;
    closedCount: number;
    winRate: number;
    netPnlPct: number;
  };
}

export const BigCapSpikeSection: React.FC = () => {
  const [data, setData] = useState<BigCapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState<'ALL' | 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT'>('ALL');
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/bigcap?symbol=${selectedSymbol}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.warn('BigCap data fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [selectedSymbol]);

  // Live WebSocket ticker for active prices
  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket('wss://fstream.binance.com/stream?streams=btcusdt@ticker/ethusdt@ticker/solusdt@ticker');
      ws.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          const t = payload?.data;
          if (t && t.s && t.c) {
            setLivePrices(prev => ({
              ...prev,
              [t.s]: parseFloat(t.c)
            }));
          }
        } catch (e) {}
      };
    } catch (e) {}

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const activeSignals = data?.activeSignals || [];
  const historicalSignals = data?.historicalSignals || [];
  const stats = data?.stats || { totalLogged: 0, activeCount: 0, closedCount: 0, winRate: 0, netPnlPct: 0 };

  const bigCapAssets: Array<{ symbol: 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT'; name: string; base: string }> = [
    { symbol: 'BTCUSDT', name: 'Bitcoin Perpetual', base: 'BTC' },
    { symbol: 'ETHUSDT', name: 'Ethereum Perpetual', base: 'ETH' },
    { symbol: 'SOLUSDT', name: 'Solana Perpetual', base: 'SOL' },
  ];

  return (
    <div className="bg-sigma-surface1 border border-sigma-border rounded-xl p-4 sm:p-5 mb-6 text-sigma-textMain font-sans">
      {/* 1. Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-sigma-border">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-xl font-mono font-bold tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sigma-cyan" />
              BIG-CAP SPIKE & PNL INTELLIGENCE DESK
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-sigma-cyan/15 text-sigma-cyan border border-sigma-cyan/30">
              BTC · ETH · SOL EXCLUSIVE
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <Lock className="w-3 h-3" /> NON-OVERLAPPING LOCK
            </span>
          </div>
          <p className="text-xs text-sigma-textMuted font-mono">
            Continuous 24/7 multi-timeframe analytics (5m, 15m, 1h) · Institutional volume & OI expansion · Automated TP/SL lifecycle
          </p>
        </div>

        {/* Aggregate KPI Strip */}
        <div className="flex items-center gap-2 sm:gap-4 font-mono text-xs">
          <div className="px-3 py-1.5 rounded bg-sigma-surface2 border border-sigma-border text-center">
            <div className="text-[10px] text-sigma-textDark">ACTIVE LOCKS</div>
            <div className="text-sm font-bold text-sigma-cyan tabular-nums">{stats.activeCount} / 3</div>
          </div>
          <div className="px-3 py-1.5 rounded bg-sigma-surface2 border border-sigma-border text-center">
            <div className="text-[10px] text-sigma-textDark">HISTORICAL WIN RATE</div>
            <div className="text-sm font-bold text-emerald-400 tabular-nums">
              {stats.closedCount > 0 ? `${stats.winRate}%` : '—'}
            </div>
          </div>
          <div className="px-3 py-1.5 rounded bg-sigma-surface2 border border-sigma-border text-center">
            <div className="text-[10px] text-sigma-textDark">NET REALIZED ROI</div>
            <div className={`text-sm font-bold tabular-nums ${stats.netPnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stats.netPnlPct >= 0 ? `+${stats.netPnlPct}%` : `${stats.netPnlPct}%`}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Asset Overview & Regime Cards (BTC, ETH, SOL) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-6">
        {bigCapAssets.map((asset) => {
          const active = activeSignals.find((s) => s.symbol === asset.symbol);
          const livePrice = livePrices[asset.symbol] || (active ? active.current_price : 0);

          return (
            <div
              key={asset.symbol}
              className={`rounded-lg border p-3.5 transition-all ${
                active
                  ? 'bg-sigma-surface2/90 border-sigma-cyan/40 shadow-lg shadow-sigma-cyan/5'
                  : 'bg-sigma-surface2/40 border-sigma-border/80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-white">{asset.base}</span>
                  <span className="text-[11px] font-mono text-sigma-textMuted">/ USDT</span>
                </div>
                {active ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sigma-cyan/15 text-sigma-cyan border border-sigma-cyan/30 animate-pulse">
                    <Lock className="w-3 h-3" />
                    LOCKED ({active.direction})
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-sigma-textDark px-2 py-0.5 rounded bg-sigma-surface3 border border-sigma-border">
                    <Unlock className="w-3 h-3" />
                    READY (SCANNING)
                  </span>
                )}
              </div>

              <div className="flex items-baseline justify-between mb-3 font-mono">
                <span className="text-xl font-bold tracking-tight text-white tabular-nums">
                  ${livePrice > 0 ? livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '—'}
                </span>
                {active && (
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      active.direction === 'LONG' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    Entry: ${active.entry_price}
                  </span>
                )}
              </div>

              {/* Timeframe indicators */}
              <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                <div className="px-2 py-1 rounded bg-sigma-surface3 text-center border border-sigma-border/60">
                  <span className="text-sigma-textDark block">5m TF</span>
                  <span className="text-sigma-textMuted font-bold">{active?.best_timeframe === '5m' ? 'ACTIVE' : 'READY'}</span>
                </div>
                <div className="px-2 py-1 rounded bg-sigma-surface3 text-center border border-sigma-border/60">
                  <span className="text-sigma-textDark block">15m TF</span>
                  <span className="text-sigma-textMuted font-bold">{active?.best_timeframe === '15m' ? 'ACTIVE' : 'READY'}</span>
                </div>
                <div className="px-2 py-1 rounded bg-sigma-surface3 text-center border border-sigma-border/60">
                  <span className="text-sigma-textDark block">1h TF</span>
                  <span className="text-sigma-textMuted font-bold">{active?.best_timeframe === '1h' ? 'ACTIVE' : 'READY'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Active Setups & Rationale Cards */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono text-xs font-bold text-sigma-textMuted uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-sigma-cyan" />
            ACTIVE DIRECTIONAL TRADES & EXCLUSIVE LOCKS ({activeSignals.length})
          </h3>
          <span className="text-[11px] font-mono text-sigma-textDark">
            Strict 1 Position Per Symbol · Auto TP2 (+3.5%) / SL (-0.8%)
          </span>
        </div>

        {activeSignals.length === 0 ? (
          <div className="bg-sigma-surface2/40 border border-dashed border-sigma-border rounded-lg p-6 text-center text-xs font-mono text-sigma-textMuted">
            No active big-cap signals currently locked. Scanner evaluating 5m/15m/1h volume compression &amp; expansion across BTC, ETH, and SOL.
          </div>
        ) : (
          <div className="space-y-4">
            {activeSignals.map((sig) => {
              const live = livePrices[sig.symbol] || sig.current_price;
              const isLong = sig.direction === 'LONG';
              const diffPct = isLong
                ? ((live - sig.entry_price) / sig.entry_price) * 100
                : ((sig.entry_price - live) / sig.entry_price) * 100;
              const isPnlPositive = diffPct >= 0;

              return (
                <div
                  key={sig.signal_id}
                  className="bg-sigma-surface2 border border-sigma-border rounded-lg p-4 font-mono transition-all hover:border-sigma-cyan/40"
                >
                  {/* Card Top Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-sigma-border/80">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base font-bold text-white">{sig.symbol}</span>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-bold rounded flex items-center gap-1 ${
                          isLong
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {isLong ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {sig.direction}
                      </span>
                      <span className="px-2 py-0.5 text-[11px] rounded bg-sigma-surface3 text-sigma-cyan border border-sigma-border flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        Best TF: {sig.best_timeframe}
                      </span>
                      <span className="px-2 py-0.5 text-[11px] rounded bg-sigma-surface3 text-sigma-textMuted border border-sigma-border">
                        Score: <strong className="text-white">{sig.eagle_score}/100</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] text-sigma-textDark">UNREALIZED PNL</div>
                        <div
                          className={`text-sm font-bold tabular-nums ${
                            isPnlPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isPnlPositive ? `+${diffPct.toFixed(2)}%` : `${diffPct.toFixed(2)}%`}
                        </div>
                      </div>
                      <span className="text-[10px] text-sigma-textDark">
                        Detected: {new Date(sig.detected_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Pricing & State Machine Progress Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-xs">
                    <div className="p-2 rounded bg-sigma-surface3 border border-sigma-border/60">
                      <div className="text-[10px] text-sigma-textDark">ENTRY PRICE</div>
                      <div className="text-white font-bold tabular-nums">${sig.entry_price}</div>
                    </div>
                    <div className="p-2 rounded bg-sigma-surface3 border border-sigma-border/60">
                      <div className="text-[10px] text-sigma-textDark">STOP LOSS (-0.8%)</div>
                      <div className="text-rose-400 font-bold tabular-nums">${sig.stop_loss_price}</div>
                    </div>
                    <div className="p-2 rounded bg-sigma-surface3 border border-sigma-border/60">
                      <div className="text-[10px] text-sigma-textDark">TARGET 1 (+1.5%)</div>
                      <div className="text-emerald-400 font-bold tabular-nums">${sig.target_price_1}</div>
                    </div>
                    <div className="p-2 rounded bg-sigma-surface3 border border-sigma-border/60">
                      <div className="text-[10px] text-sigma-textDark">TARGET 2 (+3.5%)</div>
                      <div className="text-emerald-400 font-bold tabular-nums">${sig.target_price_2}</div>
                    </div>
                  </div>

                  {/* 4-Bullet Quantitative Rationale Container */}
                  <div className="p-3.5 rounded bg-sigma-surface3/80 border border-sigma-border/80 text-xs">
                    <div className="font-bold text-sigma-cyan mb-2 flex items-center gap-1.5 text-[11px]">
                      <Database className="w-3.5 h-3.5" />
                      DETERMINISTIC QUANTITATIVE RATIONALE
                    </div>
                    <ul className="space-y-1.5 text-sigma-textMuted leading-relaxed">
                      {(sig.rationale_json || []).map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-sigma-cyan mt-0.5">•</span>
                          <span className="text-[11px] text-sigma-textMain">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Historical Resolved Signals Log */}
      <div>
        <h3 className="font-mono text-xs font-bold text-sigma-textMuted uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-sigma-cyan" />
          RESOLVED BIG-CAP POSITIONS AUDIT LOG
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-sigma-border text-sigma-textDark text-[11px]">
                <th className="py-2 px-3">TIMESTAMP</th>
                <th className="py-2 px-3">SIGNAL ID</th>
                <th className="py-2 px-3">SYMBOL</th>
                <th className="py-2 px-3">SIDE</th>
                <th className="py-2 px-3">BEST TF</th>
                <th className="py-2 px-3">ENTRY</th>
                <th className="py-2 px-3">EXIT</th>
                <th className="py-2 px-3">REALIZED ROI</th>
                <th className="py-2 px-3">OUTCOME</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sigma-border/50 text-sigma-textMuted">
              {historicalSignals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-sigma-textDark">
                    No closed positions logged yet. Automated TP/SL evaluation active.
                  </td>
                </tr>
              ) : (
                historicalSignals.map((h) => {
                  const isLong = h.direction === 'LONG';
                  const pnl = parseFloat(h.realized_pnl_pct as any) || 0;
                  const isWin = h.status === 'TP_HIT';

                  return (
                    <tr key={h.signal_id} className="hover:bg-sigma-surface2/50 transition-colors">
                      <td className="py-2 px-3 text-sigma-textDark">
                        {h.closed_at ? new Date(h.closed_at).toLocaleTimeString() : new Date(h.detected_at).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-3 text-sigma-cyan font-bold">{h.signal_id.slice(-12)}</td>
                      <td className="py-2 px-3 font-bold text-white">{h.symbol}</td>
                      <td className={`py-2 px-3 font-bold ${isLong ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {h.direction}
                      </td>
                      <td className="py-2 px-3">{h.best_timeframe}</td>
                      <td className="py-2 px-3 tabular-nums">${h.entry_price}</td>
                      <td className="py-2 px-3 tabular-nums">${h.current_price}</td>
                      <td className={`py-2 px-3 font-bold tabular-nums ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {pnl >= 0 ? `+${pnl}%` : `${pnl}%`}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isWin
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
