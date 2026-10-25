'use client';

import React, { useState, useEffect, useRef } from 'react';
import { formatPrice, formatPct, formatCandleAge } from './tokens';

// ================================================================
// 1. SidePill: BUY / SELL with directional arrow and accessible colors
// ================================================================
export function SidePill({
  side,
  size = 'md',
}: {
  side: 'BUY' | 'SELL' | 'NEUTRAL' | 'LONG' | 'SHORT';
  size?: 'sm' | 'md' | 'lg';
}) {
  const isBuy = side === 'BUY' || side === 'LONG';
  const isSell = side === 'SELL' || side === 'SHORT';

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[11px] font-semibold',
    md: 'px-2.5 py-1 text-xs font-bold',
    lg: 'px-3 py-1.5 text-sm font-bold',
  }[size];

  if (isBuy) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded font-mono uppercase tracking-wider bg-[#1FD18A]/15 text-[#1FD18A] border border-[#1FD18A]/30 ${sizeClasses}`}
        aria-label="Buy Side"
      >
        <span>▲</span>
        <span>BUY</span>
      </span>
    );
  }

  if (isSell) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded font-mono uppercase tracking-wider bg-[#F2495C]/15 text-[#F2495C] border border-[#F2495C]/30 ${sizeClasses}`}
        aria-label="Sell Side"
      >
        <span>▼</span>
        <span>SELL</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-mono uppercase tracking-wider bg-[#232A35]/50 text-[#9AA6B5] border border-[#232A35] ${sizeClasses}`}
      aria-label="Neutral Side"
    >
      <span>—</span>
      <span>NEUTRAL</span>
    </span>
  );
}

// ================================================================
// 2. ScoreRing: n/11 + percentage badge
// ================================================================
export function ScoreRing({
  votes,
  total = 11,
  scorePct,
  size = 'md',
}: {
  votes: number;
  total?: number;
  scorePct?: number;
  size?: 'sm' | 'md';
}) {
  const pct = scorePct ?? Math.round((votes / total) * 100);
  const isHigh = votes >= 8;
  const isMid = votes >= 7;

  const colorClass = isHigh
    ? 'text-[#1FD18A] border-[#1FD18A]/40 bg-[#1FD18A]/10'
    : isMid
    ? 'text-[#F5A524] border-[#F5A524]/40 bg-[#F5A524]/10'
    : 'text-[#9AA6B5] border-[#232A35] bg-[#181D26]';

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono ${colorClass} ${
        size === 'sm' ? 'text-[11px]' : 'text-xs'
      }`}
    >
      <span className="font-bold">{votes}/{total}</span>
      <span className="text-[10px] opacity-75">({pct}%)</span>
    </div>
  );
}

// ================================================================
// 3. VoteDots: 11 granular vote indicators (▲, ▼, –)
// ================================================================
export function VoteDots({
  votes,
}: {
  votes: Array<{ id: string; label: string; group: string; vote: number; detail?: string }>;
}) {
  return (
    <div className="flex items-center gap-1" title="11 Confluence Votes">
      {votes.map((v, i) => {
        const isUp = v.vote === 1;
        const isDn = v.vote === -1;
        const dotBg = isUp ? 'bg-[#1FD18A]' : isDn ? 'bg-[#F2495C]' : 'bg-[#6B7686]/40';
        const glyph = isUp ? '▲' : isDn ? '▼' : '–';
        return (
          <span
            key={v.id || i}
            title={`${v.label}: ${v.detail || glyph}`}
            className={`flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold text-black ${dotBg}`}
          >
            {glyph}
          </span>
        );
      })}
    </div>
  );
}

// ================================================================
// 4. AgeChip: Candle age ("NOW", "1c", "3c ago")
// ================================================================
export function AgeChip({
  candles,
  label,
}: {
  candles: number | null | undefined;
  label?: string;
}) {
  const isNow = candles === 0;
  const isFresh = candles !== null && candles !== undefined && candles <= 3;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] ${
        isNow
          ? 'bg-[#1FD18A]/20 text-[#1FD18A] font-bold border border-[#1FD18A]/30'
          : isFresh
          ? 'bg-[#181D26] text-[#E8ECF2] border border-[#232A35]'
          : 'bg-[#11151C] text-[#6B7686] border border-[#232A35]/50'
      }`}
    >
      {label && <span className="text-[#9AA6B5]">{label}:</span>}
      <span>{formatCandleAge(candles)}</span>
    </span>
  );
}

// ================================================================
// 5. PriceCell: Monospace Tabular Figures with 300ms Tick Flash
// ================================================================
export function PriceCell({
  price,
  tickSize = 0.01,
  className = '',
}: {
  price: number;
  tickSize?: number;
  className?: string;
}) {
  const prevPriceRef = useRef<number>(price);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (prevPriceRef.current !== price) {
      if (price > prevPriceRef.current) setFlash('up');
      else if (price < prevPriceRef.current) setFlash('down');
      prevPriceRef.current = price;

      const timer = setTimeout(() => setFlash(null), 350);
      return () => clearTimeout(timer);
    }
  }, [price]);

  const flashClass = flash === 'up' ? 'flash-tick-up' : flash === 'down' ? 'flash-tick-down' : '';

  return (
    <span
      className={`font-mono tabular-nums text-right font-medium transition-colors duration-150 ${flashClass} ${className}`}
    >
      {formatPrice(price, tickSize)}
    </span>
  );
}

