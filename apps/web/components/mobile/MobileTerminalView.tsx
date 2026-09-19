'use client';

import React, { useState } from 'react';
import { useSigmaStore } from '../../store/useSigmaStore';
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Bot,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  Shield,
  Target,
  Zap,
} from 'lucide-react';

export const MobileTerminalView: React.FC = () => {
  const { data, submitOrder } = useSigmaStore();
  const [openSection, setOpenSection] = useState<'DETAILS' | 'ORDERFLOW' | 'DERIVATIVES' | null>('DETAILS');

  const price = data?.market?.price || 79073.06;
  const change24h = data?.market?.change24hPct || 2.41;
  const signal = data?.signal;
  const regime = data?.regime;
  const aiBrief = data?.aiBrief;
  const of = data?.market?.orderFlow;
  const deriv = data?.derivatives;

  const decision = signal?.decisionLabel || 'LONG';
  const confidence = signal?.modelConfidence || 78;
  const dataQuality = signal?.dataQuality || 96;
  const isLong = decision.includes('LONG');
  const isShort = decision.includes('SHORT');

  const toggleSection = (section: 'DETAILS' | 'ORDERFLOW' | 'DERIVATIVES') => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleExecute = () => {
    submitOrder({
      symbol: 'BTCUSDT',
      side: isLong ? 'BUY' : 'SELL',
      type: 'MARKET',
      amountBtc: 0.1,
      price,
      stopPrice: signal?.stopLossPrice,
    });
  };

  return (
    <div className="md:hidden space-y-3 pb-16">
      {/* 1. Large BTC Price Strip */}
      <div className="bg-sigma-surface1 border border-sigma-border rounded-lg p-3">
        <div className="flex justify-between items-center text-[10px] font-mono text-sigma-textDark mb-1">
          <span>BTC/USDT COMPOSITE</span>
          <span className="text-sigma-green font-bold">LIVE (65ms)</span>
        </div>
        <div className="flex items-baseline justify-between">
          <div className="font-mono text-3xl font-bold tracking-tight text-sigma-textMain tabular-nums">
            ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div
            className={`font-mono text-sm font-bold tabular-nums ${
              change24h >= 0 ? 'text-sigma-green' : 'text-sigma-red'
            }`}
          >
            {change24h >= 0 ? `+${change24h}%` : `${change24h}%`}
          </div>
        </div>
      </div>

      {/* 2 & 3. BUY/SELL Decision & Confidence Card */}
      <div className="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg border ${
                isLong
                  ? 'bg-sigma-green/15 text-sigma-green border-sigma-green'
                  : isShort
                  ? 'bg-sigma-red/15 text-sigma-red border-sigma-red'
                  : 'bg-sigma-amber/15 text-sigma-amber border-sigma-amber'
              }`}
            >
              {isLong ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
            </div>
            <div>
              <div
                className={`font-mono text-xl font-black ${
                  isLong ? 'text-sigma-green' : isShort ? 'text-sigma-red' : 'text-sigma-amber'
                }`}
              >
                {decision}
              </div>
              <div className="text-[10px] font-mono text-sigma-textDark uppercase">
                {regime?.regimeLabel || 'BULLISH RECOVERY'}
              </div>
            </div>
          </div>

          <div className="text-right font-mono">
            <span className="text-[10px] text-sigma-textDark block">MODEL CONFIDENCE</span>
            <span className="text-base font-bold text-sigma-cyan">{confidence}%</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-sigma-surface3 h-2 rounded-full overflow-hidden flex border border-sigma-border mb-3">
          <div
            className={`h-full ${isLong ? 'bg-sigma-green' : 'bg-sigma-red'}`}
            style={{ width: `${confidence}%` }}
          />
        </div>

        {/* 4. AI Market Explanation */}
        {aiBrief && (
          <div className="bg-sigma-surface2 p-3 rounded border border-sigma-border text-xs font-mono mb-3">
            <div className="flex items-center gap-1.5 text-sigma-cyan font-bold text-[10px] mb-1">
              <Bot className="w-3.5 h-3.5" />
              <span>AI QUANT BRIEF</span>
            </div>
            <p className="text-sigma-textMuted text-[11px] leading-relaxed mb-2">{aiBrief.whyMarketIsBehaving}</p>
            <div className="text-[10px] text-sigma-amber border-t border-sigma-borderSubtle pt-1.5">
              Invalidation: {signal?.invalidationCondition}
            </div>
          </div>
        )}

        {/* 5. Entry, Stop, TP1, TP2, TP3 Matrix */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
          <div className="bg-sigma-surface2 p-2 rounded border border-sigma-border">
            <span className="text-[9px] text-sigma-textDark block uppercase">Entry Zone</span>
            <span className="font-bold text-sigma-textMain text-[11px]">
              ${signal?.entryZone?.[0]?.toLocaleString()} - ${signal?.entryZone?.[1]?.toLocaleString()}
            </span>
          </div>
          <div className="bg-sigma-surface2 p-2 rounded border border-sigma-border">
            <span className="text-[9px] text-sigma-textDark block uppercase">Stop Loss</span>
            <span className="font-bold text-sigma-red text-[11px]">${signal?.stopLossPrice?.toLocaleString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center text-xs font-mono mb-3">
          <div className="bg-sigma-surface2 p-1.5 rounded border border-sigma-border">
            <span className="text-[9px] text-sigma-textDark block">TP 1</span>
            <span className="font-bold text-sigma-green text-[11px]">${signal?.target1?.toLocaleString()}</span>
          </div>
          <div className="bg-sigma-surface2 p-1.5 rounded border border-sigma-border">
            <span className="text-[9px] text-sigma-textDark block">TP 2</span>
            <span className="font-bold text-sigma-green text-[11px]">${signal?.target2?.toLocaleString()}</span>
          </div>
          <div className="bg-sigma-surface2 p-1.5 rounded border border-sigma-border">
            <span className="text-[9px] text-sigma-textDark block">TP 3</span>
            <span className="font-bold text-sigma-green text-[11px]">${signal?.target3?.toLocaleString()}</span>
          </div>
        </div>

        {/* Quick Execute Button */}
        <button
          onClick={handleExecute}
          className={`w-full py-2.5 rounded font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg ${
            isLong
              ? 'bg-sigma-green text-black hover:bg-sigma-green/90'
              : 'bg-sigma-red text-white hover:bg-sigma-red/90'
          }`}
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>EXECUTE {isLong ? 'LONG' : 'SHORT'} (0.10 BTC)</span>
        </button>
      </div>

      {/* 6. Order Flow Collapsible Section */}
      <div className="bg-sigma-surface1 border border-sigma-border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('ORDERFLOW')}
          className="w-full p-3 flex items-center justify-between font-mono text-xs font-bold text-sigma-textMain bg-sigma-surface2/50"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-sigma-green" />
            <span>ORDER FLOW & DELTA ({of?.buyersPct || 54.2}% BUYERS)</span>
          </div>
          {openSection === 'ORDERFLOW' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSection === 'ORDERFLOW' && (
          <div className="p-3 space-y-2.5 text-xs font-mono">
            {/* Visual Bar */}
            <div className="w-full h-3 bg-sigma-surface3 rounded overflow-hidden flex border border-sigma-border">
              <div className="h-full bg-sigma-green" style={{ width: `${of?.buyersPct || 54.2}%` }} />
              <div className="h-full bg-sigma-red" style={{ width: `${of?.sellersPct || 45.8}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-sigma-surface2 p-2 rounded">
                <span className="text-sigma-textDark block text-[10px]">Spot Delta</span>
                <span className="font-bold text-sigma-green">+${((of?.spotDeltaNotional || 142e6) / 1e6).toFixed(1)}M</span>
              </div>
              <div className="bg-sigma-surface2 p-2 rounded">
                <span className="text-sigma-textDark block text-[10px]">Perp Delta</span>
                <span className="font-bold text-sigma-cyan">+${((of?.perpDeltaNotional || 31e6) / 1e6).toFixed(1)}M</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 7. Derivatives Collapsible Section */}
      <div className="bg-sigma-surface1 border border-sigma-border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('DERIVATIVES')}
          className="w-full p-3 flex items-center justify-between font-mono text-xs font-bold text-sigma-textMain bg-sigma-surface2/50"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sigma-purple" />
            <span>DERIVATIVES & FUNDING (+0.008%)</span>
          </div>
          {openSection === 'DERIVATIVES' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSection === 'DERIVATIVES' && (
          <div className="p-3 space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-sigma-borderSubtle">
              <span className="text-sigma-textMuted">8h Funding Rate:</span>
              <span className="text-sigma-green font-bold">+0.008% (8.76% Ann.)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-sigma-borderSubtle">
              <span className="text-sigma-textMuted">Open Interest:</span>
              <span className="text-sigma-textMain font-bold">
                ${((deriv?.openInterestUsd || 18.45e9) / 1e9).toFixed(2)}B (+4.2%)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-sigma-borderSubtle">
              <span className="text-sigma-textMuted">24h Liquidations:</span>
              <span className="text-sigma-red font-bold">$60.0M ($42M Longs / $18M Shorts)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
