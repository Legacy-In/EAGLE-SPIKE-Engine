/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — SCREEN 1: 120FPS NATIVE MARKET SCANNER
 * File: apps/mobile/src/screens/ScannerScreen.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
} from 'react-native';
import { Colors } from '../theme/colors';
import {
  useMarketStore,
  MarketTicker,
  PresetType,
  ExchangeFilter,
} from '../store/useMarketStore';
import { useTradingStore } from '../store/useTradingStore';

const PRESETS: PresetType[] = [
  'All',
  'Vol Explosion',
  'Momentum',
  'Accumulation',
  'Short Squeeze',
  'Long Squeeze',
  'Early Breakout',
];

const EXCHANGES: { key: ExchangeFilter; label: string; count: string }[] = [
  { key: 'ALL', label: 'All', count: '3,470+' },
  { key: 'BYBIT', label: 'Bybit', count: '770+' },
  { key: 'BINANCE', label: 'Binance', count: '520+' },
  { key: 'MEXC', label: 'MEXC', count: '1,170+' },
  { key: 'WEEX', label: 'WEEX', count: '990+' },
];

// High-speed seed data for instant presentation
const SEED_TICKERS: MarketTicker[] = [
  {
    id: 'JCTUSDT_BYBIT',
    symbol: 'JCTUSDT',
    exchange: 'BYBIT',
    price: 0.0061,
    prevPrice: 0.0058,
    change5m: 23.97,
    change15m: 50.59,
    change1h: 86.54,
    change24h: 133.14,
    rvol: 2.33,
    volZ: 2.93,
    oiDelta: 18.5,
    takerRatio: 45,
    eagleScore: 85,
    volume24hUsd: 91100000,
    sparkline: [0.004, 0.0045, 0.0051, 0.0058, 0.0061],
    updatedAt: Date.now(),
  },
  {
    id: 'HOOKEDUSDT_MEXC',
    symbol: 'HOOKEDUSDT',
    exchange: 'MEXC',
    price: 0.0815,
    prevPrice: 0.078,
    change5m: 17.17,
    change15m: 36.25,
    change1h: 62.0,
    change24h: 95.39,
    rvol: 1.95,
    volZ: 2.09,
    oiDelta: 13.9,
    takerRatio: 45,
    eagleScore: 81,
    volume24hUsd: 750000,
    sparkline: [0.05, 0.06, 0.068, 0.075, 0.0815],
    updatedAt: Date.now(),
  },
  {
    id: 'ORDERUSDT_BINANCE',
    symbol: 'ORDERUSDT',
    exchange: 'BINANCE',
    price: 0.0581,
    prevPrice: 0.057,
    change5m: 12.5,
    change15m: 26.39,
    change1h: 45.13,
    change24h: 69.43,
    rvol: 1.69,
    volZ: 1.52,
    oiDelta: 10.8,
    takerRatio: 45,
    eagleScore: 79,
    volume24hUsd: 897900000,
    sparkline: [0.045, 0.048, 0.052, 0.055, 0.0581],
    updatedAt: Date.now(),
  },
  {
    id: 'ORDERUSDT_WEEX',
    symbol: 'ORDERUSDT',
    exchange: 'WEEX',
    price: 0.0575,
    prevPrice: 0.0565,
    change5m: 12.28,
    change15m: 25.93,
    change1h: 44.36,
    change24h: 68.24,
    rvol: 1.68,
    volZ: 1.5,
    oiDelta: 10.7,
    takerRatio: 45,
    eagleScore: 79,
    volume24hUsd: 10580000,
    sparkline: [0.044, 0.047, 0.051, 0.054, 0.0575],
    updatedAt: Date.now(),
  },
  {
    id: 'SOLUSDT_BYBIT',
    symbol: 'SOLUSDT',
    exchange: 'BYBIT',
    price: 154.2,
    prevPrice: 153.5,
    change5m: 1.85,
    change15m: 4.25,
    change1h: 8.4,
    change24h: 14.8,
    rvol: 3.12,
    volZ: 3.45,
    oiDelta: 22.4,
    takerRatio: 68,
    eagleScore: 91,
    volume24hUsd: 3450000000,
    sparkline: [142, 145, 148, 151, 154.2],
    updatedAt: Date.now(),
  },
];

