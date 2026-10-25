import crypto from 'crypto';

export const BYBIT_DEMO_HOST = 'https://api-demo.bybit.com';
export const BYBIT_DEMO_WS = 'wss://stream-demo.bybit.com/v5/private';

export interface BybitOrderRequest {
  symbol: string;
  side: 'Buy' | 'Sell';
  qty: string;
  orderLinkId: string;
  stopLoss?: string;
  takeProfit?: string;
}

export interface InstrumentSpecs {
  symbol: string;
  tickSize: number;
  qtyStep: number;
  minOrderQty: number;
  maxOrderQty: number;
}

export class BybitDemoClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;
  private recvWindow = '15000';
  private timeOffsetMs = 0;
  private lastTimeSync = 0;

  constructor(config: { apiKey?: string; apiSecret?: string; baseUrl?: string } = {}) {
    this.apiKey = config.apiKey || process.env.BYBIT_DEMO_API_KEY || process.env.BYBIT_API_KEY || '';
    this.apiSecret = config.apiSecret || process.env.BYBIT_DEMO_API_SECRET || process.env.BYBIT_API_SECRET || '';
    this.baseUrl = config.baseUrl || process.env.BYBIT_DEMO_REST || BYBIT_DEMO_HOST;

    // NON-NEGOTIABLE RULE 2: Assert base URL is strictly Demo host
    this.assertDemoHost();
  }

  /**
   * Hard assertion guaranteeing real money endpoints can NEVER be targeted
   */
  public assertDemoHost(): void {
    if (this.baseUrl !== BYBIT_DEMO_HOST) {
      throw new Error(
        `CRITICAL SECURITY REFUSAL: Execution target must strictly be ${BYBIT_DEMO_HOST}, got '${this.baseUrl}'. Real-money live execution is prohibited in this system.`
      );
    }
  }

  /**
   * Synchronize clock with Bybit server time to eliminate clock drift errors (retCode 10002)
   */
  public async syncServerTime(): Promise<string> {
    const now = Date.now();
    if (this.lastTimeSync > 0 && now - this.lastTimeSync < 30000) {
      return (now + this.timeOffsetMs).toString();
    }

    try {
      const res = await fetch(`${this.baseUrl}/v5/market/time`);
      if (res.ok) {
        const json = await res.json();
        const serverTime = parseInt(json.time, 10);
        this.timeOffsetMs = serverTime - Date.now();
        this.lastTimeSync = Date.now();
        return serverTime.toString();
      }
    } catch (e) {
      // Fallback to local time
    }
    return (Date.now() + this.timeOffsetMs).toString();
  }

  /**
   * Executes signed Bybit V5 REST request
   */
  public async request(method: 'GET' | 'POST', endpoint: string, params: any = {}, body: any = null): Promise<any> {
    this.assertDemoHost();

    const timestamp = await this.syncServerTime();
    const qs = method === 'GET' && Object.keys(params).length > 0
      ? new URLSearchParams(params).toString()
      : '';
    const bodyStr = body ? JSON.stringify(body) : '';

    const signPayload = timestamp + this.apiKey + this.recvWindow + (method === 'GET' ? qs : bodyStr);
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(signPayload)
      .digest('hex');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'EAGLE-FLASH-DEMO/1.0',
    };

    if (this.apiKey) {
      headers['X-BAPI-API-KEY'] = this.apiKey;
      headers['X-BAPI-TIMESTAMP'] = timestamp;
      headers['X-BAPI-SIGN'] = signature;
      headers['X-BAPI-RECV-WINDOW'] = this.recvWindow;
    }

    const url = `${this.baseUrl}${endpoint}${qs ? '?' + qs : ''}`;
    const res = await fetch(url, {
      method,
      headers,
      body: body ? bodyStr : undefined,
    });

    if (!res.ok) {
      throw new Error(`Bybit Demo HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  }

  /**
   * Request $10,000 virtual balance on Demo trading
   */
  public async applyDemoFunds(amount = 10000): Promise<any> {
    return this.request('POST', '/v5/account/demo-apply-money', {}, {
      coins: [{ coin: 'USDT', amount: amount.toString() }]
    });
  }

  /**
   * Get Unified Account wallet balances
   */
  public async getWalletBalance(): Promise<any> {
    return this.request('GET', '/v5/account/wallet-balance', { accountType: 'UNIFIED' });
  }

  /**
   * Get precision, tick size, and minimum quantity for a linear symbol
   */
  public async getInstrumentSpecs(symbol: string): Promise<InstrumentSpecs> {
    const res = await this.request('GET', '/v5/market/instruments-info', {
      category: 'linear',
      symbol,
    });
    const info = res.result?.list?.[0];
    if (!info) {
      throw new Error(`Instrument info not found on Bybit for ${symbol}`);
    }
    const priceFilter = info.priceFilter || {};
    const lotSizeFilter = info.lotSizeFilter || {};

    return {
      symbol,
      tickSize: parseFloat(priceFilter.tickSize || '0.01'),
      qtyStep: parseFloat(lotSizeFilter.qtyStep || '0.001'),
      minOrderQty: parseFloat(lotSizeFilter.minOrderQty || '0.001'),
      maxOrderQty: parseFloat(lotSizeFilter.maxOrderQty || '100000'),
    };
  }

  /**
   * Set isolated leverage (capped at 3x)
   */
  public async setLeverage(symbol: string, leverage = 3): Promise<any> {
    const levStr = Math.min(leverage, 3).toString();
    try {
      return await this.request('POST', '/v5/position/set-leverage', {}, {
        category: 'linear',
        symbol,
        buyLeverage: levStr,
        sellLeverage: levStr,
      });
    } catch (e: any) {
      // 110043: leverage not modified (already set)
      if (e.message && e.message.includes('110043')) return { retCode: 0, retMsg: 'Already set' };
      throw e;
    }
  }

  /**
   * Creates market order with orderLinkId for strict idempotency
   */
  public async createMarketOrder(order: BybitOrderRequest): Promise<any> {
    const payload: any = {
      category: 'linear',
      symbol: order.symbol,
      side: order.side,
      orderType: 'Market',
      qty: order.qty,
      orderLinkId: order.orderLinkId,
      positionIdx: 0, // one-way mode
    };

    if (order.takeProfit) payload.takeProfit = order.takeProfit;
    if (order.stopLoss) payload.stopLoss = order.stopLoss;

    return this.request('POST', '/v5/order/create', {}, payload);
  }

  /**
   * Set or update trading stop (Stop Loss and Take Profit)
   */
  public async setTradingStop(params: {
    symbol: string;
    stopLoss?: string;
    takeProfit?: string;
  }): Promise<any> {
    const payload: any = {
      category: 'linear',
      symbol: params.symbol,
      positionIdx: 0,
      tpslMode: 'Full',
      slTriggerBy: 'MarkPrice',
      tpTriggerBy: 'LastPrice',
    };
    if (params.stopLoss) payload.stopLoss = params.stopLoss;
    if (params.takeProfit) payload.takeProfit = params.takeProfit;

    return this.request('POST', '/v5/position/trading-stop', {}, payload);
  }

  /**
   * Close position immediately using Market reduce-only order
   */
  public async closePosition(symbol: string, side: 'Buy' | 'Sell', qty: string): Promise<any> {
    // If closing a Buy position, side must be Sell; if closing a Sell position, side must be Buy
    const closeSide = side === 'Buy' ? 'Sell' : 'Buy';
    return this.request('POST', '/v5/order/create', {}, {
      category: 'linear',
      symbol,
      side: closeSide,
      orderType: 'Market',
      qty,
      reduceOnly: true,
      positionIdx: 0,
    });
  }

  /**
   * Query open positions
   */
  public async getPositions(symbol?: string): Promise<any> {
    const params: any = { category: 'linear', settleCoin: 'USDT' };
    if (symbol) params.symbol = symbol;
    return this.request('GET', '/v5/position/list', params);
  }

  /**
   * Query closed PnL records
   */
  public async getClosedPnl(symbol?: string, limit = 20): Promise<any> {
    const params: any = { category: 'linear', limit };
    if (symbol) params.symbol = symbol;
    return this.request('GET', '/v5/position/closed-pnl', params);
  }
}
