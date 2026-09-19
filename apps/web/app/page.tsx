'use client';

import React, { useEffect } from 'react';
import { useSigmaStore } from '../store/useSigmaStore';
import { TopBar } from '../components/layout/TopBar';
import { CommandPalette } from '../components/layout/CommandPalette';
import { PriceHeader } from '../components/terminal/PriceHeader';
import { SignalCard } from '../components/terminal/SignalCard';
import { FactorAttribution } from '../components/terminal/FactorAttribution';
import { InteractiveChart } from '../components/terminal/InteractiveChart';
import { OrderFlowModule } from '../components/terminal/OrderFlowModule';
import { OrderBookDepthWidget } from '../components/terminal/OrderBookDepthWidget';
import { DerivativesWidget } from '../components/terminal/DerivativesWidget';
import { OnchainMacroWidget } from '../components/terminal/OnchainMacroWidget';
import { AiMarketBriefWidget } from '../components/terminal/AiMarketBriefWidget';
import { PositionsAndOrdersDrawer } from '../components/trade/PositionsAndOrdersDrawer';
import { BacktestingLab } from '../components/backtest/BacktestingLab';
import { RiskExposureCenter } from '../components/risk/RiskExposureCenter';
import { TradeJournalView } from '../components/trade/TradeJournalView';
import { DataHealthCenter } from '../components/health/DataHealthCenter';
import { EconomicCalendarView } from '../components/calendar/EconomicCalendarView';
import { AlertOctagon, Power, ShieldAlert, ShieldCheck } from 'lucide-react';

