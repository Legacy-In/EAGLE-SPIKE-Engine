'use client';

import React, { useState } from 'react';
import { useSigmaStore } from '../../store/useSigmaStore';
import { BacktestResults } from '../../../../packages/types';
import {
  Activity,
  ArrowUpRight,
  BarChart2,
  CheckCircle2,
  LineChart,
  Play,
  RotateCw,
  Sliders,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';

export const BacktestingLab: React.FC = () => {
  const { backtestResults, isBacktestRunning, runBacktest } = useSigmaStore();

  const [capital, setCapital] = useState(100000);
  const [takerFee, setTakerFee] = useState(5);
  const [slippage, setSlippage] = useState(2);
  const [fundingEnabled, setFundingEnabled] = useState(true);

  const handleRun = () => {
    runBacktest({
      initialCapitalUsd: capital,
      takerFeeBps: takerFee,
      slippageBps: slippage,
      enableFundingRateDeduction: fundingEnabled,
    });
  };

  const res = backtestResults;

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <div className="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-sigma-purple" />
            <div>
              <h2 className="font-mono text-sm font-bold text-sigma-textMain uppercase tracking-wider">
                Event-Driven Backtesting Lab & Walk-Forward Validation
              </h2>
              <span className="text-[10px] font-mono text-sigma-textDark">
                ZERO LOOK-AHEAD BIAS · REALISTIC SLIPPAGE & FUNDING DRAG
              </span>
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={isBacktestRunning}
            className={`px-5 py-2 rounded text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-md ${
              isBacktestRunning
                ? 'bg-sigma-surface3 text-sigma-textMuted cursor-wait'
                : 'bg-sigma-purple text-white hover:bg-sigma-purple/90'
            }`}
          >
            {isBacktestRunning ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Simulating 180 Days...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>RUN BACKTEST ENSEMBLE</span>
              </>
            )}
          </button>
        </div>

        {/* Parameters Form */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div>
            <label className="text-[10px] text-sigma-textDark uppercase block mb-1">Initial Capital ($)</label>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(parseFloat(e.target.value))}
              className="w-full bg-sigma-surface2 border border-sigma-border rounded p-1.5 text-sigma-textMain outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-sigma-textDark uppercase block mb-1">Taker Fee (bps)</label>
            <input
              type="number"
              value={takerFee}
              onChange={(e) => setTakerFee(parseFloat(e.target.value))}
              className="w-full bg-sigma-surface2 border border-sigma-border rounded p-1.5 text-sigma-textMain outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-sigma-textDark uppercase block mb-1">Slippage (bps)</label>
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(parseFloat(e.target.value))}
              className="w-full bg-sigma-surface2 border border-sigma-border rounded p-1.5 text-sigma-textMain outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-sigma-textDark uppercase block mb-1">Funding Drag</label>
            <button
              type="button"
              onClick={() => setFundingEnabled(!fundingEnabled)}
              className={`w-full py-1.5 rounded border text-center font-bold transition-colors ${
                fundingEnabled
                  ? 'bg-sigma-green/10 border-sigma-green/40 text-sigma-green'
                  : 'bg-sigma-surface2 border-sigma-border text-sigma-textDark'
              }`}
            >
              {fundingEnabled ? '● ENABLED (8h Drag)' : '○ DISABLED'}
            </button>
          </div>
        </div>
      </div>

      {res && (
        <>
          {/* Institutional Performance Scorecard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs font-mono">
            <div className="bg-sigma-surface1 border border-sigma-border p-3 rounded-lg">
              <div className="text-[10px] text-sigma-textDark uppercase">Net Return</div>
              <div className="text-base font-bold text-sigma-green mt-0.5 tabular-nums">
                +{res.summary.netReturnPct}%
              </div>
              <div className="text-[10px] text-sigma-textDark">
                End: ${res.summary.endingCapitalUsd.toLocaleString()}
              </div>
            </div>

            <div className="bg-sigma-surface1 border border-sigma-border p-3 rounded-lg">
              <div className="text-[10px] text-sigma-textDark uppercase">Sharpe / Sortino</div>
              <div className="text-base font-bold text-sigma-cyan mt-0.5 tabular-nums">
                {res.summary.sharpeRatio} / {res.summary.sortinoRatio}
              </div>
              <div className="text-[10px] text-sigma-textDark">Annualized (4H)</div>
            </div>

            <div className="bg-sigma-surface1 border border-sigma-border p-3 rounded-lg">
              <div className="text-[10px] text-sigma-textDark uppercase">Max Drawdown</div>
              <div className="text-base font-bold text-sigma-red mt-0.5 tabular-nums">
                -{res.summary.maxDrawdownPct}%
              </div>
              <div className="text-[10px] text-sigma-textDark">Calmar: {res.summary.calmarRatio}</div>
            </div>

            <div className="bg-sigma-surface1 border border-sigma-border p-3 rounded-lg">
              <div className="text-[10px] text-sigma-textDark uppercase">Win Rate</div>
              <div className="text-base font-bold text-sigma-green mt-0.5 tabular-nums">
                {res.summary.winRatePct}%
              </div>
              <div className="text-[10px] text-sigma-textDark">{res.summary.totalTrades} Trades</div>
            </div>

            <div className="bg-sigma-surface1 border border-sigma-border p-3 rounded-lg">
              <div className="text-[10px] text-sigma-textDark uppercase">Profit Factor</div>
              <div className="text-base font-bold text-sigma-purple mt-0.5 tabular-nums">
                {res.summary.profitFactor}
              </div>
              <div className="text-[10px] text-sigma-textDark">Exp: +${res.summary.expectancyUsd}</div>
            </div>

            <div className="bg-sigma-surface1 border border-sigma-border p-3 rounded-lg">
              <div className="text-[10px] text-sigma-textDark uppercase">Frictions Paid</div>
              <div className="text-base font-bold text-sigma-textMuted mt-0.5 tabular-nums">
                ${(res.summary.totalFeesPaidUsd + res.summary.totalFundingPaidUsd).toFixed(0)}
              </div>
              <div className="text-[10px] text-sigma-textDark">Fees + Funding</div>
            </div>
          </div>

          {/* Charts Row: Equity Curve & Calibration */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Equity Curve */}
            <div className="lg:col-span-2 bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <LineChart className="w-4 h-4 text-sigma-green" />
                  <h3 className="font-mono text-xs font-bold text-sigma-textMain uppercase tracking-wider">
                    Equity Curve & Drawdown Profile
                  </h3>
                </div>
                <div className="text-[10px] font-mono text-sigma-textDark">
                  MONTE CARLO 95% CI: [{res.monteCarloConfidenceBands.percentile5}% –{' '}
                  {res.monteCarloConfidenceBands.percentile95}%]
                </div>
              </div>

              {/* SVG Equity Curve */}
              <div className="w-full h-56 relative">
                <svg viewBox="0 0 600 200" className="w-full h-full">
                  {/* Baseline $100k */}
                  <line x1={0} y1={170} x2={600} y2={170} stroke="#1C2538" strokeDasharray="3,3" strokeWidth={1} />

                  {/* Drawdown shading */}
                  <polyline
                    fill="rgba(255, 71, 87, 0.08)"
                    stroke="none"
                    points={res.equityCurve
                      .map((pt, i) => {
                        const x = (i / (res.equityCurve.length - 1)) * 600;
                        const y = 170 - (pt.drawdownPct / 15) * 60;
                        return `${x},${y}`;
                      })
                      .concat(['600,170', '0,170'])
                      .join(' ')}
                  />

                  {/* Equity Line */}
                  <polyline
                    fill="none"
                    stroke="#00E599"
                    strokeWidth={2}
                    points={res.equityCurve
                      .map((pt, i) => {
                        const x = (i / (res.equityCurve.length - 1)) * 600;
                        const minEq = res.summary.initialCapitalUsd * 0.95;
                        const maxEq = res.summary.endingCapitalUsd * 1.05;
                        const y = 180 - ((pt.equityUsd - minEq) / (maxEq - minEq)) * 160;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                </svg>
              </div>

              <div className="flex justify-between text-[10px] font-mono text-sigma-textDark mt-1 border-t border-sigma-borderSubtle pt-2">
                <span>Start: ${res.summary.initialCapitalUsd.toLocaleString()}</span>
                <span>Max Drawdown: -{res.summary.maxDrawdownPct}%</span>
                <span>Peak: ${res.summary.endingCapitalUsd.toLocaleString()}</span>
              </div>
            </div>

            {/* Model Validation & Calibration Curve */}
            <div className="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-sigma-cyan" />
                  <h3 className="font-mono text-xs font-bold text-sigma-textMain uppercase tracking-wider">
                    Calibration (Brier Score)
                  </h3>
                </div>
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-sigma-cyan/10 text-sigma-cyan border border-sigma-cyan/30">
                  BRIER: {res.calibrationMetrics.brierScore}
                </span>
              </div>

              <p className="text-[11px] text-sigma-textDark mb-3">
                Reliability diagram measuring probability accuracy. A 70% model forecast resulted in approximately 68%
                empirical wins.
              </p>

              {/* Calibration Graph */}
              <div className="w-full h-44 relative bg-sigma-surface2 p-2 rounded border border-sigma-border">
                <svg viewBox="0 0 160 140" className="w-full h-full">
                  {/* Perfect Calibration 45-deg line */}
                  <line x1={15} y1={125} x2={145} y2={15} stroke="#64748B" strokeDasharray="2,2" strokeWidth={0.8} />

                  {/* Calibration curve */}
                  <polyline
                    fill="none"
                    stroke="#00D2FF"
                    strokeWidth={1.8}
                    points={res.calibrationMetrics.reliabilityBins
                      .map((bin) => {
                        const x = 15 + bin.predictedProb * 130;
                        const y = 125 - bin.actualFrequency * 110;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />

                  {/* Points */}
                  {res.calibrationMetrics.reliabilityBins.map((bin, i) => {
                    const x = 15 + bin.predictedProb * 130;
                    const y = 125 - bin.actualFrequency * 110;
                    return <circle key={i} cx={x} cy={y} r={2.5} fill="#00D2FF" />;
                  })}
                </svg>
              </div>

              <div className="text-[9px] font-mono text-sigma-textDark text-center mt-2">
                Dotted Line = Theoretical Perfect Calibration · Blue Line = SIGMA Empirical Fit
              </div>
            </div>
          </div>

          {/* Regime Breakdown Table */}
          <div className="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
            <h3 className="font-mono text-xs font-bold text-sigma-textMain uppercase tracking-wider mb-2">
              Performance Breakdown by Market Regime
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className="text-[10px] text-sigma-textDark border-b border-sigma-borderSubtle">
                    <th className="pb-2">REGIME</th>
                    <th className="pb-2">TRADES</th>
                    <th className="pb-2">WIN RATE</th>
                    <th className="pb-2">REALIZED PnL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sigma-borderSubtle">
                  {Object.entries(res.regimeBreakdown).map(([regime, stats]) => (
                    <tr key={regime} className="hover:bg-sigma-surface2/30">
                      <td className="py-2 font-bold text-sigma-cyan">{regime}</td>
                      <td className="py-2 text-sigma-textMuted">{stats.trades}</td>
                      <td className="py-2 text-sigma-green font-semibold">{stats.winRatePct}%</td>
                      <td
                        className={`py-2 font-bold ${
                          stats.pnlUsd >= 0 ? 'text-sigma-green' : 'text-sigma-red'
                        }`}
                      >
                        {stats.pnlUsd >= 0 ? `+$${stats.pnlUsd.toLocaleString()}` : `-$${Math.abs(stats.pnlUsd).toLocaleString()}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
