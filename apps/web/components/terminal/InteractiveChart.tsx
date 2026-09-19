'use client';

import React, { useMemo, useState } from 'react';
import { useSigmaStore } from '../../store/useSigmaStore';
import { Candle, Timeframe } from '../../../../packages/types';
import { calcCVD, calcEMA, calcVWAP } from '../../../../packages/indicators';
import { BarChart3, Maximize2, Sliders, TrendingUp } from 'lucide-react';

interface InteractiveChartProps {
  candles: Candle[];
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({ candles = [] }) => {
  const { activeTimeframe, setTimeframe } = useSigmaStore();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const timeframes: Timeframe[] = ['15m', '1h', '4h', '1D'];

  // Calculate EMA 20, EMA 50, VWAP, CVD
  const { ema20, ema50, vwap, cvdSeries } = useMemo(() => {
    if (!candles || candles.length === 0) {
      return { ema20: [], ema50: [], vwap: [], cvdSeries: [] };
    }
    const closes = candles.map((c) => c.close);
    return {
      ema20: calcEMA(closes, 20),
      ema50: calcEMA(closes, 50),
      vwap: calcVWAP(candles),
      cvdSeries: calcCVD(candles).cvdSeries,
    };
  }, [candles]);

  if (!candles || candles.length === 0) {
    return (
      <div className="bg-sigma-surface1 border border-sigma-border rounded-lg p-8 text-center text-xs font-mono text-sigma-textDark">
        Loading Institutional Chart Feeds...
      </div>
    );
  }

  // Viewport dimensions
  const width = 800;
  const height = 340;
  const priceChartHeight = 240;
  const volumeChartHeight = 80;

  // Price Extents
  const minPrice = Math.min(...candles.map((c) => c.low)) * 0.996;
  const maxPrice = Math.max(...candles.map((c) => c.high)) * 1.004;
  const priceRange = maxPrice - minPrice || 1;

  // Volume Extent
  const maxVol = Math.max(...candles.map((c) => c.volume)) || 1;

  const candleWidth = width / candles.length;

  const activeCandle = hoveredIndex !== null ? candles[hoveredIndex] : candles[candles.length - 1];

  return (
    <div className="bg-sigma-surface1 border border-sigma-border rounded-lg overflow-hidden flex flex-col">
      {/* Chart Topbar */}
      <div className="p-3 border-b border-sigma-border bg-sigma-surface2/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-sigma-textMain">
            <BarChart3 className="w-4 h-4 text-sigma-cyan" />
            <span>BTC/USDT INSTITUTIONAL WORKSPACE</span>
          </div>

          <div className="flex items-center gap-1 bg-sigma-surface3 p-0.5 rounded border border-sigma-border text-[10px] font-mono">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeTimeframe === tf
                    ? 'bg-sigma-cyan text-black font-bold'
                    : 'text-sigma-textMuted hover:text-sigma-textMain'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* OHLCV readout */}
        {activeCandle && (
          <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums text-sigma-textDark">
            <span>
              O: <strong className="text-sigma-textMain">${activeCandle.open.toFixed(2)}</strong>
            </span>
            <span>
              H: <strong className="text-sigma-textMain">${activeCandle.high.toFixed(2)}</strong>
            </span>
            <span>
              L: <strong className="text-sigma-textMain">${activeCandle.low.toFixed(2)}</strong>
            </span>
            <span>
              C:{' '}
              <strong
                className={activeCandle.close >= activeCandle.open ? 'text-sigma-green' : 'text-sigma-red'}
              >
                ${activeCandle.close.toFixed(2)}
              </strong>
            </span>
            <span>
              Vol: <strong className="text-sigma-cyan">{activeCandle.volume.toFixed(0)} BTC</strong>
            </span>
          </div>
        )}
      </div>

      {/* SVG Canvas Chart */}
      <div className="relative w-full overflow-hidden p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair select-none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Horizontal Gridlines */}
          {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => {
            const y = priceChartHeight * ratio;
            const priceLevel = maxPrice - priceRange * ratio;
            return (
              <g key={i}>
                <line x1={0} y1={y} x2={width} y2={y} stroke="#1C2538" strokeDasharray="3,3" strokeWidth={1} />
                <text x={width - 5} y={y - 3} textAnchor="end" fill="#64748B" fontSize="9" fontFamily="monospace">
                  ${priceLevel.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* S/R Structural Reference Lines */}
          <line
            x1={0}
            y1={priceChartHeight * (1 - (80400 - minPrice) / priceRange)}
            x2={width}
            y2={priceChartHeight * (1 - (80400 - minPrice) / priceRange)}
            stroke="#00D2FF"
            strokeDasharray="4,4"
            strokeWidth={1}
            opacity={0.7}
          />
          <text
            x={10}
            y={priceChartHeight * (1 - (80400 - minPrice) / priceRange) - 4}
            fill="#00D2FF"
            fontSize="9"
            fontFamily="monospace"
          >
            TARGET 1 RESISTANCE: $80,400
          </text>

          <line
            x1={0}
            y1={priceChartHeight * (1 - (77920 - minPrice) / priceRange)}
            x2={width}
            y2={priceChartHeight * (1 - (77920 - minPrice) / priceRange)}
            stroke="#FF4757"
            strokeDasharray="4,4"
            strokeWidth={1}
            opacity={0.8}
          />
          <text
            x={10}
            y={priceChartHeight * (1 - (77920 - minPrice) / priceRange) + 11}
            fill="#FF4757"
            fontSize="9"
            fontFamily="monospace"
          >
            STOP LOSS / INVALIDATION: $77,920
          </text>

          {/* Candlesticks & Volume */}
          {candles.map((c, i) => {
            const x = i * candleWidth + candleWidth / 2;
            const isUp = c.close >= c.open;
            const color = isUp ? '#00E599' : '#FF4757';

            // Coordinates
            const yHigh = priceChartHeight * (1 - (c.high - minPrice) / priceRange);
            const yLow = priceChartHeight * (1 - (c.low - minPrice) / priceRange);
            const yOpen = priceChartHeight * (1 - (c.open - minPrice) / priceRange);
            const yClose = priceChartHeight * (1 - (c.close - minPrice) / priceRange);

            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));

            // Volume Coordinates
            const volBarHeight = (c.volume / maxVol) * volumeChartHeight * 0.75;
            const volY = height - volBarHeight;

            return (
              <g
                key={c.timestamp}
                onMouseEnter={() => setHoveredIndex(i)}
                className="transition-opacity hover:opacity-80"
              >
                {/* Wick */}
                <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth={1.2} />
                {/* Body */}
                <rect
                  x={x - candleWidth * 0.38}
                  y={bodyTop}
                  width={candleWidth * 0.76}
                  height={bodyHeight}
                  fill={color}
                  rx={1}
                />

                {/* Volume Bar */}
                <rect
                  x={x - candleWidth * 0.35}
                  y={volY}
                  width={candleWidth * 0.7}
                  height={volBarHeight}
                  fill={color}
                  opacity={0.4}
                />
              </g>
            );
          })}

          {/* EMA 20 Line (Cyan) */}
          {ema20.length > 0 && (
            <polyline
              fill="none"
              stroke="#00D2FF"
              strokeWidth={1.5}
              opacity={0.85}
              points={ema20
                .map((val, i) => {
                  if (isNaN(val)) return null;
                  const x = i * candleWidth + candleWidth / 2;
                  const y = priceChartHeight * (1 - (val - minPrice) / priceRange);
                  return `${x},${y}`;
                })
                .filter(Boolean)
                .join(' ')}
            />
          )}

          {/* EMA 50 Line (Purple) */}
          {ema50.length > 0 && (
            <polyline
              fill="none"
              stroke="#8B5CF6"
              strokeWidth={1.5}
              opacity={0.7}
              points={ema50
                .map((val, i) => {
                  if (isNaN(val)) return null;
                  const x = i * candleWidth + candleWidth / 2;
                  const y = priceChartHeight * (1 - (val - minPrice) / priceRange);
                  return `${x},${y}`;
                })
                .filter(Boolean)
                .join(' ')}
            />
          )}

          {/* Hover Crosshair */}
          {hoveredIndex !== null && (
            <g>
              <line
                x1={hoveredIndex * candleWidth + candleWidth / 2}
                y1={0}
                x2={hoveredIndex * candleWidth + candleWidth / 2}
                y2={height}
                stroke="#F8FAFC"
                strokeDasharray="2,2"
                strokeWidth={0.8}
                opacity={0.5}
              />
            </g>
          )}
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-between text-[10px] font-mono text-sigma-textDark pt-2 px-2 border-t border-sigma-borderSubtle">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-sigma-cyan inline-block" />
              <span>EMA 20</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-sigma-purple inline-block" />
              <span>EMA 50</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2 bg-sigma-cyan/40 inline-block" />
              <span>Volume (BTC)</span>
            </div>
          </div>
          <div>
            <span>SYNCHRONIZED CROSSHAIR · 4H CANDLE INTERVAL</span>
          </div>
        </div>
      </div>
    </div>
  );
};
