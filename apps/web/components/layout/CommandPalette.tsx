'use client';

import React, { useEffect, useState } from 'react';
import { useSigmaStore, WorkspaceTab } from '../../store/useSigmaStore';
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Calendar,
  Database,
  Flame,
  Layers,
  Power,
  Search,
  Shield,
  X,
} from 'lucide-react';

interface CommandItem {
  id: string;
  category: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    setWorkspace,
    setTimeframe,
    setKillSwitchModalOpen,
    setTradingMode,
    runBacktest,
  } = useSigmaStore();

  const [query, setQuery] = useState('');

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const commands: CommandItem[] = [
    {
      id: 'ws-terminal',
      category: 'NAVIGATION',
      label: 'Open Primary Terminal Workspace',
      icon: <Activity className="w-4 h-4 text-sigma-cyan" />,
      action: () => {
        setWorkspace('TERMINAL');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'ws-eagle-flash',
      category: 'NAVIGATION',
      label: 'Open 🦅 Eagle Flash Vol Spike Scanner',
      icon: <Flame className="w-4 h-4 text-amber-400" />,
      action: () => {
        setWorkspace('EAGLE_FLASH');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'ws-backtest',
      category: 'NAVIGATION',
      label: 'Open Backtesting Lab & Model Validation',
      icon: <BarChart2 className="w-4 h-4 text-sigma-purple" />,
      action: () => {
        setWorkspace('BACKTEST');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'ws-risk',
      category: 'NAVIGATION',
      label: 'Open Risk Management & Position Sizing',
      icon: <Shield className="w-4 h-4 text-sigma-amber" />,
      action: () => {
        setWorkspace('RISK');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'ws-journal',
      category: 'NAVIGATION',
      label: 'Open Trade Journal (MAE / MFE Analytics)',
      icon: <Layers className="w-4 h-4 text-sigma-green" />,
      action: () => {
        setWorkspace('JOURNAL');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'ws-health',
      category: 'NAVIGATION',
      label: 'Open Data Health & Feed Observability',
      icon: <Database className="w-4 h-4 text-sigma-cyan" />,
      action: () => {
        setWorkspace('HEALTH');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'ws-calendar',
      category: 'NAVIGATION',
      label: 'Open Macro & Economic Calendar',
      icon: <Calendar className="w-4 h-4 text-sigma-textDark" />,
      action: () => {
        setWorkspace('CALENDAR');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'tf-4h',
      category: 'TIMEFRAME',
      label: 'Switch Timeframe to 4H (Tactical Regime)',
      icon: <Activity className="w-4 h-4 text-sigma-textMuted" />,
      action: () => {
        setTimeframe('4h');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'tf-1d',
      category: 'TIMEFRAME',
      label: 'Switch Timeframe to 1D (Macro Trend)',
      icon: <Activity className="w-4 h-4 text-sigma-textMuted" />,
      action: () => {
        setTimeframe('1D');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'tf-15m',
      category: 'TIMEFRAME',
      label: 'Switch Timeframe to 15M (Entry Trigger)',
      icon: <Activity className="w-4 h-4 text-sigma-textMuted" />,
      action: () => {
        setTimeframe('15m');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'act-run-backtest',
      category: 'EXECUTION',
      label: 'Run Event-Driven Backtest (Walk-Forward Ensemble)',
      icon: <BarChart2 className="w-4 h-4 text-sigma-purple" />,
      action: () => {
        setWorkspace('BACKTEST');
        runBacktest();
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'act-paper-mode',
      category: 'EXECUTION',
      label: 'Set Trading Mode to Paper Trading',
      icon: <Shield className="w-4 h-4 text-sigma-cyan" />,
      action: () => {
        setTradingMode('PAPER');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'act-kill-switch',
      category: 'CRITICAL',
      label: 'ENGAGE EMERGENCY HARDWARE KILL SWITCH',
      icon: <Power className="w-4 h-4 text-sigma-red" />,
      action: () => {
        setKillSwitchModalOpen(true);
        setCommandPaletteOpen(false);
      },
    },
  ];

  const filtered = commands.filter(
    (c) =>
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
      <div className="bg-sigma-surface1 border border-sigma-border w-full max-w-xl rounded-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-sigma-border gap-2 bg-sigma-surface2">
          <Search className="w-4 h-4 text-sigma-cyan" />
          <input
            type="text"
            placeholder="Type a command, workspace, timeframe, or action..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="bg-transparent border-none outline-none text-xs text-sigma-textMain placeholder-sigma-textDark w-full font-mono"
          />
          <button
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1 rounded text-sigma-textDark hover:text-sigma-textMuted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Commands List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-sigma-borderSubtle">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-sigma-textDark font-mono">No matching commands found.</div>
          ) : (
            filtered.map((cmd) => (
              <button
                key={cmd.id}
                onClick={cmd.action}
                className="w-full text-left px-3 py-2.5 rounded hover:bg-sigma-surface2 flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1 rounded bg-sigma-surface3 border border-sigma-border">{cmd.icon}</div>
                  <div>
                    <div className="text-xs font-medium text-sigma-textMain group-hover:text-sigma-cyan transition-colors">
                      {cmd.label}
                    </div>
                    <div className="text-[10px] font-mono text-sigma-textDark">{cmd.category}</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-sigma-textDark opacity-0 group-hover:opacity-100 transition-opacity">
                  ↵ Enter
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-sigma-surface2/60 border-t border-sigma-border flex items-center justify-between text-[10px] font-mono text-sigma-textDark">
          <span>Navigation shortcuts</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};
