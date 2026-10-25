/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — SUPABASE PRODUCTION CLIENT & REAL-TIME REPOSITORY
 * File: apps/mobile/src/services/supabase.ts
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { ENV } from '../config/env';

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export interface LiveSignalRecord {
  id: number | string;
  signal_id: string;
  exchange_id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  target_1_price: number;
  target_2_price: number;
  target_3_price: number;
  stop_price: number;
  eagle_score: number;
  rvol: number;
  volume_z_score: number;
  oi_change_pct: number;
  status: 'DETECTED' | 'TP_HIT' | 'SL_HIT' | 'CLOSED' | string;
  detected_at: string;
  created_at: string;
  blockchain_network?: string;
  transaction_hash?: string;
  confirmation_status?: string;
}

export interface LiveBigCapSignal {
  id: string;
  signal_id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  best_timeframe: string;
  entry_price: number;
  stop_loss_price: number;
  target_price_1: number;
  target_price_2: number;
  current_price?: number;
  realized_pnl_pct?: number;
  eagle_score: number;
  rvol: number;
  z_score: number;
  oi_delta_pct: number;
  status: string;
  rationale_json: string[] | string;
  detected_at: string;
}

export interface LiveWhaleTrade {
  id: string;
  symbol: string;
  exchange: string;
  side: 'BUY' | 'SELL';
  amount_usdt: number;
  execution_price: number;
  detected_at: string;
}

export interface LiveManipulationAlert {
  id: string;
  alert_id: string;
  symbol: string;
  alert_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metrics_json: {
    tx_hash?: string;
    warning?: string;
    amount_usd?: number;
    to_exchange?: string;
    from_address?: string;
    token_amount?: number;
    etherscan_url?: string;
    onchain_action?: string;
    [key: string]: any;
  };
  status: string;
  detected_at: string;
  updated_at: string;
}

/**
 * Fetch initial live canonical signals from Supabase
 */
export async function fetchLiveSignals(limit = 50): Promise<LiveSignalRecord[]> {
  try {
    const { data, error } = await supabase
      .from('signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('⚠️ Error fetching live signals from Supabase:', error.message);
      return [];
    }
    return (data as LiveSignalRecord[]) || [];
  } catch (err) {
    console.warn('⚠️ Supabase connection exception:', err);
    return [];
  }
}

/**
 * Fetch initial BigCap institutional signals
 */
export async function fetchBigCapSignals(limit = 20): Promise<LiveBigCapSignal[]> {
  try {
    const { data, error } = await supabase
      .from('big_cap_signals')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('⚠️ Error fetching big_cap_signals:', error.message);
      return [];
    }
    return (data as LiveBigCapSignal[]) || [];
  } catch (err) {
    console.warn('⚠️ Supabase BigCap exception:', err);
    return [];
  }
}

/**
 * Fetch live whale block trades
 */
export async function fetchWhaleTrades(limit = 40): Promise<LiveWhaleTrade[]> {
  try {
    const { data, error } = await supabase
      .from('whale_trades')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('⚠️ Error fetching whale_trades:', error.message);
      return [];
    }
    return (data as LiveWhaleTrade[]) || [];
  } catch (err) {
    console.warn('⚠️ Supabase WhaleTrades exception:', err);
    return [];
  }
}

/**
 * Fetch manipulation and on-chain intelligence alerts
 */
export async function fetchManipulationAlerts(limit = 40): Promise<LiveManipulationAlert[]> {
  try {
    const { data, error } = await supabase
      .from('manipulation_alerts')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('⚠️ Error fetching manipulation_alerts:', error.message);
      return [];
    }
    return (data as LiveManipulationAlert[]) || [];
  } catch (err) {
    console.warn('⚠️ Supabase ManipulationAlerts exception:', err);
    return [];
  }
}

/**
 * Ping backend & database services to check latency and health
 */
export async function pingBackendServices(): Promise<{
  supabaseMs: number;
  supabaseOk: boolean;
  signalsCount: number;
}> {
  const t0 = Date.now();
  try {
    const { count, error } = await supabase
      .from('signals')
      .select('*', { count: 'exact', head: true });
    const elapsed = Date.now() - t0;
    return {
      supabaseMs: elapsed,
      supabaseOk: !error,
      signalsCount: count ?? 0,
    };
  } catch {
    return {
      supabaseMs: -1,
      supabaseOk: false,
      signalsCount: 0,
    };
  }
}

/**
 * Subscribe to real-time Postgres changes for signals
 */
export function subscribeToLiveSignals(
  onInsert: (signal: LiveSignalRecord) => void,
  onUpdate?: (signal: LiveSignalRecord) => void
): RealtimeChannel {
  const channel = supabase
    .channel('public:signals:live')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'signals' },
      (payload) => {
        if (payload.new) {
          onInsert(payload.new as LiveSignalRecord);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'signals' },
      (payload) => {
        if (payload.new && onUpdate) {
          onUpdate(payload.new as LiveSignalRecord);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to real-time Postgres changes for whale trades
 */
export function subscribeToWhaleTrades(
  onInsert: (trade: LiveWhaleTrade) => void
): RealtimeChannel {
  const channel = supabase
    .channel('public:whale_trades:live')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'whale_trades' },
      (payload) => {
        if (payload.new) {
          onInsert(payload.new as LiveWhaleTrade);
        }
      }
    )
    .subscribe();

  return channel;
}
