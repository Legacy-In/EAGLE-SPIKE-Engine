export * from '../backend/types';

export type PresetFilter =
  | 'ALL'
  | 'VOL_EXPLOSION'
  | 'MOMENTUM'
  | 'ACCUMULATION'
  | 'SHORT_SQUEEZE'
  | 'LONG_SQUEEZE'
  | 'BREAKOUT';

export type ExchangeFilter = 'ALL' | 'BYBIT' | 'MEXC' | 'WEEX';

export type SortField =
  | 'rank'
  | 'symbol'
  | 'lastPrice'
  | 'returns5m'
  | 'returns15m'
  | 'returns1h'
  | 'relativeVolume'
  | 'volumeZScore'
  | 'oiChangePct'
  | 'takerImbalance'
  | 'signalScore'
  | 'spikePhase'
  | 'spikeType'
  | 'spikeQuality'
  | 'price24hChange'
  | 'turnover24h'
  | 'openInterestValue'
  | 'fundingRate'
  | 'rsi'
  | 'spreadPct';
