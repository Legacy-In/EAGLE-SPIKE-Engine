/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — SCREEN 1: 120FPS LIVE MARKET SCANNER & WEBSOCKET ENGINE
 * File: apps/mobile/src/screens/ScannerScreen.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  ActivityIndicator,
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

interface ScannerScreenProps {
  onSelectTicker: (ticker: MarketTicker) => void;
}

export const ScannerScreen: React.FC<ScannerScreenProps> = ({ onSelectTicker }) => {
  const {
    tickerList,
    btcPrice,
    btcChange24h,
    selectedExchange,
    setSelectedExchange,
    selectedPreset,
    setSelectedPreset,
    searchQuery,
    setSearchQuery,
    isConnected,
    initLiveMarketFeed,
  } = useMarketStore();

  const { tradingMode, toggleTradingMode } = useTradingStore();

  // Initialize live WebSocket stream and snapshot
  useEffect(() => {
    const unsub = initLiveMarketFeed();
    return () => {
      unsub();
    };
  }, []);

  const filteredTickers = useMemo(() => {
    return tickerList.filter((item) => {
      // Exchange filter
      if (selectedExchange !== 'ALL' && item.exchange !== selectedExchange) return false;

      // Search query
      if (searchQuery.trim() && !item.symbol.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Quant Presets
      if (selectedPreset === 'Vol Explosion') {
        return item.rvol >= 2.0 || item.volZ >= 2.0;
      }
      if (selectedPreset === 'Momentum') {
        return item.change24h >= 6.0;
      }
      if (selectedPreset === 'Accumulation') {
        return item.oiDelta >= 8.0;
      }
      if (selectedPreset === 'Short Squeeze') {
        return item.change24h >= 10.0;
      }
      if (selectedPreset === 'Long Squeeze') {
        return item.change24h <= -6.0;
      }
      if (selectedPreset === 'Early Breakout') {
        return item.change15m >= 2.5 || item.rvol >= 1.8;
      }

      return true;
    });
  }, [tickerList, selectedExchange, searchQuery, selectedPreset]);

  const renderTickerRow = ({ item }: { item: MarketTicker }) => {
    const isUp = item.change24h >= 0;
    const priceFormatted =
      item.price >= 1
        ? item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
        : item.price.toFixed(6);

    return (
      <TouchableOpacity
        style={styles.tickerRow}
        onPress={() => onSelectTicker(item)}
        activeOpacity={0.7}
      >
        {/* Left Column: Symbol & Exchange */}
        <View style={styles.colSymbol}>
          <View style={styles.symbolBadgeRow}>
            <Text style={styles.symbolName}>{item.symbol}</Text>
            <View style={styles.exchangePill}>
              <Text style={styles.exchangePillText}>{item.exchange}</Text>
            </View>
          </View>
          <Text style={styles.volText}>
            Vol ${(item.volume24hUsd / 1_000_000).toFixed(1)}M • Score {item.eagleScore}
          </Text>
        </View>

        {/* Center Column: RVOL & Vol-Z */}
        <View style={styles.colMetrics}>
          <Text style={[styles.rvolText, item.rvol >= 2.0 && styles.rvolHot]}>
            {item.rvol.toFixed(2)}x
          </Text>
          <Text style={styles.volZText}>Z {item.volZ >= 0 ? `+${item.volZ}` : item.volZ}</Text>
        </View>

        {/* Right Column: Price & 24h Change Box */}
        <View style={styles.colPrice}>
          <Text style={styles.priceNumber}>${priceFormatted}</Text>
          <View style={[styles.changeBox, isUp ? styles.changeBoxUp : styles.changeBoxDown]}>
            <Text style={[styles.changeText, isUp ? styles.changeTextUp : styles.changeTextDown]}>
              {isUp ? '+' : ''}
              {item.change24h.toFixed(2)}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ─── 1. TOP HEADER ─── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerLogo}>🦅 EAGLE FLASH</Text>
          <View style={styles.btcTickerPill}>
            <View style={[styles.pulseDot, isConnected && styles.pulseDotLive]} />
            <Text style={styles.btcPillText}>
              BTC ${btcPrice.toLocaleString()} ({btcChange24h >= 0 ? '+' : ''}
              {btcChange24h.toFixed(2)}%)
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.modeTogglePill, tradingMode === 'paper' ? styles.pillPaper : styles.pillLive]}
          onPress={toggleTradingMode}
          activeOpacity={0.8}
        >
          <Text style={styles.modePillText}>
            {tradingMode === 'paper' ? '🧪 PAPER $10k' : '⚡ LIVE APIS'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── 2. SUMMARY METRICS STRIP ─── */}
      <View style={styles.metricsStrip}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValueText}>{tickerList.length || '3,470+'}</Text>
          <Text style={styles.metricLabelText}>MARKETS</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricValueText}>
            {tickerList.filter((t) => t.change24h > 0).length} / {tickerList.length || '3,470'}
          </Text>
          <Text style={styles.metricLabelText}>BREADTH</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={[styles.metricValueText, { color: Colors.cyan }]}>
            {tickerList.filter((t) => t.rvol >= 2.0).length}
          </Text>
          <Text style={styles.metricLabelText}>SPIKES 2X+</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={[styles.metricValueText, { color: isConnected ? Colors.long : Colors.short }]}>
            {isConnected ? 'LIVE WS' : 'CONNECTING'}
          </Text>
          <Text style={styles.metricLabelText}>FEED STATUS</Text>
        </View>
      </View>

      {/* ─── 3. SEARCH & PRESET CAROUSEL ─── */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search 3,470+ coins (e.g. BTC, SOL, PEPE)..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Presets Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.presetsScrollView}
        contentContainerStyle={styles.presetsContainer}
      >
        {PRESETS.map((p) => {
          const isActive = selectedPreset === p;
          return (
            <TouchableOpacity
              key={p}
              style={[styles.presetPill, isActive && styles.presetPillActive]}
              onPress={() => setSelectedPreset(p)}
              activeOpacity={0.8}
            >
              <Text style={[styles.presetText, isActive && styles.presetTextActive]}>{p}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ─── 4. EXCHANGE SELECTOR ROW ─── */}
      <View style={styles.exchangeSelectorRow}>
        {EXCHANGES.map((ex) => {
          const isActive = selectedExchange === ex.key;
          return (
            <TouchableOpacity
              key={ex.key}
              style={[styles.exchangeTab, isActive && styles.exchangeTabActive]}
              onPress={() => setSelectedExchange(ex.key)}
            >
              <Text style={[styles.exchangeTabText, isActive && styles.exchangeTabTextActive]}>
                {ex.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── 5. TABLE HEADER ─── */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableColHeader, styles.colSymbol]}>ASSET / VOL</Text>
        <Text style={[styles.tableColHeader, styles.colMetrics]}>RVOL / VOL-Z</Text>
        <Text style={[styles.tableColHeader, styles.colPrice, { textAlign: 'right' }]}>
          PRICE / 24H
        </Text>
      </View>

      {/* ─── 6. VIRTUALIZED TICKER FEED ─── */}
      {tickerList.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.cyan} size="large" />
          <Text style={styles.loadingFeedText}>Connecting to Live WebSocket Feeds...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTickers}
          keyExtractor={(item) => item.id}
          renderItem={renderTickerRow}
          contentContainerStyle={styles.listContainer}
          initialNumToRender={20}
          maxToRenderPerBatch={25}
          windowSize={10}
          removeClippedSubviews={true}
        />
      )}
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
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.cyan,
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
  btcTickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textMuted,
  },
  pulseDotLive: {
    backgroundColor: Colors.long,
  },
  btcPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  modeTogglePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  pillPaper: {
    backgroundColor: 'rgba(240, 185, 11, 0.15)',
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  pillLive: {
    backgroundColor: 'rgba(14, 203, 129, 0.15)',
    borderWidth: 1,
    borderColor: Colors.long,
  },
  modePillText: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  metricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValueText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  metricLabelText: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  metricDivider: {
    width: 1,
    height: 18,
    backgroundColor: Colors.border,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 11,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clearSearchBtn: {
    position: 'absolute',
    right: 28,
    top: 17,
  },
  clearSearchText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  presetsScrollView: {
    paddingVertical: 4,
  },
  presetsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 2,
    gap: 6,
    alignItems: 'center',
  },
  presetPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetPillActive: {
    backgroundColor: Colors.surfaceHighlight,
    borderColor: Colors.cyan,
  },
  presetText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  presetTextActive: {
    color: Colors.cyan,
  },
  exchangeSelectorRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#0F1216',
  },
  exchangeTab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  exchangeTabActive: {
    borderBottomColor: Colors.gold,
  },
  exchangeTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  exchangeTabTextActive: {
    color: Colors.gold,
    fontWeight: '900',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#0A0D10',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableColHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  listContainer: {
    paddingBottom: 40,
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#14181E',
  },
  colSymbol: {
    flex: 2,
  },
  symbolBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  symbolName: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  exchangePill: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  exchangePillText: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.textMuted,
  },
  volText: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  colMetrics: {
    flex: 1.2,
    alignItems: 'flex-start',
  },
  rvolText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  rvolHot: {
    color: Colors.gold,
  },
  volZText: {
    fontSize: 9,
    color: Colors.textMuted,
    fontFamily: 'monospace',
  },
  colPrice: {
    flex: 1.8,
    alignItems: 'flex-end',
  },
  priceNumber: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
    marginBottom: 2,
  },
  changeBox: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 54,
    alignItems: 'center',
  },
  changeBoxUp: {
    backgroundColor: 'rgba(14, 203, 129, 0.15)',
  },
  changeBoxDown: {
    backgroundColor: 'rgba(246, 70, 93, 0.15)',
  },
  changeText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  changeTextUp: {
    color: Colors.long,
  },
  changeTextDown: {
    color: Colors.short,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  loadingFeedText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
