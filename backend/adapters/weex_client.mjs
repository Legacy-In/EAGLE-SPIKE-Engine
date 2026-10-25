/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — AUTHENTICATED WEEX V3 CONTRACT CLIENT & TRADING ADAPTER
 * File: backend/adapters/weex_client.mjs
 * ═══════════════════════════════════════════════════════════════════════════
 */

import crypto from 'crypto';

export class WeexClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.WEEX_API_KEY || '';
    this.apiSecret = config.apiSecret || process.env.WEEX_API_SECRET || '';
    this.passphrase = config.passphrase || process.env.WEEX_PASSPHRASE || '';
    this.baseUrl = config.baseUrl || 'https://api-contract.weex.com';
    this.timeOffsetMs = 0;
    this.lastTimeSync = 0;
  }

  /**
   * Synchronize clock with WEEX server time to eliminate timestamp drift errors
   */
  async syncServerTime() {
    const now = Date.now();
    if (this.lastTimeSync > 0 && now - this.lastTimeSync < 60000) {
      return now + this.timeOffsetMs;
    }

    try {
      const res = await fetch(`${this.baseUrl}/capi/v3/market/time`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const json = await res.json();
        const serverTime = parseInt(json.serverTime, 10);
        if (!isNaN(serverTime)) {
          this.timeOffsetMs = serverTime - Date.now();
          this.lastTimeSync = Date.now();
          return serverTime;
        }
      }
    } catch {
      // Fallback to local time if network ping fails
    }
    return Date.now() + this.timeOffsetMs;
  }

  /**
   * Sign and execute authenticated WEEX V3 Contract request
   * Signature specification: Base64(HMAC_SHA256(secret, timestamp + method + requestPath + body))
   */
  async request(method, endpoint, params = {}, body = null) {
    const timestamp = (await this.syncServerTime()).toString();
    const qs = Object.keys(params).length > 0 ? new URLSearchParams(params).toString() : '';
    const fullPath = qs ? `${endpoint}?${qs}` : endpoint;
    const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';

    const signPayload = `${timestamp}${method.toUpperCase()}${fullPath}${bodyStr}`;
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(signPayload)
      .digest('base64');

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'EAGLE-FLASH/2.0',
      'ACCESS-KEY': this.apiKey,
      'ACCESS-SIGN': signature,
      'ACCESS-TIMESTAMP': timestamp,
    };

    if (this.passphrase) {
      headers['ACCESS-PASSPHRASE'] = this.passphrase;
    }

    const url = `${this.baseUrl}${fullPath}`;
    const options = {
      method: method.toUpperCase(),
      headers,
      signal: AbortSignal.timeout(8000),
    };

    if (bodyStr && ['POST', 'PUT', 'DELETE'].includes(method.toUpperCase())) {
      options.body = bodyStr;
    }

    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));

    return {
      status: res.status,
      ok: res.ok,
      data,
    };
  }

  /**
   * Public: Query 24h tickers (Single symbol or all perpetual contracts)
   */
  async fetchTickers(symbol = null) {
    const qs = symbol ? `?symbol=${symbol}` : '';
    const res = await fetch(`${this.baseUrl}/capi/v3/market/ticker/24hr${qs}`, {
      headers: {
        'User-Agent': 'EAGLE-FLASH/2.0',
        ...(this.apiKey ? { 'ACCESS-KEY': this.apiKey } : {}),
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`WEEX fetchTickers HTTP ${res.status}`);
    return await res.json();
  }

  /**
   * Public: Fetch market depth orderbook
   */
  async fetchDepth(symbol = 'BTCUSDT') {
    const res = await fetch(`${this.baseUrl}/capi/v3/market/depth?symbol=${symbol}`, {
      headers: { 'User-Agent': 'EAGLE-FLASH/2.0' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`WEEX fetchDepth HTTP ${res.status}`);
    return await res.json();
  }

  /**
   * Private: Fetch futures account balance
   */
  async fetchAccountBalance() {
    return this.request('GET', '/capi/v3/account/balance');
  }

  /**
   * Private: Fetch all active positions
   */
  async fetchAllPositions() {
    return this.request('GET', '/capi/v3/account/position/allPosition');
  }

  /**
   * Private: Place a futures order
   */
  async placeOrder(orderParams) {
    return this.request('POST', '/capi/v3/order', {}, orderParams);
  }
}

export const defaultWeexClient = new WeexClient();
