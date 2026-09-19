'use client';

import React, { useState } from 'react';
import { useSigmaStore } from '../../store/useSigmaStore';
import { Order, Position } from '../../../../packages/types';
import { AlertTriangle, CheckCircle2, DollarSign, Layers, Plus, Trash2, X } from 'lucide-react';

interface PositionsAndOrdersDrawerProps {
  positions: Position[];
  orders: Order[];
  currentPrice: number;
}

export const PositionsAndOrdersDrawer: React.FC<PositionsAndOrdersDrawerProps> = ({
  positions = [],
  orders = [],
  currentPrice,
}) => {
  const { closePosition, submitOrder, data } = useSigmaStore();
  const [activeTab, setActiveTab] = useState<'POSITIONS' | 'ORDERS' | 'TICKET'>('POSITIONS');

  // Quick Order Ticket Form State
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [orderAmountBtc, setOrderAmountBtc] = useState<number>(0.25);
  const [orderLimitPrice, setOrderLimitPrice] = useState<number>(currentPrice || 79073);
  const [orderStopLoss, setOrderStopLoss] = useState<number>(
    orderSide === 'BUY' ? Math.round((currentPrice || 79073) * 0.98) : Math.round((currentPrice || 79073) * 1.02)
  );
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [ticketSuccess, setTicketSuccess] = useState<boolean>(false);

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketError(null);
    setTicketSuccess(false);

    const res = await submitOrder({
      symbol: 'BTCUSDT',
      side: orderSide,
      type: orderType,
      amountBtc: Number(orderAmountBtc),
      price: orderType === 'LIMIT' ? Number(orderLimitPrice) : currentPrice,
      stopPrice: Number(orderStopLoss),
    });

    if (!res.success) {
      setTicketError(res.error || 'Execution blocked');
    } else {
      setTicketSuccess(true);
      setTimeout(() => setTicketSuccess(false), 3000);
    }
  };

  const tradingMode = data?.tradingMode || 'PAPER';

  return (
    <div className="bg-sigma-surface1 border border-sigma-border rounded-lg overflow-hidden flex flex-col">
      {/* Tabs Header */}
      <div className="flex items-center justify-between p-2.5 border-b border-sigma-border bg-sigma-surface2/50">
        <div className="flex items-center gap-1 text-xs font-mono">
          <button
            onClick={() => setActiveTab('POSITIONS')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'POSITIONS'
                ? 'bg-sigma-surface3 text-sigma-cyan font-bold border border-sigma-border'
                : 'text-sigma-textMuted hover:text-sigma-textMain'
            }`}
          >
            Active Positions ({positions.length})
          </button>
          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'ORDERS'
                ? 'bg-sigma-surface3 text-sigma-cyan font-bold border border-sigma-border'
                : 'text-sigma-textMuted hover:text-sigma-textMain'
            }`}
          >
            Order Book / Fills ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('TICKET')}
            className={`px-3 py-1 rounded transition-colors flex items-center gap-1 ${
              activeTab === 'TICKET'
                ? 'bg-sigma-surface3 text-sigma-green font-bold border border-sigma-border'
                : 'text-sigma-textMuted hover:text-sigma-textMain'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Order Ticket</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-sigma-textDark">EXECUTION MODE:</span>
          <span
            className={`px-1.5 py-0.5 rounded font-bold border ${
              tradingMode === 'PAPER'
                ? 'bg-sigma-cyan/10 text-sigma-cyan border-sigma-cyan/30'
                : 'bg-sigma-red/10 text-sigma-red border-sigma-red animate-pulse'
            }`}
          >
            {tradingMode === 'PAPER' ? 'PAPER EXECUTION' : 'LIVE ROUTING'}
          </span>
        </div>
      </div>

      {/* Tab 1: Positions Table */}
      {activeTab === 'POSITIONS' && (
        <div className="p-3 overflow-x-auto">
          {positions.length === 0 ? (
            <div className="text-center py-6 text-xs font-mono text-sigma-textDark">
              No active positions. Submit an order to open a position.
            </div>
          ) : (
            <table className="w-full text-xs font-mono text-left">
              <thead>
                <tr className="text-[10px] text-sigma-textDark border-b border-sigma-borderSubtle">
                  <th className="pb-2">SYMBOL</th>
                  <th className="pb-2">SIDE</th>
                  <th className="pb-2">SIZE (BTC)</th>
                  <th className="pb-2">ENTRY</th>
                  <th className="pb-2">MARK PRICE</th>
                  <th className="pb-2">UNREALIZED PnL</th>
                  <th className="pb-2">MAE / MFE</th>
                  <th className="pb-2">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sigma-borderSubtle">
                {positions.map((pos) => {
                  const isPnlPos = pos.unrealizedPnlUsd >= 0;
                  return (
                    <tr key={pos.id} className="hover:bg-sigma-surface2/40">
                      <td className="py-2.5 font-bold text-sigma-textMain">{pos.symbol}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            pos.side === 'LONG'
                              ? 'bg-sigma-green/15 text-sigma-green border border-sigma-green/30'
                              : 'bg-sigma-red/15 text-sigma-red border border-sigma-red/30'
                          }`}
                        >
                          {pos.side}
                        </span>
                      </td>
                      <td className="py-2.5 text-sigma-textMain tabular-nums">{pos.amountBtc} BTC</td>
                      <td className="py-2.5 text-sigma-textMuted tabular-nums">${pos.entryPrice.toLocaleString()}</td>
                      <td className="py-2.5 text-sigma-textMain font-medium tabular-nums">
                        ${pos.currentPrice.toLocaleString()}
                      </td>
                      <td className="py-2.5">
                        <div className={`font-bold tabular-nums ${isPnlPos ? 'text-sigma-green' : 'text-sigma-red'}`}>
                          {isPnlPos ? `+$${pos.unrealizedPnlUsd.toFixed(2)}` : `-$${Math.abs(pos.unrealizedPnlUsd).toFixed(2)}`}
                          <span className="text-[10px] font-normal ml-1">
                            ({isPnlPos ? `+${pos.unrealizedPnlPct}%` : `${pos.unrealizedPnlPct}%`})
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 text-sigma-textDark text-[11px] tabular-nums">
                        <span className="text-sigma-red">{(pos.maxAdverseExcursionBps / 100).toFixed(2)}%</span> /{' '}
                        <span className="text-sigma-green">+{(pos.maxFavorableExcursionBps / 100).toFixed(2)}%</span>
                      </td>
                      <td className="py-2.5">
                        <button
                          onClick={() => closePosition(pos.id)}
                          className="px-2 py-1 rounded bg-sigma-surface3 hover:bg-sigma-red/20 text-sigma-textMuted hover:text-sigma-red border border-sigma-border text-[10px] font-bold transition-colors"
                        >
                          CLOSE
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 2: Orders Table */}
      {activeTab === 'ORDERS' && (
        <div className="p-3 overflow-x-auto">
          {orders.length === 0 ? (
            <div className="text-center py-6 text-xs font-mono text-sigma-textDark">No recent orders recorded.</div>
          ) : (
            <table className="w-full text-xs font-mono text-left">
              <thead>
                <tr className="text-[10px] text-sigma-textDark border-b border-sigma-borderSubtle">
                  <th className="pb-2">ORDER ID</th>
                  <th className="pb-2">SIDE</th>
                  <th className="pb-2">TYPE</th>
                  <th className="pb-2">AMOUNT</th>
                  <th className="pb-2">PRICE</th>
                  <th className="pb-2">STATUS</th>
                  <th className="pb-2">AUDIT ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sigma-borderSubtle">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-sigma-surface2/40">
                    <td className="py-2 text-sigma-textDark text-[11px]">{ord.id}</td>
                    <td className="py-2">
                      <span className={ord.side === 'BUY' ? 'text-sigma-green font-bold' : 'text-sigma-red font-bold'}>
                        {ord.side}
                      </span>
                    </td>
                    <td className="py-2 text-sigma-textMuted">{ord.type}</td>
                    <td className="py-2 text-sigma-textMain tabular-nums">{ord.amountBtc} BTC</td>
                    <td className="py-2 text-sigma-textMain tabular-nums">${ord.price?.toLocaleString() || 'MKT'}</td>
                    <td className="py-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-sigma-green/15 text-sigma-green border border-sigma-green/30">
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-2 text-sigma-textDark text-[10px]">{ord.reconciliationAuditId || 'OK'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 3: Order Ticket */}
      {activeTab === 'TICKET' && (
        <form onSubmit={handleOrderSubmit} className="p-4 bg-sigma-surface2/40 space-y-4 text-xs font-mono">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Side */}
            <div>
              <label className="text-[10px] text-sigma-textDark uppercase block mb-1">Direction</label>
              <div className="grid grid-cols-2 gap-1 bg-sigma-surface3 p-0.5 rounded border border-sigma-border">
                <button
                  type="button"
                  onClick={() => setOrderSide('BUY')}
                  className={`py-1 rounded text-center font-bold ${
                    orderSide === 'BUY' ? 'bg-sigma-green text-black' : 'text-sigma-textMuted'
                  }`}
                >
                  BUY / LONG
                </button>
                <button
                  type="button"
                  onClick={() => setOrderSide('SELL')}
                  className={`py-1 rounded text-center font-bold ${
                    orderSide === 'SELL' ? 'bg-sigma-red text-white' : 'text-sigma-textMuted'
                  }`}
                >
                  SELL / SHORT
                </button>
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="text-[10px] text-sigma-textDark uppercase block mb-1">Order Type</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as any)}
                className="w-full bg-sigma-surface3 border border-sigma-border rounded p-1.5 text-sigma-textMain outline-none"
              >
                <option value="MARKET">Market Order</option>
                <option value="LIMIT">Limit Order</option>
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="text-[10px] text-sigma-textDark uppercase block mb-1">Amount (BTC)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={orderAmountBtc}
                onChange={(e) => setOrderAmountBtc(parseFloat(e.target.value))}
                className="w-full bg-sigma-surface3 border border-sigma-border rounded p-1.5 text-sigma-textMain outline-none"
              />
            </div>

            {/* Stop Loss */}
            <div>
              <label className="text-[10px] text-sigma-textDark uppercase block mb-1">Stop Loss ($)</label>
              <input
                type="number"
                step="1"
                value={orderStopLoss}
                onChange={(e) => setOrderStopLoss(parseFloat(e.target.value))}
                className="w-full bg-sigma-surface3 border border-sigma-border rounded p-1.5 text-sigma-textMain outline-none"
              />
            </div>
          </div>

          {ticketError && (
            <div className="p-2 rounded bg-sigma-red/10 border border-sigma-red/30 text-sigma-red flex items-center gap-1.5 text-[11px]">
              <AlertTriangle className="w-4 h-4" />
              <span>{ticketError}</span>
            </div>
          )}

          {ticketSuccess && (
            <div className="p-2 rounded bg-sigma-green/10 border border-sigma-green/30 text-sigma-green flex items-center gap-1.5 text-[11px]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Order executed and reconciled successfully in {tradingMode} mode.</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-sigma-borderSubtle">
            <div className="text-[11px] text-sigma-textDark">
              Notional: <strong className="text-sigma-textMain">${(orderAmountBtc * currentPrice).toFixed(2)}</strong> |
              Simulated Fee (5 bps): ${(orderAmountBtc * currentPrice * 0.0005).toFixed(2)}
            </div>
            <button
              type="submit"
              className={`px-5 py-2 rounded font-bold transition-colors ${
                orderSide === 'BUY'
                  ? 'bg-sigma-green text-black hover:bg-sigma-green/90'
                  : 'bg-sigma-red text-white hover:bg-sigma-red/90'
              }`}
            >
              Submit {tradingMode} Order
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
