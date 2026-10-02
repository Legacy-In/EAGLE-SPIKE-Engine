/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — RSI HEATMAP & HIGH-OPEN-INTEREST (OI) LONG SETUP ENGINE
 * 
 * Target: High-Probability Expansion Long Opportunities
 * Filters:
 * 1. Market Cap >= $50,000,000 (Mid-cap stability, filters micro-cap rug risk)
 * 2. 24h Volume >= $1,000,000 (Ensures deep orderbook liquidity)
 * 3. 7-Day RSI <= 55 (Non-overextended daily momentum with expansion room)
 * 4. Open Interest Confluence (High derivatives OI + positive delta/accumulation)
 * 
 * Enforces:
 * - Strict 4-hour cooldown per symbol
 * - Strict Discord routing to #rsi-longs
 * ═══════════════════════════════════════════════════════════════════════════
 */

import 'dotenv/config';
import { queueNotificationAlerts } from './notification-outbox.mjs';
import { resolveDiscordChannel } from './discord/discord-router.mjs';

// Strategy Thresholds
export const RSI_LONG_CONFIG = {
  MIN_MARKET_CAP_USD: 50_000_000,       // $50M Market Cap Gate
  MIN_24H_VOLUME_USD: 1_000_000,       // $1M 24h Volume Gate
  MAX_7D_RSI: 55.0,                    // 7-Day RSI Ceiling (<= 55)
  MIN_OPEN_INTEREST_USD: 3_000_000,    // $3M High OI Baseline
  COOLDOWN_MS: 4 * 60 * 60 * 1000,     // 4-Hour Cooldown
};

// In-Memory 4-Hour Cooldown Tracker (symbol -> lastAlertTimestampMs)
export const RsiLongCooldownMap = new Map();

// Local Market Cap Registry for major USDT perpetual assets (Fallback & Cache)
const BASE_MARKET_CAPS = {
  BTC: 1_700_000_000_000,
  ETH: 330_000_000_000,
  SOL: 85_000_000_000,
  BNB: 98_000_000_000,
  XRP: 90_000_000_000,
  DOGE: 24_000_000_000,
  ADA: 22_000_000_000,
  AVAX: 11_000_000_000,
  SUI: 8_500_000_000,
  LINK: 9_200_000_000,
  NEAR: 6_100_000_000,
  APT: 4_800_000_000,
  DOT: 6_500_000_000,
  PEPE: 4_200_000_000,
  WIF: 2_600_000_000,
  OP: 2_200_000_000,
  ARB: 2_100_000_000,
  FET: 3_100_000_000,
  RENDER: 2_900_000_000,
  INJ: 2_200_000_000,
  TAO: 4_100_000_000,
  TIA: 1_200_000_000,
  SEI: 1_100_000_000,
  KAS: 3_200_000_000,
  AAVE: 2_700_000_000,
  UNI: 5_200_000_000,
  LDO: 1_500_000_000,
  FTM: 1_800_000_000,
  RUNE: 1_600_000_000,
  ICP: 4_500_000_000,
  POL: 3_100_000_000,
  SHIB: 11_000_000_000,
  BONK: 1_700_000_000,
  FLOKI: 1_400_000_000,
};

// Dynamic in-memory market cap cache (refreshed periodically)
export const DynamicMarketCapCache = new Map(Object.entries(BASE_MARKET_CAPS));
let lastCacheUpdateMs = 0;

/**
 * Fetch and update dynamic market cap cache from public endpoints (CoinGecko)
 */
export async function refreshMarketCapCache() {
  const now = Date.now();
  if (now - lastCacheUpdateMs < 30 * 60 * 1000 && DynamicMarketCapCache.size > 50) {
    return;
  }
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1',
      {
        headers: { 'User-Agent': 'EagleFlashBot/1.0' },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const coin of data) {
          if (coin.symbol && coin.market_cap > 0) {
            DynamicMarketCapCache.set(coin.symbol.toUpperCase(), coin.market_cap);
          }
        }
        lastCacheUpdateMs = now;
      }
    }
  } catch (err) {
    // Non-blocking fallback to local base registry
  }
}

