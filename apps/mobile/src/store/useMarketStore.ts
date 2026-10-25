/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — NATIVE HIGH-FREQUENCY MARKET STORE
 * File: apps/mobile/src/store/useMarketStore.ts
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { create } from 'zustand';

export interface MarketTicker {
  id: string;
  symbol: string;
  exchange: 'BYBIT' | 'BINANCE' | 'MEXC' | 'WEEX';
  price: number;
  prevPrice: number;
  change5m: number;
  change15m: number;
  change1h: number;
  change24h: number;
  rvol: number;
  volZ: number;
  oiDelta: number;
  takerRatio: number;
  eagleScore: number;
  volume24hUsd: number;
  sparkline: number[];
  updatedAt: number;
}

export type PresetType =
  | 'All'
  | 'Vol Explosion'
  | 'Momentum'
  | 'Accumulation'
  | 'Short Squeeze'
  | 'Long Squeeze'
  | 'Early Breakout';

export type ExchangeFilter = 'ALL' | 'BYBIT' | 'BINANCE' | 'MEXC' | 'WEEX';

interface MarketStoreState {
  tickers: Map<string, MarketTicker>;
  selectedExchange: ExchangeFilter;
  selectedPreset: PresetType;
  searchQuery: string;
  btcPrice: number;
  btcChange24h: number;
  marketBreadth: number;
  spikesCount: number;
  isConnected: boolean;
  selectedTicker: MarketTicker | null;

  // Actions
  setSelectedExchange: (ex: ExchangeFilter) => void;
  setSelectedPreset: (preset: PresetType) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTicker: (ticker: MarketTicker | null) => void;
  updateTickers: (incoming: MarketTicker[]) => void;
  setConnected: (connected: boolean) => void;
}

export const useMarketStore = create<MarketStoreState>((set) => ({
  tickers: new Map(),
  selectedExchange: 'ALL',
  selectedPreset: 'All',
  searchQuery: '',
  btcPrice: 80951.54,
  btcChange24h: 0.72,
  marketBreadth: 47,
  spikesCount: 4,
  isConnected: true,
  selectedTicker: null,

  setSelectedExchange: (ex) => set({ selectedExchange: ex }),
  setSelectedPreset: (preset) => set({ selectedPreset: preset }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedTicker: (ticker) => set({ selectedTicker: ticker }),
  setConnected: (connected) => set({ isConnected: connected }),

  updateTickers: (incoming) =>
    set((state) => {
      const nextMap = new Map(state.tickers);
      for (const t of incoming) {
        nextMap.set(t.id, t);
      }
      return { tickers: nextMap };
    }),
}));
