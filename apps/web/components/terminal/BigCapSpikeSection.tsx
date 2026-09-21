'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
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
  Radio,
  RefreshCw,
  Eye,
  Sliders,
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
  historicalRecords: BigCapSignal[];
  stats: {
    totalLogged: number;
    activeCount: number;
    closedCount: number;
    winRate: number;
    netPnlPct: number;
  };
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yyswmlsrvrqwhztbktlm.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5c3dtbHNydnJxd2h6dGJrdGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NTcyMzEsImV4cCI6MjEwNTUzMzIzMX0.GLZLSZR2vXTdzECLBKcS9YURb3DmEfH7ojFaTd1a_JA';

const bigCapAssets: Array<{ symbol: 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT'; name: string; base: string; minVol: string }> = [
  { symbol: 'BTCUSDT', name: 'Bitcoin Perpetual', base: 'BTC', minVol: '1.5x - 2.1x' },
  { symbol: 'ETHUSDT', name: 'Ethereum Perpetual', base: 'ETH', minVol: '1.5x - 2.1x' },
  { symbol: 'SOLUSDT', name: 'Solana Perpetual', base: 'SOL', minVol: '1.8x - 2.4x' },
];

export const BigCapSpikeSection: React.FC = () => {
  const [data, setData] = useState<BigCapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState<'ALL' | 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT'>('ALL');
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [wsConnected, setWsConnected] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const supabaseRef = useRef<any>(null);

  // Initialize Supabase client
  if (!supabaseRef.current) {
    try {
      supabaseRef.current = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
      console.warn('Supabase client init warning:', e);
    }
  }

  // 1. Fetch strict DB-backed state from GET /api/bigcap (historicalRecords array)
  const fetchData = async () => {
    try {
      const res = await fetch(`/api/bigcap?symbol=${selectedSymbol}`);
      const json = await res.json();
      if (json.success && json.data) {
        const hist = json.data.historicalRecords || json.data.historicalSignals || [];
        setData({
          ...json.data,
          historicalRecords: hist,
          historicalSignals: hist,
        });
      }
    } catch (err) {
      console.warn('BigCap data fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Initial fetch & 2000ms high-frequency polling fallback
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [selectedSymbol]);

  // 3. Supabase Realtime channel subscription with dynamic PREPEND on terminal state transition
  useEffect(() => {
    const client = supabaseRef.current;
    if (!client) return;

    let channel: any = null;
    try {
      const terminalStates = ['TP_HIT', 'SL_HIT', 'INVALIDATED', 'EXPIRED'];
      channel = client
        .channel('public:big_cap_signals_web')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'big_cap_signals' },
          (payload: any) => {
            const { eventType, new: newRec } = payload;
            if (eventType === 'UPDATE' && newRec && terminalStates.includes(newRec.status)) {
              setData((prev) => {
                if (!prev) return prev;
                // 1. Remove from activeSignals
                const updatedActive = (prev.activeSignals || []).filter(
                  (s) => s.signal_id !== newRec.signal_id && s.id !== newRec.id
                );
                // 2. Prepend to historicalRecords table
                const currentHistory = prev.historicalRecords || prev.historicalSignals || [];
                const exists = currentHistory.some(
                  (s) => s.signal_id === newRec.signal_id || s.id === newRec.id
                );
                const updatedHistory = exists
                  ? currentHistory.map((s) =>
                      s.signal_id === newRec.signal_id || s.id === newRec.id ? newRec : s
                    )
                  : [newRec, ...currentHistory];

                // 3. Recalculate net session stats in real time
                const closed = updatedHistory.filter(
                  (s) => s.status === 'TP_HIT' || s.status === 'SL_HIT'
                );
                const tpCount = closed.filter((s) => s.status === 'TP_HIT').length;
                const winRate =
                  closed.length > 0
                    ? parseFloat(((tpCount / closed.length) * 100).toFixed(1))
                    : 0;
                const netPnl = closed.reduce(
                  (acc, s) => acc + (parseFloat(s.realized_pnl_pct as any) || 0),
                  0
                );

                return {
                  ...prev,
                  activeSignals: updatedActive,
                  historicalSignals: updatedHistory,
                  historicalRecords: updatedHistory,
                  stats: {
                    totalLogged: updatedActive.length + updatedHistory.length,
                    activeCount: updatedActive.length,
                    closedCount: closed.length,
                    winRate,
                    netPnlPct: parseFloat(netPnl.toFixed(2)),
                  },
                };
              });
            } else {
              fetchData();
            }
          }
        )
        .subscribe((status: string) => {
          setRealtimeConnected(status === 'SUBSCRIBED');
        });
    } catch (e) {
      console.warn('Supabase Realtime subscription notice:', e);
    }

    return () => {
      if (channel && client) {
        client.removeChannel(channel);
      }
    };
  }, []);

  // 4. Live Binance WebSocket Ticker for real-time floating PnL
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWs = () => {
      try {
        ws = new WebSocket('wss://fstream.binance.com/stream?streams=btcusdt@ticker/ethusdt@ticker/solusdt@ticker');
        ws.onopen = () => setWsConnected(true);
        ws.onmessage = (evt) => {
          try {
            const payload = JSON.parse(evt.data);
            const t = payload?.data;
            if (t && t.s && t.c) {
              setLivePrices((prev) => ({
                ...prev,
                [t.s]: parseFloat(t.c),
              }));
            }
          } catch (e) {}
        };
        ws.onerror = () => setWsConnected(false);
        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimeout = setTimeout(connectWs, 3000);
        };
      } catch (e) {
        setWsConnected(false);
      }
    };

    connectWs();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  const activeSignals = useMemo(() => data?.activeSignals || [], [data]);
  const historicalRecords = useMemo(
    () => data?.historicalRecords || data?.historicalSignals || [],
    [data]
  );
  const historicalSignals = historicalRecords;
  const stats = useMemo(
    () => data?.stats || { totalLogged: 0, activeCount: 0, closedCount: 0, winRate: 0, netPnlPct: 0 },
    [data]
  );

  // Filter assets to render based on user selection
  const visibleAssets = useMemo(() => {
    if (selectedSymbol === 'ALL') return bigCapAssets;
    return bigCapAssets.filter((a) => a.symbol === selectedSymbol);
  }, [selectedSymbol]);

  return (
    <div className="bg-sigma-surface1 border border-sigma-border rounded-xl p-4 sm:p-5 mb-6 text-sigma-textMain font-sans">
      {/* 1. Header Banner & Live Pipeline Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-sigma-border">
        <div>
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <span className="text-xl font-mono font-bold tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sigma-cyan" />
              BIG-CAP SPIKE &amp; PNL INTELLIGENCE DESK
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-sigma-cyan/15 text-sigma-cyan border border-sigma-cyan/30">
              BTC · ETH · SOL EXCLUSIVE
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <Lock className="w-3 h-3" /> NON-OVERLAPPING LOCK
            </span>
            {realtimeConnected ? (
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" /> REALTIME STREAMING
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-sigma-cyan/15 text-sigma-cyan border border-sigma-cyan/30 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> SYNC (2000MS)
              </span>
            )}
            {wsConnected && (
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                <Activity className="w-3 h-3" /> WS LIVE TICK
              </span>
            )}
          </div>
          <p className="text-xs text-sigma-textMuted font-mono">
            Continuous 24/7 multi-timeframe analytics (5m, 15m, 1h) · Institutional volume &amp; OI expansion · Automated TP/SL lifecycle
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

      {/* Symbol Filter Controls */}
      <div className="flex items-center gap-2 mb-4 font-mono text-xs">
        <span className="text-sigma-textDark text-[11px]">FILTER DESK:</span>
        {(['ALL', 'BTCUSDT', 'ETHUSDT', 'SOLUSDT'] as const).map((sym) => (
          <button
            key={sym}
            onClick={() => setSelectedSymbol(sym)}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
              selectedSymbol === sym
                ? 'bg-sigma-cyan text-black'
                : 'bg-sigma-surface2 text-sigma-textMuted hover:text-white border border-sigma-border'
            }`}
          >
            {sym}
          </button>
        ))}
      </div>

      {/* 2. Top Asset Regime Matrix (BTC, ETH, SOL) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-6">
        {visibleAssets.map((asset) => {
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
                  <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    <Unlock className="w-3 h-3" />
                    READY (SCANNING)
                  </span>
                )}
              </div>

              <div className="flex items-baseline justify-between mb-3 font-mono">
                <span className="text-xl font-bold tracking-tight text-white tabular-nums">
                  ${livePrice > 0 ? livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '—'}
                </span>
                {active ? (
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      active.direction === 'LONG' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    Entry: ${active.entry_price}
                  </span>
                ) : (
                  <span className="text-[10px] text-sigma-textDark font-mono">RVOL Req: {asset.minVol}</span>
                )}
              </div>

              {/* Timeframe indicators */}
              <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                <div className="px-2 py-1 rounded bg-sigma-surface3 text-center border border-sigma-border/60">
                  <span className="text-sigma-textDark block">5m TF</span>
                  <span className={`font-bold ${active?.best_timeframe === '5m' ? 'text-sigma-cyan' : 'text-sigma-textMuted'}`}>
                    {active?.best_timeframe === '5m' ? 'ACTIVE' : 'SCANNING'}
                  </span>
                </div>
                <div className="px-2 py-1 rounded bg-sigma-surface3 text-center border border-sigma-border/60">
                  <span className="text-sigma-textDark block">15m TF</span>
                  <span className={`font-bold ${active?.best_timeframe === '15m' ? 'text-sigma-cyan' : 'text-sigma-textMuted'}`}>
                    {active?.best_timeframe === '15m' ? 'ACTIVE' : 'SCANNING'}
                  </span>
                </div>
                <div className="px-2 py-1 rounded bg-sigma-surface3 text-center border border-sigma-border/60">
                  <span className="text-sigma-textDark block">1h TF</span>
                  <span className={`font-bold ${active?.best_timeframe === '1h' ? 'text-sigma-cyan' : 'text-sigma-textMuted'}`}>
                    {active?.best_timeframe === '1h' ? 'ACTIVE' : 'SCANNING'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Active Setups & Rationale Cards Container (Strict DB + Live Telemetry) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-mono text-xs font-bold text-sigma-textMuted uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-sigma-cyan" />
            ACTIVE DIRECTIONAL SETUPS &amp; INSTITUTIONAL SCANNER TELEMETRY
          </h3>
          <span className="text-[11px] font-mono text-sigma-textDark">
            Strict 1 Position Per Symbol · Auto TP2 (+3.5%) / SL (-0.8%)
          </span>
        </div>

        <div className="space-y-4">
          {visibleAssets.map((asset) => {
            const active = activeSignals.find((s) => s.symbol === asset.symbol);
            const livePrice = livePrices[asset.symbol] || (active ? active.current_price : 0);

            // If active signal exists for this symbol: Render Active Trade Card with live floating PnL
            if (active) {
              const live = livePrice > 0 ? livePrice : active.current_price;
              const isLong = active.direction === 'LONG';
              const floatingPnl = isLong
                ? ((live - active.entry_price) / active.entry_price) * 100
                : ((active.entry_price - live) / active.entry_price) * 100;
              const isPnlPositive = floatingPnl >= 0;

              // Progress bar calculation from SL (-0.8%) to TP2 (+3.5%) = 4.3% range
              const gaugeWidth = Math.max(0, Math.min(100, ((floatingPnl + 0.8) / 4.3) * 100));

              return (
                <div
                  key={active.signal_id}
                  className="bg-sigma-surface2 border border-sigma-cyan/40 rounded-lg p-4 font-mono transition-all shadow-lg shadow-sigma-cyan/5"
                >
                  {/* Card Top Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-sigma-border/80">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-base font-bold text-white">{active.symbol}</span>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-bold rounded flex items-center gap-1 ${
                          isLong
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {isLong ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {active.direction}
                      </span>
                      <span className="px-2 py-0.5 text-[11px] rounded bg-sigma-surface3 text-sigma-cyan border border-sigma-border flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        Best TF: {active.best_timeframe}
                      </span>
                      <span className="px-2 py-0.5 text-[11px] rounded bg-sigma-surface3 text-sigma-textMuted border border-sigma-border">
                        Eagle Score: <strong className="text-white">{active.eagle_score}/100</strong>
                      </span>
                      <span className="px-2 py-0.5 text-[11px] rounded bg-sigma-cyan/15 text-sigma-cyan border border-sigma-cyan/30 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> EXCLUSIVE LOCK ACTIVE
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-[10px] text-sigma-textDark flex items-center justify-end gap-1">
                          <Radio className="w-2.5 h-2.5 text-sigma-cyan animate-pulse" />
                          FLOATING REALTIME PNL
                        </div>
                        <div
                          className={`text-base font-bold tabular-nums ${
                            isPnlPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isPnlPositive ? `+${floatingPnl.toFixed(2)}%` : `${floatingPnl.toFixed(2)}%`}
                        </div>
                      </div>
                      <span className="text-[10px] text-sigma-textDark hidden sm:inline">
                        Detected: {new Date(active.detected_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Pricing Target Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3 text-xs">
                    <div className="p-2.5 rounded bg-sigma-surface3 border border-sigma-border/60">
                      <div className="text-[10px] text-sigma-textDark">ENTRY PRICE</div>
                      <div className="text-white font-bold tabular-nums">${active.entry_price}</div>
                    </div>
                    <div className="p-2.5 rounded bg-sigma-surface3 border border-sigma-border/60">
                      <div className="text-[10px] text-sigma-textDark">STOP LOSS (-0.8%)</div>
                      <div className="text-rose-400 font-bold tabular-nums">${active.stop_loss_price}</div>
                    </div>
                    <div className="p-2.5 rounded bg-sigma-surface3 border border-sigma-border/60">
                      <div className="text-[10px] text-sigma-textDark">TARGET 1 (+1.5%)</div>
                      <div className="text-emerald-400 font-bold tabular-nums">${active.target_price_1}</div>
                    </div>
                    <div className="p-2.5 rounded bg-sigma-surface3 border border-sigma-border/60">
                      <div className="text-[10px] text-sigma-textDark">TARGET 2 (+3.5%)</div>
                      <div className="text-emerald-400 font-bold tabular-nums">${active.target_price_2}</div>
                    </div>
                  </div>

                  {/* Dynamic Progress Bar (SL to TP2) */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] text-sigma-textDark mb-1.5">
                      <span>SL (-0.8%)</span>
                      <span className="text-sigma-textMuted">ENTRY</span>
                      <span className="text-sigma-textMuted">TP1 (+1.5%)</span>
                      <span className="text-emerald-400 font-bold">TP2 (+3.5%)</span>
                    </div>
                    <div className="w-full h-2 bg-sigma-surface3 rounded-full overflow-hidden relative border border-sigma-border">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 via-sigma-cyan to-emerald-400 transition-all duration-300"
                        style={{ width: `${gaugeWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* 4-Bullet Quantitative Rationale Container */}
                  <div className="p-3.5 rounded bg-sigma-surface3/80 border border-sigma-border/80 text-xs">
                    <div className="font-bold text-sigma-cyan mb-2 flex items-center gap-1.5 text-[11px]">
                      <Database className="w-3.5 h-3.5" />
                      DETERMINISTIC QUANTITATIVE RATIONALE
                    </div>
                    <ul className="space-y-1.5 text-sigma-textMuted leading-relaxed">
                      {(active.rationale_json || []).map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-sigma-cyan mt-0.5">•</span>
                          <span className="text-[11px] text-sigma-textMain">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            }

            // If NO active trade exists for this symbol: Render Authentic Institutional Telemetry Scanning Card
            return (
              <div
                key={asset.symbol}
                className="bg-sigma-surface2/40 border border-dashed border-sigma-border/90 rounded-lg p-4 font-mono transition-all"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-sigma-border/60">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-base font-bold text-white">{asset.symbol}</span>
                    <span className="px-2 py-0.5 text-[10px] rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Unlock className="w-3 h-3" />
                      STATUS: READY / UNLOCKED
                    </span>
                    <span className="text-[11px] text-sigma-textMuted">
                      SCANNING FOR 5M/15M/1H CONFLUENCE &amp; OI SQUEEZE
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[10px] text-sigma-textDark block">MARK TICK PRICE</span>
                    <span className="text-sm font-bold text-white tabular-nums">
                      ${livePrice > 0 ? livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : 'CONNECTING...'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                  <div className="p-2.5 rounded bg-sigma-surface3/60 border border-sigma-border/50">
                    <div className="text-sigma-textDark text-[10px] mb-0.5">TIMEFRAME FOOTPRINT</div>
                    <div className="text-sigma-textMain">Evaluating 5m, 15m, 1h Candles</div>
                    <div className="text-sigma-textMuted text-[10px] mt-0.5">Z-Score &gt; 2.5 Sigma Threshold</div>
                  </div>
                  <div className="p-2.5 rounded bg-sigma-surface3/60 border border-sigma-border/50">
                    <div className="text-sigma-textDark text-[10px] mb-0.5">OI SQUEEZE SENSITIVITY</div>
                    <div className="text-sigma-textMain">Monitoring Compression / Expansion</div>
                    <div className="text-sigma-textMuted text-[10px] mt-0.5">OI Delta &gt; +2.0% Gate</div>
                  </div>
                  <div className="p-2.5 rounded bg-sigma-surface3/60 border border-sigma-border/50">
                    <div className="text-sigma-textDark text-[10px] mb-0.5">AUTOMATED EXECUTION ENGINE</div>
                    <div className="text-sigma-textMain">Standing By For Ingestion Lock</div>
                    <div className="text-sigma-textMuted text-[10px] mt-0.5">Target: TP2 (+3.5%) / SL (-0.8%)</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Resolved Positions Audit Log (Strict Database SQL Results, Zero Mock Rows) */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-mono text-xs font-bold text-sigma-textMuted uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-sigma-cyan" />
            RESOLVED BIG-CAP TRADES LOG &amp; AUDIT TRAIL ({historicalRecords.length})
          </h3>
          <span className="text-[11px] font-mono text-sigma-textDark">
            Strict Supabase Query: `status IN (TP_HIT, SL_HIT, INVALIDATED, EXPIRED)`
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-sigma-border text-sigma-textDark text-[11px]">
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">SIGNAL ID</th>
                <th className="py-2.5 px-3">SYMBOL</th>
                <th className="py-2.5 px-3">SIDE</th>
                <th className="py-2.5 px-3">BEST TF</th>
                <th className="py-2.5 px-3">ENTRY</th>
                <th className="py-2.5 px-3">EXIT</th>
                <th className="py-2.5 px-3">REALIZED ROI</th>
                <th className="py-2.5 px-3">OUTCOME</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sigma-border/50 text-sigma-textMuted">
              {historicalRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-sigma-textDark font-mono text-xs">
                    [NO RESOLVED BIG-CAP TRADES IN AUDIT WINDOW]
                  </td>
                </tr>
              ) : (
                historicalRecords.map((h) => {
                  const isLong = h.direction === 'LONG';
                  const pnl = parseFloat(h.realized_pnl_pct as any) || 0;
                  const isWin = h.status === 'TP_HIT';

                  return (
                    <tr key={h.signal_id} className="hover:bg-sigma-surface2/50 transition-colors">
                      <td className="py-2 px-3 text-sigma-textDark whitespace-nowrap">
                        {h.closed_at ? new Date(h.closed_at).toLocaleTimeString() : new Date(h.detected_at).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-3 text-sigma-cyan font-bold whitespace-nowrap">{h.signal_id.slice(-14)}</td>
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
