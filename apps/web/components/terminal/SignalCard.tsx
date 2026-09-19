'use client';

import React from 'react';
import { useSigmaStore } from '../../store/useSigmaStore';
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  ShieldCheck,
  Target,
  Zap,
} from 'lucide-react';

interface SignalCardProps {
  signal: any;
  regime: any;
  currentPrice: number;
}

export const SignalCard: React.FC<SignalCardProps> = ({ signal, regime, currentPrice }) => {
  const { setOrderTicketOpen, submitOrder } = useSigmaStore();

  const decision = signal?.decision || 'LONG';
  const label = signal?.decisionLabel || 'LONG';
  const confidence = signal?.modelConfidence || 78;
  const dataQuality = signal?.dataQuality || 96;
  const entryLow = signal?.entryZone?.[0] || 78850;
  const entryHigh = signal?.entryZone?.[1] || 79150;
  const stopLoss = signal?.stopLossPrice || 77920;
  const target1 = signal?.target1 || 80400;
  const target2 = signal?.target2 || 81750;
  const target3 = signal?.target3 || 83200;
  const rr = signal?.riskRewardRatio || 2.8;
  const positionRiskPct = signal?.positionRiskPct || 0.5;
  const invalidation = signal?.invalidationCondition || '4H close below $77,920';

  const isLong = decision.includes('LONG');
  const isShort = decision.includes('SHORT');
  const isNeutral = decision.includes('WAIT');
  const isBlocked = decision.includes('BLOCKED') || decision.includes('INSUFFICIENT');

  const handleQuickExecute = () => {
    submitOrder({
      symbol: 'BTCUSDT',
      side: isLong ? 'BUY' : 'SELL',
      type: 'MARKET',
      amountBtc: 0.25,
      price: currentPrice,
      stopPrice: stopLoss,
    });
  };

  return (
    <div className="bg-sigma-surface1 border border-sigma-border rounded-lg overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <div className="p-4 border-b border-sigma-border bg-sigma-surface2/60">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs text-sigma-textMain">BTCUSDT</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sigma-surface3 text-sigma-textMuted border border-sigma-border">
              4H TIMEFRAME
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-sigma-textDark">
            <Clock className="w-3 h-3 text-sigma-cyan" />
            <span>Updated 2m ago</span>
          </div>
        </div>

        {/* Primary Decision Banner */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg border flex items-center justify-center ${
                isLong
                  ? 'bg-sigma-green/15 border-sigma-green text-sigma-green'
                  : isShort
                  ? 'bg-sigma-red/15 border-sigma-red text-sigma-red'
                  : isBlocked
                  ? 'bg-sigma-amber/15 border-sigma-amber text-sigma-amber'
                  : 'bg-sigma-surface3 border-sigma-border text-sigma-textMuted'
              }`}
            >
              {isLong ? (
                <ArrowUpCircle className="w-6 h-6" />
              ) : isShort ? (
                <ArrowDownCircle className="w-6 h-6" />
              ) : (
                <AlertCircle className="w-6 h-6" />
              )}
            </div>
            <div>
              <div
                className={`font-mono text-2xl font-black tracking-wide ${
                  isLong
                    ? 'text-sigma-green'
                    : isShort
                    ? 'text-sigma-red'
                    : isBlocked
                    ? 'text-sigma-amber'
                    : 'text-sigma-textMain'
                }`}
              >
                {label}
              </div>
              <div className="text-[11px] font-semibold text-sigma-textDark uppercase tracking-wider">
                {regime?.regimeLabel || 'BULLISH RECOVERY'}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-mono text-sigma-textDark uppercase">Model Confidence</div>
            <div className="text-base font-mono font-bold text-sigma-cyan">{confidence}%</div>
            <div className="text-[10px] font-mono text-sigma-textDark">Data Quality: {dataQuality}%</div>
          </div>
        </div>

        {/* Confidence Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-sigma-surface3 h-2 rounded-full overflow-hidden flex border border-sigma-border">
            <div
              className={`h-full transition-all duration-700 ${
                isLong ? 'bg-sigma-green' : isShort ? 'bg-sigma-red' : 'bg-sigma-amber'
              }`}
              style={{ width: `${confidence}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-sigma-textDark mt-1">
            <span>UNTESTED HYPOTHESIS (0%)</span>
            <span>CALIBRATED ENSEMBLE ({confidence}%)</span>
            <span>STATISTICAL CERTAINTY (100%)</span>
          </div>
        </div>
      </div>

      {/* Entry, Stop & Targets Grid */}
      <div className="p-4 divide-y divide-sigma-borderSubtle">
        <div className="grid grid-cols-2 gap-3 pb-3">
          <div className="bg-sigma-surface2/60 p-2.5 rounded border border-sigma-border">
            <div className="text-[10px] font-mono text-sigma-textDark uppercase mb-0.5">Entry Zone</div>
            <div className="font-mono text-xs font-bold text-sigma-textMain">
              ${entryLow.toLocaleString()} – ${entryHigh.toLocaleString()}
            </div>
          </div>
          <div className="bg-sigma-surface2/60 p-2.5 rounded border border-sigma-border">
            <div className="text-[10px] font-mono text-sigma-textDark uppercase mb-0.5">Stop Loss (ATR Max)</div>
            <div className="font-mono text-xs font-bold text-sigma-red">${stopLoss.toLocaleString()}</div>
          </div>
        </div>

        {/* Targets */}
        <div className="py-3">
          <div className="text-[10px] font-mono text-sigma-textDark uppercase mb-2 flex items-center gap-1">
            <Target className="w-3 h-3 text-sigma-cyan" />
            <span>Mathematical Target Matrix (Liquidity & ATR Extension)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-sigma-surface2/80 p-2 rounded border border-sigma-border">
              <div className="text-[9px] font-mono text-sigma-textDark">TARGET 1 (1.5R)</div>
              <div className="font-mono text-xs font-bold text-sigma-green">${target1.toLocaleString()}</div>
            </div>
            <div className="bg-sigma-surface2/80 p-2 rounded border border-sigma-border">
              <div className="text-[9px] font-mono text-sigma-textDark">TARGET 2 (2.5R)</div>
              <div className="font-mono text-xs font-bold text-sigma-green">${target2.toLocaleString()}</div>
            </div>
            <div className="bg-sigma-surface2/80 p-2 rounded border border-sigma-border">
              <div className="text-[9px] font-mono text-sigma-textDark">TARGET 3 (4.0R)</div>
              <div className="font-mono text-xs font-bold text-sigma-green">${target3.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Risk / Reward & Position Risk */}
        <div className="py-3 flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-sigma-textDark text-[10px] block">RISK / REWARD</span>
            <span className="font-bold text-sigma-textMain">1 : {rr}</span>
          </div>
          <div>
            <span className="text-sigma-textDark text-[10px] block">POSITION RISK</span>
            <span className="font-bold text-sigma-textMain">{positionRiskPct}%</span>
          </div>
          <div>
            <span className="text-sigma-textDark text-[10px] block">INVALIDATION</span>
            <span className="text-[11px] font-medium text-sigma-amber truncate max-w-[150px]" title={invalidation}>
              {invalidation}
            </span>
          </div>
        </div>

        {/* Positive & Negative Factors */}
        <div className="pt-3 space-y-2 text-xs">
          <div>
            <div className="text-[10px] font-mono text-sigma-green font-bold mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>CONFIRMING POSITIVE FACTORS</span>
            </div>
            <ul className="text-[11px] text-sigma-textMuted space-y-1 list-disc list-inside">
              <li>Spot CVD positive accumulation (+$142M net taker balance)</li>
              <li>Funding reset to +0.008% baseline with organic OI expansion</li>
              <li>4H price structure intact above 20 EMA and $77,920 support</li>
            </ul>
          </div>
          <div>
            <div className="text-[10px] font-mono text-sigma-red font-bold mb-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>KEY NEGATIVE FACTORS & RISKS</span>
            </div>
            <ul className="text-[11px] text-sigma-textMuted space-y-1 list-disc list-inside">
              <li>Overhead resistance wall clustered between $80,000 and $80,500</li>
              <li>Upcoming FOMC rate volatility window in 3 days</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-3 bg-sigma-surface2 border-t border-sigma-border flex items-center justify-between">
        <div className="text-[10px] font-mono text-sigma-textDark">
          <span>MODEL: SIGMA-4H-ENSEMBLE-v1.7</span>
        </div>
        <button
          onClick={handleQuickExecute}
          disabled={isBlocked}
          className={`px-4 py-2 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md ${
            isLong
              ? 'bg-sigma-green text-black hover:bg-sigma-green/90'
              : isShort
              ? 'bg-sigma-red text-white hover:bg-sigma-red/90'
              : 'bg-sigma-surface3 text-sigma-textMuted cursor-not-allowed'
          }`}
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>EXECUTE {isLong ? 'LONG' : isShort ? 'SHORT' : 'PAPER'} (0.25 BTC)</span>
        </button>
      </div>
    </div>
  );
};
