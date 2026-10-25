/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — NATIVE HIGH-FREQUENCY MARKET STORE
 * File: apps/mobile/src/store/useMarketStore.ts
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { create } from 'zustand';
import { marketWebSocketService } from '../services/marketWebSocket';
import { useTradingStore } from './useTradingStore';

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
  tickerList: MarketTicker[];
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
  setBtcMetrics: (price: number, change: number) => void;
  initLiveMarketFeed: () => () => void;
}

export const useMarketStore = create<MarketStoreState>((set, get) => ({
  tickers: new Map(),
  tickerList: [],
  selectedExchange: 'ALL',
  selectedPreset: 'All',
  searchQuery: '',
  btcPrice: 68420.0,
  btcChange24h: 2.45,
  marketBreadth: 58,
  spikesCount: 14,
  isConnected: true,
  selectedTicker: null,

  setSelectedExchange: (ex) => set({ selectedExchange: ex }),
  setSelectedPreset: (preset) => set({ selectedPreset: preset }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedTicker: (ticker) => set({ selectedTicker: ticker }),
  setConnected: (connected) => set({ isConnected: connected }),
  setBtcMetrics: (price, change) => set({ btcPrice: price, btcChange24h: change }),

  updateTickers: (incoming) =>
    set((state) => {
      const nextMap = new Map(state.tickers);
      for (const t of incoming) {
        nextMap.set(t.id, t);
      }
      return {
        tickers: nextMap,
        tickerList: Array.from(nextMap.values()),
      };
    }),

  initLiveMarketFeed: () => {
    // 1. Load initial live snapshot
    marketWebSocketService.fetchInitialSnapshot().then((snapshot) => {
      if (snapshot && snapshot.length > 0) {
        const map = new Map();
        const priceMap: Record<string, number> = {};
        for (const t of snapshot) {
          map.set(t.id, t);
          priceMap[t.symbol] = t.price;
        }
        set({
          tickers: map,
          tickerList: snapshot,
          isConnected: true,
        });
        useTradingStore.getState().updateMarkPrices(priceMap);
      }
    });

    // 2. Subscribe to continuous live WebSocket updates
    const unsubscribe = marketWebSocketService.subscribe((updated, btcP, btcC) => {
      const priceMap: Record<string, number> = {};
      set((state) => {
        const nextMap = new Map(state.tickers);
        for (const t of updated) {
          nextMap.set(t.id, t);
          priceMap[t.symbol] = t.price;
        }
        return {
          tickers: nextMap,
          tickerList: Array.from(nextMap.values()),
          btcPrice: btcP,
          btcChange24h: btcC,
          isConnected: true,
        };
      });
      useTradingStore.getState().updateMarkPrices(priceMap);
    });

    return unsubscribe;
  },
}));
