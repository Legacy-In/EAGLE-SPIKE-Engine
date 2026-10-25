'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type TradingMode = 'paper' | 'live';

export interface ApiConfig {
  exchange: 'binance' | 'bybit';
  testnet: boolean;
  apiKey: string;
  apiSecret: string;
  discordWebhook: string;
  telegramToken: string;
  telegramChatId: string;
}

export interface WorkerInfo {
  id: string;
  name: string;
  displayName: string;
  status: 'RUNNING' | 'STOPPED' | 'STARTING' | 'ERROR' | 'IDLE';
  intervalMs: number;
  ticksCount: number;
  lastTickAt: number | null;
  lastError: string | null;
}

export interface SystemMetrics {
  rssMb: number;
  heapUsedMb: number;
  uptimeSeconds: number;
  cpuCount: number;
}

export interface LogEntry {
  timestamp: number;
  isoTime: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  workerId: string;
  message: string;
}

interface TradingModeContextType {
  tradingMode: TradingMode;
  setTradingMode: (mode: TradingMode) => void;
  toggleTradingMode: () => void;
  apiConfig: ApiConfig;
  saveApiConfig: (updates: Partial<ApiConfig>) => void;
  engineStatus: 'STOPPED' | 'STARTING' | 'RUNNING' | 'ERROR';
  totalWorkers: number;
  runningWorkers: number;
  fleet: WorkerInfo[];
  metrics: SystemMetrics | null;
  logs: LogEntry[];
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  feedbackMessage: string | null;
  setFeedbackMessage: (msg: string | null) => void;
  startEngine: () => Promise<void>;
  stopEngine: () => Promise<void>;
  toggleWorker: (id: string) => Promise<void>;
  handleStartPaperTrading: () => Promise<void>;
  resetPortfolio: (amount?: number) => Promise<void>;
  refreshEngineStatus: () => Promise<void>;
}

const DEFAULT_CONFIG: ApiConfig = {
  exchange: 'binance',
  testnet: true,
  apiKey: '',
  apiSecret: '',
  discordWebhook: '',
  telegramToken: '',
  telegramChatId: '',
};

const DEFAULT_WORKERS: WorkerInfo[] = [
  { id: 'tpsl_monitor', name: 'TPSL-MONITOR', displayName: 'Real-time TP/SL Monitor', status: 'STOPPED', intervalMs: 3000, ticksCount: 0, lastTickAt: null, lastError: null },
  { id: 'discord', name: 'DISCORD-OUT', displayName: 'Discord Outbox Dispatcher', status: 'STOPPED', intervalMs: 2000, ticksCount: 0, lastTickAt: null, lastError: null },
  { id: 'telegram_outbox', name: 'TG-OUTBOX', displayName: 'Telegram Alert Outbox', status: 'STOPPED', intervalMs: 1000, ticksCount: 0, lastTickAt: null, lastError: null },
  { id: 'telegram_poll', name: 'TG-POLL', displayName: 'Telegram Command Poller', status: 'STOPPED', intervalMs: 3000, ticksCount: 0, lastTickAt: null, lastError: null },
  { id: 'bigcap', name: 'BIGCAP', displayName: 'BigCap Spike Intelligence', status: 'STOPPED', intervalMs: 3000, ticksCount: 0, lastTickAt: null, lastError: null },
  { id: 'checkpoint', name: 'CHECKPOINT', displayName: 'Checkpoint & Lifecycle Resolver', status: 'STOPPED', intervalMs: 60000, ticksCount: 0, lastTickAt: null, lastError: null },
  { id: 'whale', name: 'WHALE-DET', displayName: 'Whale Detector & PnD Scanner', status: 'STOPPED', intervalMs: 5000, ticksCount: 0, lastTickAt: null, lastError: null },
  { id: 'etherscan', name: 'ETH-WHALE', displayName: 'Etherscan Whale Account Scanner', status: 'STOPPED', intervalMs: 15000, ticksCount: 0, lastTickAt: null, lastError: null },
  { id: 'listing_worker', name: 'LISTING-DET', displayName: 'New Coin Listing Worker', status: 'STOPPED', intervalMs: 45000, ticksCount: 0, lastTickAt: null, lastError: null },
  { id: 'performance_worker', name: 'PERF-WORKER', displayName: 'Win-Rate & Performance Engine', status: 'STOPPED', intervalMs: 60000, ticksCount: 0, lastTickAt: null, lastError: null },
  { id: 'paper_monitor', name: 'PAPER-MONITOR', displayName: 'Paper Trading Virtual Monitor', status: 'STOPPED', intervalMs: 3000, ticksCount: 0, lastTickAt: null, lastError: null },
];

const TradingModeContext = createContext<TradingModeContextType | undefined>(undefined);

