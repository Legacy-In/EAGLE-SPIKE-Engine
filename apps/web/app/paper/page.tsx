import { Metadata } from 'next';
import { PaperTradingPanel } from '../../components/paper/PaperTradingPanel';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Paper Trading & Virtual Execution Sandbox | Eagle Flash',
  description: 'Isolated $100 virtual capital execution engine for live market signals with deterministic TP/SL resolutions.'
};

export default function PaperTradingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-5 lg:p-6 max-w-[1720px] mx-auto space-y-4 font-mono">
      {/* Top Bar Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 text-xs">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Back to Eagle Flash Terminal</span>
        </Link>

        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Paper Sandbox Mode Active · $0 Real Risk</span>
        </div>
      </div>

      {/* Main Sandbox Component */}
      <PaperTradingPanel />

      {/* Footer Info Strip */}
      <footer className="pt-2 border-t border-slate-900 text-slate-500 text-[10px] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span>EAGLE FLASH PAPER TRADING ENGINE</span>
          <span>·</span>
          <span>DISCORD CHANNEL: #paper-trades</span>
          <span>·</span>
          <span className="text-cyan-400">VIRTUAL MARGIN: $100.00 / ORDER</span>
        </div>
        <div>
          ISOLATED ENVIRONMENT · ZERO REAL CAPITAL AT RISK
        </div>
      </footer>
    </main>
  );
}
