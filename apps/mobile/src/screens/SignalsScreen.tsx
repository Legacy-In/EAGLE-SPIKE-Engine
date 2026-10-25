/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — SCREEN 2: SIGNALS & INTELLIGENCE TERMINAL
 * File: apps/mobile/src/screens/SignalsScreen.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { useTradingStore } from '../store/useTradingStore';

interface CanonicalSignal {
  id: string;
  symbol: string;
  exchange: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  score: number;
  scoreQuality: 'EXTREME' | 'HIGH' | 'MEDIUM';
  rationale: string[];
  createdAt: number;
}

const SEED_SIGNALS: CanonicalSignal[] = [
  {
    id: 'EGL-20261025-BYBIT-SOLUSDT-01',
    symbol: 'SOLUSDT',
    exchange: 'BYBIT',
    direction: 'LONG',
    entryPrice: 154.2,
    stopLoss: 150.8,
    tp1: 157.6,
    tp2: 162.0,
    tp3: 168.5,
    score: 91,
    scoreQuality: 'EXTREME',
    rationale: [
      'Multi-timeframe RVOL 3.12x expansion across 5m and 15m windows',
      'Massive +22.4% Open Interest inflow in past 30 minutes',
      'Aggressive delta-taker buy ratio reaching 68% taker dominance',
      'Clear breakout above 4h local consolidation resistance at $152.0',
    ],
    createdAt: Date.now() - 1000 * 60 * 8,
  },
  {
    id: 'EGL-20261025-BINANCE-ETHUSDT-02',
    symbol: 'ETHUSDT',
    exchange: 'BINANCE',
    direction: 'SHORT',
    entryPrice: 3520.0,
    stopLoss: 3580.0,
    tp1: 3450.0,
    tp2: 3380.0,
    tp3: 3260.0,
    score: 84,
    scoreQuality: 'HIGH',
    rationale: [
      'Bearish divergence on 1h RSI (14) with failing swing high at $3,550',
      'Rapid Open Interest decline indicating massive long liquidation flush',
      'Net negative taker flow (-$24.5M) dominated by market sellers',
      'Rejection from upper 24h Bollinger band under heavy volume',
    ],
    createdAt: Date.now() - 1000 * 60 * 25,
  },
  {
    id: 'EGL-20261025-MEXC-HOOKED-03',
    symbol: 'HOOKEDUSDT',
    exchange: 'MEXC',
    direction: 'LONG',
    entryPrice: 0.0815,
    stopLoss: 0.0785,
    tp1: 0.0848,
    tp2: 0.0895,
    tp3: 0.098,
    score: 81,
    scoreQuality: 'HIGH',
    rationale: [
      'Early breakout momentum with 1.95x RVOL on 15m timeframe',
      'Taker buy pressure absorbing low ask liquidity on orderbook',
      'Confirmed ATR volatility expansion with high reward-to-risk ratio',
      'Fresh volume baseline breakout after multi-day base accumulation',
    ],
    createdAt: Date.now() - 1000 * 60 * 50,
  },
];