export const TradingModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tradingMode, setTradingModeState] = useState<TradingMode>('paper');
  const [apiConfig, setApiConfig] = useState<ApiConfig>(DEFAULT_CONFIG);
  const [engineStatus, setEngineStatus] = useState<'STOPPED' | 'STARTING' | 'RUNNING' | 'ERROR'>('STOPPED');
  const [fleet, setFleet] = useState<WorkerInfo[]>(DEFAULT_WORKERS);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Load persisted configuration from localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedMode = localStorage.getItem('eagle_flash_trading_mode');
        if (savedMode === 'paper' || savedMode === 'live') {
          setTradingModeState(savedMode);
        }

        const savedConfig = localStorage.getItem('eagle_flash_api_config');
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          setApiConfig((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {}
  }, []);

  const showToast = useCallback((msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage((current) => (current === msg ? null : current));
    }, 4000);
  }, []);

  const setTradingMode = useCallback((mode: TradingMode) => {
    setTradingModeState(mode);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('eagle_flash_trading_mode', mode);
      }
    } catch {}
    showToast(mode === 'paper' ? '🧪 Switched to Paper Trading Sandbox ($100 virtual margin)' : '⚡ Switched to LIVE Exchange Execution');
  }, [showToast]);

  const toggleTradingMode = useCallback(() => {
    setTradingMode(tradingMode === 'paper' ? 'live' : 'paper');
  }, [tradingMode, setTradingMode]);

  const saveApiConfig = useCallback((updates: Partial<ApiConfig>) => {
    setApiConfig((prev) => {
      const next = { ...prev, ...updates };
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('eagle_flash_api_config', JSON.stringify(next));
        }
      } catch {}
      return next;
    });
    showToast('✅ API & Webhook Configuration Saved Cleanly');
  }, [showToast]);

  // Fetch live engine state from backend API route
  const refreshEngineStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/mobile/engine');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.fleet) {
        setEngineStatus(data.fleet.engineStatus || 'STOPPED');
        if (Array.isArray(data.fleet.workers) && data.fleet.workers.length > 0) {
          setFleet(data.fleet.workers);
        }
        if (data.metrics) {
          setMetrics(data.metrics);
        }
        if (Array.isArray(data.logs)) {
          setLogs(data.logs);
        }
      }
    } catch {}
  }, []);

  // Periodic polling every 3 seconds
  useEffect(() => {
    refreshEngineStatus();
    const interval = setInterval(refreshEngineStatus, 3000);
    return () => clearInterval(interval);
  }, [refreshEngineStatus]);

  const startEngine = useCallback(async () => {
    setEngineStatus('STARTING');
    showToast('🚀 Initializing all 11 background workers...');
    try {
      const res = await fetch('/api/mobile/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_all' }),
      });
      const data = await res.json();
      if (data.success) {
        setEngineStatus('RUNNING');
        showToast('● All 11 Background Workers LIVE & Active');
        await refreshEngineStatus();
      } else {
        setEngineStatus('ERROR');
        showToast(`❌ Engine launch error: ${data.error || 'Unknown'}`);
      }
    } catch (err: any) {
      setEngineStatus('ERROR');
      showToast(`❌ Engine launch failure: ${err?.message || 'Network error'}`);
    }
  }, [showToast, refreshEngineStatus]);

  const stopEngine = useCallback(async () => {
    showToast('🛑 Halting all background workers...');
    try {
      const res = await fetch('/api/mobile/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop_all' }),
      });
      const data = await res.json();
      if (data.success) {
        setEngineStatus('STOPPED');
        showToast('○ Engine Paused. All workers idle.');
        await refreshEngineStatus();
      }
    } catch (err: any) {
      showToast(`❌ Error pausing engine: ${err?.message}`);
    }
  }, [showToast, refreshEngineStatus]);

  const toggleWorker = useCallback(async (workerId: string) => {
    try {
      const res = await fetch('/api/mobile/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_worker', workerId }),
      });
      const data = await res.json();
      if (data.success && data.worker) {
        showToast(`Worker ${data.worker.name}: ${data.worker.status}`);
        await refreshEngineStatus();
      }
    } catch (err: any) {
      showToast(`❌ Worker toggle error: ${err?.message}`);
    }
  }, [showToast, refreshEngineStatus]);

  const handleStartPaperTrading = useCallback(async () => {
    setTradingMode('paper');
    showToast('🧪 Starting Paper Sandbox Engine...');
    // Ensure engine is running
    await startEngine();
  }, [setTradingMode, showToast, startEngine]);

  const resetPortfolio = useCallback(async (amount: number = 10000) => {
    try {
      showToast(`🔄 Resetting virtual portfolio to $${amount.toLocaleString()}...`);
      const res = await fetch('/api/paper-trades/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialBalance: amount }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ Portfolio Reset Complete: $${amount.toLocaleString()} Available`);
        await refreshEngineStatus();
      } else {
        showToast(`❌ Reset failed: ${data.error || 'Server error'}`);
      }
    } catch (err: any) {
      showToast(`❌ Reset request error: ${err?.message}`);
    }
  }, [showToast, refreshEngineStatus]);

  const runningWorkers = fleet.filter((w) => w.status === 'RUNNING').length;

  return (
    <TradingModeContext.Provider
      value={{
        tradingMode,
        setTradingMode,
        toggleTradingMode,
        apiConfig,
        saveApiConfig,
        engineStatus,
        totalWorkers: fleet.length,
        runningWorkers,
        fleet,
        metrics,
        logs,
        isSettingsOpen,
        setIsSettingsOpen,
        feedbackMessage,
        setFeedbackMessage,
        startEngine,
        stopEngine,
        toggleWorker,
        handleStartPaperTrading,
        resetPortfolio,
        refreshEngineStatus,
      }}
    >
      {children}
    </TradingModeContext.Provider>
  );
};

export const useTradingMode = () => {
  const context = useContext(TradingModeContext);
  if (!context) {
    throw new Error('useTradingMode must be used within a TradingModeProvider');
  }
  return context;
};
