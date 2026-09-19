/**
 * SIGMA — Storage & Journal Persistence
 */

import { Order, Position, SignalCardData, TradeJournalEntry } from '../../packages/types';

class LocalDatabase {
  private orders: Map<string, Order> = new Map();
  private positions: Map<string, Position> = new Map();
  private tradeJournal: TradeJournalEntry[] = [];
  private signalHistory: SignalCardData[] = [];
  private auditLog: { timestamp: number; level: 'INFO' | 'WARN' | 'ERROR'; message: string; details?: unknown }[] = [];

  constructor() {
    this.seedInitialJournal();
  }

  private seedInitialJournal() {
    // Realistic initial institutional paper trade history for immediate inspection
    const sampleJournal: TradeJournalEntry[] = [
      {
        id: 'TJ-10491',
        symbol: 'BTCUSDT',
        side: 'LONG',
        entryPrice: 68420.0,
        exitPrice: 70850.0,
        amountBtc: 0.35,
        realizedPnlUsd: 850.5,
        realizedPnlPct: 3.55,
        entryReason: '4H Range Breakout + Spot CVD positive surge',
        signalSnapshot: 'LONG',
        regimeSnapshot: 'RECOVERY',
        modelConfidenceSnapshot: 76,
        dataQualitySnapshot: 95,
        maePct: -0.42,
        mfePct: 3.82,
        slippageBps: 2.1,
        feesPaidUsd: 14.8,
        fundingPaidUsd: -4.2, // Received funding
        executionLatencyMs: 82,
        openedAt: Date.now() - 86400000 * 2,
        closedAt: Date.now() - 86400000 * 1.5,
      },
      {
        id: 'TJ-10492',
        symbol: 'BTCUSDT',
        side: 'SHORT',
        entryPrice: 71200.0,
        exitPrice: 69900.0,
        amountBtc: 0.28,
        realizedPnlUsd: 364.0,
        realizedPnlPct: 1.83,
        entryReason: 'Funding spike + 25-delta put skew inversion + resistance rejection',
        signalSnapshot: 'SHORT',
        regimeSnapshot: 'DISTRIBUTION',
        modelConfidenceSnapshot: 71,
        dataQualitySnapshot: 94,
        maePct: -0.28,
        mfePct: 2.15,
        slippageBps: 3.0,
        feesPaidUsd: 11.2,
        fundingPaidUsd: 2.1,
        executionLatencyMs: 95,
        openedAt: Date.now() - 86400000 * 1.2,
        closedAt: Date.now() - 86400000 * 0.8,
      },
      {
        id: 'TJ-10493',
        symbol: 'BTCUSDT',
        side: 'LONG',
        entryPrice: 69800.0,
        exitPrice: 69350.0,
        amountBtc: 0.4,
        realizedPnlUsd: -180.0,
        realizedPnlPct: -0.64,
        entryReason: 'Pullback support bounce failure, stopped out cleanly at ATR boundary',
        signalSnapshot: 'LONG',
        regimeSnapshot: 'RANGE',
        modelConfidenceSnapshot: 65,
        dataQualitySnapshot: 96,
        maePct: -0.64,
        mfePct: 0.35,
        slippageBps: 1.8,
        feesPaidUsd: 15.6,
        fundingPaidUsd: 0.8,
        executionLatencyMs: 78,
        openedAt: Date.now() - 86400000 * 0.6,
        closedAt: Date.now() - 86400000 * 0.4,
      },
    ];

    this.tradeJournal = sampleJournal;
  }

  // Orders
  public saveOrder(order: Order) {
    this.orders.set(order.id, order);
    this.log('INFO', `Order saved: ${order.id} ${order.side} ${order.amountBtc} BTC @ ${order.price || 'MKT'} [${order.status}]`);
  }

  public getOrder(id: string): Order | undefined {
    return this.orders.get(id);
  }

  public getOrders(): Order[] {
    return Array.from(this.orders.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  // Positions
  public savePosition(pos: Position) {
    this.positions.set(pos.id, pos);
  }

  public removePosition(id: string) {
    this.positions.delete(id);
  }

  public getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  // Journal
  public addJournalEntry(entry: TradeJournalEntry) {
    this.tradeJournal.unshift(entry);
    this.log('INFO', `Journal entry added: ${entry.id} PnL: $${entry.realizedPnlUsd.toFixed(2)} (${entry.realizedPnlPct}%)`);
  }

  public getJournal(): TradeJournalEntry[] {
    return [...this.tradeJournal];
  }

  // Signals
  public recordSignal(signal: SignalCardData) {
    this.signalHistory.unshift(signal);
    if (this.signalHistory.length > 200) this.signalHistory.pop();
  }

  public getSignalHistory(): SignalCardData[] {
    return [...this.signalHistory];
  }

  // Audits & Logging
  public log(level: 'INFO' | 'WARN' | 'ERROR', message: string, details?: unknown) {
    this.auditLog.unshift({ timestamp: Date.now(), level, message, details });
    if (this.auditLog.length > 500) this.auditLog.pop();
  }

  public getAuditLogs() {
    return [...this.auditLog];
  }
}

export const db = new LocalDatabase();
