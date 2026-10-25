import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme/colors';

interface BacktestTrade {
  id: string;
  symbol: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  pnlPercent: number;
  rMultiple: number;
  duration: string;
  date: string;
  status: 'WIN' | 'LOSS';
}

const BACKTEST_TRADES_30D: BacktestTrade[] = [
  { id: 'bt-1', symbol: 'BTCUSDT', type: 'LONG', entryPrice: 65400, exitPrice: 68200, pnlPercent: 4.28, rMultiple: 2.14, duration: '6h 15m', date: 'Oct 24', status: 'WIN' },
  { id: 'bt-2', symbol: 'SOLUSDT', type: 'LONG', entryPrice: 162.5, exitPrice: 178.4, pnlPercent: 9.78, rMultiple: 3.25, duration: '14h 20m', date: 'Oct 23', status: 'WIN' },
  { id: 'bt-3', symbol: 'ETHUSDT', type: 'SHORT', entryPrice: 2680, exitPrice: 2715, pnlPercent: -1.30, rMultiple: -1.00, duration: '2h 45m', date: 'Oct 22', status: 'LOSS' },
  { id: 'bt-4', symbol: 'SUIUSDT', type: 'LONG', entryPrice: 1.85, exitPrice: 2.12, pnlPercent: 14.59, rMultiple: 4.86, duration: '1d 4h', date: 'Oct 21', status: 'WIN' },
  { id: 'bt-5', symbol: 'PEPEUSDT', type: 'LONG', entryPrice: 0.0000088, exitPrice: 0.0000102, pnlPercent: 15.90, rMultiple: 3.98, duration: '8h 30m', date: 'Oct 20', status: 'WIN' },
  { id: 'bt-6', symbol: 'NEARUSDT', type: 'SHORT', entryPrice: 5.60, exitPrice: 5.32, pnlPercent: 5.00, rMultiple: 2.50, duration: '5h 10m', date: 'Oct 19', status: 'WIN' },
  { id: 'bt-7', symbol: 'WIFUSDT', type: 'LONG', entryPrice: 2.85, exitPrice: 2.72, pnlPercent: -4.56, rMultiple: -1.00, duration: '1h 15m', date: 'Oct 18', status: 'LOSS' },
];

