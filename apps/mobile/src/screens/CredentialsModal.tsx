/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — SCREEN 5B: NATIVE SECURE API VAULT MODAL
 * File: apps/mobile/src/screens/CredentialsModal.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useEngineStore } from '../store/useEngineStore';

interface CredentialsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CredentialsModal: React.FC<CredentialsModalProps> = ({ visible, onClose }) => {
  const { credentials, saveCredentials } = useEngineStore();

  const [exchange, setExchange] = useState<'binance' | 'bybit' | 'weex'>(credentials.exchange);
  const [testnet, setTestnet] = useState<boolean>(credentials.testnet);
  const [apiKey, setApiKey] = useState<string>(credentials.apiKey);
  const [apiSecret, setApiSecret] = useState<string>(credentials.apiSecret);
  const [passphrase, setPassphrase] = useState<string>(credentials.passphrase || '');
  const [discordWebhook, setDiscordWebhook] = useState<string>(credentials.discordWebhook);
  const [telegramToken, setTelegramToken] = useState<string>(credentials.telegramToken);
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  const handleSave = () => {
    saveCredentials({
      exchange,
      testnet,
      apiKey: apiKey.trim(),
      apiSecret: apiSecret.trim(),
      passphrase: passphrase.trim(),
      discordWebhook: discordWebhook.trim(),
      telegramToken: telegramToken.trim(),
    });
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
      onClose();
    }, 800);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>🔑 SECURE API CREDENTIALS</Text>
              <Text style={styles.subtitle}>Android Hardware Keystore (Encrypted)</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Exchange Toggle */}
            <Text style={styles.fieldLabel}>TARGET EXCHANGE</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleChoice, exchange === 'binance' && styles.toggleActive]}
                onPress={() => setExchange('binance')}
              >
                <Text style={[styles.choiceText, exchange === 'binance' && styles.choiceActiveText]}>
                  Binance
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleChoice, exchange === 'bybit' && styles.toggleActive]}
                onPress={() => setExchange('bybit')}
              >
                <Text style={[styles.choiceText, exchange === 'bybit' && styles.choiceActiveText]}>
                  Bybit
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleChoice, exchange === 'weex' && styles.toggleActive]}
                onPress={() => setExchange('weex')}
              >
                <Text style={[styles.choiceText, exchange === 'weex' && styles.choiceActiveText]}>
                  WEEX
                </Text>
              </TouchableOpacity>
            </View>

            {/* Network Environment */}
            <Text style={styles.fieldLabel}>ENVIRONMENT</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleChoice, testnet && styles.toggleActive]}
                onPress={() => setTestnet(true)}
              >
                <Text style={[styles.choiceText, testnet && styles.choiceActiveText]}>
                  Testnet Sandbox (Demo)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleChoice, !testnet && styles.toggleActive]}
                onPress={() => setTestnet(false)}
              >
                <Text style={[styles.choiceText, !testnet && styles.choiceActiveText]}>
                  Live Mainnet (Real Funds)
                </Text>
              </TouchableOpacity>
            </View>

            {/* API Key */}
            <Text style={styles.fieldLabel}>{exchange.toUpperCase()} API KEY</Text>
            <TextInput
              style={styles.input}
              placeholder="Paste exchange API key"
              placeholderTextColor={Colors.textTertiary}
              value={apiKey}
              onChangeText={setApiKey}
              autoCapitalize="none"
            />

            {/* API Secret */}
            <View style={styles.secretLabelRow}>
              <Text style={styles.fieldLabel}>{exchange.toUpperCase()} API SECRET</Text>
              <TouchableOpacity onPress={() => setShowSecret(!showSecret)}>
                <Text style={styles.showHideText}>{showSecret ? 'HIDE' : 'SHOW'}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Paste exchange API secret"
              placeholderTextColor={Colors.textTertiary}
              value={apiSecret}
              onChangeText={setApiSecret}
              secureTextEntry={!showSecret}
              autoCapitalize="none"
            />

            {/* WEEX API Passphrase (Optional for scan, required for private orders) */}
            {exchange === 'weex' && (
              <>
                <Text style={styles.fieldLabel}>WEEX PASSPHRASE (OPTIONAL)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter API passphrase (set during key creation)"
                  placeholderTextColor={Colors.textTertiary}
                  value={passphrase}
                  onChangeText={setPassphrase}
                  secureTextEntry={!showSecret}
                  autoCapitalize="none"
                />
              </>
            )}

            {/* Discord Webhook */}
            <Text style={styles.fieldLabel}>DISCORD WEBHOOK URL (#paper-trades)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://discord.com/api/webhooks/..."
              placeholderTextColor={Colors.textTertiary}
              value={discordWebhook}
              onChangeText={setDiscordWebhook}
              autoCapitalize="none"
            />

            {/* Telegram Bot Token */}
            <Text style={styles.fieldLabel}>TELEGRAM BOT TOKEN</Text>
            <TextInput
              style={styles.input}
              placeholder="123456789:ABCdef..."
              placeholderTextColor={Colors.textTertiary}
              value={telegramToken}
              onChangeText={setTelegramToken}
              autoCapitalize="none"
            />

            {savedFeedback && (
              <View style={styles.savedBanner}>
                <Text style={styles.savedText}>✓ Saved to Android Encrypted Storage</Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Save */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>SAVE CREDENTIALS</Text>
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
  sheet: {
    backgroundColor: '#0E1116',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: Colors.surfaceTertiary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceTertiary,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.binanceGold,
    fontFamily: 'monospace',
  },
  subtitle: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  closeBtn: {
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
  fieldLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    marginBottom: 6,
    marginTop: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#161A20',
    borderRadius: 8,
    padding: 3,
    marginBottom: 6,
  },
  toggleChoice: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleActive: {
    backgroundColor: '#28303C',
  },
  choiceText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  choiceActiveText: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceTertiary,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  secretLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  showHideText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: Colors.cyberCyan,
    fontFamily: 'monospace',
  },
  savedBanner: {
    backgroundColor: Colors.longGreenBg,
    borderColor: Colors.longGreen,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  savedText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.longGreen,
    fontFamily: 'monospace',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceTertiary,
  },
  saveBtn: {
    backgroundColor: Colors.binanceGold,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
});
