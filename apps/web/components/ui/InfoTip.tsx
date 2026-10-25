'use client';

import React, { useState } from 'react';
import { BottomSheet } from './BottomSheet';

export const GLOSSARY: Record<string, { title: string; explanation: string; formula: string }> = {
  RVOL: {
    title: 'RVOL (Relative Volume)',
    explanation: 'Measures current candle trading volume divided by the rolling 48-candle median volume. A ratio >= 1.5x indicates volume expansion.',
    formula: 'RVOL = Current Volume / Median(48 Volume Bars)',
  },
  ADX: {
    title: 'ADX (Average Directional Index)',
    explanation: 'Measures trend strength regardless of direction. Values >= 20 confirm that the market is in an active directional trend rather than ranging chop.',
    formula: 'ADX = 14-period Wilder RMA of DX (|DI+ - DI-| / |DI+ + DI-|)',
  },
  QQE: {
    title: 'QQE (Quantitative Qualitative Estimation)',
    explanation: 'A volatility-adaptive momentum oscillator. Compares smoothed RSI (14, smooth 5) against a Wilder ATR trailing band (factor 4.236).',
    formula: 'Fast RSI-MA vs Dynamic Trailing Volatility Band',
  },
  OI: {
    title: 'Open Interest Delta (OI × Price)',
    explanation: 'Evaluates net new institutional capital entering the market. Rising OI alongside rising price confirms new aggressive long leverage.',
    formula: 'OI Delta = (OI_now - OI_prev) / OI_prev * 100',
  },
  RMULTIPLE: {
    title: 'R-Multiple (Risk:Reward Ratio)',
    explanation: 'Normalizes trade performance by initial capital risked (1R = 1 unit of risk). A 2R gain means you won twice the amount risked on the stop loss.',
    formula: 'R = Realized PnL / (Entry Price - Stop Loss Price * Position Size)',
  },
};

export function InfoTip({
  term,
  label,
}: {
  term: keyof typeof GLOSSARY;
  label?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const entry = GLOSSARY[term];

  if (!entry) return <span>{label || term}</span>;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="inline-flex items-center gap-1 text-[#9AA6B5] hover:text-[#38BDF8] transition-colors underline decoration-dotted underline-offset-2"
        title={`Click for ${entry.title} explanation`}
      >
        <span>{label || term}</span>
        <span className="text-[10px] text-[#38BDF8]">ⓘ</span>
      </button>

      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={entry.title}
      >
        <div className="space-y-3">
          <p className="text-sm text-[#E8ECF2] leading-relaxed">
            {entry.explanation}
          </p>
          <div className="rounded-lg border border-[#232A35] bg-[#11151C] p-3 font-mono text-xs text-[#38BDF8]">
            <span className="text-[#9AA6B5] block mb-1">Computation / Rule:</span>
            {entry.formula}
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
