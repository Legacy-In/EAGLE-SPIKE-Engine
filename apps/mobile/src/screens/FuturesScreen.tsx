/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — SCREEN 3: FUTURES & PAPER SANDBOX TERMINAL
 * File: apps/mobile/src/screens/FuturesScreen.tsx
 * Ultra-Premium Binance Pro dark-slate aesthetic & live price evaluation
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useTradingStore, Position, SettledTrade } from '../store/useTradingStore';
import { useMarketStore } from '../store/useMarketStore';

export const FuturesScreen: React.FC = () => {
  const {
    tradingMode,
    setTradingMode,
    equity,
    balance,
    realizedPnl,
    winRate,
    availableMargin,
    activePositions,
    closedTrades,
    closePosition,
    moveStopToBreakeven,
    resetPortfolio,
    openPaperPosition,
  } = useTradingStore();

  const { tickers } = useMarketStore();

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'CLOSED'>('ACTIVE');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);

  // New Order Form State
  const [orderSymbol, setOrderSymbol] = useState<string>('BTCUSDT');
  const [orderSide, setOrderSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [orderLeverage, setOrderLeverage] = useState<number>(10);
  const [orderMargin, setOrderMargin] = useState<number>(200);

  const currentTicker = tickers.get(`${orderSymbol}_BINANCE`);
  const livePrice = currentTicker?.price || 68450.0;

  const handleExecuteOrder = () => {
    if (orderMargin > availableMargin) {
      Alert.alert('Margin Exceeded', 'You do not have enough available margin for this trade.');
      return;
    }

    const isLong = orderSide === 'LONG';
    const tp = isLong ? livePrice * 1.03 : livePrice * 0.97;
    const sl = isLong ? livePrice * 0.985 : livePrice * 1.015;

    openPaperPosition({
      symbol: orderSymbol,
      exchange: 'BINANCE',
      direction: orderSide,
      entryPrice: livePrice,
      marginUsd: orderMargin,
      leverage: orderLeverage,
      takeProfit1: tp,
      stopLoss: sl,
    });

    setIsOrderModalOpen(false);
  };

  return (
    <View style={styles.container}>
      {/* ─── 1. TOP HEADER & MODE SWITCHER ─── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📈 FUTURES TERMINAL</Text>
          <Text style={styles.headerSub}>Deterministic Execution & Risk Engine</Text>
        </View>

        <View style={styles.modeSwitchRow}>
          <TouchableOpacity
            style={[styles.modePill, tradingMode === 'paper' && styles.modePillPaperActive]}
            onPress={() => setTradingMode('paper')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modePillText, tradingMode === 'paper' && styles.modePillPaperText]}>
              🧪 PAPER
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modePill, tradingMode === 'live' && styles.modePillLiveActive]}
            onPress={() => {
              setTradingMode('live');
              Alert.alert('Live Execution', 'Live trading uses your connected API keys in settings.');
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.modePillText, tradingMode === 'live' && styles.modePillLiveText]}>
              ⚡ LIVE
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
            <Text style={styles.statLabel}>ACTIVE / CLOSED</Text>
            <Text style={styles.statValue}>
              {activePositions.length} / {closedTrades.length}
            </Text>
          </View>
        </View>

        <View style={styles.cardBtnRow}>
          <TouchableOpacity
            style={styles.newOrderBtn}
            onPress={() => setIsOrderModalOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.newOrderText}>+ NEW ORDER</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              Alert.alert('Reset Sandbox', 'Reset paper trading portfolio back to $10,000 baseline?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', onPress: () => resetPortfolio(10000), style: 'destructive' },
              ]);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.resetText}>🔄 Reset $10k</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── 3. SUBTABS ─── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'ACTIVE' && styles.tabButtonActive]}
          onPress={() => setActiveTab('ACTIVE')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabButtonText, activeTab === 'ACTIVE' && styles.tabButtonTextActive]}>
            Active Positions ({activePositions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'CLOSED' && styles.tabButtonActive]}
          onPress={() => setActiveTab('CLOSED')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabButtonText, activeTab === 'CLOSED' && styles.tabButtonTextActive]}>
            Settled History ({closedTrades.length})
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
                    <Text style={styles.priceLabel}>ENTRY</Text>
                    <Text style={styles.priceVal}>${item.entryPrice.toLocaleString()}</Text>
                  </View>
                  <View>
                    <Text style={styles.priceLabel}>LIVE MARK</Text>
                    <Text style={[styles.priceVal, styles.textCyan]}>
                      ${item.markPrice.toLocaleString()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.priceLabel}>TARGET TP</Text>
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
                    activeOpacity={0.7}
                  >
                    <Text style={styles.beText}>⚡ Move SL to Breakeven</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => closePosition(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.closeBtnText}>✕ Close Market</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Active Positions</Text>
              <Text style={styles.emptySubtitle}>
                Tap "+ NEW ORDER" or execute a signal from the SIGNALS feed
              </Text>
            </View>
          }
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
                    In: ${item.entryPrice.toLocaleString()} → Out: ${item.exitPrice.toLocaleString()}
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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Settled Trades</Text>
              <Text style={styles.emptySubtitle}>Completed trades will be recorded here</Text>
            </View>
          }
        />
      )}

      {/* ─── 5. NEW ORDER MODAL ─── */}
      <Modal visible={isOrderModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚡ EXECUTE PAPER ORDER</Text>
              <TouchableOpacity onPress={() => setIsOrderModalOpen(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Symbol Picker */}
            <Text style={styles.formLabel}>SELECT ASSET</Text>
            <View style={styles.chipRow}>
              {['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'BNBUSDT'].map((sym) => (
                <TouchableOpacity
                  key={sym}
                  style={[styles.formChip, orderSymbol === sym && styles.formChipActive]}
                  onPress={() => setOrderSymbol(sym)}
                >
                  <Text style={[styles.formChipText, orderSymbol === sym && styles.formChipTextActive]}>
                    {sym.replace('USDT', '')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Live Price Tag */}
            <View style={styles.livePriceTag}>
              <Text style={styles.livePriceLabel}>LIVE BINANCE FUTURES PRICE:</Text>
              <Text style={styles.livePriceVal}>${livePrice.toLocaleString()}</Text>
            </View>

            {/* Direction Selector */}
            <Text style={styles.formLabel}>DIRECTION</Text>
            <View style={styles.sideBtnRow}>
              <TouchableOpacity
                style={[styles.sideBtn, orderSide === 'LONG' && styles.sideBtnLong]}
                onPress={() => setOrderSide('LONG')}
              >
                <Text style={[styles.sideBtnText, orderSide === 'LONG' && styles.textWhite]}>
                  ▲ LONG (BUY)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sideBtn, orderSide === 'SHORT' && styles.sideBtnShort]}
                onPress={() => setOrderSide('SHORT')}
              >
                <Text style={[styles.sideBtnText, orderSide === 'SHORT' && styles.textWhite]}>
                  ▼ SHORT (SELL)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Leverage Selector */}
            <Text style={styles.formLabel}>LEVERAGE</Text>
            <View style={styles.chipRow}>
              {[5, 10, 20, 50].map((lev) => (
                <TouchableOpacity
                  key={lev}
                  style={[styles.formChip, orderLeverage === lev && styles.formChipActive]}
                  onPress={() => setOrderLeverage(lev)}
                >
                  <Text style={[styles.formChipText, orderLeverage === lev && styles.formChipTextActive]}>
                    {lev}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Margin Allocation */}
            <Text style={styles.formLabel}>MARGIN ALLOCATION ($USD)</Text>
            <View style={styles.chipRow}>
              {[100, 200, 500, 1000].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.formChip, orderMargin === m && styles.formChipActive]}
                  onPress={() => setOrderMargin(m)}
                >
                  <Text style={[styles.formChipText, orderMargin === m && styles.formChipTextActive]}>
                    ${m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Total Position Value Summary */}
            <View style={styles.orderSummaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Position Notional:</Text>
                <Text style={styles.summaryVal}>
                  ${(orderMargin * orderLeverage).toLocaleString()} USD
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Auto Take-Profit (+3.0%):</Text>
                <Text style={[styles.summaryVal, styles.textGreen]}>
                  ${(orderSide === 'LONG' ? livePrice * 1.03 : livePrice * 0.97).toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Auto Stop-Loss (-1.5%):</Text>
                <Text style={[styles.summaryVal, styles.textRed]}>
                  ${(orderSide === 'LONG' ? livePrice * 0.985 : livePrice * 1.015).toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitOrderBtn, orderSide === 'LONG' ? styles.bgLong : styles.bgShort]}
              onPress={handleExecuteOrder}
              activeOpacity={0.8}
            >
              <Text style={styles.submitOrderText}>
                CONFIRM {orderSide} {orderSymbol} ({orderLeverage}x)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modeSwitchRow: {
    flexDirection: 'row',
    backgroundColor: '#181A20',
    borderRadius: 6,
    padding: 2,
    borderWidth: 1,
    borderColor: '#2B313A',
  },
  modePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  modePillPaperActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  modePillPaperText: {
    color: '#0ECB81',
    fontWeight: '800',
  },
  modePillLiveActive: {
    backgroundColor: 'rgba(240, 185, 11, 0.2)',
  },
  modePillLiveText: {
    color: '#F0B90B',
    fontWeight: '800',
  },
  modePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#848E9C',
    fontFamily: 'monospace',
  },
  portfolioCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: '#181A20',
    borderColor: '#1E2329',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  equityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  equityLabel: {
    fontSize: 9,
    color: '#848E9C',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  winRateBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  winRateText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0ECB81',
    fontFamily: 'monospace',
  },
  equityValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#EAECEF',
    fontFamily: 'monospace',
    marginTop: 4,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#2B313A',
    paddingTop: 8,
  },
  statLabel: {
    fontSize: 8,
    color: '#848E9C',
    fontWeight: '700',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#EAECEF',
    fontFamily: 'monospace',
  },
  cardBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  newOrderBtn: {
    flex: 1,
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#00D2FF',
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
  },
  newOrderText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#00D2FF',
    fontFamily: 'monospace',
  },
  resetButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#1E2329',
    borderRadius: 6,
    alignItems: 'center',
  },
  resetText: {
    fontSize: 10,
    color: '#848E9C',
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#181A20',
    borderWidth: 1,
    borderColor: '#1E2329',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(0, 210, 255, 0.12)',
    borderColor: '#00D2FF',
  },
  tabButtonText: {
    fontSize: 11,
    color: '#848E9C',
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#00D2FF',
    fontWeight: '800',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },
  posCard: {
    backgroundColor: '#181A20',
    borderColor: '#1E2329',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  posTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  posTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  posSymbol: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#EAECEF',
    fontFamily: 'monospace',
  },
  dirTag: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  tagLong: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  tagShort: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  dirTagText: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  posExchange: {
    fontSize: 9,
    color: '#848E9C',
    fontFamily: 'monospace',
  },
  pnlText: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  pnlPct: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#12161A',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 8,
    color: '#848E9C',
    marginBottom: 2,
  },
  priceVal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#EAECEF',
    fontFamily: 'monospace',
  },
  textGreen: {
    color: '#0ECB81',
  },
  textRed: {
    color: '#F6465D',
  },
  textCyan: {
    color: '#00D2FF',
  },
  textWhite: {
    color: '#FFFFFF',
  },
  posActions: {
    flexDirection: 'row',
    gap: 8,
  },
  beButton: {
    flex: 1,
    backgroundColor: '#1E2329',
    paddingVertical: 6,
    borderRadius: 4,
    alignItems: 'center',
  },
  beText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00D2FF',
  },
  closeButton: {
    paddingHorizontal: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 6,
    borderRadius: 4,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
  },
  closedCard: {
    backgroundColor: '#181A20',
    borderColor: '#1E2329',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closedSub: {
    fontSize: 10,
    color: '#848E9C',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  closedR: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#848E9C',
    fontFamily: 'monospace',
    marginTop: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#181A20',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2B313A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#00D2FF',
    fontFamily: 'monospace',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#848E9C',
  },
  formLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#848E9C',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  formChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#12161A',
    borderWidth: 1,
    borderColor: '#2B313A',
  },
  formChipActive: {
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    borderColor: '#00D2FF',
  },
  formChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#848E9C',
  },
  formChipTextActive: {
    color: '#00D2FF',
  },
  livePriceTag: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#12161A',
    padding: 8,
    borderRadius: 6,
    marginVertical: 4,
  },
  livePriceLabel: {
    fontSize: 9,
    color: '#848E9C',
    fontWeight: '700',
  },
  livePriceVal: {
    fontSize: 12,
    fontWeight: '900',
    color: '#F0B90B',
    fontFamily: 'monospace',
  },
  sideBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  sideBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#12161A',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2B313A',
  },
  sideBtnLong: {
    backgroundColor: '#0ECB81',
    borderColor: '#0ECB81',
  },
  sideBtnShort: {
    backgroundColor: '#F6465D',
    borderColor: '#F6465D',
  },
  sideBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#848E9C',
  },
  orderSummaryCard: {
    backgroundColor: '#12161A',
    borderRadius: 6,
    padding: 10,
    marginVertical: 10,
    gap: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#848E9C',
  },
  summaryVal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#EAECEF',
    fontFamily: 'monospace',
  },
  submitOrderBtn: {
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  bgLong: {
    backgroundColor: '#0ECB81',
  },
  bgShort: {
    backgroundColor: '#F6465D',
  },
  submitOrderText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0B0E11',
    fontFamily: 'monospace',
  },
});