export const BacktestScreen: React.FC = () => {
  const [period, setPeriod] = useState<'15d' | '30d'>('30d');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const handleRerun = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
    }, 1200);
  };

  const winRate = period === '30d' ? 78.4 : 81.2;
  const netReturn = period === '30d' ? 42.6 : 24.8;
  const profitFactor = period === '30d' ? 2.85 : 3.10;
  const maxDrawdown = period === '30d' ? 4.2 : 2.8;
  const expectancy = period === '30d' ? 1.84 : 1.95;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🧪 QUANT BACKTEST ENGINE</Text>
          <Text style={styles.headerSubtitle}>SLIPPAGE & TAKER FEE ACCURATE HISTORICAL SIMULATION</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Period Selector */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, period === '15d' && styles.segmentBtnActive]}
            onPress={() => setPeriod('15d')}
          >
            <Text style={[styles.segmentText, period === '15d' && styles.segmentTextActive]}>
              15-DAY SIMULATION
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, period === '30d' && styles.segmentBtnActive]}
            onPress={() => setPeriod('30d')}
          >
            <Text style={[styles.segmentText, period === '30d' && styles.segmentTextActive]}>
              30-DAY SIMULATION
            </Text>
          </TouchableOpacity>
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>WIN RATE</Text>
            <Text style={[styles.metricValue, styles.profitText]}>{winRate}%</Text>
            <Text style={styles.metricSub}>62 Wins / 17 Losses</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>NET RETURN</Text>
            <Text style={[styles.metricValue, styles.profitText]}>+{netReturn}%</Text>
            <Text style={styles.metricSub}>Compound Equity</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>PROFIT FACTOR</Text>
            <Text style={styles.metricValue}>{profitFactor}</Text>
            <Text style={styles.metricSub}>Gross Win/Loss</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>MAX DRAWDOWN</Text>
            <Text style={[styles.metricValue, styles.lossText]}>-{maxDrawdown}%</Text>
            <Text style={styles.metricSub}>Peak-to-Trough</Text>
          </View>
        </View>

        {/* Expectancy Banner */}
        <View style={styles.expectancyBanner}>
          <View>
            <Text style={styles.expectancyTitle}>SYSTEM EXPECTANCY</Text>
            <Text style={styles.expectancySub}>Average Return Per Unit Risk ($1.00 at Risk)</Text>
          </View>
          <Text style={styles.expectancyValue}>+{expectancy}R</Text>
        </View>

        {/* Equity Curve Visual Bar */}
        <View style={styles.curveCard}>
          <View style={styles.curveHeader}>
            <Text style={styles.curveTitle}>EQUITY EXPANSION TRAJECTORY</Text>
            <Text style={styles.curveRoi}>ROI +{netReturn}%</Text>
          </View>
          {/* Visual bar simulation of equity path */}
          <View style={styles.visualBarContainer}>
            <View style={[styles.visualBarProgress, { width: '84%' }]} />
          </View>
          <View style={styles.curveLabels}>
            <Text style={styles.curveLabelText}>Start: $10,000</Text>
            <Text style={styles.curveLabelText}>Current: ${(10000 * (1 + netReturn / 100)).toFixed(0)}</Text>
          </View>
        </View>

        {/* Trade Log */}
        <View style={styles.logHeaderRow}>
          <Text style={styles.sectionHeader}>SIMULATION TRADE LOG</Text>
          <Text style={styles.logCountText}>{BACKTEST_TRADES_30D.length} TRADES</Text>
        </View>

        {BACKTEST_TRADES_30D.map((t) => (
          <View key={t.id} style={styles.tradeRow}>
            <View style={styles.tradeMain}>
              <View style={styles.tradeSymbolRow}>
                <View style={[styles.tradeBadge, t.type === 'LONG' ? styles.longBadge : styles.shortBadge]}>
                  <Text style={styles.badgeText}>{t.type}</Text>
                </View>
                <Text style={styles.tradeSymbol}>{t.symbol}</Text>
                <Text style={styles.tradeDate}>{t.date}</Text>
              </View>
              <Text style={styles.tradePrices}>
                Entry: ${t.entryPrice.toLocaleString()} → Exit: ${t.exitPrice.toLocaleString()} • {t.duration}
              </Text>
            </View>

            <View style={styles.tradeResult}>
              <Text style={[styles.tradePnl, t.status === 'WIN' ? styles.profitText : styles.lossText]}>
                {t.pnlPercent > 0 ? '+' : ''}{t.pnlPercent.toFixed(2)}%
              </Text>
              <Text style={styles.tradeR}>
                {t.rMultiple > 0 ? '+' : ''}{t.rMultiple.toFixed(2)}R
              </Text>
            </View>
          </View>
        ))}

        {/* Re-run Button */}
        <TouchableOpacity
          style={styles.rerunBtn}
          onPress={handleRerun}
          disabled={isSimulating}
          activeOpacity={0.8}
        >
          {isSimulating ? (
            <ActivityIndicator color="#000000" size="small" />
          ) : (
            <Text style={styles.rerunBtnText}>RE-RUN SIMULATION (LIVE CANDLES)</Text>
          )}
        </TouchableOpacity>
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 3,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentBtnActive: {
    backgroundColor: Colors.surfaceHighlight,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.cyan,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginVertical: 4,
    fontVariant: ['tabular-nums'],
  },
  metricSub: {
    fontSize: 9,
    color: Colors.textSecondary,
  },
  profitText: {
    color: Colors.long,
  },
  lossText: {
    color: Colors.short,
  },
  expectancyBanner: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.3)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  expectancyTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.cyan,
    letterSpacing: 0.8,
  },
  expectancySub: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  expectancyValue: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.cyan,
    fontVariant: ['tabular-nums'],
  },
  curveCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  curveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  curveTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  curveRoi: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.long,
  },
  visualBarContainer: {
    height: 10,
    backgroundColor: Colors.background,
    borderRadius: 5,
    overflow: 'hidden',
  },
  visualBarProgress: {
    height: '100%',
    backgroundColor: Colors.long,
    borderRadius: 5,
  },
  curveLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  curveLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  logHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  logCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  tradeRow: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tradeMain: {
    flex: 1,
  },
  tradeSymbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  tradeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  longBadge: {
    backgroundColor: 'rgba(14, 203, 129, 0.2)',
  },
  shortBadge: {
    backgroundColor: 'rgba(246, 70, 93, 0.2)',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  tradeSymbol: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  tradeDate: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  tradePrices: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  tradeResult: {
    alignItems: 'flex-end',
  },
  tradePnl: {
    fontSize: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  tradeR: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  rerunBtn: {
    backgroundColor: Colors.cyan,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  rerunBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
});
