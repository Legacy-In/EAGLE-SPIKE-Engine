/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — PRODUCTION ENVIRONMENT & API CONFIGURATION
 * File: apps/mobile/src/config/env.ts
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const ENV = {
  // Supabase Live Production Database
  SUPABASE_URL: 'https://yyswmlsrvrqwhztbktlm.supabase.co',
  SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5c3dtbHNydnJxd2h6dGJrdGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NTcyMzEsImV4cCI6MjEwNTUzMzIzMX0.GLZLSZR2vXTdzECLBKcS9YURb3DmEfH7ojFaTd1a_JA',

  // Live Exchange WebSocket Feeds
  WS_BINANCE_FUTURES: 'wss://fstream.binance.com/ws/!ticker@arr',
  WS_BYBIT_LINEAR: 'wss://stream.bybit.com/v5/public/linear',

  // Live Exchange REST Endpoints
  BINANCE_FUTURES_TICKERS: 'https://fapi.binance.com/fapi/v1/ticker/24hr',
  BYBIT_FUTURES_TICKERS: 'https://api.bybit.com/v5/market/tickers?category=linear',
  MEXC_FUTURES_TICKERS: 'https://contract.mexc.com/api/v1/contract/ticker',

  // Default virtual sandbox balance
  DEFAULT_PAPER_BALANCE: 10000.0,
};
