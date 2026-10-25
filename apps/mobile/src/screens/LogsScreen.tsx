import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
  Clipboard,
  Alert,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useEngineStore, EngineLog } from '../store/useEngineStore';

export const LogsScreen: React.FC = () => {
  const { logs, clearLogs } = useEngineStore();
  const [filter, setFilter] = useState<'ALL' | 'WORKERS' | 'SIGNAL' | 'ERROR'>('ALL');
  const [search, setSearch] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (autoScroll && logs.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filter === 'ERROR' && log.level !== 'ERROR') return false;
    if (filter === 'SIGNAL' && !log.message.includes('SIGNAL') && !log.workerId.includes('CHECKPOINT')) return false;
    if (filter === 'WORKERS' && !log.workerId.includes('WORKER')) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return log.message.toLowerCase().includes(q) || log.workerId.toLowerCase().includes(q);
    }
    return true;
  });

  const getLevelColor = (level: EngineLog['level']) => {
    switch (level) {
      case 'ERROR':
        return Colors.short;
      case 'WARN':
        return Colors.gold;
      case 'SUCCESS':
        return Colors.long;
      default:
        return Colors.textSecondary;
    }
  };

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level}] [${l.workerId}] ${l.message}`)
      .join('\n');
    Clipboard.setString(text);
    Alert.alert('Copied', 'Terminal buffer copied to clipboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>TERMINAL CONSOLE</Text>
          <Text style={styles.headerSubtitle}>REAL-TIME WORKER STREAM & IPC LOG BUFFER</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionBtn, autoScroll && styles.actionBtnActive]}
            onPress={() => setAutoScroll(!autoScroll)}
          >
            <Text style={[styles.actionBtnText, autoScroll && styles.actionBtnTextActive]}>
              {autoScroll ? 'AUTO-SCROLL ON' : 'AUTO-SCROLL OFF'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearBtn} onPress={clearLogs}>
            <Text style={styles.clearBtnText}>CLEAR</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter and Search Bar */}
      <View style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Filter logs by keyword or worker..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.pillsRow}>
          {(['ALL', 'WORKERS', 'SIGNAL', 'ERROR'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.pill, filter === f && styles.pillActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.copyPill} onPress={handleCopyLogs}>
            <Text style={styles.copyPillText}>COPY ALL</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Log Feed */}
      <FlatList
        ref={listRef}
        data={filteredLogs}
        keyExtractor={(item, index) => `${item.timestamp}-${index}`}
        contentContainerStyle={styles.logListContent}
        renderItem={({ item }) => (
          <View style={styles.logLine}>
            <Text style={styles.logTime}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
            <Text style={[styles.logLevel, { color: getLevelColor(item.level) }]}>[{item.level}]</Text>
            <Text style={styles.logSource}>[{item.workerId}]</Text>
            <Text style={styles.logMessage}>{item.message}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No logs match current filter</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090C',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnActive: {
    borderColor: Colors.cyan,
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
  },
  actionBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
  },
  actionBtnTextActive: {
    color: Colors.cyan,
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    backgroundColor: Colors.surface,
  },
  clearBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.short,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    backgroundColor: Colors.background,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 11,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(240, 185, 11, 0.15)',
  },
  pillText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.gold,
  },
  copyPill: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: Colors.surfaceHighlight,
  },
  copyPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  logListContent: {
    padding: 12,
    paddingBottom: 30,
  },
  logLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  logTime: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: 'monospace',
    marginRight: 6,
  },
  logLevel: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginRight: 6,
  },
  logSource: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.cyan,
    fontFamily: 'monospace',
    marginRight: 6,
  },
  logMessage: {
    fontSize: 10,
    color: '#D1D5DB',
    fontFamily: 'monospace',
    flex: 1,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'monospace',
  },
});
