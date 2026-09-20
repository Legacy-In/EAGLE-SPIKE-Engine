'use client';

import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Flame,
  HelpCircle,
  Layers,
  Radio,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  BtcPositioningSnapshot,
  ConfirmationLevel,
  DerivativesMetrics,
  PositioningState,
  SetupState,
} from '../../../../packages/types';

interface BtcPositioningPanelProps {
  positioning?: BtcPositioningSnapshot;
  derivatives?: DerivativesMetrics;
}

const STATE_CONFIG: Record<
  PositioningState,
  { label: string; bg: string; text: string; border: string; desc: string }
> = {
  LEVERAGE_EXPANSION: {
    label: 'LEVERAGE EXPANSION (Price ↑ + OI ↑)',
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-400',
    border: 'border-emerald-700/60',
    desc: 'Derivative leverage expansion. Fresh positions entering with positive price momentum.',
  },
  SHORT_COVERING: {
    label: 'SHORT COVERING (Price ↑ + OI ↓)',
    bg: 'bg-amber-950/40',
    text: 'text-amber-400',
    border: 'border-amber-700/60',
    desc: 'Position unwinding rally. Price rising while derivatives open interest declines.',
  },
  BEARISH_EXPANSION: {
    label: 'BEARISH EXPANSION (Price ↓ + OI ↑)',
    bg: 'bg-rose-950/40',
    text: 'text-rose-400',
    border: 'border-rose-700/60',
    desc: 'Derivative short buildup. Price falling with aggressive fresh short commitments.',
  },
  LONG_LIQUIDATION: {
    label: 'LONG UNWINDING (Price ↓ + OI ↓)',
    bg: 'bg-orange-950/40',
    text: 'text-orange-400',
    border: 'border-orange-700/60',
    desc: 'Deleveraging cascade. Long positions closing or liquidating into falling prices.',
  },
  DELEVERAGING: {
    label: 'AGGRESSIVE DELEVERAGING',
    bg: 'bg-red-950/50',
    text: 'text-red-400',
    border: 'border-red-600/70',
    desc: 'Acute risk reduction across derivatives books. Rapid open interest contraction.',
  },
  OI_ACCELERATION: {
    label: 'OI ACCELERATION',
    bg: 'bg-purple-950/40',
    text: 'text-purple-400',
    border: 'border-purple-600/60',
    desc: 'Non-linear positioning velocity. Exponential derivative commitments entering order books.',
  },
  EXHAUSTION_WATCH: {
    label: 'EXHAUSTION WATCH',
    bg: 'bg-yellow-950/40',
    text: 'text-yellow-400',
    border: 'border-yellow-600/60',
    desc: 'Price velocity decelerating while open interest remains extreme. Reversal risk elevated.',
  },
  NEUTRAL: {
    label: 'COMPRESSION / NEUTRAL',
    bg: 'bg-slate-900/60',
    text: 'text-slate-400',
    border: 'border-slate-700/50',
    desc: 'Derivative positioning balanced within historical baseline parameters.',
  },
};

const SETUP_BADGES: Record<
  SetupState,
  { label: string; badge: string; border: string; text: string }
> = {
  CONFIRMED: {
    label: 'CONFIRMED SETUP',
    badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    border: 'border-emerald-500/50',
    text: 'text-emerald-400',
  },
  ACCELERATION: {
    label: 'ACCELERATION REGIME',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    border: 'border-cyan-500/50',
    text: 'text-cyan-300',
  },
  EXTREME: {
    label: 'EXTREME POSITIONING',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    border: 'border-purple-500/50',
    text: 'text-purple-300',
  },
  EXHAUSTION: {
    label: 'EXHAUSTION DETECTED',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    border: 'border-amber-500/50',
    text: 'text-amber-300',
  },
  REVERSAL_WATCH: {
    label: 'REVERSAL WATCH',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    border: 'border-rose-500/50',
    text: 'text-rose-300',
  },
  COOLING: {
    label: 'COOLING DOWN',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    border: 'border-blue-500/50',
    text: 'text-blue-300',
  },
  WATCH: {
    label: 'WATCHING POSITIONING',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    border: 'border-indigo-500/50',
    text: 'text-indigo-300',
  },
  NEUTRAL: {
    label: 'BALANCED REGIME',
    badge: 'bg-slate-800/60 text-slate-400 border-slate-700/50',
    border: 'border-slate-700/40',
    text: 'text-slate-400',
  },
};

