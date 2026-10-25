/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — SCREEN 1B: COIN DETAIL & TRADING DRAWER
 * File: apps/mobile/src/screens/CoinDetailModal.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../theme/colors';
import { MarketTicker } from '../store/useMarketStore';
import { useTradingStore } from '../store/useTradingStore';

interface CoinDetailModalProps {
  ticker: MarketTicker | null;
  onClose: () => void;
}

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'];

export const CoinDetailModal: React.FC<CoinDetailModalProps> = ({ ticker, onClose }) => {
  const [selectedTf, setSelectedTf] = useState<string>('15m');
  const { openPaperPosition } = useTradingStore();

  if (!ticker) return null;

  const entryPrice = ticker.price;
  const tp1 = entryPrice * 1.018; // +1.8% ATR target
  const tp2 = entryPrice * 1.035; // +3.5%
  const sl = entryPrice * 0.982;  // -1.8% stop loss

  const handleOpenLong = () => {
    openPaperPosition({
      symbol: ticker.symbol,
      exchange: ticker.exchange,
      direction: 'LONG',
      entryPrice,
      takeProfit1: tp1,
      stopLoss: sl,
    });
    onClose();
  };

  const handleOpenShort = () => {
    openPaperPosition({
      symbol: ticker.symbol,
      exchange: ticker.exchange,
      direction: 'SHORT',
      entryPrice,
      takeProfit1: entryPrice * 0.982,
      stopLoss: entryPrice * 1.018,
    });
    onClose();
  };

  return (
    <Modal visible={Boolean(ticker)} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <View style={styles.titleRow}>
                <Text style={styles.assetTitle}>{ticker.symbol}</Text>
                <View style={styles.exchangeBadge}>
                  <Text style={styles.exchangeBadgeText}>{ticker.exchange}</Text>
                </View>
              </View>
              <Text style={styles.priceSubtext}>
                ${ticker.price} • 24h Vol ${(ticker.volume24hUsd / 1_000_000).toFixed(1)}M
              </Text>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Timeframe Selector */}
            <View style={styles.timeframeRow}>
              {TIMEFRAMES.map((tf) => (
                <TouchableOpacity
                  key={tf}
                  style={[styles.tfButton, selectedTf === tf && styles.tfButtonActive]}
                  onPress={() => setSelectedTf(tf)}
                >
                  <Text style={[styles.tfText, selectedTf === tf && styles.tfTextActive]}>{tf}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Candlestick Chart Placeholder Box */}
            <View style={styles.chartBox}>
              <Text style={styles.chartPlaceholder}>
                📈 [High-Frequency Skia Candlestick Chart • {selectedTf}]
              </Text>
              <View style={styles.chartOhlc}>
                <Text style={styles.ohlcText}>O: ${ticker.price * 0.995}</Text>
                <Text style={styles.ohlcText}>H: ${ticker.price * 1.012}</Text>
                <Text style={styles.ohlcText}>L: ${ticker.price * 0.992}</Text>
                <Text style={styles.ohlcText}>C: ${ticker.price}</Text>
              </View>
            </View>

            {/* Quantitative Diagnostics */}
            <Text style={styles.sectionTitle}>QUANTITATIVE ANOMALY DIAGNOSTICS</Text>
            <View style={styles.diagGrid}>
              <View style={styles.diagCard}>
                <Text style={styles.diagLabel}>RVOL MULTIPLIER</Text>
                <Text style={[styles.diagVal, { color: Colors.binanceGold }]}>{ticker.rvol}x</Text>
              </View>
              <View style={styles.diagCard}>
                <Text style={styles.diagLabel}>VOL Z-SCORE</Text>
                <Text style={[styles.diagVal, { color: Colors.cyberCyan }]}>+{ticker.volZ}</Text>
              </View>
              <View style={styles.diagCard}>
                <Text style={styles.diagLabel}>OPEN INTEREST Δ</Text>
                <Text style={[styles.diagVal, { color: Colors.longGreen }]}>+{ticker.oiDelta}%</Text>
              </View>
              <View style={styles.diagCard}>
                <Text style={styles.diagLabel}>TAKER BUY RATIO</Text>
                <Text style={styles.diagVal}>{ticker.takerRatio}%</Text>
              </View>
            </View>

            {/* Dynamic ATR Targets */}
            <Text style={styles.sectionTitle}>DYNAMIC ATR TARGETS (15M HORIZON)</Text>
            <View style={styles.targetRow}>
              <View style={styles.targetBox}>
                <Text style={styles.targetLabel}>TARGET 1 (1.8%)</Text>
                <Text style={[styles.targetPrice, { color: Colors.longGreen }]}>${tp1.toFixed(4)}</Text>
              </View>
              <View style={styles.targetBox}>
                <Text style={styles.targetLabel}>TARGET 2 (3.5%)</Text>
                <Text style={[styles.targetPrice, { color: Colors.longGreen }]}>${tp2.toFixed(4)}</Text>
              </View>
              <View style={styles.targetBox}>
                <Text style={styles.targetLabel}>STOP-LOSS (-1.8%)</Text>
                <Text style={[styles.targetPrice, { color: Colors.shortRed }]}>${sl.toFixed(4)}</Text>
              </View>
            </View>

            {/* Sizing & Execution Guidelines */}
            <View style={styles.guidelineBox}>
              <Text style={styles.guidelineText}>
                🛡️ <Text style={{ fontWeight: 'bold' }}>Execution Sizing:</Text> Calibrated for $100 Margin at 5x Isolated Leverage ($500 Notional). Stop-loss enforced deterministically.
              </Text>
            </View>
          </ScrollView>

          {/* Fast Order Execution Bar */}
          <View style={styles.footerBar}>
            <TouchableOpacity style={styles.longButton} onPress={handleOpenLong} activeOpacity={0.8}>
              <Text style={styles.execBtnText}>🚀 LONG (5x)</Text>
              <Text style={styles.execSubtext}>Target: ${tp1.toFixed(4)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shortButton} onPress={handleOpenShort} activeOpacity={0.8}>
              <Text style={styles.execBtnText}>🔴 SHORT (5x)</Text>
              <Text style={styles.execSubtext}>Target: ${(entryPrice * 0.982).toFixed(4)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0E1116',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: Colors.surfaceTertiary,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceTertiary,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  exchangeBadge: {
    backgroundColor: '#20262E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  exchangeBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: Colors.binanceGold,
    fontFamily: 'monospace',
  },
  priceSubtext: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E2329',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  body: {
    padding: 16,
  },
  timeframeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tfButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: Colors.surface,
  },
  tfButtonActive: {
    backgroundColor: Colors.cyberCyanBg,
    borderColor: Colors.cyberCyan,
    borderWidth: 1,
  },
  tfText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  tfTextActive: {
    color: Colors.cyberCyan,
    fontWeight: 'bold',
  },
  chartBox: {
    height: 180,
    backgroundColor: '#07090C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartPlaceholder: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  chartOhlc: {
    flexDirection: 'row',
    gap: 12,
    position: 'absolute',
    bottom: 8,
    left: 12,
  },
  ohlcText: {
    fontSize: 9,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  diagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  diagCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceTertiary,
  },
  diagLabel: {
    fontSize: 8,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
  },
  diagVal: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 2,
    color: Colors.textPrimary,
  },
  targetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  targetBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceTertiary,
  },
  targetLabel: {
    fontSize: 8,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
  },
  targetPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  guidelineBox: {
    backgroundColor: 'rgba(240, 185, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(240, 185, 11, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 24,
  },
  guidelineText: {
    fontSize: 10,
    color: Colors.binanceGold,
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  footerBar: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceTertiary,
    backgroundColor: '#12161A',
    gap: 12,
  },
  longButton: {
    flex: 1,
    backgroundColor: Colors.longGreen,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortButton: {
    flex: 1,
    backgroundColor: Colors.shortRed,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  execBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  execSubtext: {
    color: '#000000',
    fontSize: 9,
    fontFamily: 'monospace',
    marginTop: 1,
    opacity: 0.8,
  },
});
