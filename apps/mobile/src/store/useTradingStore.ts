/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — NATIVE TRADING & POSITION MANAGEMENT STORE
 * File: apps/mobile/src/store/useTradingStore.ts
 * Real-Time Mark Price Evaluation, Dynamic PnL & Auto TP/SL Settlement
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
  updateMarkPrices: (priceMap: Record<string, number>) => void;
}

export const useTradingStore = create<TradingState>((set, get) => ({
  tradingMode: 'paper',
  equity: 10000.0,
  balance: 10000.0,
  availableMargin: 10000.0,
  realizedPnl: 0.0,
  winRate: 80.0,
  activePositions: [
    {
      id: 'POS-BTC-INIT',
      symbol: 'BTCUSDT',
      exchange: 'BINANCE',
      direction: 'LONG',
      entryPrice: 67800,
      markPrice: 68420,
      marginUsd: 200,
      positionSizeUsd: 1000,
      leverage: 5,
      takeProfit1: 71000,
      stopLoss: 66500,
      unrealizedPnlUsd: 45.72,
      unrealizedPnlPct: 22.86,
      realizedR: 1.15,
      openedAt: Date.now() - 1000 * 60 * 20,
    },
  ],
  closedTrades: [
    {
      id: 'CLOSED-SOL-1',
      symbol: 'SOLUSDT',
      direction: 'LONG',
      entryPrice: 172.4,
      exitPrice: 181.2,
      realizedPnlUsd: 51.04,
      realizedR: 2.3,
      outcome: 'WIN',
      closedAt: Date.now() - 1000 * 60 * 60,
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
        id: `SETTLED-${Date.now()}-${pos.symbol}`,
        symbol: pos.symbol,
        direction: pos.direction,
        entryPrice: pos.entryPrice,
        exitPrice: pos.markPrice,
        realizedPnlUsd: pos.unrealizedPnlUsd,
        realizedR: pos.realizedR,
        outcome: pos.unrealizedPnlUsd >= 0 ? 'WIN' : 'LOSS',
        closedAt: Date.now(),
      };

      const newBalance = state.balance + pos.unrealizedPnlUsd;
      const newClosed = [settled, ...state.closedTrades];
      const wins = newClosed.filter((t) => t.outcome === 'WIN').length;
      const winRate = newClosed.length > 0 ? (wins / newClosed.length) * 100 : 75;
      const remaining = state.activePositions.filter((p) => p.id !== id);
      const marginUsed = remaining.reduce((acc, p) => acc + p.marginUsd, 0);

      return {
        activePositions: remaining,
        closedTrades: newClosed,
        realizedPnl: state.realizedPnl + pos.unrealizedPnlUsd,
        balance: newBalance,
        equity: newBalance + remaining.reduce((acc, p) => acc + p.unrealizedPnlUsd, 0),
        availableMargin: Math.max(0, newBalance - marginUsed),
        winRate,
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
      closedTrades: [],
      winRate: 100,
    }),

  openPaperPosition: (params) =>
    set((state) => {
      const margin = params.marginUsd || 100;
      if (state.availableMargin < margin) return state;

      const leverage = params.leverage || 5;
      const entryPrice = params.entryPrice || 68000;
      const direction = params.direction || 'LONG';
      const isLong = direction === 'LONG';
      const tp = params.takeProfit1 || (isLong ? entryPrice * 1.035 : entryPrice * 0.965);
      const sl = params.stopLoss || (isLong ? entryPrice * 0.985 : entryPrice * 1.015);

      const newPos: Position = {
        id: `POS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        symbol: params.symbol || 'BTCUSDT',
        exchange: params.exchange || 'BINANCE',
        direction,
        entryPrice,
        markPrice: entryPrice,
        marginUsd: margin,
        positionSizeUsd: margin * leverage,
        leverage,
        takeProfit1: tp,
        stopLoss: sl,
        unrealizedPnlUsd: 0,
        unrealizedPnlPct: 0,
        realizedR: 0,
        openedAt: Date.now(),
      };

      const remaining = [newPos, ...state.activePositions];
      const marginUsed = remaining.reduce((acc, p) => acc + p.marginUsd, 0);

      return {
        activePositions: remaining,
        availableMargin: Math.max(0, state.balance - marginUsed),
      };
    }),

  updateMarkPrices: (priceMap: Record<string, number>) =>
    set((state) => {
      if (state.activePositions.length === 0) return state;

      let hasChange = false;
      const newClosed: SettledTrade[] = [];
      const remaining: Position[] = [];
      let netUnrealized = 0;
      let balanceDelta = 0;

      for (const pos of state.activePositions) {
        const livePrice = priceMap[pos.symbol];
        if (!livePrice) {
          remaining.push(pos);
          netUnrealized += pos.unrealizedPnlUsd;
          continue;
        }

        hasChange = true;
        const isLong = pos.direction === 'LONG';
        const pnlPct = isLong
          ? ((livePrice - pos.entryPrice) / pos.entryPrice) * pos.leverage * 100
          : ((pos.entryPrice - livePrice) / pos.entryPrice) * pos.leverage * 100;
        const pnlUsd = (pos.marginUsd * pnlPct) / 100;
        const riskPerR = Math.abs(pos.entryPrice - pos.stopLoss) || 1;
        const realizedR = parseFloat(
          (isLong ? (livePrice - pos.entryPrice) / riskPerR : (pos.entryPrice - livePrice) / riskPerR).toFixed(2)
        );

        // Auto TP / SL check
        const tpHit = isLong ? livePrice >= pos.takeProfit1 : livePrice <= pos.takeProfit1;
        const slHit = isLong ? livePrice <= pos.stopLoss : livePrice >= pos.stopLoss;

        if (tpHit || slHit) {
          newClosed.push({
            id: `SETTLED-${Date.now()}-${pos.symbol}`,
            symbol: pos.symbol,
            direction: pos.direction,
            entryPrice: pos.entryPrice,
            exitPrice: livePrice,
            realizedPnlUsd: pnlUsd,
            realizedR,
            outcome: pnlUsd >= 0 ? 'WIN' : 'LOSS',
            closedAt: Date.now(),
          });
          balanceDelta += pnlUsd;
        } else {
          remaining.push({
            ...pos,
            markPrice: livePrice,
            unrealizedPnlUsd: parseFloat(pnlUsd.toFixed(2)),
            unrealizedPnlPct: parseFloat(pnlPct.toFixed(2)),
            realizedR,
          });
          netUnrealized += pnlUsd;
        }
      }

      if (!hasChange) return state;

      const newBalance = state.balance + balanceDelta;
      const newEquity = newBalance + netUnrealized;
      const allClosed = [...newClosed, ...state.closedTrades];
      const wins = allClosed.filter((t) => t.outcome === 'WIN').length;
      const winRate = allClosed.length > 0 ? (wins / allClosed.length) * 100 : 75;
      const marginUsed = remaining.reduce((acc, p) => acc + p.marginUsd, 0);

      return {
        activePositions: remaining,
        closedTrades: allClosed,
        balance: newBalance,
        equity: parseFloat(newEquity.toFixed(2)),
        realizedPnl: parseFloat((state.realizedPnl + balanceDelta).toFixed(2)),
        availableMargin: Math.max(0, parseFloat((newBalance - marginUsed).toFixed(2))),
        winRate: parseFloat(winRate.toFixed(1)),
      };
    }),
}));
