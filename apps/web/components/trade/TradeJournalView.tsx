'use client';

import React from 'react';
import { useSigmaStore } from '../../store/useSigmaStore';
import { TradeJournalEntry } from '../../../../packages/types';
import { ArrowDownRight, ArrowUpRight, BookOpen, Clock, Layers, Zap } from 'lucide-react';

export const TradeJournalView: React.FC = () => {
  const { data } = useSigmaStore();
  const journal: TradeJournalEntry[] = data?.journal || [];

  const totalTrades = journal.length;
  const wins = journal.filter((t) => t.realizedPnlUsd > 0).length;
  const totalPnl = journal.reduce((acc, t) => acc + t.realizedPnlUsd, 0);
  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      {/* Header Summary */}
      <div className="bg-sigma-surface1 border border-sigma-border rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-sigma-green" />
          <div>
            <h2 className="font-mono text-sm font-bold text-sigma-textMain uppercase tracking-wider">
              Automated Trade Journal & Excursion Analytics
            </h2>
            <span className="text-[10px] font-mono text-sigma-textDark">
              EVERY TRADE IS PERMANENTLY LOGGED WITH MAE, MFE, SLIPPAGE, AND FACTOR SNAPSHOTS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-[10px] text-sigma-textDark block uppercase">Closed Trades</span>
            <span className="font-bold text-sigma-textMain">{totalTrades}</span>
          </div>
          <div>
            <span className="text-[10px] text-sigma-textDark block uppercase">Win Rate</span>
            <span className="font-bold text-sigma-green">{winRate}%</span>
          </div>
          <div>
            <span className="text-[10px] text-sigma-textDark block uppercase">Realized PnL</span>
            <span
              className={`font-bold tabular-nums ${
                totalPnl >= 0 ? 'text-sigma-green' : 'text-sigma-red'
              }`}
            >
              {totalPnl >= 0 ? `+$${totalPnl.toFixed(2)}` : `-$${Math.abs(totalPnl).toFixed(2)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Journal Table */}
      <div className="bg-sigma-surface1 border border-sigma-border rounded-lg overflow-hidden p-4">
        {journal.length === 0 ? (
          <div className="text-center py-10 text-xs font-mono text-sigma-textDark">
            No closed trades in journal yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead>
                <tr className="text-[10px] text-sigma-textDark border-b border-sigma-borderSubtle">
                  <th className="pb-2">TRADE ID</th>
                  <th className="pb-2">SIDE</th>
                  <th className="pb-2">ENTRY / EXIT</th>
                  <th className="pb-2">REALIZED PnL</th>
                  <th className="pb-2">MAE / MFE</th>
                  <th className="pb-2">SLIPPAGE & FEES</th>
                  <th className="pb-2">REGIME / SIGNAL</th>
                  <th className="pb-2">ENTRY REASON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sigma-borderSubtle">
                {journal.map((trade) => {
                  const isWin = trade.realizedPnlUsd > 0;
                  return (
                    <tr key={trade.id} className="hover:bg-sigma-surface2/30">
                      <td className="py-2.5 font-bold text-sigma-textDark text-[11px]">{trade.id}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            trade.side === 'LONG'
                              ? 'bg-sigma-green/15 text-sigma-green border border-sigma-green/30'
                              : 'bg-sigma-red/15 text-sigma-red border border-sigma-red/30'
                          }`}
                        >
                          {trade.side}
                        </span>
                      </td>
                      <td className="py-2.5 text-sigma-textMuted tabular-nums">
                        ${trade.entryPrice.toLocaleString()} → ${trade.exitPrice.toLocaleString()}
                      </td>
                      <td className="py-2.5">
                        <div className={`font-bold tabular-nums ${isWin ? 'text-sigma-green' : 'text-sigma-red'}`}>
                          {isWin ? `+$${trade.realizedPnlUsd.toFixed(2)}` : `-$${Math.abs(trade.realizedPnlUsd).toFixed(2)}`}
                          <span className="text-[10px] font-normal ml-1">
                            ({isWin ? `+${trade.realizedPnlPct}%` : `${trade.realizedPnlPct}%`})
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 text-[11px] tabular-nums">
                        <span className="text-sigma-red font-medium">{trade.maePct}% MAE</span> /{' '}
                        <span className="text-sigma-green font-medium">+{trade.mfePct}% MFE</span>
                      </td>
                      <td className="py-2.5 text-sigma-textDark text-[11px]">
                        <span>{trade.slippageBps} bps</span> · <span>${trade.feesPaidUsd.toFixed(1)} fees</span>
                      </td>
                      <td className="py-2.5">
                        <span className="text-sigma-cyan font-semibold">{trade.regimeSnapshot}</span>{' '}
                        <span className="text-sigma-textDark text-[10px]">({trade.signalSnapshot})</span>
                      </td>
                      <td className="py-2.5 text-sigma-textMuted text-[11px] max-w-xs truncate" title={trade.entryReason}>
                        {trade.entryReason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
