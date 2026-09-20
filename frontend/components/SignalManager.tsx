'use client';

import React, { useState } from 'react';
import { EagleSignalRecord } from '../types';
import { Target, TrendingUp, TrendingDown, Clock, ShieldCheck, AlertCircle } from 'lucide-react';

interface SignalManagerProps {
  signals: EagleSignalRecord[];
  onExecuteSignal?: (signal: EagleSignalRecord) => void;
  onForwardTelegram?: (signal: EagleSignalRecord) => void;
}

export const SignalManager: React.FC<SignalManagerProps> = ({
  signals,
  onExecuteSignal,
  onForwardTelegram,
}) => {
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filtered = signals.filter((s) => {
    if (filterDirection !== 'ALL' && s.direction !== filterDirection) return false;
    if (filterStatus !== 'ALL' && s.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="bg-sigma-surface1 border border-sigma-border rounded-lg overflow-hidden font-mono flex flex-col h-full text-xs">
      {/* Header & Controls */}
      <div className="p-3 bg-sigma-surface2/70 border-b border-sigma-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-sigma-textMain tracking-wide">
                STATEFUL EAGLE SIGNALS
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-sigma-surface3 text-sigma-cyan border border-sigma-border">
                {signals.length} RECORDED
              </span>
            </div>
            <div className="text-[10px] text-sigma-textDark">
              Trigger criteria: Eagle Score ≥ 65 · RVOL ≥ 2.0x · OI Δ ≥ +3% · 15m Cooldown
            </div>
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5">
          <div className="flex bg-sigma-surface3 p-0.5 rounded border border-sigma-border text-[10px]">
            <button
              onClick={() => setFilterDirection('ALL')}
              className={`px-2 py-0.5 rounded ${filterDirection === 'ALL' ? 'bg-sigma-surface1 text-sigma-textMain font-bold' : 'text-sigma-textDark'}`}
            >
              ALL
            </button>
            <button
              onClick={() => setFilterDirection('LONG')}
              className={`px-2 py-0.5 rounded ${filterDirection === 'LONG' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-sigma-textDark'}`}
            >
              LONG
            </button>
            <button
              onClick={() => setFilterDirection('SHORT')}
              className={`px-2 py-0.5 rounded ${filterDirection === 'SHORT' ? 'bg-rose-500/20 text-rose-400 font-bold' : 'text-sigma-textDark'}`}
            >
              SHORT
            </button>
          </div>

          <div className="flex bg-sigma-surface3 p-0.5 rounded border border-sigma-border text-[10px]">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-2 py-0.5 rounded ${filterStatus === 'ALL' ? 'bg-sigma-surface1 text-sigma-textMain font-bold' : 'text-sigma-textDark'}`}
            >
              ALL
            </button>
            <button
              onClick={() => setFilterStatus('ACTIVE')}
              className={`px-2 py-0.5 rounded ${filterStatus === 'ACTIVE' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-sigma-textDark'}`}
            >
              ACTIVE
            </button>
            <button
              onClick={() => setFilterStatus('TARGET_HIT')}
              className={`px-2 py-0.5 rounded ${filterStatus === 'TARGET_HIT' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-sigma-textDark'}`}
            >
              TARGET HIT
            </button>
          </div>
        </div>
      </div>

      {/* Signals List / Grid */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-sigma-textDark space-y-2">
            <Clock className="w-8 h-8 mx-auto text-sigma-textDark opacity-50 animate-pulse" />
            <p>Awaiting high-probability breakout events meeting criteria...</p>
            <p className="text-[10px]">Active monitoring: 2,940+ USDT contracts on Bybit, MEXC, and WEEX.</p>
          </div>
        ) : (
          filtered.map((sig) => {
            const isLong = sig.direction === 'LONG';
            const ageMinutes = Math.floor((Date.now() - sig.triggerTimestamp) / 60000);
            const statusBg =
              sig.status === 'TARGET_HIT'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                : sig.status === 'INVALIDATED'
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/50'
                : sig.status === 'CONFIRMED'
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/50';

            return (
              <div
                key={sig.signalId}
                className="bg-sigma-surface2/60 border border-sigma-border rounded-lg p-3 hover:border-sigma-borderFocus transition-all"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                        isLong
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/40'
                      }`}
                    >
                      {isLong ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {sig.direction}
                    </span>
                    <strong className="text-sm font-bold text-sigma-textMain">{sig.symbol}</strong>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-sigma-surface3 text-sigma-textDark border border-sigma-border">
                      {sig.exchange}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-sigma-purple/15 text-sigma-purple border border-sigma-purple/30 font-bold">
                      SCORE: {sig.eagleScore}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBg}`}>
                      {sig.status}
                    </span>
                    <span className="text-[10px] text-sigma-textDark">
                      {ageMinutes < 1 ? 'Just now' : `${ageMinutes}m ago`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] mb-2">
                  <div className="bg-sigma-surface1/60 p-1.5 rounded border border-sigma-border/60">
                    <span className="text-[9px] text-sigma-textDark block">TRIGGER PRICE</span>
                    <strong className="text-sigma-textMain">${sig.triggerPrice}</strong>
                  </div>
                  <div className="bg-sigma-surface1/60 p-1.5 rounded border border-sigma-border/60">
                    <span className="text-[9px] text-sigma-textDark block">CURRENT PRICE</span>
                    <strong className="text-sigma-cyan">${sig.currentPrice}</strong>
                  </div>
                  <div className="bg-sigma-surface1/60 p-1.5 rounded border border-sigma-border/60">
                    <span className="text-[9px] text-sigma-textDark block">RVOL / VOL Z</span>
                    <strong className="text-sigma-green">{sig.rvol}x</strong>{' '}
                    <span className="text-[10px] text-sigma-textDark">({sig.volumeZScore}σ)</span>
                  </div>
                  <div className="bg-sigma-surface1/60 p-1.5 rounded border border-sigma-border/60">
                    <span className="text-[9px] text-sigma-textDark block">OI DELTA</span>
                    <strong className="text-sigma-green">+{sig.oiChangePct}%</strong>
                  </div>
                  <div className="bg-sigma-surface1/60 p-1.5 rounded border border-sigma-border/60">
                    <span className="text-[9px] text-sigma-textDark block">MFE / MAE</span>
                    <strong className="text-emerald-400">+{sig.mfePct}%</strong> /{' '}
                    <strong className="text-rose-400">-{sig.maePct}%</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-sigma-border/40">
                  <div className="text-sigma-textDark flex items-center gap-2">
                    <span>Phase: <strong className="text-sigma-textMuted">{sig.spikePhase}</strong></span>
                    <span>Type: <strong className="text-sigma-textMuted">{sig.spikeType}</strong></span>
                    <span>Quality: <strong className="text-sigma-textMuted">{sig.spikeQuality}</strong></span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onExecuteSignal?.(sig)}
                      className="px-2 py-1 rounded bg-sigma-green text-black font-bold hover:bg-sigma-green/90 transition-all"
                    >
                      EXECUTE
                    </button>
                    <button
                      onClick={() => onForwardTelegram?.(sig)}
                      className="px-2 py-1 rounded bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold hover:bg-sky-500/30"
                    >
                      ✈ TG
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
