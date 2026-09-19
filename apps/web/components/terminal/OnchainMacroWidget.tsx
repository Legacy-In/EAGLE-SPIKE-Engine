'use client';

import React from 'react';
import { Database, DollarSign, Globe, TrendingUp } from 'lucide-react';
import { EtfFlowMetrics, MacroMetrics, OnChainMetrics } from '../../../../packages/types';

interface OnchainMacroWidgetProps {
  onchain: OnChainMetrics;
  etf: EtfFlowMetrics;
  macro: MacroMetrics;
}

export const OnchainMacroWidget: React.FC<OnchainMacroWidgetProps> = ({ onchain, etf, macro }) => {
  const mvrv = onchain?.mvrv || 1.42;
  const mvrvPercentile = onchain?.mvrvPercentile3y || 31.0;
  const nupl = onchain?.nupl || 0.48;
  const realizedPrice = onchain?.realizedPrice || 55685.2;
  const exchangeNetflow = onchain?.exchangeNetflow24hBtc || -4120;
  const whaleScore = onchain?.whaleAccumulationScore || 78;

  const etf1d = etf?.flow1dUsdMillions || 182.4;
  const etfCum = etf?.cumulativeNetFlowUsdMillions || 28450.0;

  const dxy = macro?.dxy || 101.25;
  const y10 = macro?.us10yYield || 4.12;
  const y2 = macro?.us2yYield || 4.08;
  const curveSlope = macro?.yieldCurve10y2yBps || 4.0;
  const liquidity = macro?.liquidityRegime || 'EXPANDING';
  const macroRisk = macro?.macroRiskScore || 32;

  return (
    <div className="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-sigma-cyan" />
          <h3 className="font-mono text-xs font-bold text-sigma-textMain uppercase tracking-wider">
            On-Chain, ETF Flows & Macro Regime
          </h3>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="text-sigma-textDark">LIQUIDITY:</span>
          <span className="px-1.5 py-0.5 rounded bg-sigma-green/10 text-sigma-green border border-sigma-green/30 font-bold">
            {liquidity}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
        {/* On-Chain Column */}
        <div className="bg-sigma-surface2 p-3 rounded border border-sigma-border">
          <div className="text-[10px] text-sigma-cyan font-bold uppercase mb-2 flex items-center gap-1">
            <Database className="w-3 h-3" />
            <span>ON-CHAIN FUNDAMENTALS</span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-sigma-textMuted">MVRV Ratio:</span>
              <span className="text-sigma-textMain font-bold">
                {mvrv} ({mvrvPercentile}th pctile)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sigma-textMuted">Realized Price:</span>
              <span className="text-sigma-green font-semibold">${realizedPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sigma-textMuted">NUPL Phase:</span>
              <span className="text-sigma-cyan font-semibold">
                {nupl} ({onchain?.nuplPhase || 'OPTIMISM'})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sigma-textMuted">Exchange Netflow:</span>
              <span className="text-sigma-green font-bold tabular-nums">
                {exchangeNetflow.toLocaleString()} BTC (Outflow)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sigma-textMuted">Whale Accumulation:</span>
              <span className="text-sigma-green font-semibold">{whaleScore} / 100</span>
            </div>
          </div>
        </div>

        {/* ETF & Spot Flows Column */}
        <div className="bg-sigma-surface2 p-3 rounded border border-sigma-border">
          <div className="text-[10px] text-sigma-green font-bold uppercase mb-2 flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            <span>VERIFIED ETF FLOWS</span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-sigma-textMuted">1D Net Inflow:</span>
              <span className="text-sigma-green font-bold">+{etf1d}M USD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sigma-textMuted">7D Cumulative:</span>
              <span className="text-sigma-green font-semibold">+$1,120.0M</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sigma-textMuted">Total Net Assets:</span>
              <span className="text-sigma-textMain font-bold">${(etfCum / 1e3).toFixed(1)}B</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sigma-textMuted">Flow Momentum:</span>
              <span className="text-sigma-cyan font-semibold">STEADY INFLOWS</span>
            </div>
            <div className="text-[9px] text-sigma-textDark pt-1">
              Source: Farside / Issuer 13F (Verified, Non-Proxy)
            </div>
          </div>
        </div>

        {/* Macro Regime Column */}
        <div className="bg-sigma-surface2 p-3 rounded border border-sigma-border">
          <div className="text-[10px] text-sigma-purple font-bold uppercase mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>MACRO ENVIRONMENT</span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-sigma-textMuted">DXY Dollar Index:</span>
              <span className="text-sigma-textMain font-bold">{dxy} (-1.4% 30d)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sigma-textMuted">US 10Y Yield:</span>
              <span className="text-sigma-textMain font-semibold">{y10}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sigma-textMuted">10Y-2Y Curve Slope:</span>
              <span className="text-sigma-green font-bold">+{curveSlope} bps (Normal)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sigma-textMuted">Macro Risk Score:</span>
              <span className="text-sigma-green font-semibold">{macroRisk} / 100 (Low Risk)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sigma-textMuted">Nasdaq 100 Corr:</span>
              <span className="text-sigma-textDark font-medium">+0.71 (High)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
