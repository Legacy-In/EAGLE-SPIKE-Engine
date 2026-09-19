'use client';

import React from 'react';
import { Calendar, Clock, DollarSign, Globe, TrendingUp } from 'lucide-react';
import { EconomicCalendarEvent } from '../../../../packages/types';
import { macroService } from '../../../../services/macro';

export const EconomicCalendarView: React.FC = () => {
  const events: EconomicCalendarEvent[] = macroService.getEconomicCalendar();

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-sigma-surface1 border border-sigma-border rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-sigma-cyan" />
          <div>
            <h2 className="font-mono text-sm font-bold text-sigma-textMain uppercase tracking-wider">
              Macro & Economic Event Calendar
            </h2>
            <span className="text-[10px] font-mono text-sigma-textDark">
              FOMC · CPI · PPI · OPTIONS EXPIRIES · SYSTEM AUTOMATICALLY TRANSITIONS EXPIRED EVENTS TO HISTORICAL
            </span>
          </div>
        </div>
      </div>

      <div className="bg-sigma-surface1 border border-sigma-border rounded-lg overflow-hidden p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead>
              <tr className="text-[10px] text-sigma-textDark border-b border-sigma-borderSubtle">
                <th className="pb-2">SCHEDULED TIME</th>
                <th className="pb-2">EVENT TITLE</th>
                <th className="pb-2">IMPORTANCE</th>
                <th className="pb-2">SOURCE</th>
                <th className="pb-2">STATUS</th>
                <th className="pb-2">PREVIOUS / FORECAST</th>
                <th className="pb-2">ACTUAL / REACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sigma-borderSubtle">
              {events.map((evt) => {
                const isReleased = evt.status === 'RELEASED';
                return (
                  <tr key={evt.id} className="hover:bg-sigma-surface2/30">
                    <td className="py-3 text-sigma-textMuted text-[11px] whitespace-nowrap">
                      {formatDate(evt.scheduledTime)}
                    </td>
                    <td className="py-3 font-bold text-sigma-textMain">{evt.title}</td>
                    <td className="py-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          evt.importance === 'CRITICAL'
                            ? 'bg-sigma-red/15 text-sigma-red border border-sigma-red/30'
                            : evt.importance === 'HIGH'
                            ? 'bg-sigma-amber/15 text-sigma-amber border border-sigma-amber/30'
                            : 'bg-sigma-surface3 text-sigma-textDark'
                        }`}
                      >
                        {evt.importance}
                      </span>
                    </td>
                    <td className="py-3 text-sigma-textDark text-[11px]">{evt.source}</td>
                    <td className="py-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isReleased
                            ? 'bg-sigma-cyan/10 text-sigma-cyan border border-sigma-cyan/30'
                            : 'bg-sigma-green/10 text-sigma-green border border-sigma-green/30'
                        }`}
                      >
                        {evt.status}
                      </span>
                    </td>
                    <td className="py-3 text-sigma-textMuted text-[11px]">
                      {evt.previousValue} / <span className="text-sigma-textMain">{evt.forecastValue}</span>
                    </td>
                    <td className="py-3 text-[11px]">
                      {isReleased ? (
                        <div>
                          <span className="text-sigma-textMain font-bold">{evt.actualValue}</span>
                          {evt.marketReactionBtcBps !== undefined && (
                            <span className="ml-2 font-bold text-sigma-green">
                              (+{evt.marketReactionBtcBps} bps BTC rally)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sigma-textDark">Pending release</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
