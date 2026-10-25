/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — NATIVE TRADING & POSITION MANAGEMENT STORE
 * File: apps/mobile/src/store/useTradingStore.ts
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { create } from 'zustand';

export interface Position {
  id: string;
  symbol: string;
  exchange: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  markPrice: number;
  marginUsd: number;
  positionSizeUsd: number;
  leverage: number;
  takeProfit1: number;
  stopLoss: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number;
  realizedR: number;
  openedAt: number;
}

export interface SettledTrade {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  realizedPnlUsd: number;
  realizedR: number;
  outcome: 'WIN' | 'LOSS';
  closedAt: number;
}

interface TradingState {
  tradingMode: 'paper' | 'live';
  equity: number;
  balance: number;
  availableMargin: number;
  realizedPnl: number;
  winRate: number;
  activePositions: Position[];
  closedTrades: SettledTrade[];

  // Actions
  toggleTradingMode: () => void;
  setTradingMode: (mode: 'paper' | 'live') => void;
  closePosition: (id: string) => void;
  moveStopToBreakeven: (id: string) => void;
  resetPortfolio: (amount?: number) => void;
  openPaperPosition: (params: Partial<Position>) => void;
}

export const useTradingStore = create<TradingState>((set, get) => ({
  tradingMode: 'paper',
  equity: 10148.5,
  balance: 10000.0,
  availableMargin: 9800.0,
  realizedPnl: 148.5,
  winRate: 78.4,
  activePositions: [
    {
      id: 'POS-1',
      symbol: 'BTCUSDT',
      exchange: 'BYBIT',
      direction: 'LONG',
      entryPrice: 65200,
      markPrice: 65850,
      marginUsd: 100,
      positionSizeUsd: 500,
      leverage: 5,
      takeProfit1: 66400,
      stopLoss: 64100,
      unrealizedPnlUsd: 34.2,
      unrealizedPnlPct: 34.2,
      realizedR: 1.82,
      openedAt: Date.now() - 1000 * 60 * 24,
    },
    {
      id: 'POS-2',
      symbol: 'ETHUSDT',
      exchange: 'BINANCE',
      direction: 'SHORT',
      entryPrice: 3520,
      markPrice: 3540,
      marginUsd: 100,
      positionSizeUsd: 500,
      leverage: 5,
      takeProfit1: 3450,
      stopLoss: 3580,
      unrealizedPnlUsd: -12.5,
      unrealizedPnlPct: -12.5,
      realizedR: -0.6,
      openedAt: Date.now() - 1000 * 60 * 45,
    },
  ],
  closedTrades: [
    {
      id: 'CLOSED-1',
      symbol: 'SOLUSDT',
      direction: 'LONG',
      entryPrice: 148.2,
      exitPrice: 154.6,
      realizedPnlUsd: 43.18,
      realizedR: 2.15,
      outcome: 'WIN',
      closedAt: Date.now() - 1000 * 60 * 120,
    },
    {
      id: 'CLOSED-2',
      symbol: 'AVAXUSDT',
      direction: 'LONG',
      entryPrice: 28.5,
      exitPrice: 27.8,
      realizedPnlUsd: -24.56,
      realizedR: -1.0,
      outcome: 'LOSS',
      closedAt: Date.now() - 1000 * 60 * 300,
    },
  ],

  toggleTradingMode: () =>
    set((state) => ({ tradingMode: state.tradingMode === 'paper' ? 'live' : 'paper' })),
  setTradingMode: (mode) => set({ tradingMode: mode }),

  closePosition: (id) =>
    set((state) => {
      const pos = state.activePositions.find((p) => p.id === id);
      if (!pos) return state;

      const settled: SettledTrade = {
        id: `SETTLED-${Date.now()}`,
        symbol: pos.symbol,
        direction: pos.direction,
        entryPrice: pos.entryPrice,
        exitPrice: pos.markPrice,
        realizedPnlUsd: pos.unrealizedPnlUsd,
        realizedR: pos.realizedR,
        outcome: pos.unrealizedPnlUsd >= 0 ? 'WIN' : 'LOSS',
        closedAt: Date.now(),
      };

      const newRealizedPnl = state.realizedPnl + pos.unrealizedPnlUsd;
      const newEquity = state.equity + pos.unrealizedPnlUsd;

      return {
        activePositions: state.activePositions.filter((p) => p.id !== id),
        closedTrades: [settled, ...state.closedTrades],
        realizedPnl: newRealizedPnl,
        equity: newEquity,
        availableMargin: state.availableMargin + pos.marginUsd,
      };
    }),

  moveStopToBreakeven: (id) =>
    set((state) => ({
      activePositions: state.activePositions.map((p) =>
        p.id === id ? { ...p, stopLoss: p.entryPrice } : p
      ),
    })),

  resetPortfolio: (amount = 10000) =>
    set({
      equity: amount,
      balance: amount,
      availableMargin: amount,
      realizedPnl: 0,
      activePositions: [],
    }),

  openPaperPosition: (params) =>
    set((state) => {
      const newPos: Position = {
        id: `POS-${Date.now()}`,
        symbol: params.symbol || 'BTCUSDT',
        exchange: params.exchange || 'BYBIT',
        direction: params.direction || 'LONG',
        entryPrice: params.entryPrice || 65000,
        markPrice: params.entryPrice || 65000,
        marginUsd: 100,
        positionSizeUsd: 500,
        leverage: 5,
        takeProfit1: params.takeProfit1 || 66500,
        stopLoss: params.stopLoss || 64000,
        unrealizedPnlUsd: 0,
        unrealizedPnlPct: 0,
        realizedR: 0,
        openedAt: Date.now(),
      };

      return {
        activePositions: [newPos, ...state.activePositions],
        availableMargin: Math.max(0, state.availableMargin - 100),
      };
    }),
}));
