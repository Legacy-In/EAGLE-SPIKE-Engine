/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — SCREEN 2: LIVE SUPABASE SIGNALS & INTELLIGENCE TERMINAL
 * File: apps/mobile/src/screens/SignalsScreen.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useTradingStore } from '../store/useTradingStore';
import {
  fetchLiveSignals,
  fetchBigCapSignals,
  subscribeToLiveSignals,
  LiveSignalRecord,
  LiveBigCapSignal,
} from '../services/supabase';

export const SignalsScreen: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'SIGNALS' | 'BIGCAP' | 'PRE_BREAKOUT'>('SIGNALS');
  const [signals, setSignals] = useState<LiveSignalRecord[]>([]);
  const [bigCapSignals, setBigCapSignals] = useState<LiveBigCapSignal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const { openPaperPosition } = useTradingStore();

  const loadData = async () => {
    try {
      const [sigs, bigcaps] = await Promise.all([
        fetchLiveSignals(50),
        fetchBigCapSignals(20),
      ]);
      setSignals(sigs);
      setBigCapSignals(bigcaps);
    } catch (e) {
      console.warn('Error loading Supabase signals:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Real-time Postgres subscription
    const channel = subscribeToLiveSignals((newSig) => {
      setSignals((prev) => [newSig, ...prev.filter((s) => s.id !== newSig.id)]);
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleExecutePaper = (sig: LiveSignalRecord) => {
    openPaperPosition({
      symbol: sig.symbol,
      exchange: sig.exchange_id || 'BYBIT',
      direction: sig.direction,
      entryPrice: sig.entry_price,
      takeProfit1: sig.target_1_price,
      stopLoss: sig.stop_price,
    });
  };

  const renderSignalCard = ({ item }: { item: LiveSignalRecord }) => {
    const isLong = item.direction === 'LONG';
    const scoreColor = item.eagle_score >= 85 ? Colors.cyan : Colors.gold;

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View style={[styles.dirBadge, isLong ? styles.longBadge : styles.shortBadge]}>
              <Text style={[styles.dirText, isLong ? styles.longText : styles.shortText]}>
                {isLong ? '🚀 LONG' : '🔴 SHORT'} 5x
              </Text>
            </View>
            <Text style={styles.symbolText}>{item.symbol}</Text>
            <Text style={styles.exchangeText}>({item.exchange_id || 'BYBIT'})</Text>
          </View>
          <View style={[styles.scoreBadge, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreText, { color: scoreColor }]}>
              Score {item.eagle_score || 80}
            </Text>
          </View>
        </View>

        {/* Pricing Grid */}
        <View style={styles.priceGrid}>
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>ENTRY</Text>
            <Text style={styles.priceValue}>${item.entry_price?.toLocaleString()}</Text>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>TARGET TP1</Text>
            <Text style={[styles.priceValue, styles.profitText]}>
              ${item.target_1_price?.toLocaleString()}
            </Text>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>TARGET TP2</Text>
            <Text style={[styles.priceValue, styles.profitText]}>
              ${item.target_2_price?.toLocaleString()}
            </Text>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>STOP-LOSS</Text>
            <Text style={[styles.priceValue, styles.lossText]}>
              ${item.stop_price?.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Quantitative Intelligence */}
        <View style={styles.metricsRow}>
          <View style={styles.metricPill}>
            <Text style={styles.metricPillText}>RVOL {item.rvol?.toFixed(2)}x</Text>
          </View>
          <View style={styles.metricPill}>
            <Text style={styles.metricPillText}>Vol-Z {item.volume_z_score?.toFixed(2)}</Text>
          </View>
          <View style={styles.metricPill}>
            <Text style={styles.metricPillText}>Status: {item.status || 'DETECTED'}</Text>
          </View>
          {item.blockchain_network && (
            <View style={[styles.metricPill, styles.chainPill]}>
              <Text style={styles.chainText}>🔗 ON-CHAIN</Text>
            </View>
          )}
        </View>

        {/* One-Tap Execution Button */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleExecutePaper(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.actionBtnText}>⚡ Execute Paper Trade ($100)</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBigCapCard = ({ item }: { item: LiveBigCapSignal }) => {
    const isLong = item.direction === 'LONG';
    const rationale = Array.isArray(item.rationale_json)
      ? item.rationale_json
      : typeof item.rationale_json === 'string'
      ? [item.rationale_json]
      : [];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View style={[styles.dirBadge, isLong ? styles.longBadge : styles.shortBadge]}>
              <Text style={[styles.dirText, isLong ? styles.longText : styles.shortText]}>
                {isLong ? '💎 BIGCAP LONG' : '💎 BIGCAP SHORT'}
              </Text>
            </View>
            <Text style={styles.symbolText}>{item.symbol}</Text>
            <Text style={styles.exchangeText}>({item.best_timeframe || '15m'})</Text>
          </View>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>Score {item.eagle_score}</Text>
          </View>
        </View>

        <View style={styles.priceGrid}>
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>ENTRY</Text>
            <Text style={styles.priceValue}>${item.entry_price?.toLocaleString()}</Text>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>TARGET 1</Text>
            <Text style={[styles.priceValue, styles.profitText]}>
              ${item.target_price_1?.toLocaleString()}
            </Text>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>TARGET 2</Text>
            <Text style={[styles.priceValue, styles.profitText]}>
              ${item.target_price_2?.toLocaleString()}
            </Text>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>STOP</Text>
            <Text style={[styles.priceValue, styles.lossText]}>
              ${item.stop_loss_price?.toLocaleString()}
            </Text>
          </View>
        </View>

        {rationale.length > 0 && (
          <View style={styles.rationaleBox}>
            <Text style={styles.rationaleTitle}>QUANTITATIVE RATIONALE:</Text>
            {rationale.map((r, i) => (
              <Text key={i} style={styles.bulletText}>
                • {r}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>⚡ LIVE SIGNALS DESK</Text>
          <Text style={styles.headerSubtitle}>Real-time Supabase PostgreSQL Stream</Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.pulseDot} />
          <Text style={styles.liveText}>REALTIME</Text>
        </View>
      </View>

      {/* Sub-Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeSubTab === 'SIGNALS' && styles.tabItemActive]}
          onPress={() => setActiveSubTab('SIGNALS')}
        >
          <Text style={[styles.tabText, activeSubTab === 'SIGNALS' && styles.tabTextActive]}>
            Perp Signals ({signals.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeSubTab === 'BIGCAP' && styles.tabItemActive]}
          onPress={() => setActiveSubTab('BIGCAP')}
        >
          <Text style={[styles.tabText, activeSubTab === 'BIGCAP' && styles.tabTextActive]}>
            BigCap Desk ({bigCapSignals.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={Colors.cyan} size="large" />
          <Text style={styles.loadingText}>Connecting to Supabase signals stream...</Text>
        </View>
      ) : activeSubTab === 'SIGNALS' ? (
        <FlatList
          data={signals}
          keyExtractor={(item) => String(item.id || item.signal_id)}
          renderItem={renderSignalCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.cyan}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No active signals detected.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={bigCapSignals}
          keyExtractor={(item) => String(item.id || item.signal_id)}
          renderItem={renderBigCapCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.cyan}
            />
          }
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
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.cyan,
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
  headerSubtitle: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(14, 203, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(14, 203, 129, 0.3)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.long,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.long,
    letterSpacing: 0.5,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.surface,
  },
  tabItemActive: {
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.textPrimary,
  },
  listContent: {
    padding: 14,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dirBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  longBadge: {
    backgroundColor: 'rgba(14, 203, 129, 0.15)',
  },
  shortBadge: {
    backgroundColor: 'rgba(246, 70, 93, 0.15)',
  },
  dirText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  longText: {
    color: Colors.long,
  },
  shortText: {
    color: Colors.short,
  },
  symbolText: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  exchangeText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  scoreBadge: {
    borderWidth: 1,
    borderColor: Colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  scoreText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.gold,
    fontFamily: 'monospace',
  },
  priceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  priceCol: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.textMuted,
    marginBottom: 3,
  },
  priceValue: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  profitText: {
    color: Colors.long,
  },
  lossText: {
    color: Colors.short,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  metricPill: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  metricPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  chainPill: {
    backgroundColor: 'rgba(0, 210, 255, 0.12)',
    borderWidth: 1,
    borderColor: Colors.cyan,
  },
  chainText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.cyan,
    fontFamily: 'monospace',
  },
  actionBtn: {
    backgroundColor: 'rgba(14, 203, 129, 0.12)',
    borderWidth: 1,
    borderColor: Colors.long,
    borderRadius: 6,
    paddingVertical: 9,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.long,
    letterSpacing: 0.3,
  },
  rationaleBox: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    marginTop: 6,
  },
  rationaleTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  bulletText: {
    fontSize: 10,
    color: Colors.textSecondary,
    lineHeight: 15,
    marginBottom: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