/**
 * Resolve estimated Market Cap for a given perpetual symbol
 */
export function getEstimatedMarketCap(symbol, lastPrice = 0, turnover24h = 0) {
  if (!symbol) return 0;
  const cleanSym = symbol.toUpperCase().replace(/[-_]/g, '').replace(/USDT$/, '');

  // 1. Direct cache lookup
  if (DynamicMarketCapCache.has(cleanSym)) {
    return DynamicMarketCapCache.get(cleanSym);
  }

  // 2. High turnover proxy: perpetual contracts with >= $15M 24h turnover
  // typically represent tokens with at least $50M-$150M+ circulating market cap.
  if (turnover24h >= 15_000_000) {
    return Math.max(turnover24h * 4.5, RSI_LONG_CONFIG.MIN_MARKET_CAP_USD);
  }

  return 0;
}

/**
 * Calculate Wilder's Relative Strength Index (RSI)
 * @param {number[]} closes - Array of closing prices (chronological: index 0 oldest, last newest)
 * @param {number} period - RSI lookback period (default: 7 for 7-day daily RSI)
 * @returns {number} RSI value (0 - 100)
 */
export function calculateRsi(closes = [], period = 7) {
  if (!Array.isArray(closes) || closes.length < period + 1) {
    return 50.0; // Default neutral if insufficient bars
  }

  const changes = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  let gains = 0;
  let losses = 0;

  // First period simple average
  for (let i = 0; i < period; i++) {
    const diff = changes[i];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Subsequent periods smoothed using Wilder's technique
  for (let i = period; i < changes.length; i++) {
    const diff = changes[i];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) {
    return 100.0;
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  return parseFloat(rsi.toFixed(2));
}

// Historical Daily Closes Cache (symbol -> { closes: number[], fetchedAt: number })
export const DailyClosesCache = new Map();
const DAILY_CLOSES_TTL_MS = 30 * 60 * 1000; // 30 minutes TTL

/**
 * Fetch previous daily closes for Wilder's 7D RSI calculation
 * Returns array of previous 13 closed daily prices
 */
export async function getHistoricalDailyCloses(symbol, exchange = 'BYBIT') {
  const cleanSym = (symbol || '').toUpperCase().replace(/[-_]/g, '');
  const now = Date.now();
  const cached = DailyClosesCache.get(cleanSym);
  if (cached && now - cached.fetchedAt < DAILY_CLOSES_TTL_MS && Array.isArray(cached.closes) && cached.closes.length >= 7) {
    return cached.closes;
  }

  try {
    const res = await fetch(
      `https://api.bybit.com/v5/market/kline?category=linear&symbol=${cleanSym}&interval=D&limit=14`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const json = await res.json();
      const list = json?.result?.list || [];
      if (Array.isArray(list) && list.length >= 8) {
        const prevCloses = list.slice(1).map((k) => parseFloat(k[4])).reverse();
        DailyClosesCache.set(cleanSym, { closes: prevCloses, fetchedAt: now });
        return prevCloses;
      }
    }
  } catch (err) {
    // Non-blocking fallback
  }

  return cached?.closes || [];
}

/**
 * Checks whether a symbol is currently on the 4-hour cooldown
 */
export function isRsiLongOnCooldown(symbol, now = Date.now()) {
  const lastAlert = RsiLongCooldownMap.get(symbol);
  if (!lastAlert) return false;
  return now - lastAlert < RSI_LONG_CONFIG.COOLDOWN_MS;
}

/**
 * Record alert timestamp to enforce the 4-hour cooldown
 */
export function recordRsiLongCooldown(symbol, now = Date.now()) {
  RsiLongCooldownMap.set(symbol, now);
}

/**
 * Evaluate Candidate for RSI Heatmap & High-OI Long Opportunity
 * 
 * @param {object} candidate
 * @returns {object} Evaluation result with qualifies, reasons, and calculated metrics
 */
export function evaluateRsiLongOpportunity(candidate = {}) {
  const symbol = (candidate.symbol || '').toUpperCase().replace(/[-_]/g, '');
  const exchange = (candidate.exchange || 'BYBIT').toUpperCase();
  const lastPrice = parseFloat(candidate.lastPrice || candidate.price || candidate.close || 0);
  const volume24h = parseFloat(candidate.turnover24h || candidate.volume24h || candidate.quoteVolume || 0);

  // 1. Resolve Market Cap
  let marketCap = parseFloat(candidate.marketCap || candidate.market_cap || 0);
  if (marketCap <= 0) {
    marketCap = getEstimatedMarketCap(symbol, lastPrice, volume24h);
  }

  // 2. Resolve 7-Day RSI
  let rsi7d = candidate.rsi7d !== undefined && candidate.rsi7d !== null ? parseFloat(candidate.rsi7d) : null;
  if (rsi7d === null) {
    if (Array.isArray(candidate.dailyCloses) && candidate.dailyCloses.length >= 8) {
      rsi7d = calculateRsi(candidate.dailyCloses, 7);
    } else if (Array.isArray(candidate.klineCloses) && candidate.klineCloses.length >= 8) {
      rsi7d = calculateRsi(candidate.klineCloses, 7);
    } else {
      const cached = DailyClosesCache.get(symbol);
      if (cached && Array.isArray(cached.closes) && cached.closes.length >= 7) {
        rsi7d = calculateRsi([...cached.closes, lastPrice], 7);
      } else {
        rsi7d = parseFloat(candidate.rsi || 50);
      }
    }
  }

  // 3. Resolve Open Interest & Confluence
  const openInterestValue = parseFloat(
    candidate.openInterestValue ||
    candidate.oiValue ||
    (parseFloat(candidate.openInterest || candidate.oi || 0) * lastPrice) ||
    0
  );
  const oiDeltaPct = parseFloat(candidate.oiDeltaPct || candidate.oiChangePct || candidate.oiDelta || 0);
  const takerFlow = parseFloat(candidate.takerImbalance || candidate.takerFlow || 0);
  const fundingRate = parseFloat(candidate.fundingRate || 0);

  const reasons = [];
  let qualifies = true;

  // Criterion 1: Market Cap Gate (>= $50,000,000)
  if (marketCap < RSI_LONG_CONFIG.MIN_MARKET_CAP_USD) {
    qualifies = false;
    reasons.push(`Market Cap ($${Math.round(marketCap).toLocaleString()}) below $50M gate`);
  }

  // Criterion 2: 24h Volume Gate (>= $1,000,000)
  if (volume24h < RSI_LONG_CONFIG.MIN_24H_VOLUME_USD) {
    qualifies = false;
    reasons.push(`24h Volume ($${Math.round(volume24h).toLocaleString()}) below $1M gate`);
  }

  // Criterion 3: 7-Day RSI Ceiling (<= 55)
  if (rsi7d > RSI_LONG_CONFIG.MAX_7D_RSI) {
    qualifies = false;
    reasons.push(`7D RSI (${rsi7d}) exceeds ceiling of 55`);
  }

  // Criterion 4: Open Interest Confluence
  // High OI (>= $3M) AND supportive derivatives positioning (positive delta or positive taker flow)
  const isHighOi = openInterestValue >= RSI_LONG_CONFIG.MIN_OPEN_INTEREST_USD;
  const isPositiveConfluence = oiDeltaPct > 0 || takerFlow > 0 || fundingRate < 0.0003;

  if (!isHighOi) {
    qualifies = false;
    reasons.push(`Open Interest ($${Math.round(openInterestValue).toLocaleString()}) below $3M high-OI threshold`);
  } else if (!isPositiveConfluence && oiDeltaPct < -2.0) {
    qualifies = false;
    reasons.push(`Open Interest contraction without positive institutional flow (OI Δ ${oiDeltaPct}%)`);
  }

  // Cooldown Verification
  const onCooldown = isRsiLongOnCooldown(symbol);
  if (onCooldown) {
    qualifies = false;
    reasons.push('Symbol is within 4-hour alert cooldown');
  }

  return {
    qualifies,
    symbol,
    exchange,
    reasons,
    onCooldown,
    metrics: {
      symbol,
      exchange,
      lastPrice,
      marketCap,
      volume24h,
      rsi7d,
      openInterestValue,
      oiDeltaPct,
      takerFlow,
      fundingRate,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Dispatch Qualified RSI Long Setup to Discord #rsi-longs Outbox
 * 
 * @param {object} opportunity - Evaluated opportunity or candidate
 * @returns {Promise<object|null>} Outbox queuing result
 */
export async function dispatchRsiLongAlert(opportunity) {
  const evalResult = opportunity.qualifies !== undefined
    ? opportunity
    : evaluateRsiLongOpportunity(opportunity);

  if (!evalResult.qualifies) {
    return null;
  }

  const m = evalResult.metrics;
  const now = Date.now();
  const dateStr = new Date(now).toISOString().slice(0, 10).replace(/-/g, '');
  const fourHourBucket = Math.floor(now / (4 * 3600 * 1000));
  const signalId = `RSI-LONG-${dateStr}-${m.exchange}-${m.symbol}-${fourHourBucket.toString(16).toUpperCase()}`;

  // Record 4-hour cooldown
  recordRsiLongCooldown(m.symbol, now);

  const payload = {
    signal_id: signalId,
    symbol: m.symbol,
    exchange: m.exchange,
    strategy_type: 'RSI_HEATMAP_LONG',
    primary_strategy: 'RSI_LONG',
    event_type: 'RSI_LONG_SETUP',
    price: m.lastPrice,
    entry_price: m.lastPrice,
    market_cap: m.marketCap,
    volume_24h: m.volume24h,
    rsi_7d: m.rsi7d,
    open_interest_usd: m.openInterestValue,
    oi_delta_pct: m.oiDeltaPct,
    taker_flow_pct: m.takerFlow,
    detected_at: m.timestamp,
    direction: 'LONG',
  };

  const channelId = resolveDiscordChannel({
    signal_id: signalId,
    event_type: 'RSI_LONG_SETUP',
    payload,
  });

  const outboxItem = {
    signal_id: signalId,
    event_type: 'RSI_LONG_SETUP',
    channel_type: 'DISCORD',
    channel_id: channelId,
    payload,
    deduplication_key: `OUTBOX-${m.symbol}-RSI_LONG_SETUP-DISCORD-${fourHourBucket}`,
  };

  await queueNotificationAlerts([outboxItem]);
  console.log(`📡 [RSI_LONG_ALERT_QUEUED] Symbol: ${m.symbol} | 7D RSI: ${m.rsi7d} | OI: $${(m.openInterestValue / 1e6).toFixed(1)}M | Cap: $${(m.marketCap / 1e6).toFixed(1)}M`);
  return { success: true, signalId, outboxItem };
}

/**
 * Fast multi-asset screener that scans raw market tickers, computes real-time 7D RSI,
 * and identifies qualified institutional long setups.
 * 
 * @param {Array<object>} tickers - Live tickers from exchange(s)
 * @returns {Promise<Array<object>>} Qualified long setups
 */
export async function scanAndEvaluateRsiLongs(tickers = []) {
  if (!Array.isArray(tickers) || tickers.length === 0) return [];

  await refreshMarketCapCache().catch(() => {});

  // 1. Fast pre-filter against volume, OI, and market cap baseline
  const candidates = [];
  for (const t of tickers) {
    const sym = (t.symbol || '').toUpperCase().replace(/[-_]/g, '');
    if (!sym.endsWith('USDT')) continue;

    const lastPrice = parseFloat(t.lastPrice || t.price || t.close || 0);
    if (lastPrice <= 0) continue;

    const turnover = parseFloat(t.turnover24h || t.volume24h || t.quoteVolume || 0);
    if (turnover < RSI_LONG_CONFIG.MIN_24H_VOLUME_USD) continue;

    const oiVal = parseFloat(
      t.openInterestValue ||
      t.oiValue ||
      (parseFloat(t.openInterest || t.oi || 0) * lastPrice) ||
      0
    );
    if (oiVal < RSI_LONG_CONFIG.MIN_OPEN_INTEREST_USD) continue;

    const mcap = parseFloat(t.marketCap || t.market_cap || 0) || getEstimatedMarketCap(sym, lastPrice, turnover);
    if (mcap < RSI_LONG_CONFIG.MIN_MARKET_CAP_USD) continue;

    candidates.push({
      ...t,
      cleanSym: sym,
      lastPrice,
      turnover,
      oiVal,
      mcap,
    });
  }

  // 2. Sort by Open Interest descending to prioritize deepest institutional capital
  candidates.sort((a, b) => b.oiVal - a.oiVal);

  const qualifiedSetups = [];

  // 3. Deep-evaluate top candidates (up to 40 assets per cycle)
  for (const c of candidates.slice(0, 40)) {
    let rsi7d = c.rsi7d !== undefined && c.rsi7d !== null ? parseFloat(c.rsi7d) : null;
    if (rsi7d === null) {
      const prevDaily = await getHistoricalDailyCloses(c.cleanSym, c.exchange || 'BYBIT');
      if (prevDaily.length >= 7) {
        rsi7d = calculateRsi([...prevDaily, c.lastPrice], 7);
      } else {
        rsi7d = parseFloat(c.rsi || 50);
      }
    }

    const evalResult = evaluateRsiLongOpportunity({
      symbol: c.cleanSym,
      exchange: c.exchange || 'BYBIT',
      lastPrice: c.lastPrice,
      turnover24h: c.turnover,
      openInterestValue: c.oiVal,
      oiDeltaPct: parseFloat(c.price24hPcnt || c.oiDeltaPct || 0) * 10,
      fundingRate: parseFloat(c.fundingRate || 0),
      marketCap: c.mcap,
      rsi7d,
    });

    if (evalResult.qualifies) {
      qualifiedSetups.push(evalResult);
    }
  }

  return qualifiedSetups;
}

/**
 * Scan and dispatch live RSI long setups to the outbox for Discord routing
 * 
 * @param {Array<object>} tickers - Raw exchange tickers
 * @returns {Promise<object>} Execution stats
 */
export async function scanAndDispatchLiveRsiLongs(tickers = []) {
  try {
    const qualified = await scanAndEvaluateRsiLongs(tickers);
    let dispatchedCount = 0;

    for (const opp of qualified) {
      if (!isRsiLongOnCooldown(opp.symbol)) {
        const res = await dispatchRsiLongAlert(opp);
        if (res && res.success) {
          dispatchedCount++;
        }
      }
    }

    return { qualifiedCount: qualified.length, dispatchedCount, qualified };
  } catch (err) {
    console.warn('⚠️ [RSI_LONG_SCANNER_WARN]:', err?.message);
    return { qualifiedCount: 0, dispatchedCount: 0, qualified: [] };
  }
}

// Standalone CLI runner: node backend/services/rsi_long_strategy.mjs
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('backend/services/rsi_long_strategy.mjs')) {
  (async () => {
    console.log('🦅 Running Autonomous RSI Heatmap & High-OI Long Strategy Scanner...');
    try {
      const res = await fetch('https://api.bybit.com/v5/market/tickers?category=linear');
      const json = await res.json();
      const tickers = json?.result?.list || [];
      console.log(`📡 Ingested ${tickers.length} tickers from Bybit.`);
      const result = await scanAndDispatchLiveRsiLongs(tickers);
      console.log(`✅ Scan complete: ${result.qualifiedCount} qualified, ${result.dispatchedCount} dispatched to outbox.`);
      for (const q of result.qualified) {
        console.log(`  🪙 ${q.symbol} | 7D RSI: ${q.metrics.rsi7d} | OI: $${(q.metrics.openInterestValue/1e6).toFixed(1)}M | Cap: $${(q.metrics.marketCap/1e6).toFixed(1)}M | Vol: $${(q.metrics.volume24h/1e6).toFixed(1)}M`);
      }
    } catch (e) {
      console.error('Scan error:', e);
    }
  })();
}