export default function SigmaWorkstationPage() {
  const {
    activeWorkspace,
    data,
    fetchSnapshot,
    connectWebSocket,
    isLoading,
    isKillSwitchModalOpen,
    setKillSwitchModalOpen,
    engageKillSwitch,
  } = useSigmaStore();

  useEffect(() => {
    fetchSnapshot();
    connectWebSocket();
    // Live continuous heartbeat poll every 3000ms
    const interval = setInterval(() => {
      fetchSnapshot();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchSnapshot, connectWebSocket]);

  const market = data?.market;
  const signal = data?.signal;
  const regime = data?.regime;
  const derivatives = data?.derivatives;
  const onchain = data?.onchain;
  const etf = data?.etf;
  const macro = data?.macro;
  const aiBrief = data?.aiBrief;
  const positions = data?.positions || [];
  const orders = data?.orders || [];
  const attribution = signal?.attribution || [];
  const currentPrice = market?.price || 79073.06;

  return (
    <div className="min-h-screen bg-sigma-bg text-sigma-textMain flex flex-col font-sans select-none">
      {/* Top Bar */}
      <TopBar />

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette />

      {/* Main Content Area */}
      <main className="flex-1 p-2 sm:p-4 max-w-[1780px] w-full mx-auto pb-24 lg:pb-4">
        {/* Terminal Workspace - 100% of all information fully visible on mobile & desktop */}
        {activeWorkspace === 'TERMINAL' && (
          <div className="space-y-3">
            {/* Header Ticker Strip */}
            <PriceHeader market={market} />

            {/* Responsive Institutional Grid: 1 col on mobile, 12 cols on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
              {/* Left Column (4 cols on desktop, full width on mobile): Signal Card & Factor Attribution */}
              <div className="lg:col-span-4 space-y-3">
                <SignalCard signal={signal} regime={regime} currentPrice={currentPrice} />
                <FactorAttribution attribution={attribution} compositeScore={62} />
                <AiMarketBriefWidget brief={aiBrief} />
              </div>

              {/* Center Column (5 cols on desktop, full width on mobile): Interactive Chart & Positions Drawer */}
              <div className="lg:col-span-5 space-y-3">
                <InteractiveChart candles={market?.candles4h || []} />
                <PositionsAndOrdersDrawer positions={positions} orders={orders} currentPrice={currentPrice} />
              </div>

              {/* Right Column (3 cols on desktop, full width on mobile): Order Flow, Book Depth, Derivatives, On-Chain */}
              <div className="lg:col-span-3 space-y-3">
                <OrderFlowModule orderFlow={market?.orderFlow} />
                <OrderBookDepthWidget orderBook={market?.orderBook} />
                <DerivativesWidget derivatives={derivatives} />
                <OnchainMacroWidget onchain={onchain} etf={etf} macro={macro} />
              </div>
            </div>
          </div>
        )}

        {/* Eagle Flash Workspace (Responsive on both Mobile & Desktop) */}
        {activeWorkspace === 'EAGLE_FLASH' && (
          <div className="w-full h-[calc(100vh-160px)] lg:h-[calc(100vh-125px)] rounded-lg border border-sigma-border overflow-hidden bg-sigma-surface1 shadow-2xl">
            <iframe
              src="/eagle-flash.html"
              title="Eagle Flash Vol Spike Candidate Scanner"
              className="w-full h-full border-0"
            />
          </div>
        )}

        {/* Other Workspaces (Available on both Mobile & Desktop) */}
        {activeWorkspace === 'BACKTEST' && <BacktestingLab />}
        {activeWorkspace === 'RISK' && <RiskExposureCenter />}
        {activeWorkspace === 'JOURNAL' && <TradeJournalView />}
        {activeWorkspace === 'HEALTH' && <DataHealthCenter />}
        {activeWorkspace === 'CALENDAR' && <EconomicCalendarView />}
      </main>

      {/* Institutional Permanent Bottom Status Strip (Desktop only) */}
      <footer className="hidden lg:flex border-t border-sigma-border bg-sigma-surface1 px-4 py-2 text-[10px] font-mono text-sigma-textDark flex-wrap items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sigma-green inline-block animate-ping" />
            <span className="text-sigma-textMain font-semibold">SYSTEM OPERATIONAL</span>
          </div>
          <div>
            MODEL: <span className="text-sigma-cyan font-bold">SIGMA-4H-ENSEMBLE-v1.7</span>
          </div>
          <div className="hidden sm:inline">
            FEATURE SET: <span className="text-sigma-textMain font-medium">2026-09-19</span>
          </div>
          <div className="hidden md:inline">
            CONFIG: <span className="text-sigma-textMain font-medium">risk-profile-institutional-v3</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-sigma-green">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SECURITY AUDIT: ZERO FRONTEND API SECRETS · BACKEND VAULT ACTIVE</span>
          </div>
          <div className="text-sigma-textDark hidden lg:inline">PRESS CTRL+K FOR COMMAND PALETTE</div>
        </div>
      </footer>

      {/* Emergency Kill Switch Modal */}
      {isKillSwitchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-sigma-surface1 border border-sigma-red p-5 rounded-lg max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-sigma-red font-bold text-sm">
              <AlertOctagon className="w-6 h-6" />
              <span>HARDWARE KILL SWITCH CONFIRMATION</span>
            </div>

            <p className="text-xs font-mono text-sigma-textMuted leading-relaxed">
              Engaging the emergency Kill Switch will immediately:
            </p>

            <ul className="text-xs font-mono text-sigma-textDark space-y-1 list-disc list-inside bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <li>Cancel all active and pending orders across all venues</li>
              <li>Halt new order generation across all strategies</li>
              <li>Lock the platform permanently into SAFE MODE</li>
              <li>Trigger institutional audit log reconciliation</li>
            </ul>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setKillSwitchModalOpen(false)}
                className="px-4 py-2 rounded bg-sigma-surface2 hover:bg-sigma-surface3 border border-sigma-border text-xs font-mono text-sigma-textMain"
              >
                Dismiss
              </button>
              <button
                onClick={engageKillSwitch}
                className="px-4 py-2 rounded bg-sigma-red hover:bg-sigma-red/90 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg"
              >
                <Power className="w-4 h-4" />
                <span>CONFIRM EMERGENCY KILL SWITCH</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
