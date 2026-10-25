/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — SCREEN 4: WHALE RADAR & ON-CHAIN INTELLIGENCE
 * File: apps/mobile/src/screens/WhaleRadarScreen.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';

interface WhaleEvent {
  id: string;
  type: 'EXCHANGE_ACCUMULATION' | 'ONCHAIN_TRANSFER' | 'NEW_LISTING';
  symbol: string;
  exchange: string;
  amountUsd: number;
  direction: 'BUY' | 'SELL' | 'LISTING';
  details: string;
  timeAgo: string;
}

const SEED_WHALE_EVENTS: WhaleEvent[] = [
  {
    id: 'WHALE-1',
    type: 'EXCHANGE_ACCUMULATION',
    symbol: 'BTCUSDT',
    exchange: 'BINANCE FUTURES',
    amountUsd: 14800000,
    direction: 'BUY',
    details: '+$14.8M net taker market buys in 15m window (4.8x baseline volume)',
    timeAgo: '2m ago',
  },
  {
    id: 'WHALE-2',
    type: 'ONCHAIN_TRANSFER',
    symbol: 'ETH',
    exchange: 'ETHERSCAN',
    amountUsd: 15800000,
    direction: 'SELL',
    details: 'Wallet 0x71C...84B2 (Jump Trading) deposited 4,500 ETH to Binance',
    timeAgo: '12m ago',
  },
  {
    id: 'WHALE-3',
    type: 'NEW_LISTING',
    symbol: 'ASTERUSDT',
    exchange: 'BYBIT LINEAR',
    amountUsd: 0,
    direction: 'LISTING',
    details: 'Newly listed USDT perpetual detected at $0.125 initial price',
    timeAgo: '45m ago',
  },
  {
    id: 'WHALE-4',
    type: 'EXCHANGE_ACCUMULATION',
    symbol: 'SOLUSDT',
    exchange: 'BYBIT LINEAR',
    amountUsd: 8200000,
    direction: 'BUY',
    details: '+$8.2M aggressive taker flow absorbing local ask liquidity',
    timeAgo: '1h ago',
  },
];

export const WhaleRadarScreen: React.FC = () => {
  const [filter, setFilter] = useState<'ALL' | 'ACCUMULATION' | 'ONCHAIN' | 'LISTINGS'>('ALL');

  const filteredEvents = SEED_WHALE_EVENTS.filter((e) => {
    if (filter === 'ACCUMULATION') return e.type === 'EXCHANGE_ACCUMULATION';
    if (filter === 'ONCHAIN') return e.type === 'ONCHAIN_TRANSFER';
    if (filter === 'LISTINGS') return e.type === 'NEW_LISTING';
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🐋 WHALE RADAR & ON-CHAIN</Text>
        <Text style={styles.headerSub}>Institutional Order Flow & Smart Money Tracking</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        {(['ALL', 'ACCUMULATION', 'ONCHAIN', 'LISTINGS'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabChip, filter === tab && styles.tabChipActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isBuy = item.direction === 'BUY';
          const isListing = item.direction === 'LISTING';

          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.typeBadge,
                      isListing
                        ? styles.badgePurple
                        : isBuy
                        ? styles.badgeGreen
                        : styles.badgeRed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        isListing
                          ? styles.textPurple
                          : isBuy
                          ? styles.textGreen
                          : styles.textRed,
                      ]}
                    >
                      {item.type}
                    </Text>
                  </View>
                  <Text style={styles.symbolText}>{item.symbol}</Text>
                </View>
                <Text style={styles.timeText}>{item.timeAgo}</Text>
              </View>

              <Text style={styles.detailsText}>{item.details}</Text>

              <View style={styles.cardBottom}>
                <Text style={styles.exchangeText}>{item.exchange}</Text>
                {item.amountUsd > 0 && (
                  <Text style={styles.amountText}>
                    ${(item.amountUsd / 1_000_000).toFixed(1)}M USD
                  </Text>
                )}
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
    color: Colors.cyberCyan,
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  headerSub: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  tabChipActive: {
    backgroundColor: Colors.cyberCyanBg,
    borderColor: Colors.cyberCyan,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  tabTextActive: {
    color: Colors.cyberCyan,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceTertiary,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeGreen: {
    backgroundColor: Colors.longGreenBg,
  },
  badgeRed: {
    backgroundColor: Colors.shortRedBg,
  },
  badgePurple: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  textGreen: {
    color: Colors.longGreen,
  },
  textRed: {
    color: Colors.shortRed,
  },
  textPurple: {
    color: '#C084FC',
  },
  symbolText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  timeText: {
    fontSize: 9,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
  },
  detailsText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    lineHeight: 16,
    marginBottom: 8,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#20262E',
    paddingTop: 8,
  },
  exchangeText: {
    fontSize: 9,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
  },
  amountText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.binanceGold,
    fontFamily: 'monospace',
  },
});
