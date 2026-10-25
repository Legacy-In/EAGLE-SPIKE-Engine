/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — 11-WORKER FLEET & HARDWARE ENGINE STORE
 * File: apps/mobile/src/store/useEngineStore.ts
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { create } from 'zustand';

export interface MobileWorker {
  id: string;
  name: string;
  displayName: string;
  status: 'RUNNING' | 'STOPPED' | 'ERROR';
  intervalMs: number;
  ticksCount: number;
  lastTickAt: number | null;
}

export interface EngineLog {
  timestamp: number;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  workerId: string;
  message: string;
}

export interface ApiCredentials {
  exchange: 'binance' | 'bybit';
  testnet: boolean;
  apiKey: string;
  apiSecret: string;
  discordWebhook: string;
  telegramToken: string;
}

interface EngineState {
  engineStatus: 'RUNNING' | 'STOPPED' | 'STARTING';
  fleet: MobileWorker[];
  logs: EngineLog[];
  metrics: {
    rssMb: number;
    cpuPercent: number;
    uptimeSeconds: number;
  };
  credentials: ApiCredentials;
  isCredentialsModalOpen: boolean;

  // Actions
  startAllWorkers: () => void;
  stopAllWorkers: () => void;
  toggleWorker: (id: string) => void;
  setCredentialsModalOpen: (open: boolean) => void;
  saveCredentials: (updates: Partial<ApiCredentials>) => void;
  addLog: (level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS', workerId: string, message: string) => void;
  clearLogs: () => void;
}

export const useEngineStore = create<EngineState>((set) => ({
  engineStatus: 'RUNNING',
  fleet: [
    { id: 'tpsl_monitor', name: 'TPSL-MONITOR', displayName: 'Real-time TP/SL Monitor', status: 'RUNNING', intervalMs: 3000, ticksCount: 1420, lastTickAt: Date.now() },
    { id: 'discord', name: 'DISCORD-OUT', displayName: 'Discord Outbox Dispatcher', status: 'RUNNING', intervalMs: 2000, ticksCount: 84, lastTickAt: Date.now() },
    { id: 'telegram_outbox', name: 'TG-OUTBOX', displayName: 'Telegram Alert Outbox', status: 'RUNNING', intervalMs: 1000, ticksCount: 42, lastTickAt: Date.now() },
    { id: 'telegram_poll', name: 'TG-POLL', displayName: 'Telegram Command Poller', status: 'RUNNING', intervalMs: 3000, ticksCount: 520, lastTickAt: Date.now() },
    { id: 'bigcap', name: 'BIGCAP', displayName: 'BigCap Spike Intelligence', status: 'RUNNING', intervalMs: 3000, ticksCount: 320, lastTickAt: Date.now() },
    { id: 'checkpoint', name: 'CHECKPOINT', displayName: 'Checkpoint & Lifecycle Resolver', status: 'RUNNING', intervalMs: 60000, ticksCount: 48, lastTickAt: Date.now() },
    { id: 'whale', name: 'WHALE-DET', displayName: 'Whale Detector & PnD Scanner', status: 'RUNNING', intervalMs: 5000, ticksCount: 712, lastTickAt: Date.now() },
    { id: 'etherscan', name: 'ETH-WHALE', displayName: 'Etherscan On-Chain Whale Scanner', status: 'RUNNING', intervalMs: 15000, ticksCount: 18, lastTickAt: Date.now() },
    { id: 'listing_worker', name: 'LISTING-DET', displayName: 'New Coin Listing Worker', status: 'RUNNING', intervalMs: 45000, ticksCount: 8, lastTickAt: Date.now() },
    { id: 'performance_worker', name: 'PERF-WORKER', displayName: 'Win-Rate & Performance Engine', status: 'RUNNING', intervalMs: 60000, ticksCount: 14, lastTickAt: Date.now() },
    { id: 'paper_monitor', name: 'PAPER-MONITOR', displayName: 'Paper Trading Virtual Monitor', status: 'RUNNING', intervalMs: 3000, ticksCount: 1420, lastTickAt: Date.now() },
  ],
  logs: [
    { timestamp: Date.now() - 12000, level: 'SUCCESS', workerId: 'PAPER_MONITOR', message: 'Target TP1 reached for SOLUSDT (+2.15R)' },
    { timestamp: Date.now() - 8000, level: 'INFO', workerId: 'WHALE_DET', message: 'Binance aggTrade burst: $1.2M buy on BTCUSDT' },
    { timestamp: Date.now() - 4000, level: 'SUCCESS', workerId: 'DISCORD', message: 'Dispatched alert to #paper-trades (Msg ID: 129481)' },
    { timestamp: Date.now() - 1000, level: 'INFO', workerId: 'TPSL_MONITOR', message: 'Evaluated 2 active positions against mark prices' },
  ],
  metrics: {
    rssMb: 112.4,
    cpuPercent: 1.4,
    uptimeSeconds: 14820,
  },
  credentials: {
    exchange: 'binance',
    testnet: true,
    apiKey: '',
    apiSecret: '',
    discordWebhook: '',
    telegramToken: '',
  },
  isCredentialsModalOpen: false,

  startAllWorkers: () =>
    set((state) => ({
      engineStatus: 'RUNNING',
      fleet: state.fleet.map((w) => ({ ...w, status: 'RUNNING' })),
    })),

  stopAllWorkers: () =>
    set((state) => ({
      engineStatus: 'STOPPED',
      fleet: state.fleet.map((w) => ({ ...w, status: 'STOPPED' })),
    })),

  toggleWorker: (id) =>
    set((state) => ({
      fleet: state.fleet.map((w) =>
        w.id === id ? { ...w, status: w.status === 'RUNNING' ? 'STOPPED' : 'RUNNING' } : w
      ),
    })),

  setCredentialsModalOpen: (open) => set({ isCredentialsModalOpen: open }),
  saveCredentials: (updates) =>
    set((state) => ({ credentials: { ...state.credentials, ...updates } })),

  addLog: (level, workerId, message) =>
    set((state) => {
      const entry: EngineLog = { timestamp: Date.now(), level, workerId, message };
      const nextLogs = [entry, ...state.logs].slice(0, 100);
      return { logs: nextLogs };
    }),
  clearLogs: () => set({ logs: [] }),
}));
