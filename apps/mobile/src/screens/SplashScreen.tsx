/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — SCREEN 0: NATIVE BOOT & MARKET INITIALIZATION SPLASH
 * File: apps/mobile/src/screens/SplashScreen.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '../theme/colors';

interface SplashScreenProps {
  onEnter: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onEnter }) => {
  const [step, setStep] = useState<number>(0);

  const checklist = [
    'Loading Bybit & MEXC perpetual markets...',
    'Building 3,470+ multi-exchange ticker universe...',
    'Loading historical volume baselines & rolling metrics...',
    'Initializing Bybit & Binance WebSocket feeds...',
    'Computing Eagle Scores & live canonical signals...',
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => {
        if (prev < checklist.length) return prev + 1;
        clearInterval(timer);
        return prev;
      });
    }, 450);

    return () => clearInterval(timer);
  }, []);

  const isReady = step >= checklist.length;

  return (
    <View style={styles.container}>
      {/* Mascot & Brand Header */}
      <View style={styles.brandContainer}>
        <Text style={styles.mascot}>🦅</Text>
        <Text style={styles.title}>EAGLE FLASH</Text>
        <Text style={styles.subtitle}>
          VOL SPIKE CANDIDATE • MULTI-EXCHANGE PERPETUAL INTELLIGENCE
        </Text>
      </View>

      {/* Boot Checklist Box */}
      <View style={styles.checklistCard}>
        {checklist.map((item, idx) => {
          const isDone = step > idx;
          const isCurrent = step === idx;
          return (
            <View key={idx} style={styles.checkItem}>
              <Text
                style={[
                  styles.checkBullet,
                  isDone
                    ? styles.bulletDone
                    : isCurrent
                    ? styles.bulletCurrent
                    : styles.bulletPending,
                ]}
              >
                {isDone ? '✓' : isCurrent ? '●' : '○'}
              </Text>
              <Text
                style={[
                  styles.checkText,
                  isDone
                    ? styles.textDone
                    : isCurrent
                    ? styles.textCurrent
                    : styles.textPending,
                ]}
              >
                {item}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Enter Button CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.enterButton, !isReady && styles.enterButtonDisabled]}
          onPress={onEnter}
          disabled={!isReady}
          activeOpacity={0.8}
        >
          {isReady ? (
            <Text style={styles.enterButtonText}>ENTER EAGLE FLASH</Text>
          ) : (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#000" />
              <Text style={styles.enterButtonText}>INITIALIZING ENGINE...</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.footerNote}>
          Sigma Institutional v4.2 • Dynamic ATR Risk Management
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 56,
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  mascot: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.longGreen,
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 1,
    fontFamily: 'monospace',
    maxWidth: 280,
  },
  checklistCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceTertiary,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkBullet: {
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  bulletDone: {
    color: Colors.longGreen,
  },
  bulletCurrent: {
    color: Colors.binanceGold,
  },
  bulletPending: {
    color: Colors.textTertiary,
  },
  checkText: {
    fontSize: 11,
    fontFamily: 'monospace',
    flex: 1,
  },
  textDone: {
    color: Colors.textPrimary,
  },
  textCurrent: {
    color: Colors.binanceGold,
    fontWeight: 'bold',
  },
  textPending: {
    color: Colors.textTertiary,
  },
  footer: {
    alignItems: 'center',
    gap: 12,
  },
  enterButton: {
    backgroundColor: Colors.longGreen,
    width: '100%',
    minHeight: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.longGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  enterButtonDisabled: {
    backgroundColor: '#374151',
    shadowOpacity: 0,
  },
  enterButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerNote: {
    fontSize: 9,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
  },
});
