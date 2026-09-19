import { create } from 'zustand';
import {
  BacktestResults,
  Order,
  Position,
  SignalCardData,
  Timeframe,
  TradeJournalEntry,
  TradingMode,
} from '../../../packages/types';

export type WorkspaceTab = 'TERMINAL' | 'EAGLE_FLASH' | 'BACKTEST' | 'RISK' | 'JOURNAL' | 'HEALTH' | 'CALENDAR';

interface SigmaState {
  // Navigation & UI
  activeWorkspace: WorkspaceTab;
  activeTimeframe: Timeframe;
  isCommandPaletteOpen: boolean;
  isKillSwitchModalOpen: boolean;
  isOrderTicketOpen: boolean;
  isLoading: boolean;
  lastUpdated: number;
  wsConnected: boolean;

  // Domain Snapshots
  data: any | null;
  backtestResults: BacktestResults | null;
  isBacktestRunning: boolean;

  // Actions
  setWorkspace: (tab: WorkspaceTab) => void;
  setTimeframe: (tf: Timeframe) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setKillSwitchModalOpen: (open: boolean) => void;
  setOrderTicketOpen: (open: boolean) => void;
  fetchSnapshot: () => Promise<void>;
  connectWebSocket: () => void;
  submitOrder: (params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT';
    amountBtc: number;
    price?: number;
    stopPrice?: number;
  }) => Promise<{ success: boolean; error?: string }>;
  closePosition: (positionId: string) => Promise<boolean>;
  engageKillSwitch: () => Promise<void>;
  disengageKillSwitch: () => Promise<void>;
  triggerSafeMode: (reason: string) => Promise<void>;
  clearSafeMode: () => Promise<void>;
  setTradingMode: (mode: TradingMode, token?: string) => Promise<void>;
  runBacktest: (params?: any) => Promise<void>;
}

let wsInstance: WebSocket | null = null;

export const useSigmaStore = create<SigmaState>((set, get) => ({
  activeWorkspace: 'TERMINAL',
  activeTimeframe: '4h',
  isCommandPaletteOpen: false,
  isKillSwitchModalOpen: false,
  isOrderTicketOpen: false,
  isLoading: true,
  lastUpdated: Date.now(),
  wsConnected: false,
  data: null,
  backtestResults: null,
  isBacktestRunning: false,

  setWorkspace: (tab) => set({ activeWorkspace: tab }),
  setTimeframe: (tf) => set({ activeTimeframe: tf }),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  setKillSwitchModalOpen: (open) => set({ isKillSwitchModalOpen: open }),
  setOrderTicketOpen: (open) => set({ isOrderTicketOpen: open }),

  fetchSnapshot: async () => {
    try {
      const res = await fetch('/api/market-snapshot', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        set({ data: json, isLoading: false, lastUpdated: Date.now() });
      }
    } catch (err) {
      console.error('Snapshot fetch error:', err);
    }
  },

  connectWebSocket: () => {
    if (typeof window === 'undefined') return;
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) return;

    try {
      // Connect to Binance Public Trade Stream for Sub-Second Live Price Updates
      const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
      wsInstance = ws;

      ws.onopen = () => {
        set({ wsConnected: true });
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.e === 'trade' && msg.p) {
            const livePrice = parseFloat(msg.p);
            const currentData = get().data;
            if (currentData && currentData.market) {
              const updatedMarket = {
                ...currentData.market,
                price: livePrice,
                provenance: {
                  ...currentData.market.provenance,
                  value: livePrice,
                  timestamp: msg.T || Date.now(),
                  freshnessMs: Math.max(15, Date.now() - (msg.T || Date.now())),
                  quality: 'LIVE',
                  confidenceScore: 99,
                },
              };
              set({
                data: {
                  ...currentData,
                  market: updatedMarket,
                },
                lastUpdated: Date.now(),
              });
            }
          }
        } catch {
          // ignore parsing error
        }
      };

      ws.onerror = () => {
        set({ wsConnected: false });
      };

      ws.onclose = () => {
        set({ wsConnected: false });
        wsInstance = null;
        // Reconnect after 3 seconds
        setTimeout(() => {
          get().connectWebSocket();
        }, 3000);
      };
    } catch (e) {
      console.error('WebSocket connection error:', e);
    }
  },

  submitOrder: async (params) => {
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SUBMIT_ORDER', ...params }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Execution failed' };
      }
      await get().fetchSnapshot();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  closePosition: async (positionId: string) => {
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CLOSE_POSITION', positionId }),
      });
      const json = await res.json();
      if (json.success) {
        await get().fetchSnapshot();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  engageKillSwitch: async () => {
    try {
      await fetch('/api/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ENGAGE_KILL_SWITCH', reason: 'Operator Triggered Emergency Kill Switch' }),
      });
      await get().fetchSnapshot();
      set({ isKillSwitchModalOpen: false });
    } catch (err) {
      console.error(err);
    }
  },

  disengageKillSwitch: async () => {
    try {
      await fetch('/api/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DISENGAGE_KILL_SWITCH' }),
      });
      await get().fetchSnapshot();
      set({ isKillSwitchModalOpen: false });
    } catch (err) {
      console.error(err);
    }
  },

  triggerSafeMode: async (reason: string) => {
    try {
      await fetch('/api/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TRIGGER_SAFE_MODE', reason }),
      });
      await get().fetchSnapshot();
    } catch (err) {
      console.error(err);
    }
  },

  clearSafeMode: async () => {
    try {
      await fetch('/api/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CLEAR_SAFE_MODE' }),
      });
      await get().fetchSnapshot();
    } catch (err) {
      console.error(err);
    }
  },

  setTradingMode: async (mode: TradingMode, token?: string) => {
    try {
      await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SET_TRADING_MODE', mode, confirmationToken: token }),
      });
      await get().fetchSnapshot();
    } catch (err) {
      console.error(err);
    }
  },

  runBacktest: async (params = {}) => {
    set({ isBacktestRunning: true });
    try {
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const json = await res.json();
        set({ backtestResults: json.results, isBacktestRunning: false });
      }
    } catch (err) {
      console.error('Backtest error:', err);
      set({ isBacktestRunning: false });
    }
  },
}));
