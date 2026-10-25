/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — PAPER TRADING / SANDBOX EXECUTION ENGINE
 * File: backend/services/paper_trading_executor.mjs
 *
 * Simulates real-time order execution, virtual capital management ($100 margin),
 * deterministic TP/SL resolutions, dual persistence (Supabase + local JSON ledger),
 * and dispatches rich alerts to dedicated Discord channel (#paper-trades).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { queueNotificationAlerts, isTestExecution } from './notification-outbox.mjs';

// 1. Environment & Supabase Initialization
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const envFiles = ['.env', 'apps/web/.env.local'];
for (const ef of envFiles) {
  try {
    const fullPath = path.resolve(process.cwd(), ef);
    if (fs.existsSync(fullPath)) {
      const lines = fs.readFileSync(fullPath, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...v] = trimmed.split('=');
        const val = v.join('=').trim().replace(/^["']|["']$/g, '');
        if (k === 'NEXT_PUBLIC_SUPABASE_URL' && !supabaseUrl) supabaseUrl = val;
        if (k === 'SUPABASE_SERVICE_ROLE_KEY' && (!supabaseKey || supabaseKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5c3dtbHNydnJxd2h6dGJrdGxtIiwicm9sZSI6ImFub24i'))) {
          supabaseKey = val;
        }
        if (k === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' && !supabaseKey) supabaseKey = val;
      }
    }
  } catch (e) {}
}

const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

// 2. Ledger File Paths
function getLedgerPath() {
  const isTest = isTestExecution();
  const filename = isTest ? 'test_paper_trades_ledger.json' : 'paper_trades_ledger.json';
  return path.resolve(process.cwd(), 'data', filename);
}

// 3. Default Configuration
export const DEFAULT_CONFIG = {
  startingBalance: parseFloat(process.env.PAPER_STARTING_BALANCE || '10000.00'),
  positionMarginUsd: parseFloat(process.env.PAPER_POSITION_SIZE_USD || '100.00'),
  defaultLeverage: parseInt(process.env.PAPER_DEFAULT_LEVERAGE || '5', 10),
};

// 4. In-Memory State
class PaperTradingStateManager {
  constructor() {
    this.account = {
      id: 'DEFAULT_SANDBOX',
      initial_balance: DEFAULT_CONFIG.startingBalance,
      current_balance: DEFAULT_CONFIG.startingBalance,
      allocated_margin: 0.0,
      realized_pnl: 0.0,
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      win_rate_pct: 0.0,
      profit_factor: 0.0,
      updated_at: new Date().toISOString(),
    };
    this.trades = new Map(); // paper_trade_id -> trade
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    this.loadFromDisk();
    this.isInitialized = true;
  }

  loadFromDisk() {
    try {
      const p = getLedgerPath();
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.account) {
          this.account = { ...this.account, ...parsed.account };
        }
        if (Array.isArray(parsed.trades)) {
          this.trades.clear();
          for (const t of parsed.trades) {
            this.trades.set(t.paper_trade_id, t);
          }
        }
      }
    } catch (e) {
      console.warn('Paper trading ledger disk load notice:', e?.message);
    }
  }

  saveToDisk() {
    try {
      const p = getLedgerPath();
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const payload = {
        account: this.account,
        trades: Array.from(this.trades.values()),
        lastUpdated: new Date().toISOString(),
      };
      fs.writeFileSync(p, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Paper trading ledger disk save notice:', e?.message);
    }
  }
}

export const paperState = new PaperTradingStateManager();
paperState.init();

/**
 * Checks if paper trading mode is currently active
 * Evaluates environment variable TRADING_MODE (live vs paper)
 */
export function isPaperTradingActive() {
  const mode = (process.env.TRADING_MODE || 'paper').toLowerCase().trim();
  return mode === 'paper';
}

/**
 * Generates canonical Paper Trade ID: PPT-YYYYMMDD-[EXCHANGE]-[SYMBOL]-[HASH]
 */
export function generatePaperTradeId(symbol, exchange) {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
  const cleanSym = String(symbol || 'BTCUSDT').toUpperCase().replace(/[-_]/g, '');
  const cleanEx = String(exchange || 'BYBIT').toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `PPT-${dateStr}-${cleanEx}-${cleanSym}-${rand}`;
}

/**
 * Open a new Paper Position
 * @param {object} signalPayload - Canonical signal payload
 * @param {object} options - Optional margin or leverage overrides
 */
export async function openPaperTrade(signalPayload, options = {}) {
  paperState.init();

  const p = signalPayload.payload || signalPayload;
  const symbol = String(p.symbol || '').toUpperCase().replace(/[-_]/g, '');
  const exchange = String(p.exchange || p.exchange_id || 'BYBIT').toUpperCase();
  const direction = String(p.direction || 'LONG').toUpperCase();
  const entryPrice = parseFloat(p.entry_price || p.entryPrice || p.current_price || p.price || 0);

  if (!symbol || entryPrice <= 0) {
    throw new Error(`Invalid paper trade parameters: symbol=${symbol}, entry=${entryPrice}`);
  }

  const marginUsd = options.marginUsd || DEFAULT_CONFIG.positionMarginUsd;
  const leverage = options.leverage || DEFAULT_CONFIG.defaultLeverage;
  const notionalUsd = Number((marginUsd * leverage).toFixed(2));
  const quantity = Number((notionalUsd / entryPrice).toFixed(6));

  const freeMargin = paperState.account.current_balance - paperState.account.allocated_margin;
  if (freeMargin < marginUsd) {
    console.warn(`⚠️ [PAPER_MARGIN_ALERT] Insufficient virtual free margin ($${freeMargin.toFixed(2)} < $${marginUsd}) for ${symbol}`);
  }

  // Targets and Stop-Loss resolution
  const stopLoss = parseFloat(p.stop_price || p.stop_loss_price || p.stopLossPrice || (
    direction === 'LONG' ? entryPrice * 0.98 : entryPrice * 1.02
  ));
  const tp1 = parseFloat(p.target_1_price || p.target_price_1 || p.targetPrice1 || p.tp1_price || (
    direction === 'LONG' ? entryPrice * 1.025 : entryPrice * 0.975
  ));
  const tp2 = parseFloat(p.target_2_price || p.target_price_2 || p.targetPrice2 || (
    direction === 'LONG' ? entryPrice * 1.045 : entryPrice * 0.955
  ));
  const tp3 = parseFloat(p.target_3_price || p.target_price_3 || p.targetPrice3 || (
    direction === 'LONG' ? entryPrice * 1.070 : entryPrice * 0.930
  ));

  const riskR = Math.abs(entryPrice - stopLoss);
  const paperTradeId = generatePaperTradeId(symbol, exchange);

  const paperTrade = {
    paper_trade_id: paperTradeId,
    signal_id: p.signal_id || signalPayload.signal_id || null,
    symbol,
    exchange,
    direction,
    entry_price: entryPrice,
    exit_price: null,
    position_size_usd: notionalUsd,
    quantity,
    leverage,
    margin_usd: marginUsd,
    take_profit_1: tp1,
    take_profit_2: tp2,
    take_profit_3: tp3,
    stop_loss: stopLoss,
    risk_r: Number(riskR.toFixed(4)),
    status: 'OPEN',
    realized_pnl_usd: 0.0,
    realized_pnl_pct: 0.0,
    realized_r: 0.0,
    outcome: 'UNRESOLVED',
    exit_reason: null,
    opened_at: new Date().toISOString(),
    closed_at: null,
    created_at: new Date().toISOString(),
  };

  // 1. Update State & Margin
  paperState.trades.set(paperTradeId, paperTrade);
  paperState.account.allocated_margin = Number((paperState.account.allocated_margin + marginUsd).toFixed(2));
  paperState.account.updated_at = new Date().toISOString();
  paperState.saveToDisk();

  // 2. Persist to Supabase if connected
  if (supabase) {
    try {
      await supabase.from('paper_trades').upsert([paperTrade], { onConflict: 'paper_trade_id' });
      await supabase.from('paper_accounts').upsert([paperState.account], { onConflict: 'id' });
    } catch (dbErr) {
      console.warn('Paper trading Supabase sync notice:', dbErr?.message);
    }
  }

  // 3. Queue Dedicated Discord Alert (#paper-trades)
  try {
    await queueNotificationAlerts([
      {
        channel_type: 'DISCORD',
        event_type: 'PAPER_ORDER_OPENED',
        signal_id: paperTradeId,
        destination_channel: 'PAPER_TRADES',
        payload: {
          ...paperTrade,
          virtual_balance: paperState.account.current_balance,
          free_margin: Number((paperState.account.current_balance - paperState.account.allocated_margin).toFixed(2)),
        },
      },
    ]);
  } catch (alertErr) {
    console.warn('Paper order Discord alert notice:', alertErr?.message);
  }

  console.log(`🧪 [PAPER_ORDER_OPENED] ID: ${paperTradeId} | ${symbol} (${direction}) | Entry: $${entryPrice} | Margin: $${marginUsd} (${leverage}x)`);
  return paperTrade;
}

/**
 * Close an active Paper Position (e.g. TP_HIT or SL_HIT or Manual Exit)
 * @param {string} paperTradeId - Canonical paper trade ID
 * @param {number} exitPrice - Realized market exit price
 * @param {'WIN'|'LOSS'} outcome - WIN if TP reached, LOSS if SL reached
 * @param {string} reason - Detailed exit reason
 */
export async function closePaperTrade(paperTradeId, exitPrice, outcome, reason = 'TP_HIT') {
  paperState.init();

  const trade = paperState.trades.get(paperTradeId);
  if (!trade || trade.status !== 'OPEN') {
    return null;
  }

  const exit = parseFloat(exitPrice);
  const entry = trade.entry_price;
  const isLong = trade.direction === 'LONG';

  // Calculate gross PnL
  const priceDiff = isLong ? (exit - entry) : (entry - exit);
  const returnRatio = priceDiff / entry;
  const realizedPnlUsd = Number((trade.position_size_usd * returnRatio).toFixed(2));
  const realizedPnlPct = Number(((realizedPnlUsd / trade.margin_usd) * 100).toFixed(2));

  // Calculate Realized R
  const risk1R = trade.risk_r > 0 ? trade.risk_r : Math.abs(entry - trade.stop_loss);
  let realizedR = 0;
  if (risk1R > 0) {
    realizedR = Number((priceDiff / risk1R).toFixed(2));
  } else {
    realizedR = outcome === 'WIN' ? 1.5 : -1.0;
  }

  // Determine terminal status
  const isWin = outcome === 'WIN';
  const status = isWin ? 'TP_HIT' : 'SL_HIT';

  trade.exit_price = exit;
  trade.closed_at = new Date().toISOString();
  trade.realized_pnl_usd = realizedPnlUsd;
  trade.realized_pnl_pct = realizedPnlPct;
  trade.realized_r = realizedR;
  trade.outcome = isWin ? 'WIN' : 'LOSS';
  trade.status = status;
  trade.exit_reason = reason;

  // Release margin & update account balance
  paperState.account.allocated_margin = Math.max(0, Number((paperState.account.allocated_margin - trade.margin_usd).toFixed(2)));
  paperState.account.current_balance = Number((paperState.account.current_balance + realizedPnlUsd).toFixed(2));
  paperState.account.realized_pnl = Number((paperState.account.realized_pnl + realizedPnlUsd).toFixed(2));
  paperState.account.total_trades++;
  if (isWin) paperState.account.winning_trades++;
  else paperState.account.losing_trades++;

  const totalResolved = paperState.account.winning_trades + paperState.account.losing_trades;
  paperState.account.win_rate_pct = totalResolved > 0
    ? Number(((paperState.account.winning_trades / totalResolved) * 100).toFixed(2))
    : 0.0;

  paperState.account.updated_at = new Date().toISOString();
  paperState.saveToDisk();

  // Persist update to Supabase
  if (supabase) {
    try {
      await supabase.from('paper_trades').update(trade).eq('paper_trade_id', paperTradeId);
      await supabase.from('paper_accounts').upsert([paperState.account], { onConflict: 'id' });
    } catch (dbErr) {
      console.warn('Paper trade close Supabase sync notice:', dbErr?.message);
    }
  }

  // Queue Dedicated Discord Alert (#paper-trades)
  const eventType = isWin ? 'PAPER_TRADE_WON' : 'PAPER_TRADE_LOST';
  try {
    await queueNotificationAlerts([
      {
        channel_type: 'DISCORD',
        event_type: eventType,
        signal_id: paperTradeId,
        destination_channel: 'PAPER_TRADES',
        payload: {
          ...trade,
          virtual_balance: paperState.account.current_balance,
          win_rate_pct: paperState.account.win_rate_pct,
        },
      },
    ]);
  } catch (alertErr) {
    console.warn('Paper close Discord alert notice:', alertErr?.message);
  }

  console.log(`${isWin ? '🎯 [PAPER_TRADE_WON]' : '🛑 [PAPER_TRADE_LOST]'} ID: ${paperTradeId} | ${trade.symbol} | PnL: ${realizedPnlUsd >= 0 ? '+' : ''}$${realizedPnlUsd} (${realizedR}R) | Reason: ${reason}`);
  return trade;
}

/**
 * Retrieve all currently active open paper trades
 */
export function getActivePaperTrades() {
  paperState.init();
  return Array.from(paperState.trades.values()).filter(t => t.status === 'OPEN');
}

/**
 * Retrieve all paper trades (newest first)
 */
export function getAllPaperTrades() {
  paperState.init();
  return Array.from(paperState.trades.values()).sort(
    (a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime()
  );
}

/**
 * Retrieve Paper Account Summary & Metrics
 */
export function getPaperAccountSummary() {
  paperState.init();
  const allTrades = getAllPaperTrades();
  const activeTrades = allTrades.filter(t => t.status === 'OPEN');
  const closedTrades = allTrades.filter(t => t.status !== 'OPEN');

  const grossWins = closedTrades.filter(t => (t.realized_pnl_usd || 0) > 0).reduce((acc, t) => acc + t.realized_pnl_usd, 0);
  const grossLosses = Math.abs(closedTrades.filter(t => (t.realized_pnl_usd || 0) < 0).reduce((acc, t) => acc + t.realized_pnl_usd, 0));
  const profitFactor = grossLosses > 0 ? Number((grossWins / grossLosses).toFixed(2)) : (grossWins > 0 ? 99.0 : 0.0);

  return {
    account: {
      ...paperState.account,
      free_margin: Number((paperState.account.current_balance - paperState.account.allocated_margin).toFixed(2)),
      equity: Number((paperState.account.current_balance).toFixed(2)),
      profit_factor: profitFactor,
      active_positions_count: activeTrades.length,
      closed_positions_count: closedTrades.length,
    },
    activeTrades,
    closedTrades,
  };
}

/**
 * Reset Paper Account back to baseline (e.g. $10,000 virtual balance)
 */
export async function resetPaperAccount(initialBalance = DEFAULT_CONFIG.startingBalance) {
  paperState.init();
  paperState.trades.clear();
  paperState.account = {
    id: 'DEFAULT_SANDBOX',
    initial_balance: initialBalance,
    current_balance: initialBalance,
    allocated_margin: 0.0,
    realized_pnl: 0.0,
    total_trades: 0,
    winning_trades: 0,
    losing_trades: 0,
    win_rate_pct: 0.0,
    profit_factor: 0.0,
    updated_at: new Date().toISOString(),
  };

  paperState.saveToDisk();

  if (supabase) {
    try {
      await supabase.from('paper_trades').delete().neq('paper_trade_id', 'NONE');
      await supabase.from('paper_accounts').upsert([paperState.account], { onConflict: 'id' });
    } catch (e) {}
  }

  console.log(`🔄 [PAPER_ACCOUNT_RESET] Virtual balance restored to $${initialBalance.toLocaleString()}`);
  return paperState.account;
}