// ================================================================
// 6. ChangeBadge: Directional Signed % with Arrow
// ================================================================
export function ChangeBadge({ val }: { val: number | null | undefined }) {
  if (val === null || val === undefined || isNaN(val)) {
    return <span className="font-mono text-xs text-[#6B7686]">—%</span>;
  }
  const isPositive = val > 0;
  const isZero = val === 0;

  const colorClass = isPositive
    ? 'text-[#1FD18A] bg-[#1FD18A]/10'
    : isZero
    ? 'text-[#9AA6B5] bg-[#232A35]/30'
    : 'text-[#F2495C] bg-[#F2495C]/10';

  return (
    <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums ${colorClass}`}>
      <span>{isPositive ? '▲' : isZero ? '•' : '▼'}</span>
      <span>{formatPct(val)}</span>
    </span>
  );
}

// ================================================================
// 7. StatTile: Institutional Compact Metric Tile
// ================================================================
export function StatTile({
  label,
  value,
  subtext,
  trend,
}: {
  label: string;
  value: React.ReactNode;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  const trendColor = trend === 'up' ? 'text-[#1FD18A]' : trend === 'down' ? 'text-[#F2495C]' : 'text-[#9AA6B5]';

  return (
    <div className="flex flex-col rounded-lg border border-[#232A35] bg-[#11151C] p-3">
      <span className="text-[11px] font-medium uppercase tracking-wider text-[#9AA6B5]">{label}</span>
      <span className="mt-1 font-mono text-lg font-bold tabular-nums text-[#E8ECF2]">{value}</span>
      {subtext && <span className={`mt-0.5 text-xs font-mono tabular-nums ${trendColor}`}>{subtext}</span>}
    </div>
  );
}

// ================================================================
// 8. SegmentedControl: Tab switcher (Confluence 1H · Pre-Pump · All)
// ================================================================
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string; badge?: number | string }[];
  value: T;
  onChange: (val: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-[#232A35] bg-[#0A0D12] p-1">
      {options.map((opt) => {
        const isActive = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              isActive
                ? 'bg-[#181D26] text-[#E8ECF2] shadow-sm border border-[#232A35]'
                : 'text-[#9AA6B5] hover:text-[#E8ECF2]'
            }`}
          >
            <span>{opt.label}</span>
            {opt.badge !== undefined && (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${isActive ? 'bg-[#F5A524]/20 text-[#F5A524]' : 'bg-[#232A35] text-[#9AA6B5]'}`}>
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ================================================================
// 9. StaleBadge: SLA Alert (Amber if > 75m, Red if > 130m)
// ================================================================
export function StaleBadge({
  ageMinutes,
  status = 'OK',
}: {
  ageMinutes: number | null | undefined;
  status?: string;
}) {
  if (ageMinutes === null || ageMinutes === undefined) {
    return <span className="inline-flex items-center gap-1 rounded border border-[#232A35] bg-[#181D26] px-2 py-0.5 text-xs text-[#9AA6B5]">● Live Feed</span>;
  }

  if (ageMinutes > 130) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-[#F2495C]/40 bg-[#F2495C]/15 px-2 py-0.5 text-xs font-mono font-bold text-[#F2495C]">
        <span>🔴 STALE SLA</span>
        <span>({ageMinutes}m ago)</span>
      </span>
    );
  }

  if (ageMinutes > 75) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-[#F5A524]/40 bg-[#F5A524]/15 px-2 py-0.5 text-xs font-mono font-bold text-[#F5A524]">
        <span>🟡 DELAYED</span>
        <span>({ageMinutes}m ago)</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded border border-[#1FD18A]/30 bg-[#1FD18A]/10 px-2 py-0.5 text-xs font-mono text-[#1FD18A]">
      <span>🟢 {status === 'SUCCESS' ? 'OK' : status}</span>
      <span>({ageMinutes}m ago)</span>
    </span>
  );
}

// ================================================================
// 10. Persistent Paper Chip Marker
// ================================================================
export function PaperMarkerChip({ openCount }: { openCount?: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-[#F5A524] bg-[#F5A524]/15 px-2.5 py-0.5 text-xs font-bold text-[#F5A524] tracking-wide">
      <span>● PAPER</span>
      {openCount !== undefined && openCount > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F5A524] px-1 text-[10px] text-black">
          {openCount}
        </span>
      )}
    </div>
  );
}

// ================================================================
// 11. Skeleton: Fixed Dimension Loading Placeholders
// ================================================================
export function Skeleton({ className = 'h-4 w-full' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-[#181D26] ${className}`} />;
}
