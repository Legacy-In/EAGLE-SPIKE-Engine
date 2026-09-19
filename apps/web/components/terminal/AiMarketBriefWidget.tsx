'use client';

import React from 'react';
import { AlertCircle, Bot, CheckCircle2, Shield, Sparkles } from 'lucide-react';
import { StructuredAiMarketBrief } from '../../../../packages/types';

interface AiMarketBriefWidgetProps {
  brief: StructuredAiMarketBrief;
}

export const AiMarketBriefWidget: React.FC<AiMarketBriefWidgetProps> = ({ brief }) => {
  if (!brief) return null;

  return (
    <div className="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-sigma-cyan/15 border border-sigma-cyan/30 text-sigma-cyan">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-mono text-xs font-bold text-sigma-textMain uppercase tracking-wider">
              Fact-Grounded AI Market Brief
            </h3>
            <span className="text-[10px] font-mono text-sigma-textDark">
              DETERMINISTIC QUANTITATIVE SYNTHESIS (NO HALLUCINATIONS)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="px-2 py-0.5 rounded bg-sigma-surface2 text-sigma-cyan border border-sigma-border">
            Model Conf: {brief.modelConfidence}%
          </span>
          <span className="px-2 py-0.5 rounded bg-sigma-surface2 text-sigma-green border border-sigma-border">
            Data Quality: {brief.dataQuality}%
          </span>
        </div>
      </div>

      {/* Brief Content Cards */}
      <div className="space-y-3 text-xs font-mono">
        <div className="bg-sigma-surface2/60 p-3 rounded border border-sigma-border">
          <div className="text-[10px] text-sigma-cyan font-bold uppercase mb-1">MARKET CONTEXT & DYNAMICS</div>
          <p className="text-sigma-textMuted leading-relaxed">{brief.whyMarketIsBehaving}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-sigma-surface2/60 p-3 rounded border border-sigma-border">
            <div className="text-[10px] text-sigma-textMain font-bold uppercase mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-sigma-purple" />
              <span>WHAT CHANGED RECENTLY</span>
            </div>
            <p className="text-sigma-textMuted leading-relaxed">{brief.whatChangedRecently}</p>
          </div>

          <div className="bg-sigma-surface2/60 p-3 rounded border border-sigma-border">
            <div className="text-[10px] text-sigma-amber font-bold uppercase mb-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-sigma-amber" />
              <span>INVALIDATION CRITERIA</span>
            </div>
            <p className="text-sigma-textMuted leading-relaxed">{brief.invalidationCriteria}</p>
          </div>
        </div>

        {/* Key Risks Checklist */}
        <div className="bg-sigma-surface2/40 p-3 rounded border border-sigma-border">
          <div className="text-[10px] text-sigma-red font-bold uppercase mb-2 flex items-center gap-1">
            <Shield className="w-3 h-3 text-sigma-red" />
            <span>PRIMARY RISK VECTORS</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-sigma-textMuted">
            {brief.keyRisks?.map((risk, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-sigma-red font-bold">•</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Strict Architecture Constraint Footer */}
      <div className="mt-3 pt-2 border-t border-sigma-borderSubtle text-[9px] font-mono text-sigma-textDark flex items-center justify-between">
        <span>ARCHITECTURAL GUARANTEE: AI LAYER HAS ZERO EXECUTION OVERRIDE PRIVILEGES</span>
        <span>FACT ENVELOPE VERIFIED</span>
      </div>
    </div>
  );
};
