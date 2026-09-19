'use client';

import React from 'react';
import { ArrowDownRight, ArrowUpRight, BarChart2, Flame, Gauge, Zap } from 'lucide-react';
import { OrderFlowMetrics } from '../../../../packages/types';

interface OrderFlowModuleProps {
  orderFlow: OrderFlowMetrics;
}

export const OrderFlowModule: React.FC<OrderFlowModuleProps> = ({ orderFlow }) => {
  const buyersPct = orderFlow?.buyersPct || 54.2;
  const sellersPct = orderFlow?.sellersPct || 45.8;
  const spotDelta = orderFlow?.spotDeltaNotional || 142500000;
  const perpDelta = orderFlow?.perpDeltaNotional || 31200000;
  const netDelta = orderFlow?.netDeltaNotional || -18500000;
  const volumeUsd = orderFlow?.volume24hUsd || 1810500000;
  const trades = orderFlow?.tradesCount30m || 403829;
  const largeTrades = orderFlow?.largeTradesCount30m || 148;
  const divergence = orderFlow?.priceDeltaDivergence || 'BULLISH_DIVERGENCE';

  const formatMillions = (val: number) => {
    const sign = val > 0 ? '+' : '';
    return `${sign}$${(val / 1e6).toFixed(1)}M`;
  };

  return (
    <div className="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-sigma-green" />
          <h3 className="font-mono text-xs font-bold text-sigma-textMain uppercase tracking-wider">
            Order Flow & Net Delta Intelligence
          </h3>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="text-sigma-textDark">DIVERGENCE:</span>
          <span className="px-1.5 py-0.5 rounded bg-sigma-green/10 text-sigma-green border border-sigma-green/30 font-bold">
            BULLISH DELTA DIVERGENCE
          </span>
        </div>
      </div>

      {/* Buyers vs Sellers Visual Percentage Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs font-mono mb-1.5">
          <div className="flex items-center gap-1 text-sigma-green font-bold">
            <span>BUYERS</span>
            <span>{buyersPct}%</span>
          </div>
          <div className="flex items-center gap-1 text-sigma-red font-bold">
            <span>{sellersPct}%</span>
            <span>SELLERS</span>
          </div>
        </div>

        <div className="w-full h-3.5 bg-sigma-surface3 rounded overflow-hidden flex border border-sigma-border">
          <div
            className="h-full bg-sigma-green transition-all duration-500 flex items-center justify-start pl-2 text-[9px] font-mono font-bold text-black"
            style={{ width: `${buyersPct}%` }}
          >
            {buyersPct}%
          </div>
          <div
            className="h-full bg-sigma-red transition-all duration-500 flex items-center justify-end pr-2 text-[9px] font-mono font-bold text-white"
            style={{ width: `${sellersPct}%` }}
          >
            {sellersPct}%
          </div>
        </div>
      </div>

      {/* Spot vs Futures Breakdown Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Spot Breakdown */}
        <div className="bg-sigma-surface2 p-3 rounded border border-sigma-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-sigma-textDark uppercase font-bold">SPOT ACCUMULATION</span>
            <span className="text-xs font-mono font-bold text-sigma-green tabular-nums">
              {formatMillions(spotDelta)}
            </span>
          </div>
          <div className="space-y-1 text-[11px] font-mono">
            <div className="flex justify-between text-sigma-textMuted">
              <span>Taker Buy:</span>
              <span className="text-sigma-green font-semibold">{orderFlow?.spotTakerBuy || 52.8}%</span>
            </div>
            <div className="flex justify-between text-sigma-textMuted">
              <span>Taker Sell:</span>
              <span className="text-sigma-red font-semibold">{orderFlow?.spotTakerSell || 47.2}%</span>
            </div>
          </div>
        </div>

        {/* Perpetual Futures Breakdown */}
        <div className="bg-sigma-surface2 p-3 rounded border border-sigma-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-sigma-textDark uppercase font-bold">FUTURES POSITIONING</span>
            <span className="text-xs font-mono font-bold text-sigma-cyan tabular-nums">
              {formatMillions(perpDelta)}
            </span>
          </div>
          <div className="space-y-1 text-[11px] font-mono">
            <div className="flex justify-between text-sigma-textMuted">
              <span>Perp Taker Buy:</span>
              <span className="text-sigma-green font-semibold">{orderFlow?.perpTakerBuy || 50.4}%</span>
            </div>
            <div className="flex justify-between text-sigma-textMuted">
              <span>Perp Taker Sell:</span>
              <span className="text-sigma-red font-semibold">{orderFlow?.perpTakerSell || 49.6}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quantitative Summary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-sigma-borderSubtle text-xs font-mono">
        <div>
          <span className="text-[10px] text-sigma-textDark uppercase block">Net Delta (30m)</span>
          <span
            className={`font-bold tabular-nums ${
              netDelta >= 0 ? 'text-sigma-green' : 'text-sigma-red'
            }`}
          >
            {formatMillions(netDelta)}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-sigma-textDark uppercase block">30m Volume</span>
          <span className="font-bold text-sigma-textMain tabular-nums">
            ${(volumeUsd / 1e9).toFixed(2)}B
          </span>
        </div>
        <div>
          <span className="text-[10px] text-sigma-textDark uppercase block">Trade Count</span>
          <span className="font-bold text-sigma-cyan tabular-nums">{trades.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-[10px] text-sigma-textDark uppercase block">Large Block Trades</span>
          <span className="font-bold text-sigma-purple tabular-nums">{largeTrades} (&gt; $250k)</span>
        </div>
      </div>
    </div>
  );
};
