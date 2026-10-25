import fs from 'fs';
import path from 'path';
import { getSupabaseAdmin } from './supabase.ts';

export interface PaperTradeRecord {
  id: string;
  signal_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  qty: number;
  leverage: number;
  entry_avg: number;
  sl: number;
  tp: number;
  opened_at: string;
  closed_at: string | null;
  exit_price: number | null;
  exit_reason: 'TP' | 'SL' | 'OPPOSITE_SIGNAL' | 'TIME_STOP_12C' | 'MANUAL' | 'KILL_SWITCH' | 'EXEC_FAILED' | null;
  gross_pnl: number;
  fees: number;
  funding: number;
  net_pnl: number;
  net_pnl_pct: number;
  r_multiple: number | null;
  mfe_pct: number;
  mae_pct: number;
  score_at_detection: number;
  features_json: any;
  source_exchanges: string[];
  config_version: string;
  bybit_order_id: string;
  order_link_id: string;
  status: 'OPEN' | 'CLOSED';
}

export interface PaperAccountState {
  initial_balance: number;       // $10,000
  balance: number;
  equity: number;
  realized_pnl: number;
  today_realized_pnl: number;
  today_realized_pct: number;
  open_positions_count: number;
  auto_trade_enabled: boolean;
  kill_switch_active: boolean;
  last_synced_at: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const TRADES_FILE = path.join(DATA_DIR, 'paper_trades.json');
const ACCOUNT_FILE = path.join(DATA_DIR, 'paper_account.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export class PaperTradesRepository {
  private static instance: PaperTradesRepository;

  public static getInstance(): PaperTradesRepository {
    if (!PaperTradesRepository.instance) {
      PaperTradesRepository.instance = new PaperTradesRepository();
    }
    return PaperTradesRepository.instance;
  }

  // ---------- ACCOUNT STATE ----------
  public getAccountState(): PaperAccountState {
    if (fs.existsSync(ACCOUNT_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(ACCOUNT_FILE, 'utf-8'));
      } catch (e) {}
    }
    const defaultState: PaperAccountState = {
      initial_balance: 10000,
      balance: 10000,
      equity: 10000,
      realized_pnl: 0,
      today_realized_pnl: 0,
      today_realized_pct: 0,
      open_positions_count: 0,
      auto_trade_enabled: true,
      kill_switch_active: false,
      last_synced_at: new Date().toISOString(),
    };
    this.saveAccountState(defaultState);
    return defaultState;
  }

  public saveAccountState(state: PaperAccountState): void {
    const tmp = `${ACCOUNT_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, ACCOUNT_FILE);
  }

  public resetAccount(balance = 10000): PaperAccountState {
    const state: PaperAccountState = {
      initial_balance: balance,
      balance,
      equity: balance,
      realized_pnl: 0,
      today_realized_pnl: 0,
      today_realized_pct: 0,
      open_positions_count: 0,
      auto_trade_enabled: true,
      kill_switch_active: false,
      last_synced_at: new Date().toISOString(),
    };
    this.saveAccountState(state);
    return state;
  }

  // ---------- TRADES PERSISTENCE & IDEMPOTENCY ----------
  public loadTrades(): PaperTradeRecord[] {
    if (fs.existsSync(TRADES_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(TRADES_FILE, 'utf-8'));
      } catch (e) {}
    }
    return [];
  }

  public saveTrades(trades: PaperTradeRecord[]): void {
    const tmp = `${TRADES_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(trades, null, 2));
    fs.renameSync(tmp, TRADES_FILE);
  }