export const SignalsScreen: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'SIGNALS' | 'BIGCAP' | 'PRE_BREAKOUT'>('SIGNALS');
  const { openPaperPosition } = useTradingStore();

  const handleExecutePaper = (sig: CanonicalSignal) => {
    openPaperPosition({
      symbol: sig.symbol,
      exchange: sig.exchange,
      direction: sig.direction,
      entryPrice: sig.entryPrice,
      takeProfit1: sig.tp1,
      stopLoss: sig.stopLoss,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚡ CANONICAL SIGNALS DESK</Text>
        <Text style={styles.headerSubtitle}>Real-time Institutional Vol Spike Detection</Text>
      </View>

      {/* Sub-Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeSubTab === 'SIGNALS' && styles.tabItemActive]}
          onPress={() => setActiveSubTab('SIGNALS')}
        >
          <Text style={[styles.tabText, activeSubTab === 'SIGNALS' && styles.tabTextActive]}>
            Live Signals (3)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeSubTab === 'BIGCAP' && styles.tabItemActive]}
          onPress={() => setActiveSubTab('BIGCAP')}
        >
          <Text style={[styles.tabText, activeSubTab === 'BIGCAP' && styles.tabTextActive]}>
            BigCap Desk (BTC/ETH)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeSubTab === 'PRE_BREAKOUT' && styles.tabItemActive]}
          onPress={() => setActiveSubTab('PRE_BREAKOUT')}
        >
          <Text style={[styles.tabText, activeSubTab === 'PRE_BREAKOUT' && styles.tabTextActive]}>
            Pre-Breakout (2)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Signals Feed */}
      <FlatList
        data={SEED_SIGNALS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isLong = item.direction === 'LONG';
          return (
            <View style={styles.signalCard}>
              {/* Card Top Row */}
              <View style={styles.cardHeader}>
                <View style={styles.dirRow}>
                  <View style={[styles.dirBadge, isLong ? styles.dirLong : styles.dirShort]}>
                    <Text style={[styles.dirText, isLong ? styles.textLong : styles.textShort]}>
                      {isLong ? '🚀 LONG 5x' : '🔴 SHORT 5x'}
                    </Text>
                  </View>
                  <Text style={styles.symbolText}>{item.symbol}</Text>
                  <Text style={styles.exchangeText}>({item.exchange})</Text>
                </View>

                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreText}>Score {item.score}</Text>
                </View>
              </View>

              {/* Levels Matrix */}
              <View style={styles.levelsGrid}>
                <View style={styles.levelCol}>
                  <Text style={styles.levelLabel}>ENTRY</Text>
                  <Text style={styles.levelVal}>${item.entryPrice}</Text>
                </View>
                <View style={styles.levelCol}>
                  <Text style={styles.levelLabel}>TARGET TP1</Text>
                  <Text style={[styles.levelVal, { color: Colors.longGreen }]}>${item.tp1}</Text>
                </View>
                <View style={styles.levelCol}>
                  <Text style={styles.levelLabel}>TARGET TP2</Text>
                  <Text style={[styles.levelVal, { color: Colors.longGreen }]}>${item.tp2}</Text>
                </View>
                <View style={styles.levelCol}>
                  <Text style={styles.levelLabel}>STOP-LOSS</Text>
                  <Text style={[styles.levelVal, { color: Colors.shortRed }]}>${item.stopLoss}</Text>
                </View>
              </View>

              {/* Quantitative Rationale */}
              <View style={styles.rationaleBox}>
                <Text style={styles.rationaleTitle}>QUANTITATIVE RATIONALE:</Text>
                {item.rationale.map((r, idx) => (
                  <Text key={idx} style={styles.rationaleItem}>
                    • {r}
                  </Text>
                ))}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.paperExecButton}
                  onPress={() => handleExecutePaper(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.paperExecText}>🧪 Execute Paper Trade ($100)</Text>
                </TouchableOpacity>
              </View>
            </View>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#12161A',
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceTertiary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.longGreen,
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  headerSubtitle: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceTertiary,
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  tabItemActive: {
    backgroundColor: Colors.cyberCyanBg,
    borderColor: Colors.cyberCyan,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  tabTextActive: {
    color: Colors.cyberCyan,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  signalCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceTertiary,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dirRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dirBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dirLong: {
    backgroundColor: Colors.longGreenBg,
  },
  dirShort: {
    backgroundColor: Colors.shortRedBg,
  },
  dirText: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  textLong: {
    color: Colors.longGreen,
  },
  textShort: {
    color: Colors.shortRed,
  },
  symbolText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  exchangeText: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
  },
  scoreBadge: {
    backgroundColor: '#20262E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scoreText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.binanceGold,
    fontFamily: 'monospace',
  },
  levelsGrid: {
    flexDirection: 'row',
    backgroundColor: '#101418',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1C222A',
  },
  levelCol: {
    flex: 1,
  },
  levelLabel: {
    fontSize: 8,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
  },
  levelVal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  rationaleBox: {
    backgroundColor: '#12161C',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  rationaleTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  rationaleItem: {
    fontSize: 10,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    lineHeight: 15,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paperExecButton: {
    flex: 1,
    backgroundColor: Colors.longGreenBg,
    borderColor: Colors.longGreen,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperExecText: {
    color: Colors.longGreen,
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
});
