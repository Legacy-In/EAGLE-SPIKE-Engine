import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useTradingStore } from '../store/useTradingStore';

export const BtcHedgeScreen: React.FC = () => {
  const { tradingMode, openPaperPosition } = useTradingStore();
  const isPaperMode = tradingMode === 'paper';
  const [strategy, setStrategy] = useState<'neutral' | 'straddle'>('neutral');
  const [leverage, setLeverage] = useState<number>(5);
  const [allocation, setAllocation] = useState<number>(1000);
  const [isHedgeActive, setIsHedgeActive] = useState<boolean>(true);

  const btcPrice = 68420.5;
  const longEntry = 68250.0;
  const shortEntry = 68250.0;
  const fundingYield = 18.42;

  const handleDeployHedge = () => {
    setIsHedgeActive(true);
    Alert.alert(
      'Hedge Deployed',
      `Delta-Neutral 50/50 Strategy deployed on BTCUSDT with ${leverage}x leverage and $${allocation} total capital.`
    );
  };

  const handleEmergencyFlatten = () => {
    Alert.alert(
      'Emergency Flatten',
      'Are you sure you want to market-close both Long and Short hedge legs immediately?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Flatten Both Legs',
          style: 'destructive',
          onPress: () => {
            setIsHedgeActive(false);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>⚡ LIVE HEDGE EXECUTION</Text>
          <Text style={styles.headerSubtitle}>DELTA-NEUTRAL TWIN-LEG SYSTEM • FUNDING HARVESTER</Text>
        </View>
        <View style={[styles.badge, isPaperMode ? styles.paperBadge : styles.liveBadge]}>
          <Text style={styles.badgeText}>{isPaperMode ? 'PAPER SANDBOX' : 'LIVE APIS'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Strategy Selector */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, strategy === 'neutral' && styles.segmentBtnActive]}
            onPress={() => setStrategy('neutral')}
          >
            <Text style={[styles.segmentText, strategy === 'neutral' && styles.segmentTextActive]}>
              RANGE DELTA-NEUTRAL
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, strategy === 'straddle' && styles.segmentBtnActive]}
            onPress={() => setStrategy('straddle')}
          >
            <Text style={[styles.segmentText, strategy === 'straddle' && styles.segmentTextActive]}>
              BREAKOUT STRADDLE
            </Text>
          </TouchableOpacity>
        </View>

        {/* Live Net Delta Exposure Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>NET DELTA EXPOSURE</Text>
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, isHedgeActive && styles.statusDotActive]} />
              <Text style={styles.statusText}>{isHedgeActive ? 'BALANCED' : 'INACTIVE'}</Text>
            </View>
          </View>

          <View style={styles.deltaValueRow}>
            <Text style={styles.deltaValue}>±0.0000 BTC</Text>
            <Text style={styles.deltaUsd}>$0.00 NET MARKET RISK</Text>
          </View>

          <View style={styles.yieldRow}>
            <Text style={styles.yieldLabel}>Accumulated Funding Yield:</Text>
            <Text style={styles.yieldValue}>+${fundingYield.toFixed(2)} USDT</Text>
          </View>
        </View>

        {/* Twin Leg Positions */}
        <Text style={styles.sectionHeader}>ACTIVE TWIN-LEG POSITIONS</Text>
        <View style={styles.twinLegsContainer}>
          {/* Leg A: Long */}
          <View style={styles.legCard}>
            <View style={styles.legHeader}>
              <View style={styles.longBadge}>
                <Text style={styles.badgeText}>LONG {leverage}X</Text>
              </View>
              <Text style={styles.legSymbol}>BTCUSDT</Text>
            </View>
            <View style={styles.legRow}>
              <Text style={styles.legLabel}>Entry Price</Text>
              <Text style={styles.legValue}>${longEntry.toLocaleString()}</Text>
            </View>
            <View style={styles.legRow}>
              <Text style={styles.legLabel}>Mark Price</Text>
              <Text style={styles.legValue}>${btcPrice.toLocaleString()}</Text>
            </View>
            <View style={styles.legRow}>
              <Text style={styles.legLabel}>Unrealized PnL</Text>
              <Text style={[styles.legValue, styles.profitText]}>
                +${((btcPrice - longEntry) * (allocation / 2 / longEntry)).toFixed(2)} (+1.25%)
              </Text>
            </View>
          </View>

          {/* Leg B: Short */}
          <View style={styles.legCard}>
            <View style={styles.legHeader}>
              <View style={styles.shortBadge}>
                <Text style={styles.badgeText}>SHORT {leverage}X</Text>
              </View>
              <Text style={styles.legSymbol}>BTCUSDT</Text>
            </View>
            <View style={styles.legRow}>
              <Text style={styles.legLabel}>Entry Price</Text>
              <Text style={styles.legValue}>${shortEntry.toLocaleString()}</Text>
            </View>
            <View style={styles.legRow}>
              <Text style={styles.legLabel}>Mark Price</Text>
              <Text style={styles.legValue}>${btcPrice.toLocaleString()}</Text>
            </View>
            <View style={styles.legRow}>
              <Text style={styles.legLabel}>Unrealized PnL</Text>
              <Text style={[styles.legValue, styles.lossText]}>
                -${((btcPrice - shortEntry) * (allocation / 2 / shortEntry)).toFixed(2)} (-1.25%)
              </Text>
            </View>
          </View>
        </View>

        {/* Configuration Sliders/Selectors */}
        <Text style={styles.sectionHeader}>HEDGE ENGINE CONFIGURATION</Text>
        <View style={styles.configCard}>
          <Text style={styles.configLabel}>Leverage Multiplier</Text>
          <View style={styles.configPillsRow}>
            {[1, 3, 5, 10, 20].map((lev) => (
              <TouchableOpacity
                key={lev}
                style={[styles.configPill, leverage === lev && styles.configPillActive]}
                onPress={() => setLeverage(lev)}
              >
                <Text style={[styles.configPillText, leverage === lev && styles.configPillTextActive]}>
                  {lev}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.configLabel, { marginTop: 14 }]}>Capital Allocation ($ USDT)</Text>
          <View style={styles.configPillsRow}>
            {[500, 1000, 2500, 5000].map((cap) => (
              <TouchableOpacity
                key={cap}
                style={[styles.configPill, allocation === cap && styles.configPillActive]}
                onPress={() => setAllocation(cap)}
              >
                <Text style={[styles.configPillText, allocation === cap && styles.configPillTextActive]}>
                  ${cap}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.deployBtn}
            onPress={handleDeployHedge}
            activeOpacity={0.8}
          >
            <Text style={styles.deployBtnText}>DEPLOY DELTA HEDGE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.flattenBtn}
            onPress={handleEmergencyFlatten}
            activeOpacity={0.8}
          >
            <Text style={styles.flattenBtnText}>EMERGENCY FLATTEN</Text>
          </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  paperBadge: {
    backgroundColor: 'rgba(240, 185, 11, 0.15)',
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  liveBadge: {
    backgroundColor: 'rgba(14, 203, 129, 0.15)',
    borderWidth: 1,
    borderColor: Colors.long,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textPrimary,
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
    color: Colors.gold,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textMuted,
  },
  statusDotActive: {
    backgroundColor: Colors.long,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.long,
  },
  deltaValueRow: {
    marginVertical: 12,
  },
  deltaValue: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  deltaUsd: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  yieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  yieldLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  yieldValue: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.long,
    fontVariant: ['tabular-nums'],
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  twinLegsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  legCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  legHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  longBadge: {
    backgroundColor: 'rgba(14, 203, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  shortBadge: {
    backgroundColor: 'rgba(246, 70, 93, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  legSymbol: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  legRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  legLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  legValue: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  profitText: {
    color: Colors.long,
  },
  lossText: {
    color: Colors.short,
  },
  configCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  configLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  configPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  configPill: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  configPillActive: {
    backgroundColor: Colors.surfaceHighlight,
    borderColor: Colors.gold,
  },
  configPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  configPillTextActive: {
    color: Colors.gold,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  deployBtn: {
    flex: 1.3,
    backgroundColor: Colors.gold,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deployBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  flattenBtn: {
    flex: 1,
    backgroundColor: 'rgba(246, 70, 93, 0.2)',
    borderWidth: 1,
    borderColor: Colors.short,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  flattenBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.short,
  },
});
