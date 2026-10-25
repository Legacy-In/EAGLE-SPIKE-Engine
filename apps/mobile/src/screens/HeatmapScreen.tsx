import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useMarketStore, MarketTicker } from '../store/useMarketStore';

interface HeatmapTile {
  symbol: string;
  name: string;
  category: 'Mega' | 'L1/AI' | 'Meme/DeFi';
  change24h: number;
  rsi: number;
  oiChange: number;
  price: number;
  size: 'large' | 'medium' | 'small';
}

const HEATMAP_DATA: HeatmapTile[] = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', category: 'Mega', change24h: 3.42, rsi: 68.4, oiChange: 8.2, price: 68420.5, size: 'large' },
  { symbol: 'ETHUSDT', name: 'Ethereum', category: 'Mega', change24h: 2.15, rsi: 61.2, oiChange: 4.1, price: 2640.8, size: 'large' },
  { symbol: 'SOLUSDT', name: 'Solana', category: 'Mega', change24h: 6.84, rsi: 74.8, oiChange: 14.5, price: 178.4, size: 'large' },
  { symbol: 'BNBUSDT', name: 'BNB', category: 'Mega', change24h: 0.85, rsi: 54.1, oiChange: -1.2, price: 592.1, size: 'medium' },
  { symbol: 'SUIUSDT', name: 'Sui', category: 'L1/AI', change24h: 12.45, rsi: 79.2, oiChange: 22.8, price: 2.14, size: 'medium' },
  { symbol: 'NEARUSDT', name: 'NEAR', category: 'L1/AI', change24h: 7.32, rsi: 71.0, oiChange: 11.4, price: 5.48, size: 'medium' },
  { symbol: 'FETUSDT', name: 'Artificial Superintelligence', category: 'L1/AI', change24h: -3.85, rsi: 42.1, oiChange: -6.5, price: 1.42, size: 'medium' },
  { symbol: 'AVAXUSDT', name: 'Avalanche', category: 'L1/AI', change24h: 1.95, rsi: 56.4, oiChange: 2.8, price: 28.6, size: 'small' },
  { symbol: 'LINKUSDT', name: 'Chainlink', category: 'L1/AI', change24h: 4.12, rsi: 63.8, oiChange: 5.7, price: 12.35, size: 'small' },
  { symbol: 'PEPEUSDT', name: 'Pepe', category: 'Meme/DeFi', change24h: 15.68, rsi: 82.4, oiChange: 34.2, price: 0.0000104, size: 'medium' },
  { symbol: 'WIFUSDT', name: 'dogwifhat', category: 'Meme/DeFi', change24h: -5.42, rsi: 38.6, oiChange: -8.9, price: 2.65, size: 'small' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', category: 'Meme/DeFi', change24h: 4.88, rsi: 65.2, oiChange: 9.4, price: 0.145, size: 'small' },
  { symbol: 'POPCATUSDT', name: 'Popcat', category: 'Meme/DeFi', change24h: 9.75, rsi: 73.1, oiChange: 18.2, price: 1.48, size: 'small' },
  { symbol: 'AAVEUSDT', name: 'Aave', category: 'Meme/DeFi', change24h: -1.82, rsi: 48.2, oiChange: -2.4, price: 158.2, size: 'small' },
];

