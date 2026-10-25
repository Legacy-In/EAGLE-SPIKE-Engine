/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — SCREEN 4: WHALE RADAR & ON-CHAIN INTELLIGENCE
 * File: apps/mobile/src/screens/WhaleRadarScreen.tsx
 * Production-Ready: Supabase Live Stream & On-Chain Inflow Tracker
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import {
  fetchWhaleTrades,
  fetchManipulationAlerts,
  subscribeToWhaleTrades,
  LiveWhaleTrade,
  LiveManipulationAlert,
} from '../services/supabase';

export interface UnifiedWhaleEvent {
  id: string;
  sourceType: 'TRADE' | 'ONCHAIN';
  category: 'ACCUMULATION' | 'ONCHAIN' | 'ANOMALY';
  symbol: string;
  exchange: string;
  amountUsd: number;
  direction: 'BUY' | 'SELL' | 'ALERT';
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: string;
  txHash?: string;
  detectedAt: string;
}

function timeAgo(dateString: string): string {
  try {
    const diff = Date.now() - new Date(dateString).getTime();
    if (isNaN(diff)) return 'Just now';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return 'Recently';
  }
}

export const WhaleRadarScreen: React.FC = () => {
  const [filter, setFilter] = useState<'ALL' | 'ACCUMULATION' | 'ONCHAIN' | 'ANOMALIES'>('ALL');
  const [events, setEvents] = useState<UnifiedWhaleEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      const [trades, alerts] = await Promise.all([
        fetchWhaleTrades(40),
        fetchManipulationAlerts(40),
      ]);

      const formattedTrades: UnifiedWhaleEvent[] = trades.map((t) => ({
        id: `wt-${t.id}`,
        sourceType: 'TRADE',
        category: 'ACCUMULATION',
        symbol: t.symbol,
        exchange: t.exchange,
        amountUsd: Number(t.amount_usdt) || 0,
        direction: t.side,
        details: `${t.side === 'BUY' ? 'Aggressive market taker buy absorption' : 'Block order sell distribution'} executed at $${Number(t.execution_price).toLocaleString()}`,
        detectedAt: t.detected_at,
      }));

      const formattedAlerts: UnifiedWhaleEvent[] = alerts.map((a) => {
        const metrics = a.metrics_json || {};
        const isDeposit = metrics.onchain_action === 'WHALE_EXCHANGE_DEPOSIT';
        const isDumpRisk = a.alert_type === 'PUMP_AND_DUMP_RISK';
        return {
          id: `ma-${a.id}`,
          sourceType: 'ONCHAIN',
          category: isDumpRisk ? 'ANOMALY' : 'ONCHAIN',
          symbol: a.symbol,
          exchange: metrics.to_exchange || 'ETHERSCAN_ONCHAIN',
          amountUsd: Number(metrics.amount_usd) || 0,
          direction: isDumpRisk ? 'SELL' : 'BUY',
          severity: a.severity,
          details: metrics.warning || `${a.alert_type.replace(/_/g, ' ')} detected on ${metrics.to_exchange || 'CEX'}`,
          txHash: metrics.tx_hash,
          detectedAt: a.detected_at,
        };
      });

      const combined = [...formattedTrades, ...formattedAlerts].sort(
        (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
      );

      setEvents(combined);
    } catch (e) {
      console.warn('Error loading whale radar data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to new real-time whale trades
    const sub = subscribeToWhaleTrades((newTrade) => {
      const formatted: UnifiedWhaleEvent = {
        id: `wt-${newTrade.id}`,
        sourceType: 'TRADE',
        category: 'ACCUMULATION',
        symbol: newTrade.symbol,
        exchange: newTrade.exchange,
        amountUsd: Number(newTrade.amount_usdt) || 0,
        direction: newTrade.side,
        details: `⚡ Real-time block execution: $${Number(newTrade.amount_usdt).toLocaleString()} at $${Number(newTrade.execution_price).toLocaleString()}`,
        detectedAt: newTrade.detected_at,
      };
      setEvents((prev) => [formatted, ...prev]);
    });

    return () => {
      sub.unsubscribe();
    };
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Metrics summary
  const metrics = useMemo(() => {
    let buyVol = 0;
    let sellVol = 0;
    events.forEach((e) => {
      if (e.direction === 'BUY') buyVol += e.amountUsd;
      else if (e.direction === 'SELL') sellVol += e.amountUsd;
    });
    const totalVol = buyVol + sellVol;
    const buyPct = totalVol > 0 ? (buyVol / totalVol) * 100 : 50;
    return {
      totalVol,
      buyVol,
      sellVol,
      buyPct,
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (filter === 'ACCUMULATION') return e.category === 'ACCUMULATION';
      if (filter === 'ONCHAIN') return e.category === 'ONCHAIN';
      if (filter === 'ANOMALIES') return e.category === 'ANOMALY';
      return true;
    });
  }, [events, filter]);

  return (
    <View style={styles.container}>
      {/* ─── 1. HEADER ─── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🐋 WHALE RADAR & ON-CHAIN</Text>
          <Text style={styles.headerSub}>Smart Money Inflow & Large Block Order Flow</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE CDC</Text>
        </View>
      </View>

      {/* ─── 2. AGGREGATE FLOW STATS CARD ─── */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>24H TRACKED VOL</Text>
            <Text style={styles.statValGold}>
              ${(metrics.totalVol / 1_000_000).toFixed(1)}M
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>NET ACCUMULATION</Text>
            <Text style={metrics.buyPct >= 50 ? styles.statValGreen : styles.statValRed}>
              {metrics.buyPct.toFixed(1)}% BUY
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>WHALE EVENTS</Text>
            <Text style={styles.statValCyan}>{events.length} Live</Text>
          </View>
        </View>

        {/* Bull/Bear Volume Ratio Bar */}
        <View style={styles.ratioBarContainer}>
          <View style={[styles.ratioBarGreen, { flex: Math.max(0.05, metrics.buyPct) }]} />
          <View style={[styles.ratioBarRed, { flex: Math.max(0.05, 100 - metrics.buyPct) }]} />
        </View>
      </View>

      {/* ─── 3. FILTER TABS ─── */}
      <View style={styles.tabRow}>
        {(['ALL', 'ACCUMULATION', 'ONCHAIN', 'ANOMALIES'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabChip, filter === tab && styles.tabChipActive]}
            onPress={() => setFilter(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── 4. EVENTS FEED ─── */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.cyan} />
          <Text style={styles.loadingText}>Syncing Postgres Whale Ledger...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.cyan}
              colors={[Colors.cyan]}
            />
          }
          renderItem={({ item }) => {
            const isBuy = item.direction === 'BUY';
            const isAnomaly = item.category === 'ANOMALY';

            return (
              <View style={[styles.card, isAnomaly && styles.anomalyBorder]}>
                <View style={styles.cardTop}>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.typeBadge,
                        isAnomaly
                          ? styles.badgePurple
                          : isBuy
                          ? styles.badgeGreen
                          : styles.badgeRed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          isAnomaly
                            ? styles.textPurple
                            : isBuy
                            ? styles.textGreen
                            : styles.textRed,
                        ]}
                      >
                        {item.category === 'ANOMALY'
                          ? `⚠️ ${item.severity || 'CRITICAL'}`
                          : item.direction === 'BUY'
                          ? '▲ ACCUMULATION'
                          : '▼ DISTRIBUTION'}
                      </Text>
                    </View>
                    <Text style={styles.symbolText}>{item.symbol}</Text>
                  </View>
                  <Text style={styles.timeText}>{timeAgo(item.detectedAt)}</Text>
                </View>

                <Text style={styles.detailsText}>{item.details}</Text>

                <View style={styles.cardBottom}>
                  <View style={styles.exchangeBox}>
                    <Text style={styles.exchangeText}>{item.exchange.toUpperCase()}</Text>
                    {item.txHash ? (
                      <Text style={styles.txHashText}>
                        Tx: {item.txHash.slice(0, 8)}...{item.txHash.slice(-6)}
                      </Text>
                    ) : null}
                  </View>

                  {item.amountUsd > 0 && (
                    <Text style={styles.amountText}>
                      ${item.amountUsd >= 1_000_000
                        ? `${(item.amountUsd / 1_000_000).toFixed(2)}M`
                        : `${(item.amountUsd / 1_000).toFixed(0)}K`}{' '}
                      USD
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Whale Events Found</Text>
              <Text style={styles.emptySubtitle}>Listening to live on-chain and block trades</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E11',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#12161A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2329',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#00D2FF',
    letterSpacing: 0.8,
    fontFamily: 'monospace',
  },
  headerSub: {
    fontSize: 10,
    color: '#848E9C',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  statsCard: {
    backgroundColor: '#181A20',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E2329',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    color: '#848E9C',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValGold: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F0B90B',
    fontFamily: 'monospace',
  },
  statValGreen: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0ECB81',
    fontFamily: 'monospace',
  },
  statValRed: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F6465D',
    fontFamily: 'monospace',
  },
  statValCyan: {
    fontSize: 14,
    fontWeight: '900',
    color: '#00D2FF',
    fontFamily: 'monospace',
  },
  ratioBarContainer: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: '#2B313A',
  },
  ratioBarGreen: {
    backgroundColor: '#0ECB81',
  },
  ratioBarRed: {
    backgroundColor: '#F6465D',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    backgroundColor: '#181A20',
    borderWidth: 1,
    borderColor: '#2B313A',
  },
  tabChipActive: {
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    borderColor: '#00D2FF',
  },
  tabText: {
    fontSize: 10,
    color: '#848E9C',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  tabTextActive: {
    color: '#00D2FF',
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },
  card: {
    backgroundColor: '#181A20',
    borderColor: '#1E2329',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  anomalyBorder: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(24, 26, 32, 0.95)',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  badgeGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  badgePurple: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  textGreen: {
    color: '#0ECB81',
  },
  textRed: {
    color: '#F6465D',
  },
  textPurple: {
    color: '#EF4444',
  },
  symbolText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#EAECEF',
    fontFamily: 'monospace',
  },
  timeText: {
    fontSize: 9,
    color: '#848E9C',
    fontFamily: 'monospace',
  },
  detailsText: {
    fontSize: 11,
    color: '#B7BDC6',
    fontFamily: 'monospace',
    lineHeight: 16,
    marginBottom: 8,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2B313A',
    paddingTop: 8,
  },
  exchangeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exchangeText: {
    fontSize: 9,
    color: '#848E9C',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  txHashText: {
    fontSize: 9,
    color: '#00D2FF',
    fontFamily: 'monospace',
  },
  amountText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#F0B90B',
    fontFamily: 'monospace',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 11,
    color: '#848E9C',
    fontFamily: 'monospace',
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#EAECEF',
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#848E9C',
    marginTop: 4,
  },
});
