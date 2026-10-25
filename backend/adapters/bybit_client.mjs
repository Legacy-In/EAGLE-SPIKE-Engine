/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — AUTHENTICATED BYBIT V5 CLIENT & PAPER/LIVE TRADING BRIDGE
 * File: backend/adapters/bybit_client.mjs
 * ═══════════════════════════════════════════════════════════════════════════
 */

import crypto from 'crypto';

export class BybitClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.BYBIT_API_KEY || '';
    this.apiSecret = config.apiSecret || process.env.BYBIT_API_SECRET || '';
    this.baseUrl = config.baseUrl || 'https://api.bybit.com';
    this.recvWindow = '10000';
    this.timeOffsetMs = 0;
    this.lastTimeSync = 0;
  }

  /**
   * Synchronize clock with Bybit server time to eliminate timestamp drift errors
   */
  async syncServerTime() {
    const now = Date.now();
    if (this.lastTimeSync > 0 && now - this.lastTimeSync < 60000) {
      return now + this.timeOffsetMs;
    }

    try {
      const res = await fetch(`${this.baseUrl}/v5/market/time`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const json = await res.json();
        const serverTime = parseInt(json.time, 10);
        this.timeOffsetMs = serverTime - Date.now();
        this.lastTimeSync = Date.now();
        return serverTime;
      }
    } catch {
      // Fallback to local time if network ping fails
    }
    return Date.now() + this.timeOffsetMs;
  }

  /**
   * Sign and execute authenticated Bybit V5 request
   */
  async request(method, endpoint, params = {}, body = null) {
    const timestamp = (await this.syncServerTime()).toString();
    const qs = method === 'GET' && Object.keys(params).length > 0
      ? new URLSearchParams(params).toString()
      : '';
    const bodyStr = body ? JSON.stringify(body) : '';

    const signPayload = timestamp + this.apiKey + this.recvWindow + (method === 'GET' ? qs : bodyStr);
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(signPayload)
      .digest('hex');

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'EAGLE-FLASH/2.0',
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
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`Bybit HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    return json;
  }

  /**
   * Get Unified Account wallet balances
   */
  async getWalletBalance() {
    return this.request('GET', '/v5/account/wallet-balance', { accountType: 'UNIFIED' });
  }

  /**
   * Get active linear perpetual positions
   */
  async getLinearPositions(symbol = '') {
    const params = { category: 'linear', settleCoin: 'USDT' };
    if (symbol) params.symbol = symbol;
    return this.request('GET', '/v5/position/list', params);
  }

  /**
   * Place linear perpetual order (live mode)
   */
  async placeLinearOrder({ symbol, side, orderType = 'Market', qty, price, takeProfit, stopLoss }) {
    const payload = {
      category: 'linear',
      symbol,
      side: side === 'LONG' || side === 'Buy' ? 'Buy' : 'Sell',
      orderType,
      qty: String(qty),
      timeInForce: 'GTC',
      positionIdx: 0, // One-Way Mode
    };

    if (price && orderType === 'Limit') {
      payload.price = String(price);
    }
    if (takeProfit) {
      payload.takeProfit = String(takeProfit);
    }
    if (stopLoss) {
      payload.stopLoss = String(stopLoss);
    }

    return this.request('POST', '/v5/order/create', {}, payload);
  }

  /**
   * Close linear position at market
   */
  async closeLinearPosition(symbol, side, qty) {
    return this.placeLinearOrder({
      symbol,
      side: side === 'Buy' ? 'Sell' : 'Buy',
      orderType: 'Market',
      qty,
    });
  }
}

export const bybitClient = new BybitClient();
