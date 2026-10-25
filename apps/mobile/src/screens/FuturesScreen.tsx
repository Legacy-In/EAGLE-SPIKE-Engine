/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — SCREEN 3: FUTURES & PAPER SANDBOX TERMINAL
 * File: apps/mobile/src/screens/FuturesScreen.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { useTradingStore, Position, SettledTrade } from '../store/useTradingStore';

export const FuturesScreen: React.FC = () => {
  const {
    tradingMode,
    setTradingMode,
    equity,
    realizedPnl,
    winRate,
    availableMargin,
    activePositions,
    closedTrades,
    closePosition,
    moveStopToBreakeven,
    resetPortfolio,
  } = useTradingStore();

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'CLOSED'>('ACTIVE');

  return (
    <View style={styles.container}>
      {/* ─── 1. TOP HEADER & MODE SWITCHER ─── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🧪 FUTURES TERMINAL</Text>
          <Text style={styles.headerSub}>Deterministic Quantitative Execution</Text>
        </View>

        <View style={styles.modeSwitchRow}>
          <TouchableOpacity
            style={[styles.modePill, tradingMode === 'paper' && styles.modePillActive]}
            onPress={() => setTradingMode('paper')}
          >
            <Text style={[styles.modePillText, tradingMode === 'paper' && styles.modePillTextActive]}>
              PAPER
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modePill, tradingMode === 'live' && styles.modePillLiveActive]}
            onPress={() => setTradingMode('live')}
          >
            <Text style={[styles.modePillText, tradingMode === 'live' && styles.modePillLiveText]}>
              LIVE
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── 2. PORTFOLIO EQUITY CARD ─── */}
      <View style={styles.portfolioCard}>
        <View style={styles.equityHeader}>
          <Text style={styles.equityLabel}>
            {tradingMode === 'paper' ? 'VIRTUAL SANDBOX EQUITY' : 'EXCHANGE FUTURES BALANCE'}
          </Text>
          <View style={styles.winRateBadge}>
            <Text style={styles.winRateText}>{winRate.toFixed(1)}% WIN-RATE</Text>
          </View>
        </View>

        <Text style={styles.equityValue}>
          ${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>

        <View style={styles.statsRow}>
          <View>
            <Text style={styles.statLabel}>REALIZED PNL</Text>
            <Text style={[styles.statValue, realizedPnl >= 0 ? styles.textGreen : styles.textRed]}>
              {realizedPnl >= 0 ? '+' : ''}${realizedPnl.toFixed(2)}
            </Text>
          </View>
          <View>
            <Text style={styles.statLabel}>AVAILABLE MARGIN</Text>
            <Text style={styles.statValue}>${availableMargin.toFixed(2)}</Text>
          </View>
          <View>
            <Text style={styles.statLabel}>POSITIONS</Text>
            <Text style={styles.statValue}>{activePositions.length} Active</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={() => resetPortfolio(10000)}>
          <Text style={styles.resetText}>🔄 Reset Sandbox Baseline ($10,000)</Text>
        </TouchableOpacity>
      </View>

      {/* ─── 3. SUBTABS ─── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'ACTIVE' && styles.tabButtonActive]}
          onPress={() => setActiveTab('ACTIVE')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'ACTIVE' && styles.tabButtonTextActive]}>
            Active Positions ({activePositions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'CLOSED' && styles.tabButtonActive]}
          onPress={() => setActiveTab('CLOSED')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'CLOSED' && styles.tabButtonTextActive]}>
            Closed History ({closedTrades.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── 4. POSITIONS LIST ─── */}
      {activeTab === 'ACTIVE' ? (
        <FlatList
          data={activePositions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const isLong = item.direction === 'LONG';
            const isPnlPositive = item.unrealizedPnlUsd >= 0;

            return (
              <View style={styles.posCard}>
                <View style={styles.posTop}>
                  <View style={styles.posTitleGroup}>
                    <Text style={styles.posSymbol}>{item.symbol}</Text>
                    <View style={[styles.dirTag, isLong ? styles.tagLong : styles.tagShort]}>
                      <Text style={[styles.dirTagText, isLong ? styles.textGreen : styles.textRed]}>
                        {item.direction} {item.leverage}x
                      </Text>
                    </View>
                    <Text style={styles.posExchange}>({item.exchange})</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.pnlText, isPnlPositive ? styles.textGreen : styles.textRed]}>
                      {isPnlPositive ? '+' : ''}${item.unrealizedPnlUsd.toFixed(2)}
                    </Text>
                    <Text style={[styles.pnlPct, isPnlPositive ? styles.textGreen : styles.textRed]}>
                      ({isPnlPositive ? '+' : ''}
                      {item.unrealizedPnlPct.toFixed(1)}% • {item.realizedR.toFixed(2)}R)
                    </Text>
                  </View>
                </View>

                {/* Price Details */}
                <View style={styles.priceRow}>
                  <View>
                    <Text style={styles.priceLabel}>ENTRY PRICE</Text>
                    <Text style={styles.priceVal}>${item.entryPrice.toLocaleString()}</Text>
                  </View>
                  <View>
                    <Text style={styles.priceLabel}>MARK PRICE</Text>
                    <Text style={styles.priceVal}>${item.markPrice.toLocaleString()}</Text>
                  </View>
                  <View>
                    <Text style={styles.priceLabel}>TARGET TP1</Text>
                    <Text style={[styles.priceVal, styles.textGreen]}>
                      ${item.takeProfit1.toLocaleString()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.priceLabel}>STOP LOSS</Text>
                    <Text style={[styles.priceVal, styles.textRed]}>
                      ${item.stopLoss.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.posActions}>
                  <TouchableOpacity
                    style={styles.beButton}
                    onPress={() => moveStopToBreakeven(item.id)}
                  >
                    <Text style={styles.beText}>⚡ Move SL to Breakeven</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => closePosition(item.id)}
                  >
                    <Text style={styles.closeBtnText}>✕ Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          data={closedTrades}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const isWin = item.outcome === 'WIN';
            return (
              <View style={styles.closedCard}>
                <View>
                  <View style={styles.posTitleGroup}>
                    <Text style={styles.posSymbol}>{item.symbol}</Text>
                    <View style={[styles.dirTag, isWin ? styles.tagLong : styles.tagShort]}>
                      <Text style={[styles.dirTagText, isWin ? styles.textGreen : styles.textRed]}>
                        {item.outcome}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.closedSub}>
                    In: ${item.entryPrice} → Out: ${item.exitPrice}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.pnlText, isWin ? styles.textGreen : styles.textRed]}>
                    {item.realizedPnlUsd >= 0 ? '+' : ''}${item.realizedPnlUsd.toFixed(2)}
                  </Text>
                  <Text style={styles.closedR}>{item.realizedR.toFixed(2)}R</Text>
                </View>
              </View>
            );
          }}
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
  headerSub: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  modeSwitchRow: {
    flexDirection: 'row',
    backgroundColor: '#1C222A',
    borderRadius: 8,
    padding: 3,
  },
  modePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  modePillActive: {
    backgroundColor: Colors.longGreenBg,
  },
  modePillLiveActive: {
    backgroundColor: Colors.binanceGoldBg,
  },
  modePillText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  modePillTextActive: {
    color: Colors.longGreen,
  },
  modePillLiveText: {
    color: Colors.binanceGold,
  },
  portfolioCard: {
    margin: 16,
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceTertiary,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  equityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  equityLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  winRateBadge: {
    backgroundColor: Colors.longGreenBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  winRateText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: Colors.longGreen,
    fontFamily: 'monospace',
  },
  equityValue: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    marginTop: 4,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#242C36',
    paddingTop: 10,
  },
  statLabel: {
    fontSize: 8,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
  },
  statValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  resetButton: {
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: '#1E252E',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceTertiary,
  },
  resetText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#20262E',
    borderWidth: 1,
    borderColor: Colors.surfaceTertiary,
  },
  tabButtonText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  tabButtonTextActive: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  posCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceTertiary,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  posTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  posTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  posSymbol: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  dirTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagLong: {
    backgroundColor: Colors.longGreenBg,
  },
  tagShort: {
    backgroundColor: Colors.shortRedBg,
  },
  dirTagText: {
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  posExchange: {
    fontSize: 9,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
  },
  pnlText: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  pnlPct: {
    fontSize: 9,
    fontFamily: 'monospace',
    marginTop: 1,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#12161A',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 8,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
  },
  priceVal: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  posActions: {
    flexDirection: 'row',
    gap: 8,
  },
  beButton: {
    flex: 2,
    backgroundColor: '#1C232C',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  beText: {
    fontSize: 10,
    color: Colors.cyberCyan,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  closeButton: {
    flex: 1,
    backgroundColor: Colors.shortRedBg,
    borderColor: Colors.shortRed,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 10,
    color: Colors.shortRed,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  closedCard: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closedSub: {
    fontSize: 9,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  closedR: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  textGreen: {
    color: Colors.longGreen,
  },
  textRed: {
    color: Colors.shortRed,
  },
});
