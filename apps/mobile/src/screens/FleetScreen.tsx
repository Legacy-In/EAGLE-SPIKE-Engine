/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — SCREEN 5: 11-WORKER FLEET & HARDWARE ENGINE
 * File: apps/mobile/src/screens/FleetScreen.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { useEngineStore } from '../store/useEngineStore';

interface FleetScreenProps {
  onOpenCredentials: () => void;
  onOpenLogs: () => void;
}

export const FleetScreen: React.FC<FleetScreenProps> = ({ onOpenCredentials, onOpenLogs }) => {
  const {
    engineStatus,
    fleet,
    metrics,
    startAllWorkers,
    stopAllWorkers,
    toggleWorker,
  } = useEngineStore();

  const isLive = engineStatus === 'RUNNING';
  const runningCount = fleet.filter((w) => w.status === 'RUNNING').length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>⚙️ ENGINE SUPERVISOR</Text>
          <Text style={styles.headerSub}>Single-Process Embedded Node.js Engine</Text>
        </View>

        <TouchableOpacity
          style={[styles.masterBtn, isLive ? styles.btnLive : styles.btnPaused]}
          onPress={isLive ? stopAllWorkers : startAllWorkers}
          activeOpacity={0.8}
        >
          <Text style={[styles.masterBtnText, isLive ? styles.textLive : styles.textPaused]}>
            {isLive ? 'PAUSE ALL' : 'START ALL'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hardware Telemetry Card */}
        <View style={styles.telemetryCard}>
          <View style={styles.telemetryItem}>
            <Text style={styles.telLabel}>RAM FOOTPRINT</Text>
            <Text style={[styles.telVal, { color: Colors.longGreen }]}>{metrics.rssMb} MB</Text>
          </View>
          <View style={styles.telemetryItem}>
            <Text style={styles.telLabel}>CPU USAGE</Text>
            <Text style={styles.telVal}>{metrics.cpuPercent}%</Text>
          </View>
          <View style={styles.telemetryItem}>
            <Text style={styles.telLabel}>DRAIN RATE</Text>
            <Text style={styles.telVal}>~0.8%/hr</Text>
          </View>
          <View style={styles.telemetryItem}>
            <Text style={styles.telLabel}>UPTIME</Text>
            <Text style={styles.telVal}>{Math.floor(metrics.uptimeSeconds / 60)}m</Text>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={onOpenCredentials}>
            <Text style={styles.actionBtnText}>🔑 API Vault</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={onOpenLogs}>
            <Text style={styles.actionBtnText}>💻 Console Logs</Text>
          </TouchableOpacity>
        </View>

        {/* Worker Fleet Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            11-WORKER BACKGROUND FLEET ({runningCount}/11 ACTIVE)
          </Text>
          <Text style={styles.sectionSub}>FOREGROUND SERVICE ACTIVE</Text>
        </View>

        {/* 11 Workers Grid */}
        <View style={styles.fleetGrid}>
          {fleet.map((worker) => {
            const isWorkerRunning = worker.status === 'RUNNING';
            return (
              <View key={worker.id} style={styles.workerCard}>
                <View style={styles.workerTop}>
                  <View style={styles.workerInfo}>
                    <View
                      style={[
                        styles.workerPulse,
                        isWorkerRunning ? styles.pulseActive : styles.pulseIdle,
                      ]}
                    />
                    <View>
                      <Text style={styles.workerName}>{worker.name}</Text>
                      <Text style={styles.workerDisplay}>{worker.displayName}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      isWorkerRunning ? styles.toggleOn : styles.toggleOff,
                    ]}
                    onPress={() => toggleWorker(worker.id)}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        isWorkerRunning ? styles.toggleTextOn : styles.toggleTextOff,
                      ]}
                    >
                      {isWorkerRunning ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.workerFooter}>
                  <Text style={styles.footerInfo}>Every {worker.intervalMs / 1000}s</Text>
                  <Text style={styles.footerInfo}>{worker.ticksCount} ticks</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
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
  masterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnLive: {
    backgroundColor: Colors.longGreenBg,
    borderColor: Colors.longGreen,
  },
  btnPaused: {
    backgroundColor: Colors.binanceGoldBg,
    borderColor: Colors.binanceGold,
  },
  masterBtnText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  textLive: {
    color: Colors.longGreen,
  },
  textPaused: {
    color: Colors.binanceGold,
  },
  content: {
    padding: 16,
  },
  telemetryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceTertiary,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  telemetryItem: {
    alignItems: 'center',
  },
  telLabel: {
    fontSize: 8,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
  },
  telVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    marginTop: 3,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1B2129',
    borderColor: Colors.surfaceTertiary,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.binanceGold,
    fontFamily: 'monospace',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  sectionSub: {
    fontSize: 8,
    color: Colors.longGreen,
    fontFamily: 'monospace',
  },
  fleetGrid: {
    gap: 8,
    paddingBottom: 24,
  },
  workerCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceTertiary,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  workerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  workerPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pulseActive: {
    backgroundColor: Colors.longGreen,
  },
  pulseIdle: {
    backgroundColor: Colors.textTertiary,
  },
  workerName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  workerDisplay: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  toggleOn: {
    backgroundColor: Colors.longGreenBg,
    borderColor: Colors.longGreen,
  },
  toggleOff: {
    backgroundColor: '#161A20',
    borderColor: Colors.surfaceTertiary,
  },
  toggleText: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  toggleTextOn: {
    color: Colors.longGreen,
  },
  toggleTextOff: {
    color: Colors.textTertiary,
  },
  workerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#20262E',
    marginTop: 8,
    paddingTop: 6,
  },
  footerInfo: {
    fontSize: 8,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
  },
});
