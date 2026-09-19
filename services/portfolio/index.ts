/**
 * SIGMA — Portfolio Management & Trade Journal Service
 */

import { Position, TradeJournalEntry } from '../../packages/types';
import { db } from '../../infrastructure/database';
import { marketDataService } from '../market-data';

class PortfolioService {
  constructor() {
    this.seedSamplePosition();
  }

  private seedSamplePosition() {
    const existing = db.getPositions();
    if (existing.length === 0) {
      const samplePosition: Position = {
        id: 'POS-BTC-001',
        symbol: 'BTCUSDT',
        side: 'LONG',
        entryPrice: 78250.0,
        currentPrice: 79073.06,
        amountBtc: 0.38,
        notionalUsd: 30047.76,
        stopLossPrice: 76950.0,
        takeProfitPrice: 81500.0,
        unrealizedPnlUsd: 312.76,
        unrealizedPnlPct: 1.05,
        realizedPnlUsd: 0,
        liquidationPrice: 53200.0,
        leverage: 2.5,
        maxAdverseExcursionBps: -42, // -0.42% MAE
        maxFavorableExcursionBps: 115, // +1.15% MFE
        cumulativeFundingPaidUsd: 1.25,
        feesPaidUsd: 12.5,
        openedAt: Date.now() - 4 * 3600 * 1000,
        mode: 'PAPER',
      };
      db.savePosition(samplePosition);
    }
  }

  public getPositions(): Position[] {
    const market = marketDataService.getSnapshot();
    const positions = db.getPositions();

    // Update real-time unrealized PnL and MAE/MFE against current price
    for (const pos of positions) {
      pos.currentPrice = market.price;
      const priceDiff = pos.side === 'LONG' ? market.price - pos.entryPrice : pos.entryPrice - market.price;
      pos.unrealizedPnlUsd = Number((priceDiff * pos.amountBtc).toFixed(2));
      pos.unrealizedPnlPct = Number(((priceDiff / pos.entryPrice) * 100).toFixed(2));
      pos.notionalUsd = Number((pos.amountBtc * market.price).toFixed(2));

      const excursionBps = Math.round((priceDiff / pos.entryPrice) * 10000);
      if (excursionBps > pos.maxFavorableExcursionBps) pos.maxFavorableExcursionBps = excursionBps;
      if (excursionBps < pos.maxAdverseExcursionBps) pos.maxAdverseExcursionBps = excursionBps;
    }

    return positions;
  }

  public closePosition(positionId: string, exitPrice?: number): TradeJournalEntry | null {
    const pos = db.getPositions().find((p) => p.id === positionId);
    if (!pos) return null;

    const market = marketDataService.getSnapshot();
    const closeP = exitPrice || market.price;
    const priceDiff = pos.side === 'LONG' ? closeP - pos.entryPrice : pos.entryPrice - closeP;
    const realizedPnlUsd = Number((priceDiff * pos.amountBtc - pos.feesPaidUsd - pos.cumulativeFundingPaidUsd).toFixed(2));
    const realizedPnlPct = Number(((realizedPnlUsd / (pos.amountBtc * pos.entryPrice)) * 100).toFixed(2));

    const journalEntry: TradeJournalEntry = {
      id: `TJ-${Date.now()}`,
      symbol: pos.symbol,
      side: pos.side,
      entryPrice: pos.entryPrice,
      exitPrice: closeP,
      amountBtc: pos.amountBtc,
      realizedPnlUsd,
      realizedPnlPct,
      entryReason: 'Manual closure / Target reach',
      signalSnapshot: 'LONG',
      regimeSnapshot: 'RECOVERY',
      modelConfidenceSnapshot: 78,
      dataQualitySnapshot: 96,
      maePct: Number((pos.maxAdverseExcursionBps / 100).toFixed(2)),
      mfePct: Number((pos.maxFavorableExcursionBps / 100).toFixed(2)),
      slippageBps: 2.2,
      feesPaidUsd: pos.feesPaidUsd + 12.0,
      fundingPaidUsd: pos.cumulativeFundingPaidUsd,
      executionLatencyMs: 65,
      openedAt: pos.openedAt,
      closedAt: Date.now(),
    };

    db.addJournalEntry(journalEntry);
    db.removePosition(pos.id);
    return journalEntry;
  }

  public getTradeJournal(): TradeJournalEntry[] {
    return db.getJournal();
  }
}

export const portfolioService = new PortfolioService();
