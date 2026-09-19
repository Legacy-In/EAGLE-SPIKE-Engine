/**
 * SIGMA — Platform Configuration, Factor Weights & Risk Constants
 */

import { RiskParameters } from '../types';

export const SYSTEM_VERSION = {
  platform: 'SIGMA Workstation v4.2 Institutional',
  modelVersion: 'SIGMA-4H-ENSEMBLE-v1.7',
  featureSetDate: '2026-09-19',
  configProfile: 'risk-profile-institutional-v3',
  build: '2026.09.19.RELEASE',
};

/**
 * Baseline Multi-Factor Ensemble Weights
 * Configurable, must sum to 100%
 */
export const DEFAULT_FACTOR_WEIGHTS = {
  marketStructure: 0.25, // 25% EMA, structural trend, ADX, VWAP
  derivatives: 0.15, // 15% Funding z-score, OI/Price divergence, basis
  orderFlow: 0.15, // 15% CVD, net delta, book depth imbalance
  onChain: 0.15, // 15% MVRV percentile, SOPR, NUPL, exchange netflows
  macro: 0.1, // 10% DXY, US10Y, yield curve, liquidity regime
  flow: 0.1, // 10% Verified ETF flows, stablecoin supply expansion
  sentiment: 0.05, // 5% Fear & Greed, social sentiment
  volatilityLiquidity: 0.05, // 5% Realized vs implied vol, book spread
};

/**
 * Institutional Risk Parameters (Hard Limits)
 */
export const DEFAULT_RISK_PARAMETERS: RiskParameters = {
  maxRiskPerTradePct: 0.5, // 0.50% account equity
  maxDailyLossPct: 2.0, // 2.0% daily hard stop
  maxWeeklyLossPct: 5.0, // 5.0% weekly circuit breaker
  maxDrawdownPct: 10.0, // 10.0% max drawdown before locking safe mode
  maxLeverage: 3.0, // Institutional 3x max leverage
  maxNotionalExposureUsd: 250000,
  maxCorrelatedExposurePct: 40.0,
  safeModeActive: false,
  killSwitchEngaged: false,
};

/**
 * Feed & Venue Configs
 */
export const DATA_PROVIDERS = {
  binance: {
    spotWs: 'wss://stream.binance.com:9443/ws/btcusdt@trade/btcusdt@depth20@100ms/btcusdt@kline_1m',
    futuresWs: 'wss://fstream.binance.com/ws/btcusdt@markPrice@1s/btcusdt@forceOrder',
    spotRest: 'https://api.binance.com',
    futuresRest: 'https://fapi.binance.com',
  },
  okx: {
    rest: 'https://www.okx.com',
  },
  coinbase: {
    rest: 'https://api.exchange.coinbase.com',
  },
  alternativeMe: {
    fearGreed: 'https://api.alternative.me/fng/?limit=2',
  },
  defiLlama: {
    stablecoins: 'https://stablecoins.llama.fi/stablecoincharts/all',
  },
};