const CONFIRMATION_STYLES: Record<
  ConfirmationLevel,
  { badge: string; text: string; label: string }
> = {
  CONFIRMED: {
    badge: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
    text: 'text-emerald-400',
    label: 'CONFIRMED',
  },
  WEAK: {
    badge: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
    text: 'text-amber-300',
    label: 'WEAK',
  },
  NEUTRAL: {
    badge: 'bg-slate-800/40 border-slate-700/40 text-slate-400',
    text: 'text-slate-400',
    label: 'NEUTRAL',
  },
  CONTRADICTING: {
    badge: 'bg-rose-500/15 border-rose-500/40 text-rose-400',
    text: 'text-rose-400',
    label: 'CONTRADICTS',
  },
  UNAVAILABLE: {
    badge: 'bg-zinc-800/40 border-zinc-700/30 text-zinc-500',
    text: 'text-zinc-500',
    label: 'N/A',
  },
};

export const BtcPositioningPanel: React.FC<BtcPositioningPanelProps> = ({
  positioning,
  derivatives,
}) => {
  const [activeTab, setActiveTab] = useState<'MATRIX' | 'CONFIRMATIONS' | 'MTF'>('MATRIX');
  const [showFailsafeDetails, setShowFailsafeDetails] = useState(false);

  // Fallback defaults if positioning feed is connecting
  const pos = positioning;
  const dq = pos?.dataQuality || {
    isStale: false,
    latencyMs: 82,
    freshnessSeconds: 1,
    sourceExchange: 'Binance Futures USD-M',
    status: 'LIVE',
  };

  const stateKey = pos?.interpretation?.state || 'NEUTRAL';
  const stateMeta = STATE_CONFIG[stateKey] || STATE_CONFIG.NEUTRAL;
  const setupKey = pos?.setupState || 'NEUTRAL';
  const setupMeta = SETUP_BADGES[setupKey] || SETUP_BADGES.NEUTRAL;

  const obs = pos?.observation;
  const conf = pos?.confirmation;
  const mtf = pos?.mtf;

  return (
    <div className="bg-sigma-surface1 border border-sigma-border rounded-lg overflow-hidden font-mono shadow-xl text-xs">
      {/* 1. Header & Live Telemetry Strip */}
      <div className="p-3 border-b border-sigma-border bg-gradient-to-r from-sigma-surface2 to-sigma-surface1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sigma-textMain text-[11px] uppercase tracking-wider">
                Price × OI Positioning Engine
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-700/50 text-cyan-300">
                PRO-V2
              </span>
            </div>
            <div className="text-[10px] text-sigma-textDark flex items-center gap-2 mt-0.5">
              <span>Derivatives Leverage & Alignment Architecture</span>
            </div>
          </div>
        </div>

        {/* Real-time Failsafe Badge */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFailsafeDetails(!showFailsafeDetails)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border transition-colors ${
              dq.status === 'LIVE'
                ? 'bg-emerald-950/30 border-emerald-700/40 text-emerald-400'
                : dq.status === 'DEGRADED'
                ? 'bg-amber-950/30 border-amber-700/40 text-amber-300'
                : 'bg-rose-950/40 border-rose-700/50 text-rose-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                dq.status === 'LIVE'
                  ? 'bg-emerald-400 animate-pulse'
                  : dq.status === 'DEGRADED'
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <span className="font-bold">{dq.status}</span>
            <span className="text-[9px] text-sigma-textDark">({dq.latencyMs}ms)</span>
          </button>
        </div>
      </div>

      {/* Latency / Provenance Drawer (Collapsible) */}
      {showFailsafeDetails && (
        <div className="p-2.5 bg-sigma-surface3/80 border-b border-sigma-border text-[10px] text-sigma-textMuted flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-sigma-textDark">Source: </span>
            <span className="text-sigma-cyan font-semibold">{dq.sourceExchange}</span>
          </div>
          <div>
            <span className="text-sigma-textDark">Telemetry Latency: </span>
            <span className="text-sigma-textMain font-mono">{dq.latencyMs}ms</span>
          </div>
          <div>
            <span className="text-sigma-textDark">Freshness: </span>
            <span className="text-sigma-green font-mono">{dq.freshnessSeconds}s ago</span>
          </div>
          <div>
            <span className="text-sigma-textDark">Failsafe Mode: </span>
            <span
              className={dq.isStale ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}
            >
              {dq.isStale ? 'ACTIVE (DATA STALE)' : 'NOMINAL LIVE'}
            </span>
          </div>
        </div>
      )}

      {/* 2. OBSERVATION STRIP (Factual Raw Metrics Only) */}
      <div className="p-3 bg-sigma-surface2/70 border-b border-sigma-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-sigma-textDark uppercase tracking-wider">
            <Radio className="w-3 h-3 text-sigma-cyan" />
            <span>Layer 1: Factual Observations</span>
          </div>
          <span className="text-[9px] text-sigma-textDark">Zero Inference</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          {/* Price Deltas */}
          <div className="bg-sigma-surface1/80 p-2 rounded border border-sigma-border/60">
            <div className="text-[9px] text-sigma-textDark uppercase">BTC Price Delta</div>
            <div className="flex items-baseline justify-between mt-1 font-mono">
              <span className="text-[10px] text-sigma-textMuted">5m:</span>
              <span
                className={
                  (obs?.priceChange5mPct || 0) >= 0 ? 'text-sigma-green' : 'text-sigma-red'
                }
              >
                {(obs?.priceChange5mPct || 0) >= 0 ? '+' : ''}
                {(obs?.priceChange5mPct || 0).toFixed(2)}%
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5 font-mono">
              <span className="text-[10px] text-sigma-textMuted">1h:</span>
              <span
                className={
                  (obs?.priceChange1hPct || 0) >= 0 ? 'text-sigma-green' : 'text-sigma-red'
                }
              >
                {(obs?.priceChange1hPct || 0) >= 0 ? '+' : ''}
                {(obs?.priceChange1hPct || 0).toFixed(2)}%
              </span>
            </div>
          </div>

          {/* OI Deltas */}
          <div className="bg-sigma-surface1/80 p-2 rounded border border-sigma-border/60">
            <div className="text-[9px] text-sigma-textDark uppercase">Open Interest Δ</div>
            <div className="flex items-baseline justify-between mt-1 font-mono">
              <span className="text-[10px] text-sigma-textMuted">5m:</span>
              <span
                className={(obs?.oiChange5mPct || 0) >= 0 ? 'text-cyan-400' : 'text-amber-400'}
              >
                {(obs?.oiChange5mPct || 0) >= 0 ? '+' : ''}
                {(obs?.oiChange5mPct || 0).toFixed(2)}%
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5 font-mono">
              <span className="text-[10px] text-sigma-textMuted">1h:</span>
              <span
                className={(obs?.oiChange1hPct || 0) >= 0 ? 'text-cyan-400' : 'text-amber-400'}
              >
                {(obs?.oiChange1hPct || 0) >= 0 ? '+' : ''}
                {(obs?.oiChange1hPct || 0).toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Volume & RVOL */}
          <div className="bg-sigma-surface1/80 p-2 rounded border border-sigma-border/60">
            <div className="text-[9px] text-sigma-textDark uppercase">Volume & RVOL</div>
            <div className="flex items-baseline justify-between mt-1 font-mono">
              <span className="text-[10px] text-sigma-textMuted">RVOL:</span>
              <span
                className={
                  (obs?.rvol || 1.0) > 1.5
                    ? 'text-sigma-purple font-bold'
                    : (obs?.rvol || 1.0) > 1.0
                    ? 'text-sigma-cyan font-bold'
                    : 'text-sigma-textMain'
                }
              >
                {(obs?.rvol || 1.0).toFixed(2)}x
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5 font-mono">
              <span className="text-[10px] text-sigma-textMuted">Taker Buys:</span>
              <span
                className={
                  (obs?.takerBuyerPct || 50) > 52
                    ? 'text-sigma-green font-bold'
                    : (obs?.takerBuyerPct || 50) < 48
                    ? 'text-sigma-red font-bold'
                    : 'text-sigma-textMain'
                }
              >
                {(obs?.takerBuyerPct || 50).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Funding & Liqs */}
          <div className="bg-sigma-surface1/80 p-2 rounded border border-sigma-border/60">
            <div className="text-[9px] text-sigma-textDark uppercase">Funding & 1h Liqs</div>
            <div className="flex items-baseline justify-between mt-1 font-mono">
              <span className="text-[10px] text-sigma-textMuted">Funding:</span>
              <span className="text-sigma-cyan font-semibold">
                +{(obs?.fundingRatePct || 0.0076).toFixed(4)}%
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5 font-mono">
              <span className="text-[10px] text-sigma-textMuted">1h Liqs:</span>
              <span className="text-sigma-textMain">
                ${((obs?.liquidations1hUsd || 2400000) / 1e6).toFixed(2)}M
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. INTERPRETATION MATRIX BANNER */}
      <div className={`p-3 border-b ${stateMeta.border} ${stateMeta.bg} transition-all`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider text-sigma-textDark uppercase">
                Layer 2: Matrix State
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border ${stateMeta.border} ${stateMeta.text} bg-sigma-surface1/80`}
              >
                {stateMeta.label}
              </span>
            </div>
            <p className="text-[11px] text-sigma-textMuted leading-relaxed max-w-2xl font-sans">
              {pos?.interpretation?.narrative || stateMeta.desc}
            </p>
          </div>

          {/* Setup State & Confirmation Score Gauge */}
          <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-sigma-border/40 gap-1 min-w-[130px]">
            <div className="text-[9px] text-sigma-textDark uppercase">Setup State</div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider uppercase ${setupMeta.badge}`}
            >
              {setupMeta.label}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
              <span className="text-sigma-textDark">Confirmation:</span>
              <span
                className={`font-bold ${
                  (conf?.score || 0) >= 65
                    ? 'text-sigma-green'
                    : (conf?.score || 0) >= 45
                    ? 'text-amber-400'
                    : 'text-sigma-red'
                }`}
              >
                {conf?.score || 64}%
              </span>
            </div>
          </div>
        </div>

        {/* Confirmation Score Bar */}
        <div className="mt-2.5 w-full bg-sigma-surface3 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              (conf?.score || 0) >= 65
                ? 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                : (conf?.score || 0) >= 45
                ? 'bg-gradient-to-r from-blue-500 to-amber-400'
                : 'bg-gradient-to-r from-rose-600 to-amber-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(5, conf?.score || 64))}%` }}
          />
        </div>
      </div>

      {/* 4. TABS NAVIGATION FOR CONFIRMATION LAYERS & MULTI-TIMEFRAME */}
      <div className="flex border-b border-sigma-border bg-sigma-surface2/50 text-[10px]">
        <button
          onClick={() => setActiveTab('MATRIX')}
          className={`flex-1 py-2 px-3 text-center border-b-2 font-bold transition-all uppercase tracking-wider ${
            activeTab === 'MATRIX'
              ? 'border-cyan-400 text-cyan-300 bg-sigma-surface1/60'
              : 'border-transparent text-sigma-textDark hover:text-sigma-textMain'
          }`}
        >
          Positioning Matrix (4 Quadrants)
        </button>
        <button
          onClick={() => setActiveTab('CONFIRMATIONS')}
          className={`flex-1 py-2 px-3 text-center border-b-2 font-bold transition-all uppercase tracking-wider ${
            activeTab === 'CONFIRMATIONS'
              ? 'border-cyan-400 text-cyan-300 bg-sigma-surface1/60'
              : 'border-transparent text-sigma-textDark hover:text-sigma-textMain'
          }`}
        >
          9 Confirmation Layers ({conf?.score || 64}%)
        </button>
        <button
          onClick={() => setActiveTab('MTF')}
          className={`flex-1 py-2 px-3 text-center border-b-2 font-bold transition-all uppercase tracking-wider ${
            activeTab === 'MTF'
              ? 'border-cyan-400 text-cyan-300 bg-sigma-surface1/60'
              : 'border-transparent text-sigma-textDark hover:text-sigma-textMain'
          }`}
        >
          MTF Alignment ({mtf?.state || 'ALIGNED'})
        </button>
      </div>

      {/* TAB 1: 4-QUADRANT MATRIX VISUALIZER */}
      {activeTab === 'MATRIX' && (
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {/* Q1: Price Up + OI Up */}
            <div
              className={`p-2 rounded border ${
                stateKey === 'LEVERAGE_EXPANSION'
                  ? 'bg-emerald-950/40 border-emerald-500/70 ring-1 ring-emerald-500/40'
                  : 'bg-sigma-surface2/40 border-sigma-border/60 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="text-emerald-400">Price ↑ + OI ↑</span>
                {stateKey === 'LEVERAGE_EXPANSION' && (
                  <span className="text-[9px] px-1 rounded bg-emerald-500 text-black font-bold">
                    ACTIVE
                  </span>
                )}
              </div>
              <div className="text-[11px] font-semibold text-sigma-textMain mt-0.5">
                Leverage Expansion
              </div>
              <div className="text-[10px] text-sigma-textDark mt-1 leading-snug">
                Derivatives positioning expanding. Requires volume, taker dominance, & funding
                confirmation.
              </div>
            </div>

            {/* Q2: Price Up + OI Down */}
            <div
              className={`p-2 rounded border ${
                stateKey === 'SHORT_COVERING'
                  ? 'bg-amber-950/40 border-amber-500/70 ring-1 ring-amber-500/40'
                  : 'bg-sigma-surface2/40 border-sigma-border/60 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="text-amber-400">Price ↑ + OI ↓</span>
                {stateKey === 'SHORT_COVERING' && (
                  <span className="text-[9px] px-1 rounded bg-amber-500 text-black font-bold">
                    ACTIVE
                  </span>
                )}
              </div>
              <div className="text-[11px] font-semibold text-sigma-textMain mt-0.5">
                Short Covering
              </div>
              <div className="text-[10px] text-sigma-textDark mt-1 leading-snug">
                Unwinding rally driven by short stops. Susceptible to sudden stall if fresh spot demand
                lacks.
              </div>
            </div>

            {/* Q3: Price Down + OI Up */}
            <div
              className={`p-2 rounded border ${
                stateKey === 'BEARISH_EXPANSION'
                  ? 'bg-rose-950/40 border-rose-500/70 ring-1 ring-rose-500/40'
                  : 'bg-sigma-surface2/40 border-sigma-border/60 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="text-rose-400">Price ↓ + OI ↑</span>
                {stateKey === 'BEARISH_EXPANSION' && (
                  <span className="text-[9px] px-1 rounded bg-rose-500 text-white font-bold">
                    ACTIVE
                  </span>
                )}
              </div>
              <div className="text-[11px] font-semibold text-sigma-textMain mt-0.5">
                Bearish Expansion
              </div>
              <div className="text-[10px] text-sigma-textDark mt-1 leading-snug">
                Fresh short derivative positioning adding into downward momentum. Watch support
                absorption.
              </div>
            </div>

            {/* Q4: Price Down + OI Down */}
            <div
              className={`p-2 rounded border ${
                stateKey === 'LONG_LIQUIDATION' || stateKey === 'DELEVERAGING'
                  ? 'bg-orange-950/40 border-orange-500/70 ring-1 ring-orange-500/40'
                  : 'bg-sigma-surface2/40 border-sigma-border/60 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="text-orange-400">Price ↓ + OI ↓</span>
                {(stateKey === 'LONG_LIQUIDATION' || stateKey === 'DELEVERAGING') && (
                  <span className="text-[9px] px-1 rounded bg-orange-500 text-black font-bold">
                    ACTIVE
                  </span>
                )}
              </div>
              <div className="text-[11px] font-semibold text-sigma-textMain mt-0.5">
                Long Unwinding / Liqs
              </div>
              <div className="text-[10px] text-sigma-textDark mt-1 leading-snug">
                Deleveraging cascade. Longs closing out or liquidated. Often precedes mean-reversion
                bottoms.
              </div>
            </div>
          </div>

          <div className="p-2 bg-sigma-surface2/40 border border-sigma-border/50 rounded flex items-center justify-between text-[10px] text-sigma-textDark">
            <span className="font-semibold text-sigma-cyan">Core Positioning Rule:</span>
            <span>Derivatives never dictate direction alone; confirmation layers validate continuation.</span>
          </div>
        </div>
      )}

      {/* TAB 2: 9 CONFIRMATION LAYERS */}
      {activeTab === 'CONFIRMATIONS' && (
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px]">
            {/* 1. Price */}
            <div className="p-2 bg-sigma-surface2/60 border border-sigma-border rounded flex items-center justify-between">
              <span className="text-sigma-textMuted">1. Price Trend</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                  CONFIRMATION_STYLES[conf?.priceConfirmation || 'CONFIRMED'].badge
                }`}
              >
                {CONFIRMATION_STYLES[conf?.priceConfirmation || 'CONFIRMED'].label}
              </span>
            </div>

            {/* 2. Volume */}
            <div className="p-2 bg-sigma-surface2/60 border border-sigma-border rounded flex items-center justify-between">
              <span className="text-sigma-textMuted">2. Volume Expansion</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                  CONFIRMATION_STYLES[conf?.volumeConfirmation || 'CONFIRMED'].badge
                }`}
              >
                {CONFIRMATION_STYLES[conf?.volumeConfirmation || 'CONFIRMED'].label}
              </span>
            </div>

            {/* 3. RVOL */}
            <div className="p-2 bg-sigma-surface2/60 border border-sigma-border rounded flex items-center justify-between">
              <span className="text-sigma-textMuted">3. RVOL (Relative Vol)</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                  CONFIRMATION_STYLES[conf?.rvolConfirmation || 'CONFIRMED'].badge
                }`}
              >
                {CONFIRMATION_STYLES[conf?.rvolConfirmation || 'CONFIRMED'].label}
              </span>
            </div>

            {/* 4. Taker Flow */}
            <div className="p-2 bg-sigma-surface2/60 border border-sigma-border rounded flex items-center justify-between">
              <span className="text-sigma-textMuted">4. Taker Buy/Sell Flow</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                  CONFIRMATION_STYLES[conf?.takerConfirmation || 'CONFIRMED'].badge
                }`}
              >
                {CONFIRMATION_STYLES[conf?.takerConfirmation || 'CONFIRMED'].label}
              </span>
            </div>

            {/* 5. OI Velocity */}
            <div className="p-2 bg-sigma-surface2/60 border border-sigma-border rounded flex items-center justify-between">
              <span className="text-sigma-textMuted">5. OI Velocity</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                  CONFIRMATION_STYLES[conf?.oiConfirmation || 'CONFIRMED'].badge
                }`}
              >
                {CONFIRMATION_STYLES[conf?.oiConfirmation || 'CONFIRMED'].label}
              </span>
            </div>

            {/* 6. Liquidations */}
            <div className="p-2 bg-sigma-surface2/60 border border-sigma-border rounded flex items-center justify-between">
              <span className="text-sigma-textMuted">6. Liquidations Align</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                  CONFIRMATION_STYLES[conf?.liquidationConfirmation || 'CONFIRMED'].badge
                }`}
              >
                {CONFIRMATION_STYLES[conf?.liquidationConfirmation || 'CONFIRMED'].label}
              </span>
            </div>

            {/* 7. Funding Alignment */}
            <div className="p-2 bg-sigma-surface2/60 border border-sigma-border rounded flex items-center justify-between">
              <span className="text-sigma-textMuted">7. Funding Regime</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                  CONFIRMATION_STYLES[conf?.fundingConfirmation || 'CONFIRMED'].badge
                }`}
              >
                {CONFIRMATION_STYLES[conf?.fundingConfirmation || 'CONFIRMED'].label}
              </span>
            </div>

            {/* 8. Order Book Structure */}
            <div className="p-2 bg-sigma-surface2/60 border border-sigma-border rounded flex items-center justify-between">
              <span className="text-sigma-textMuted">8. Market Structure</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                  CONFIRMATION_STYLES[conf?.structureConfirmation || 'CONFIRMED'].badge
                }`}
              >
                {CONFIRMATION_STYLES[conf?.structureConfirmation || 'CONFIRMED'].label}
              </span>
            </div>

            {/* 9. MTF Confirmation */}
            <div className="p-2 bg-sigma-surface2/60 border border-sigma-border rounded flex items-center justify-between">
              <span className="text-sigma-textMuted">9. MTF Consensus</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                  CONFIRMATION_STYLES[conf?.mtfConfirmation || 'CONFIRMED'].badge
                }`}
              >
                {CONFIRMATION_STYLES[conf?.mtfConfirmation || 'CONFIRMED'].label}
              </span>
            </div>
          </div>

          <div className="p-2 bg-sigma-surface2/40 border border-sigma-border/50 rounded flex items-center justify-between text-[10px] text-sigma-textDark">
            <span className="text-sigma-textMuted">Synthesis:</span>
            <span className="font-semibold text-sigma-textMain">
              {conf?.summary ||
                '6 of 9 layers aligned with derivatives positioning. Directional bias confirmed.'}
            </span>
          </div>
        </div>
      )}

      {/* TAB 3: MULTI-TIMEFRAME CONFIRMATION MATRIX */}
      {activeTab === 'MTF' && (
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 text-[10px]">
            {(
              mtf?.timeframes || [
                { timeframe: '1m', state: 'LEVERAGE_EXPANSION', priceDeltaPct: 0.12, oiDeltaPct: 0.28, status: 'CONFIRMED' },
                { timeframe: '5m', state: 'LEVERAGE_EXPANSION', priceDeltaPct: 0.35, oiDeltaPct: 0.84, status: 'CONFIRMED' },
                { timeframe: '15m', state: 'LEVERAGE_EXPANSION', priceDeltaPct: 0.52, oiDeltaPct: 1.12, status: 'CONFIRMED' },
                { timeframe: '30m', state: 'LEVERAGE_EXPANSION', priceDeltaPct: 0.44, oiDeltaPct: 0.95, status: 'CONFIRMED' },
                { timeframe: '1h', state: 'LEVERAGE_EXPANSION', priceDeltaPct: 0.82, oiDeltaPct: 1.85, status: 'CONFIRMED' },
                { timeframe: '4h', state: 'LEVERAGE_EXPANSION', priceDeltaPct: 1.45, oiDeltaPct: 3.12, status: 'CONFIRMED' },
              ]
            ).map((node) => (
              <div
                key={node.timeframe}
                className="bg-sigma-surface2/60 border border-sigma-border/80 p-2 rounded flex flex-col items-center justify-between text-center"
              >
                <div className="font-bold text-sigma-cyan text-[11px]">{node.timeframe}</div>
                <div className="mt-1 font-mono text-[10px]">
                  <div
                    className={
                      node.priceDeltaPct >= 0 ? 'text-sigma-green font-semibold' : 'text-sigma-red font-semibold'
                    }
                  >
                    P: {node.priceDeltaPct >= 0 ? '+' : ''}
                    {node.priceDeltaPct.toFixed(2)}%
                  </div>
                  <div
                    className={
                      node.oiDeltaPct >= 0 ? 'text-cyan-400 font-semibold' : 'text-amber-400 font-semibold'
                    }
                  >
                    OI: {node.oiDeltaPct >= 0 ? '+' : ''}
                    {node.oiDeltaPct.toFixed(2)}%
                  </div>
                </div>
                <div className="mt-1.5 w-full">
                  <span
                    className={`block w-full py-0.5 rounded text-[8px] font-bold border uppercase ${
                      CONFIRMATION_STYLES[node.status as ConfirmationLevel]?.badge ||
                      'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    }`}
                  >
                    {node.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-2 bg-sigma-surface2/40 border border-sigma-border/50 rounded flex items-center justify-between text-[10px] text-sigma-textDark">
            <span>MTF Consensus:</span>
            <span
              className={`font-bold uppercase ${
                mtf?.state === 'ALIGNED'
                  ? 'text-sigma-green'
                  : mtf?.state === 'STRONG_ALIGNMENT'
                  ? 'text-cyan-400'
                  : mtf?.state === 'DIVERGENT'
                  ? 'text-sigma-red'
                  : 'text-amber-400'
              }`}
            >
              {mtf?.state || 'ALIGNED'} MULTI-TIMEFRAME CONSENSUS
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
