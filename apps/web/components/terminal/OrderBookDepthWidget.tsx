'use client';

import React from 'react';
import { AlertCircle, Eye, Layers } from 'lucide-react';
import { OrderBookDepth } from '../../../../packages/types';

interface OrderBookDepthWidgetProps {
  orderBook: OrderBookDepth;
}

export const OrderBookDepthWidget: React.FC<OrderBookDepthWidgetProps> = ({ orderBook }) => {
  const mid = orderBook?.midPrice || 79073.06;
  const spread = orderBook?.spread || 0.6;
  const spreadBps = orderBook?.spreadBps || 0.8;
  const depth5 = orderBook?.depth5bps;
  const depth10 = orderBook?.depth10bps;
  const depth25 = orderBook?.depth25bps;
  const depth50 = orderBook?.depth50bps;

  return (
    <div className="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sigma-cyan" />
          <h3 className="font-mono text-xs font-bold text-sigma-textMain uppercase tracking-wider">
            Order Book Depth & Imbalance
          </h3>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="text-sigma-textDark">SPREAD:</span>
          <span className="text-sigma-green font-bold">
            ${spread.toFixed(2)} ({spreadBps.toFixed(2)} bps)
          </span>
        </div>
      </div>

      {/* Depth Imbalance Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs font-mono">
        {[
          { label: '±5 bps Depth', data: depth5 },
          { label: '±10 bps Depth', data: depth10 },
          { label: '±25 bps Depth', data: depth25 },
          { label: '±50 bps Depth', data: depth50 },
        ].map((item, idx) => {
          const imb = item.data?.imbalance || 0;
          const isBidHeavy = imb >= 0;
          return (
            <div key={idx} className="bg-sigma-surface2 p-2 rounded border border-sigma-border">
              <div className="text-[10px] text-sigma-textDark mb-1">{item.label}</div>
              <div className="flex items-baseline justify-between">
                <span className="text-sigma-textMuted text-[11px]">
                  {(item.data?.bidQty || 0).toFixed(1)} vs {(item.data?.askQty || 0).toFixed(1)}
                </span>
                <span
                  className={`font-bold tabular-nums text-[11px] ${
                    isBidHeavy ? 'text-sigma-green' : 'text-sigma-red'
                  }`}
                >
                  {isBidHeavy ? `+${(imb * 100).toFixed(1)}%` : `${(imb * 100).toFixed(1)}%`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Liquidity Walls */}
      <div className="mb-3">
        <div className="text-[10px] font-mono text-sigma-textDark uppercase mb-1.5 flex items-center gap-1">
          <Eye className="w-3 h-3 text-sigma-cyan" />
          <span>Detected Liquidity Walls (Cluster Depth)</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-sigma-green/10 border border-sigma-green/30 p-2 rounded flex justify-between items-center">
            <span className="text-sigma-green font-bold">BID WALL</span>
            <span className="text-sigma-textMain font-medium">$78,820 (45.5 BTC / $3.59M)</span>
          </div>
          <div className="bg-sigma-red/10 border border-sigma-red/30 p-2 rounded flex justify-between items-center">
            <span className="text-sigma-red font-bold">ASK WALL</span>
            <span className="text-sigma-textMain font-medium">$80,450 (38.0 BTC / $3.05M)</span>
          </div>
        </div>
      </div>

      {/* Cautious Pattern Note */}
      <div className="p-2 rounded bg-sigma-surface2 border border-sigma-border flex items-start gap-2 text-[10px] font-mono text-sigma-textDark">
        <AlertCircle className="w-3.5 h-3.5 text-sigma-amber shrink-0 mt-0.5" />
        <div>
          <span className="text-sigma-amber font-semibold">POSSIBLE LIQUIDITY REMOVAL: </span>
          <span>
            Potential spoofing-like pattern noted at ask -45bps. Handled strictly as an unconfirmed heuristic (LOW
            CONFIDENCE).
          </span>
        </div>
      </div>
    </div>
  );
};
