'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { NormalizedTicker, ExchangeFilter, PresetFilter, SortField } from '../types';

interface VirtualizedScannerTableProps {
  tickers: NormalizedTicker[];
  activeExchange: ExchangeFilter;
  activePreset: PresetFilter;
  searchQuery: string;
  onSelectSymbol?: (symbol: string) => void;
  onToggleWatchlist?: (symbol: string) => void;
  watchlist?: Set<string>;
}

const ROW_HEIGHT = 38;
const OVERSCAN = 10;

export const VirtualizedScannerTable: React.FC<VirtualizedScannerTableProps> = ({
  tickers,
  activeExchange,
  activePreset,
  searchQuery,
  onSelectSymbol,
  onToggleWatchlist,
  watchlist = new Set(),
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(650);

  const [sortField, setSortField] = useState<SortField>('signalScore');
  const [sortAsc, setSortAsc] = useState(false);

  // ResizeObserver to track container height dynamically
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]?.contentRect?.height) {
        setContainerHeight(entries[0].contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Filter & Sort Pipeline
  const filteredAndSortedList = useMemo(() => {
    let result = tickers;

    // 1. Exchange Filter
    if (activeExchange !== 'ALL') {
      result = result.filter((t) => t.exchange.toUpperCase() === activeExchange.toUpperCase());
    }

    // 2. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toUpperCase().trim();
      result = result.filter((t) => t.symbol.toUpperCase().includes(q));
    }

    // 3. Preset Filter
    if (activePreset === 'VOL_EXPLOSION') {
      result = result.filter((t) => t.relativeVolume >= 2.0 && t.volumeZScore >= 2.0);
    } else if (activePreset === 'MOMENTUM') {
      result = result.filter((t) => Math.abs(t.returns5m || 0) >= 1.5 && t.takerImbalance > 15);
    } else if (activePreset === 'ACCUMULATION') {
      result = result.filter((t) => (t.oiChangePct || 0) >= 2.0 && t.relativeVolume >= 1.2);
    } else if (activePreset === 'SHORT_SQUEEZE') {
      result = result.filter((t) => t.price24hChange > 3.0 && (t.oiChangePct || 0) < -1.0);
    } else if (activePreset === 'LONG_SQUEEZE') {
      result = result.filter((t) => t.price24hChange < -3.0 && (t.oiChangePct || 0) < -1.0);
    } else if (activePreset === 'BREAKOUT') {
      result = result.filter((t) => t.relativeVolume >= 1.5 && t.signalScore >= 60);
    }

    // 4. Sort
    return [...result].sort((a, b) => {
      let valA: any = a[sortField as keyof NormalizedTicker];
      let valB: any = b[sortField as keyof NormalizedTicker];

      if (valA === undefined) valA = 0;
      if (valB === undefined) valB = 0;

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [tickers, activeExchange, activePreset, searchQuery, sortField, sortAsc]);

  const totalRows = filteredAndSortedList.length;

  // Optimized Scroll Handler using requestAnimationFrame for 60 FPS
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const currentTarget = e.currentTarget;
    requestAnimationFrame(() => {
      if (currentTarget) {
        setScrollTop(currentTarget.scrollTop);
      }
    });
  }, []);

  // Compute Virtual Window
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT);
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(totalRows, startIndex + visibleCount + OVERSCAN * 2);

  const topPadding = startIndex * ROW_HEIGHT;
  const bottomPadding = Math.max(0, (totalRows - endIndex) * ROW_HEIGHT);
  const visibleRows = filteredAndSortedList.slice(startIndex, endIndex);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-sigma-surface1 border border-sigma-border rounded-lg overflow-hidden font-mono text-xs select-none">
      {/* Table Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-auto relative"
        style={{ willChange: 'transform' }}
      >
        <table className="w-full text-left border-collapse min-w-[1350px]">
          <thead className="sticky top-0 z-20 bg-sigma-surface2 text-[11px] font-bold text-sigma-textDark border-b border-sigma-border">
            <tr>
              <th className="py-2.5 px-3 w-12 cursor-pointer hover:text-sigma-textMain" onClick={() => handleSort('rank')}>
                #
              </th>
              <th className="py-2.5 px-3 w-36 cursor-pointer hover:text-sigma-textMain" onClick={() => handleSort('symbol')}>
                Symbol {sortField === 'symbol' && (sortAsc ? '▲' : '▼')}
              </th>
              <th className="py-2.5 px-3 w-28 cursor-pointer hover:text-sigma-textMain" onClick={() => handleSort('lastPrice')}>
                Price {sortField === 'lastPrice' && (sortAsc ? '▲' : '▼')}
              </th>
              <th className="py-2.5 px-2.5 w-20 cursor-pointer hover:text-sigma-textMain" onClick={() => handleSort('returns5m')}>
                5M {sortField === 'returns5m' && (sortAsc ? '▲' : '▼')}
              </th>
              <th className="py-2.5 px-2.5 w-20 cursor-pointer hover:text-sigma-textMain" onClick={() => handleSort('returns15m')}>
                15M {sortField === 'returns15m' && (sortAsc ? '▲' : '▼')}
              </th>
              <th className="py-2.5 px-2.5 w-20 cursor-pointer hover:text-sigma-textMain" onClick={() => handleSort('returns1h')}>
                1H {sortField === 'returns1h' && (sortAsc ? '▲' : '▼')}
              </th>
              <th className="py-2.5 px-3 w-20 cursor-pointer hover:text-sigma-textMain" onClick={() => handleSort('relativeVolume')}>
                RVOL {sortField === 'relativeVolume' && (sortAsc ? '▲' : '▼')}
              </th>
              <th className="py-2.5 px-2.5 w-20 cursor-pointer hover:text-sigma-textMain" onClick={() => handleSort('volumeZScore')}>
                Vol Z {sortField === 'volumeZScore' && (sortAsc ? '▲' : '▼')}
              </th>
              <th className="py-2.5 px-2.5 w-20 cursor-pointer hover:text-sigma-textMain" onClick={() => handleSort('oiChangePct')}>
                OI Δ {sortField === 'oiChangePct' && (sortAsc ? '▲' : '▼')}
              </th>
              <th className="py-2.5 px-2.5 w-20 cursor-pointer hover:text-sigma-textMain" onClick={() => handleSort('takerImbalance')}>
                Taker {sortField === 'takerImbalance' && (sortAsc ? '▲' : '▼')}
              </th>
              <th className="py-2.5 px-3 w-24 cursor-pointer hover:text-sigma-textMain" onClick={() => handleSort('signalScore')}>
                Eagle Score {sortField === 'signalScore' && (sortAsc ? '▲' : '▼')}
              </th>
              <th className="py-2.5 px-2.5 w-28 cursor-pointer hover:text-sigma-textMain" onClick={() => handleSort('spikePhase')}>
                Phase
              </th>
              <th className="py-2.5 px-2.5 w-32 cursor-pointer hover:text-sigma-textMain" onClick={() => handleSort('spikeType')}>
                Type
              </th>
              <th className="py-2.5 px-2.5 w-28 cursor-pointer hover:text-sigma-textMain" onClick={() => handleSort('spikeQuality')}>
                Quality
              </th>
              <th className="py-2.5 px-3 w-20 cursor-pointer hover:text-sigma-textMain" onClick={() => handleSort('price24hChange')}>
                24h {sortField === 'price24hChange' && (sortAsc ? '▲' : '▼')}
              </th>
              <th className="py-2.5 px-3 w-24 cursor-pointer hover:text-sigma-textMain" onClick={() => handleSort('turnover24h')}>
                24h Vol
              </th>
              <th className="py-2.5 px-3 w-24 cursor-pointer hover:text-sigma-textMain" onClick={() => handleSort('openInterestValue')}>
                OI (USD)
              </th>
              <th className="py-2.5 px-3 w-20 cursor-pointer hover:text-sigma-textMain" onClick={() => handleSort('fundingRate')}>
                Funding
              </th>
              <th className="py-2.5 px-2 w-16 text-center">Watch</th>
            </tr>
          </thead>

          <tbody>
            {/* Top Virtual Spacer */}
            {topPadding > 0 && (
              <tr>
                <td style={{ height: `${topPadding}px` }} colSpan={19} />
              </tr>
            )}

            {/* Render Only Visible Virtual Rows */}
            {visibleRows.map((s, index) => {
              const rowIndex = startIndex + index;
              const isPos24h = s.price24hChange >= 0;
              const isPos5m = (s.returns5m || 0) >= 0;
              const isPos15m = (s.returns15m || 0) >= 0;
              const isPos1h = (s.returns1h || 0) >= 0;
              const isPosOi = (s.oiChangePct || 0) >= 0;
              const isPosTaker = (s.takerImbalance || 0) >= 0;
              const isWatched = watchlist.has(s.symbol);

              const scoreBg =
                s.signalScore >= 75
                  ? 'bg-sigma-green/20 text-sigma-green border-sigma-green/50'
                  : s.signalScore >= 60
                  ? 'bg-sigma-amber/20 text-sigma-amber border-sigma-amber/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700';

              const exBadge =
                s.exchange === 'BYBIT'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : s.exchange === 'MEXC'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  : 'bg-purple-500/10 text-purple-400 border-purple-500/30';

              return (
                <tr
                  key={`${s.exchange}-${s.symbol}`}
                  onClick={() => onSelectSymbol?.(s.symbol)}
                  className="border-b border-sigma-border/40 hover:bg-sigma-surface2/80 transition-colors cursor-pointer"
                  style={{ height: `${ROW_HEIGHT}px` }}
                >
                  <td className="py-2 px-3 text-sigma-textDark tabular-nums">{rowIndex + 1}</td>
                  <td className="py-2 px-3 font-bold flex items-center gap-1.5 whitespace-nowrap">
                    <span className="text-sigma-textMain">{s.symbol}</span>
                    <span className={`text-[9px] px-1 py-0.2 rounded border font-semibold ${exBadge}`}>
                      {s.exchange}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-bold tabular-nums text-sigma-textMain">
                    ${s.lastPrice >= 1 ? s.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) : s.lastPrice.toFixed(4)}
                  </td>
                  <td className={`py-2 px-2.5 font-bold tabular-nums ${isPos5m ? 'text-sigma-green' : 'text-sigma-red'}`}>
                    {isPos5m ? '+' : ''}{(s.returns5m || 0).toFixed(2)}%
                  </td>
                  <td className={`py-2 px-2.5 tabular-nums ${isPos15m ? 'text-sigma-green' : 'text-sigma-red'}`}>
                    {isPos15m ? '+' : ''}{(s.returns15m || 0).toFixed(2)}%
                  </td>
                  <td className={`py-2 px-2.5 tabular-nums ${isPos1h ? 'text-sigma-green' : 'text-sigma-red'}`}>
                    {isPos1h ? '+' : ''}{(s.returns1h || 0).toFixed(2)}%
                  </td>
                  <td className={`py-2 px-3 font-bold tabular-nums ${s.relativeVolume >= 2.0 ? 'text-sigma-green' : s.relativeVolume >= 1.4 ? 'text-sigma-amber' : 'text-sigma-textMuted'}`}>
                    {s.relativeVolume.toFixed(2)}x
                  </td>
                  <td className={`py-2 px-2.5 tabular-nums ${s.volumeZScore >= 2.0 ? 'text-sigma-green' : 'text-sigma-textDark'}`}>
                    {s.volumeZScore.toFixed(1)}σ
                  </td>
                  <td className={`py-2 px-2.5 tabular-nums font-semibold ${isPosOi ? 'text-sigma-green' : 'text-sigma-red'}`}>
                    {isPosOi ? '+' : ''}{(s.oiChangePct || 0).toFixed(1)}%
                  </td>
                  <td className={`py-2 px-2.5 tabular-nums font-bold ${isPosTaker ? 'text-sigma-green' : 'text-sigma-red'}`}>
                    {isPosTaker ? '+' : ''}{s.takerImbalance.toFixed(0)}%
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded border font-bold text-[10px] ${scoreBg}`}>
                      {s.signalScore}
                    </span>
                  </td>
                  <td className="py-2 px-2.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sigma-surface3 text-sigma-cyan border border-sigma-border">
                      {s.spikePhase}
                    </span>
                  </td>
                  <td className="py-2 px-2.5 text-[10px] text-sigma-textMuted">{s.spikeType}</td>
                  <td className="py-2 px-2.5 text-[10px] text-sigma-textDark">{s.spikeQuality}</td>
                  <td className={`py-2 px-3 tabular-nums font-bold ${isPos24h ? 'text-sigma-green' : 'text-sigma-red'}`}>
                    {isPos24h ? '+' : ''}{s.price24hChange.toFixed(2)}%
                  </td>
                  <td className="py-2 px-3 tabular-nums text-sigma-cyan">
                    ${(s.turnover24h / 1e6).toFixed(2)}M
                  </td>
                  <td className="py-2 px-3 tabular-nums text-sigma-textMuted">
                    ${(s.openInterestValue / 1e6).toFixed(1)}M
                  </td>
                  <td className={`py-2 px-3 tabular-nums text-[10px] ${s.fundingRate >= 0 ? 'text-sigma-green' : 'text-sigma-red'}`}>
                    {(s.fundingRate * 100).toFixed(4)}%
                  </td>
                  <td className="py-2 px-2 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWatchlist?.(s.symbol);
                      }}
                      className="text-sigma-amber hover:scale-125 transition-transform"
                    >
                      {isWatched ? '★' : '☆'}
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* Bottom Virtual Spacer */}
            {bottomPadding > 0 && (
              <tr>
                <td style={{ height: `${bottomPadding}px` }} colSpan={19} />
              </tr>
            )}

            {totalRows === 0 && (
              <tr>
                <td colSpan={19} className="text-center py-12 text-sigma-textDark">
                  No perpetual contracts match active filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
