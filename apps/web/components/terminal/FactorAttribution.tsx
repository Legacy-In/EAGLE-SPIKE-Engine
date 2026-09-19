'use client';

import React from 'react';
import { HelpCircle, Layers, TrendingDown, TrendingUp } from 'lucide-react';

interface FactorAttributionProps {
  attribution: any[];
  compositeScore: number;
}

export const FactorAttribution: React.FC<FactorAttributionProps> = ({ attribution = [], compositeScore = 62 }) => {
  return (
    <div className="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sigma-cyan" />
          <h3 className="font-mono text-xs font-bold text-sigma-textMain uppercase tracking-wider">
            Factor Attribution & Weights
          </h3>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-sigma-textDark text-[11px]">NET ENSEMBLE:</span>
          <span className="font-bold text-sigma-green px-1.5 py-0.5 rounded bg-sigma-green/10 border border-sigma-green/30">
            +{compositeScore} / 100
          </span>
        </div>
      </div>

      <p className="text-[11px] text-sigma-textDark mb-3">
        Orthogonal multi-factor decomposition. Individual factor scores are computed prior to linear ensemble weighting
        to eliminate collinearity.
      </p>

      {/* Factor Rows */}
      <div className="space-y-2.5">
        {attribution.map((item, idx) => {
          const isPos = item.score >= 0;
          const absVal = Math.min(100, Math.abs(item.score) * 4); // Scaled for visual representation

          return (
            <div key={idx} className="group">
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sigma-textMuted group-hover:text-sigma-textMain transition-colors">
                    {item.factor}
                  </span>
                  <span className="text-[10px] text-sigma-textDark">({item.weightPct}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-sigma-textDark hidden sm:inline truncate max-w-[240px]">
                    {item.summary}
                  </span>
                  <span
                    className={`font-bold tabular-nums ${
                      isPos ? 'text-sigma-green' : 'text-sigma-red'
                    }`}
                  >
                    {isPos ? `+${item.score}` : item.score}
                  </span>
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full h-1.5 bg-sigma-surface3 rounded-full overflow-hidden flex">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isPos ? 'bg-sigma-green' : 'bg-sigma-red'
                  }`}
                  style={{ width: `${Math.max(5, absVal)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