  /**
   * Idempotent trade insertion using order_link_id (signal_id)
   */
  public async openTrade(trade: PaperTradeRecord): Promise<{ opened: boolean; isDuplicate: boolean }> {
    const trades = this.loadTrades();
    const existing = trades.find((t) => t.order_link_id === trade.order_link_id);
    if (existing) {
      return { opened: false, isDuplicate: true };
    }

    trades.push(trade);
    this.saveTrades(trades);

    const account = this.getAccountState();
    account.open_positions_count = trades.filter((t) => t.status === 'OPEN').length;
    account.last_synced_at = new Date().toISOString();
    this.saveAccountState(account);

    // Try Supabase insert
    try {
      const admin = getSupabaseAdmin();
      await admin.from('paper_trades').insert({
        signal_id: trade.signal_id,
        symbol: trade.symbol,
        side: trade.side,
        qty: trade.qty,
        leverage: trade.leverage,
        entry_price: trade.entry_avg,
        stop_price: trade.sl,
        take_profit_price: trade.tp,
        status: 'OPEN',
        order_link_id: trade.order_link_id,
        created_at: trade.opened_at,
      });
    } catch (e) {}

    return { opened: true, isDuplicate: false };
  }

  /**
   * Closes trade and updates balance, realized PnL, and R-multiple
   */
  public async closeTrade(params: {
    orderLinkId: string;
    exitPrice: number;
    exitReason: PaperTradeRecord['exit_reason'];
    closedAt?: string;
    fees?: number;
    funding?: number;
  }): Promise<PaperTradeRecord | null> {
    const trades = this.loadTrades();
    const trade = trades.find((t) => t.order_link_id === params.orderLinkId);
    if (!trade || trade.status === 'CLOSED') return trade || null;

    trade.status = 'CLOSED';
    trade.exit_price = params.exitPrice;
    trade.exit_reason = params.exitReason;
    trade.closed_at = params.closedAt || new Date().toISOString();
    trade.fees = params.fees || (trade.qty * params.exitPrice * 0.0006); // 0.06% taker fee
    trade.funding = params.funding || 0;

    const priceDiff = trade.side === 'BUY'
      ? params.exitPrice - trade.entry_avg
      : trade.entry_avg - params.exitPrice;

    trade.gross_pnl = priceDiff * trade.qty;
    trade.net_pnl = trade.gross_pnl - trade.fees + trade.funding;
    trade.net_pnl_pct = (trade.net_pnl / (trade.entry_avg * trade.qty / trade.leverage)) * 100;

    const initialRisk = Math.abs(trade.entry_avg - trade.sl) * trade.qty;
    trade.r_multiple = initialRisk > 0 ? parseFloat((trade.net_pnl / initialRisk).toFixed(2)) : 0;

    this.saveTrades(trades);

    // Update account equity
    const account = this.getAccountState();
    account.balance += trade.net_pnl;
    account.equity = account.balance;
    account.realized_pnl += trade.net_pnl;
    account.today_realized_pnl += trade.net_pnl;
    account.today_realized_pct = (account.today_realized_pnl / account.initial_balance) * 100;
    account.open_positions_count = trades.filter((t) => t.status === 'OPEN').length;
    account.last_synced_at = new Date().toISOString();
    this.saveAccountState(account);

    return trade;
  }

  public getOpenPositions(): PaperTradeRecord[] {
    return this.loadTrades().filter((t) => t.status === 'OPEN');
  }

  public getTradeByOrderLinkId(orderLinkId: string): PaperTradeRecord | null {
    return this.loadTrades().find((t) => t.order_link_id === orderLinkId) || null;
  }

  /**
   * Kill Switch: Closes all open positions and disables automated trading
   */
  public async triggerKillSwitch(): Promise<{ closedCount: number; balance: number }> {
    const openTrades = this.getOpenPositions();
    for (const t of openTrades) {
      await this.closeTrade({
        orderLinkId: t.order_link_id,
        exitPrice: t.entry_avg, // Market close
        exitReason: 'KILL_SWITCH',
      });
    }

    const account = this.getAccountState();
    account.auto_trade_enabled = false;
    account.kill_switch_active = true;
    account.last_synced_at = new Date().toISOString();
    this.saveAccountState(account);

    return { closedCount: openTrades.length, balance: account.balance };
  }
}
