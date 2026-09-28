'use client';

import React, { useEffect } from 'react';
import { useSigmaStore } from '../store/useSigmaStore';
import { TopBar } from '../components/layout/TopBar';
import { CommandPalette } from '../components/layout/CommandPalette';
import { AlertOctagon, Power, ShieldCheck } from 'lucide-react';

export default function SigmaWorkstationPage() {
  const {
    fetchSnapshot,
    connectWebSocket,
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

  return (
    <div className="h-screen bg-sigma-bg text-sigma-textMain flex flex-col font-sans select-none overflow-hidden">
      {/* Top Bar */}
      <TopBar />

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette />

      {/* Main Content Area: Dedicated Full-Viewport Eagle Flash Terminal */}
      <main className="flex-1 min-h-0 w-full p-1 sm:p-2 flex flex-col">
        <div className="w-full flex-1 min-h-0 rounded-lg border border-sigma-border overflow-hidden bg-sigma-surface1 shadow-2xl">
          <iframe
            src="/eagle-flash.html"
            title="Eagle Flash Vol Spike Candidate Scanner"
            className="w-full h-full border-0"
          />
        </div>
      </main>

      {/* Institutional Permanent Bottom Status Strip */}
      <footer className="hidden lg:flex border-t border-sigma-border bg-sigma-surface1 px-4 py-1.5 text-[10px] font-mono text-sigma-textDark flex-wrap items-center justify-between gap-3 select-none shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sigma-green inline-block animate-ping" />
            <span className="text-sigma-textMain font-semibold">EAGLE FLASH QUANT ENGINE ONLINE</span>
          </div>
          <div>
            MODEL: <span className="text-sigma-cyan font-bold">EAGLE-FLASH-v3.0</span>
          </div>
          <div className="hidden sm:inline">
            SYSTEM: <span className="text-amber-400 font-bold">DYNAMIC ATR TP/SL + BLOCKCHAIN AUDIT</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-sigma-green">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>VERIFIED ON-CHAIN TELEMETRY · ETHERSCAN RPC CONNECTED</span>
          </div>
          <div className="text-sigma-textDark hidden lg:inline">PRESS CTRL+K FOR COMMANDS</div>
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
