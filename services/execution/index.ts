/**
 * SIGMA — Execution Engine, Exchange Adapters & Paper Simulator
 */

import { Order, OrderSide, OrderType, TradingMode } from '../../packages/types';
import { db } from '../../infrastructure/database';
import { failsafeController } from '../../infrastructure/failsafe';
import { marketDataService } from '../market-data';
import { riskEngineService } from '../risk';

export interface ExchangeAdapter {
  venueName: string;
  submitOrder(order: Order): Promise<Order>;
  cancelOrder(orderId: string): Promise<boolean>;
  getPositions(): Promise<unknown[]>;
}

export class BinanceAdapter implements ExchangeAdapter {
  venueName = 'Binance USD-M';
  async submitOrder(order: Order): Promise<Order> {
    // In production, signed HMAC-SHA256 request to https://fapi.binance.com
    return order;
  }
  async cancelOrder(): Promise<boolean> {
    return true;
  }
  async getPositions(): Promise<unknown[]> {
    return [];
  }
}

export class OKXAdapter implements ExchangeAdapter {
  venueName = 'OKX Futures';
  async submitOrder(order: Order): Promise<Order> {
    return order;
  }
  async cancelOrder(): Promise<boolean> {
    return true;
  }
  async getPositions(): Promise<unknown[]> {
    return [];
  }
}

export class KrakenAdapter implements ExchangeAdapter {
  venueName = 'Kraken Pro';
  async submitOrder(order: Order): Promise<Order> {
    return order;
  }
  async cancelOrder(): Promise<boolean> {
    return true;
  }
  async getPositions(): Promise<unknown[]> {
    return [];
  }
}

export class CoinbaseAdapter implements ExchangeAdapter {
  venueName = 'Coinbase Advanced';
  async submitOrder(order: Order): Promise<Order> {
    return order;
  }
  async cancelOrder(): Promise<boolean> {
    return true;
  }
  async getPositions(): Promise<unknown[]> {
    return [];
  }
}

class ExecutionEngineService {
  private mode: TradingMode = 'PAPER'; // Default institutional safety
  private adapters: Map<string, ExchangeAdapter> = new Map();

  constructor() {
    this.adapters.set('BINANCE', new BinanceAdapter());
    this.adapters.set('OKX', new OKXAdapter());
    this.adapters.set('KRAKEN', new KrakenAdapter());
    this.adapters.set('COINBASE', new CoinbaseAdapter());
  }

  public getTradingMode(): TradingMode {
    return this.mode;
  }

  public setTradingMode(mode: TradingMode, confirmationToken?: string): boolean {
    if (mode === 'LIVE') {
      if (confirmationToken !== 'CONFIRM_LIVE_TRADING_AUTH') {
        throw new Error('Live trading requires explicit 2-step verification token.');
      }
    }
    this.mode = mode;
    db.log('WARN', `Trading mode switched to ${mode}`);
    return true;
  }

  public async executeOrder(params: {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    amountBtc: number;
    price?: number;
    stopPrice?: number;
    strategyId?: string;
  }): Promise<{ success: boolean; order?: Order; error?: string }> {
    const failsafe = failsafeController.getState();
    if (failsafe.killSwitchEngaged || failsafe.safeMode) {
      return {
        success: false,
        error: `Execution Rejected: ${failsafe.killSwitchEngaged ? 'Emergency Kill Switch Active' : failsafe.safeModeReason}`,
      };
    }

    const market = marketDataService.getSnapshot();
    const currentPrice = market.price;
    const notionalUsd = Number((params.amountBtc * (params.price || currentPrice)).toFixed(2));

    // Risk Check
    const riskStatus = riskEngineService.getRiskStatus(notionalUsd);
    if (!riskStatus.tradingAllowed) {
      return {
        success: false,
        error: `Risk Engine Block: ${riskStatus.blockReason}`,
      };
    }

    const clientOrderId = `SIGMA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const orderId = `ORD-${Date.now()}`;

    // Slippage calculation (1.5 - 3.0 bps for paper execution)
    const slippageBps = 2.0;
    const slippageMultiplier = params.side === 'BUY' ? 1 + slippageBps / 10000 : 1 - slippageBps / 10000;
    const fillPrice = Number(((params.price || currentPrice) * slippageMultiplier).toFixed(2));

    const order: Order = {
      id: orderId,
      clientOrderId,
      exchangeOrderId: `EX-${clientOrderId}`,
      strategyId: params.strategyId || 'SIGMA-ENSEMBLE-4H',
      signalId: `SIG-${Date.now()}`,
      decisionId: `DEC-${Date.now()}`,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      price: params.price,
      stopPrice: params.stopPrice,
      amountBtc: params.amountBtc,
      notionalUsd,
      filledBtc: params.amountBtc, // Immediate paper fill
      averageFillPrice: fillPrice,
      status: 'FILLED',
      postOnly: false,
      reduceOnly: false,
      mode: this.mode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      reconciliationAuditId: `AUD-${Date.now()}`,
    };

    db.saveOrder(order);

    // If long or short, record open position
    const posId = `POS-${params.symbol}-${Date.now()}`;
    db.savePosition({
      id: posId,
      symbol: params.symbol,
      side: params.side === 'BUY' ? 'LONG' : 'SHORT',
      entryPrice: fillPrice,
      currentPrice: fillPrice,
      amountBtc: params.amountBtc,
      notionalUsd,
      stopLossPrice: params.side === 'BUY' ? fillPrice * 0.98 : fillPrice * 1.02,
      takeProfitPrice: params.side === 'BUY' ? fillPrice * 1.03 : fillPrice * 0.97,
      unrealizedPnlUsd: 0,
      unrealizedPnlPct: 0,
      realizedPnlUsd: 0,
      leverage: 2.0,
      maxAdverseExcursionBps: 0,
      maxFavorableExcursionBps: 0,
      cumulativeFundingPaidUsd: 0,
      feesPaidUsd: Number((notionalUsd * 0.0005).toFixed(2)), // 5 bps taker fee
      openedAt: Date.now(),
      mode: this.mode,
    });

    return { success: true, order };
  }

  public getOrders(): Order[] {
    return db.getOrders();
  }
}

export const executionEngineService = new ExecutionEngineService();
