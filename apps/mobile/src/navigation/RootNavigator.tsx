import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Colors } from '../theme/colors';
import { SplashScreen } from '../screens/SplashScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { HeatmapScreen } from '../screens/HeatmapScreen';
import { SignalsScreen } from '../screens/SignalsScreen';
import { FuturesScreen } from '../screens/FuturesScreen';
import { BtcHedgeScreen } from '../screens/BtcHedgeScreen';
import { BacktestScreen } from '../screens/BacktestScreen';
import { WhaleRadarScreen } from '../screens/WhaleRadarScreen';
import { FleetScreen } from '../screens/FleetScreen';
import { LogsScreen } from '../screens/LogsScreen';
import { CoinDetailModal } from '../screens/CoinDetailModal';
import { CredentialsModal } from '../screens/CredentialsModal';
import { useMarketStore, MarketTicker } from '../store/useMarketStore';

export type MainTab = 'SCANNER' | 'SIGNALS' | 'FUTURES' | 'RADAR' | 'FLEET';
export type SubScreen = 'HEATMAP' | 'HEDGE' | 'BACKTEST' | 'LOGS' | null;

export const RootNavigator: React.FC = () => {
  const [hasBooted, setHasBooted] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<MainTab>('SCANNER');
  const [activeSubScreen, setActiveSubScreen] = useState<SubScreen>(null);
  const [isCoinModalVisible, setIsCoinModalVisible] = useState<boolean>(false);
  const [isCredentialsVisible, setIsCredentialsVisible] = useState<boolean>(false);

  const { selectedTicker, setSelectedTicker } = useMarketStore();

  if (!hasBooted) {
    return <SplashScreen onEnter={() => setHasBooted(true)} />;
  }

  const handleSelectCoin = (ticker: MarketTicker) => {
    setSelectedTicker(ticker);
    setIsCoinModalVisible(true);
  };

  const renderActiveScreen = () => {
    // If a subscreen is active, render that with a back button bar
    if (activeSubScreen === 'HEATMAP') {
      return <HeatmapScreen onSelectCoin={handleSelectCoin} />;
    }
    if (activeSubScreen === 'HEDGE') {
      return <BtcHedgeScreen />;
    }
    if (activeSubScreen === 'BACKTEST') {
      return <BacktestScreen />;
    }
    if (activeSubScreen === 'LOGS') {
      return <LogsScreen />;
    }

    switch (activeTab) {
      case 'SCANNER':
        return <ScannerScreen onSelectTicker={handleSelectCoin} />;
      case 'SIGNALS':
        return <SignalsScreen />;
      case 'FUTURES':
        return <FuturesScreen />;
      case 'RADAR':
        return <WhaleRadarScreen />;
      case 'FLEET':
        return (
          <FleetScreen
            onOpenCredentials={() => setIsCredentialsVisible(true)}
            onOpenLogs={() => setActiveSubScreen('LOGS')}
          />
        );
      default:
        return <ScannerScreen onSelectTicker={handleSelectCoin} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Quick Sub-Navigation Bar if Sub-Screen is active */}
      {activeSubScreen !== null && (
        <View style={styles.subScreenHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setActiveSubScreen(null)}
          >
            <Text style={styles.backButtonText}>← RETURN TO MAIN TAB</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sub-Screen Direct Navigation Pills (when in Scanner, Futures, or Fleet) */}
      {activeSubScreen === null && (
        <View style={styles.quickBar}>
          {activeTab === 'SCANNER' && (
            <TouchableOpacity
              style={styles.quickPill}
              onPress={() => setActiveSubScreen('HEATMAP')}
            >
              <Text style={styles.quickPillText}>🗺️ OPEN MARKET HEATMAP</Text>
            </TouchableOpacity>
          )}

          {activeTab === 'FUTURES' && (
            <View style={styles.quickPillRow}>
              <TouchableOpacity
                style={styles.quickPill}
                onPress={() => setActiveSubScreen('HEDGE')}
              >
                <Text style={styles.quickPillText}>⚡ DELTA HEDGE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickPill}
                onPress={() => setActiveSubScreen('BACKTEST')}
              >
                <Text style={styles.quickPillText}>🧪 QUANT BACKTEST</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'FLEET' && (
            <View style={styles.quickPillRow}>
              <TouchableOpacity
                style={styles.quickPill}
                onPress={() => setIsCredentialsVisible(true)}
              >
                <Text style={styles.quickPillText}>🔑 API CREDENTIALS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickPill}
                onPress={() => setActiveSubScreen('LOGS')}
              >
                <Text style={styles.quickPillText}>💻 LIVE CONSOLE</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Main Content Area */}
      <View style={styles.contentArea}>{renderActiveScreen()}</View>

      {/* Native Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            setActiveTab('SCANNER');
            setActiveSubScreen(null);
          }}
          activeOpacity={0.7}
        >
          {activeTab === 'SCANNER' && <View style={[styles.activeIndicator, { backgroundColor: '#00D2FF' }]} />}
          <Text style={[styles.tabIcon, activeTab === 'SCANNER' && styles.tabIconActive]}>📊</Text>
          <Text style={[styles.tabLabel, activeTab === 'SCANNER' && { color: '#00D2FF', fontWeight: '900' }]}>
            SCANNER
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            setActiveTab('SIGNALS');
            setActiveSubScreen(null);
          }}
          activeOpacity={0.7}
        >
          {activeTab === 'SIGNALS' && <View style={[styles.activeIndicator, { backgroundColor: '#0ECB81' }]} />}
          <Text style={[styles.tabIcon, activeTab === 'SIGNALS' && styles.tabIconActive]}>⚡</Text>
          <Text style={[styles.tabLabel, activeTab === 'SIGNALS' && { color: '#0ECB81', fontWeight: '900' }]}>
            SIGNALS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            setActiveTab('FUTURES');
            setActiveSubScreen(null);
          }}
          activeOpacity={0.7}
        >
          {activeTab === 'FUTURES' && <View style={[styles.activeIndicator, { backgroundColor: '#F0B90B' }]} />}
          <Text style={[styles.tabIcon, activeTab === 'FUTURES' && styles.tabIconActive]}>📈</Text>
          <Text style={[styles.tabLabel, activeTab === 'FUTURES' && { color: '#F0B90B', fontWeight: '900' }]}>
            FUTURES
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            setActiveTab('RADAR');
            setActiveSubScreen(null);
          }}
          activeOpacity={0.7}
        >
          {activeTab === 'RADAR' && <View style={[styles.activeIndicator, { backgroundColor: '#00D2FF' }]} />}
          <Text style={[styles.tabIcon, activeTab === 'RADAR' && styles.tabIconActive]}>🐋</Text>
          <Text style={[styles.tabLabel, activeTab === 'RADAR' && { color: '#00D2FF', fontWeight: '900' }]}>
            RADAR
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            setActiveTab('FLEET');
            setActiveSubScreen(null);
          }}
          activeOpacity={0.7}
        >
          {activeTab === 'FLEET' && <View style={[styles.activeIndicator, { backgroundColor: '#EAECEF' }]} />}
          <Text style={[styles.tabIcon, activeTab === 'FLEET' && styles.tabIconActive]}>⚙️</Text>
          <Text style={[styles.tabLabel, activeTab === 'FLEET' && { color: '#EAECEF', fontWeight: '900' }]}>
            FLEET
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <CoinDetailModal
        ticker={isCoinModalVisible ? selectedTicker : null}
        onClose={() => setIsCoinModalVisible(false)}
      />

      <CredentialsModal
        visible={isCredentialsVisible}
        onClose={() => setIsCredentialsVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  subScreenHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.cyan,
    letterSpacing: 0.5,
  },
  quickBar: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#0F1216',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  quickPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickPill: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  contentArea: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#12161A',
    borderTopWidth: 1,
    borderTopColor: '#1E2329',
    paddingVertical: 6,
    paddingBottom: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 4,
  },
  activeIndicator: {
    position: 'absolute',
    top: -6,
    width: 28,
    height: 3,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#848E9C',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
  tabLabelActive: {
    color: '#00D2FF',
  },
});