export const HeatmapScreen: React.FC<{ onSelectCoin?: (ticker: MarketTicker) => void }> = ({ onSelectCoin }) => {
  const [metric, setMetric] = useState<'pnl' | 'rsi' | 'oi'>('pnl');
  const [timeframe, setTimeframe] = useState<'15m' | '1h' | '4h' | '24h'>('24h');
  const { tickers, setSelectedTicker } = useMarketStore();

  const dynamicTiles: HeatmapTile[] = HEATMAP_DATA.map((tile) => {
    const live = tickers.get(`${tile.symbol}_BINANCE`);
    if (!live) return tile;
    return {
      ...tile,
      price: live.price,
      change24h: live.change24h,
      oiChange: live.oiDelta,
    };
  });

  const getTileColor = (val: number, type: 'pnl' | 'rsi' | 'oi') => {
    if (type === 'rsi') {
      if (val >= 70) return '#0ECB81'; // Overbought / Strong momentum
      if (val >= 55) return 'rgba(14, 203, 129, 0.4)';
      if (val <= 30) return '#F6465D'; // Oversold
      if (val <= 45) return 'rgba(246, 70, 93, 0.4)';
      return Colors.surface;
    }
    // For PnL or OI Change
    if (val >= 8) return '#0ECB81';
    if (val > 0) return 'rgba(14, 203, 129, 0.45)';
    if (val <= -8) return '#F6465D';
    if (val < 0) return 'rgba(246, 70, 93, 0.45)';
    return Colors.surface;
  };

  const handleTilePress = (tile: HeatmapTile) => {
    const match: MarketTicker = tickers.get(tile.symbol) || {
      id: `${tile.symbol}_BINANCE`,
      symbol: tile.symbol,
      exchange: 'BINANCE',
      price: tile.price,
      prevPrice: tile.price,
      change5m: 0.5,
      change15m: 1.2,
      change1h: tile.change24h * 0.4,
      change24h: tile.change24h,
      rvol: 2.1,
      volZ: 2.5,
      oiDelta: tile.oiChange,
      takerRatio: 52,
      eagleScore: 82,
      volume24hUsd: 150000000,
      sparkline: [tile.price * 0.98, tile.price * 0.99, tile.price],
      updatedAt: Date.now(),
    };
    setSelectedTicker(match);
    if (onSelectCoin) onSelectCoin(match);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>MARKET HEATMAP</Text>
          <Text style={styles.headerSubtitle}>CROSS-EXCHANGE VOLUME & MOMENTUM TREEMAP</Text>
        </View>
      </View>

      {/* Control Pills Row */}
      <View style={styles.controlRow}>
        <View style={styles.pillsContainer}>
          {(['pnl', 'rsi', 'oi'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.metricPill, metric === m && styles.metricPillActive]}
              onPress={() => setMetric(m)}
            >
              <Text style={[styles.metricPillText, metric === m && styles.metricPillTextActive]}>
                {m === 'pnl' ? '% 24H' : m === 'rsi' ? 'RSI HEAT' : 'OI Δ%'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.pillsContainer}>
          {(['15m', '1h', '4h', '24h'] as const).map((tf) => (
            <TouchableOpacity
              key={tf}
              style={[styles.tfPill, timeframe === tf && styles.tfPillActive]}
              onPress={() => setTimeframe(tf)}
            >
              <Text style={[styles.tfPillText, timeframe === tf && styles.tfPillTextActive]}>
                {tf.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Treemap Tile Grid */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionLabel}>MEGA CAP LEADERS</Text>
        <View style={styles.gridRow}>
          {dynamicTiles.filter((i) => i.category === 'Mega').map((tile) => {
            const displayVal = metric === 'pnl' ? `${tile.change24h > 0 ? '+' : ''}${tile.change24h.toFixed(2)}%`
              : metric === 'rsi' ? `RSI ${tile.rsi.toFixed(1)}`
              : `OI ${tile.oiChange > 0 ? '+' : ''}${tile.oiChange.toFixed(1)}%`;
            const color = getTileColor(metric === 'pnl' ? tile.change24h : metric === 'rsi' ? tile.rsi : tile.oiChange, metric);

            return (
              <TouchableOpacity
                key={tile.symbol}
                style={[
                  styles.tile,
                  tile.size === 'large' ? styles.tileLarge : styles.tileMedium,
                  { backgroundColor: color },
                ]}
                onPress={() => handleTilePress(tile)}
                activeOpacity={0.8}
              >
                <Text style={styles.tileSymbol}>{tile.symbol.replace('USDT', '')}</Text>
                <Text style={styles.tilePrice}>${tile.price >= 1 ? tile.price.toLocaleString() : tile.price.toFixed(6)}</Text>
                <Text style={styles.tileMetric}>{displayVal}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>LAYER 1 & AI SECTOR</Text>
        <View style={styles.gridRow}>
          {dynamicTiles.filter((i) => i.category === 'L1/AI').map((tile) => {
            const displayVal = metric === 'pnl' ? `${tile.change24h > 0 ? '+' : ''}${tile.change24h.toFixed(2)}%`
              : metric === 'rsi' ? `RSI ${tile.rsi.toFixed(1)}`
              : `OI ${tile.oiChange > 0 ? '+' : ''}${tile.oiChange.toFixed(1)}%`;
            const color = getTileColor(metric === 'pnl' ? tile.change24h : metric === 'rsi' ? tile.rsi : tile.oiChange, metric);

            return (
              <TouchableOpacity
                key={tile.symbol}
                style={[
                  styles.tile,
                  tile.size === 'medium' ? styles.tileMedium : styles.tileSmall,
                  { backgroundColor: color },
                ]}
                onPress={() => handleTilePress(tile)}
                activeOpacity={0.8}
              >
                <Text style={styles.tileSymbol}>{tile.symbol.replace('USDT', '')}</Text>
                <Text style={styles.tilePrice}>${tile.price.toFixed(2)}</Text>
                <Text style={styles.tileMetric}>{displayVal}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>MEME & DEFI HIGH VOLATILITY</Text>
        <View style={styles.gridRow}>
          {dynamicTiles.filter((i) => i.category === 'Meme/DeFi').map((tile) => {
            const displayVal = metric === 'pnl' ? `${tile.change24h > 0 ? '+' : ''}${tile.change24h.toFixed(2)}%`
              : metric === 'rsi' ? `RSI ${tile.rsi.toFixed(1)}`
              : `OI ${tile.oiChange > 0 ? '+' : ''}${tile.oiChange.toFixed(1)}%`;
            const color = getTileColor(metric === 'pnl' ? tile.change24h : metric === 'rsi' ? tile.rsi : tile.oiChange, metric);

            return (
              <TouchableOpacity
                key={tile.symbol}
                style={[
                  styles.tile,
                  tile.size === 'medium' ? styles.tileMedium : styles.tileSmall,
                  { backgroundColor: color },
                ]}
                onPress={() => handleTilePress(tile)}
                activeOpacity={0.8}
              >
                <Text style={styles.tileSymbol}>{tile.symbol.replace('USDT', '')}</Text>
                <Text style={styles.tilePrice}>
                  ${tile.price < 0.01 ? tile.price.toFixed(6) : tile.price.toFixed(3)}
                </Text>
                <Text style={styles.tileMetric}>{displayVal}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.8,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pillsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  metricPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricPillActive: {
    backgroundColor: Colors.cyan,
    borderColor: Colors.cyan,
  },
  metricPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  metricPillTextActive: {
    color: Colors.background,
  },
  tfPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: Colors.surface,
  },
  tfPillActive: {
    backgroundColor: Colors.surfaceHighlight,
  },
  tfPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  tfPillTextActive: {
    color: Colors.gold,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    borderRadius: 8,
    padding: 10,
    justifyContent: 'space-between',
  },
  tileLarge: {
    width: '48.5%',
    height: 110,
  },
  tileMedium: {
    width: '31%',
    height: 90,
  },
  tileSmall: {
    width: '22.8%',
    height: 75,
  },
  tileSymbol: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  tilePrice: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    fontVariant: ['tabular-nums'],
  },
  tileMetric: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
});