interface ScannerScreenProps {
  onSelectTicker: (ticker: MarketTicker) => void;
}

export const ScannerScreen: React.FC<ScannerScreenProps> = ({ onSelectTicker }) => {
  const {
    btcPrice,
    btcChange24h,
    selectedExchange,
    setSelectedExchange,
    selectedPreset,
    setSelectedPreset,
    searchQuery,
    setSearchQuery,
  } = useMarketStore();

  const { tradingMode, toggleTradingMode } = useTradingStore();

  const filteredTickers = useMemo(() => {
    return SEED_TICKERS.filter((item) => {
      if (selectedExchange !== 'ALL' && item.exchange !== selectedExchange) return false;
      if (searchQuery.trim() && !item.symbol.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [selectedExchange, searchQuery]);

  return (
    <View style={styles.container}>
      {/* ─── 1. TOP HEADER ─── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerLogo}>🦅 EAGLE FLASH</Text>
          <View style={styles.btcTickerPill}>
            <View style={styles.greenPulseDot} />
            <Text style={styles.btcPillText}>
              BTC ${btcPrice.toLocaleString()} ({btcChange24h >= 0 ? '+' : ''}
              {btcChange24h}%)
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.modeTogglePill, tradingMode === 'paper' ? styles.pillPaper : styles.pillLive]}
          onPress={toggleTradingMode}
          activeOpacity={0.8}
        >
          <Text style={styles.modePillText}>
            {tradingMode === 'paper' ? '🧪 PAPER $10k' : '⚡ LIVE'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── 2. SUMMARY METRICS STRIP ─── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.metricsStrip}
      >
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>PRIMARY WIN-RATE</Text>
          <Text style={[styles.metricValue, { color: Colors.longGreen }]}>78.4% (WTD: 14W/4L)</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>NET REALIZED R</Text>
          <Text style={[styles.metricValue, { color: Colors.cyberCyan }]}>+24.8R (PF: 2.85)</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>VOL SPIKES</Text>
          <Text style={[styles.metricValue, { color: Colors.binanceGold }]}>4 (RVOL ≥ 1.5x)</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>BREADTH</Text>
          <Text style={styles.metricValue}>47% (Vol: 53%)</Text>
        </View>
      </ScrollView>

      {/* ─── 3. STRATEGY PRESETS CAROUSEL ─── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presetsStrip}
      >
        {PRESETS.map((p) => {
          const isSelected = selectedPreset === p;
          return (
            <TouchableOpacity
              key={p}
              style={[styles.presetChip, isSelected && styles.presetChipActive]}
              onPress={() => setSelectedPreset(p)}
            >
              <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                {p}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ─── 4. EXCHANGE FILTER PILLS ─── */}
      <View style={styles.exchangeBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exchangeScroll}>
          {EXCHANGES.map((ex) => {
            const isSelected = selectedExchange === ex.key;
            return (
              <TouchableOpacity
                key={ex.key}
                style={[styles.exchangePill, isSelected && styles.exchangePillActive]}
                onPress={() => setSelectedExchange(ex.key)}
              >
                <Text style={[styles.exchangeText, isSelected && styles.exchangeTextActive]}>
                  {ex.label} <Text style={styles.exchangeCount}>({ex.count})</Text>
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── 5. SEARCH BAR ─── */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search 3,470+ symbols (e.g. SOL, BTC)..."
          placeholderTextColor={Colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* ─── 6. TABLE HEADER ─── */}
      <View style={styles.tableHeader}>
        <Text style={[styles.columnHeader, { flex: 2 }]}>SYMBOL / VOL</Text>
        <Text style={[styles.columnHeader, { flex: 1.5, textAlign: 'right' }]}>PRICE</Text>
        <Text style={[styles.columnHeader, { flex: 1.8, textAlign: 'right' }]}>15M / SCORE</Text>
      </View>

      {/* ─── 7. HIGH-FREQUENCY VIRTUALIZED TICKER LIST ─── */}
      <FlatList
        data={filteredTickers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isProfit = item.change15m >= 0;
          const exchangeColor =
            item.exchange === 'BYBIT'
              ? Colors.bybitOrange
              : item.exchange === 'BINANCE'
              ? Colors.binanceYellow
              : item.exchange === 'MEXC'
              ? Colors.mexcCyan
              : Colors.weexPurple;

          return (
            <TouchableOpacity
              style={styles.tickerRow}
              onPress={() => onSelectTicker(item)}
              activeOpacity={0.7}
            >
              {/* Left Column: Symbol & Exchange */}
              <View style={{ flex: 2 }}>
                <View style={styles.symbolRow}>
                  <Text style={styles.symbolText}>{item.symbol}</Text>
                  <View style={[styles.exchangeBadge, { borderColor: exchangeColor }]}>
                    <Text style={[styles.exchangeBadgeText, { color: exchangeColor }]}>
                      {item.exchange}
                    </Text>
                  </View>
                </View>
                <Text style={styles.volumeText}>
                  Vol ${(item.volume24hUsd / 1_000_000).toFixed(1)}M
                </Text>
              </View>

              {/* Center Column: Price */}
              <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                <Text style={styles.priceText}>
                  ${item.price < 1 ? item.price.toFixed(4) : item.price.toLocaleString()}
                </Text>
                <Text style={styles.rvolText}>RVOL {item.rvol.toFixed(2)}x</Text>
              </View>

              {/* Right Column: 15M Change & Eagle Score */}
              <View style={{ flex: 1.8, alignItems: 'flex-end' }}>
                <View style={[styles.changeBadge, isProfit ? styles.badgeGreen : styles.badgeRed]}>
                  <Text style={[styles.changeText, isProfit ? styles.textGreen : styles.textRed]}>
                    {isProfit ? '+' : ''}
                    {item.change15m.toFixed(2)}%
                  </Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Score </Text>
                  <Text style={styles.scoreValue}>{item.eagleScore}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#12161A',
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceTertiary,
  },
  headerLeft: {
    gap: 4,
  },
  headerLogo: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.longGreen,
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  btcTickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.longGreen,
  },
  btcPillText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  modeTogglePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillPaper: {
    backgroundColor: Colors.longGreenBg,
    borderColor: Colors.longGreen,
  },
  pillLive: {
    backgroundColor: Colors.binanceGoldBg,
    borderColor: Colors.binanceGold,
  },
  modePillText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  metricsStrip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  metricCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceTertiary,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metricLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  metricValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  presetsStrip: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  presetChip: {
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceTertiary,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  presetChipActive: {
    backgroundColor: Colors.cyberCyanBg,
    borderColor: Colors.cyberCyan,
  },
  presetChipText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  presetChipTextActive: {
    color: Colors.cyberCyan,
    fontWeight: 'bold',
  },
  exchangeBar: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceTertiary,
    paddingBottom: 8,
  },
  exchangeScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  exchangePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#161A20',
  },
  exchangePillActive: {
    backgroundColor: '#28303C',
  },
  exchangeText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  exchangeTextActive: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  exchangeCount: {
    fontSize: 9,
    color: Colors.textTertiary,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceTertiary,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.textPrimary,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.surfaceTertiary,
    backgroundColor: '#0F1216',
  },
  columnHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#161A20',
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  symbolText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  exchangeBadge: {
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  exchangeBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  volumeText: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  priceText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  rvolText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeGreen: {
    backgroundColor: Colors.longGreenBg,
  },
  badgeRed: {
    backgroundColor: Colors.shortRedBg,
  },
  changeText: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  textGreen: {
    color: Colors.longGreen,
  },
  textRed: {
    color: Colors.shortRed,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  scoreLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
  },
  scoreValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.longGreen,
    fontFamily: 'monospace',
  },
});
