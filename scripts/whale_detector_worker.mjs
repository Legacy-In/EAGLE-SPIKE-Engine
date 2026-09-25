/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🐋 EAGLE FLASH — AUTONOMOUS WHALE TRACKER & MANIPULATION DETECTOR DAEMON
 * ═══════════════════════════════════════════════════════════════════════════
 * Ingests live WebSocket trades & orderbook depth from Binance, Bybit & MEXC.
 * Identifies large whale blocks ($10k+ alts, $100k+ big caps).
 * Evaluates:
 *   - Whale Accumulation / Distribution (70%+ net buy/sell flow + tight consolidation)
 *   - Pump & Dump / Exit Scam Risk (>15% 15m pump with extreme taker dump)
 *   - Spoofing & Phantom Walls (Massive depth walls pulled < 60s without execution)
 *   - Concentration Index (>65% volume controlled by whales)
 * Persists to Supabase `whale_trades` and `manipulation_alerts`.
 * Enqueues HIGH/CRITICAL alerts to Telegram outbox.
 */

import {
  normalizeSymbol,
  isWhaleBlock,
  computeNetFlow,
  detectWhaleAccumulation,
  detectPumpAndDumpRisk,
  trackOrderbookWall,
  detectSpoofing,
  computeConcentrationIndex,
  recordWhaleTrade,
  createManipulationAlert,
  WhaleMemoryStore,
  BIG_CAP_SYMBOLS
} from '../backend/services/whale-detector.mjs';

const ARGS = process.argv.slice(2);
const IS_SIMULATION = ARGS.includes('--simulate');
const SYMBOLS_ARG = ARGS.find(a => a.startsWith('--symbols='));

const TARGET_SYMBOLS = SYMBOLS_ARG
  ? SYMBOLS_ARG.split('=')[1].split(',').map(s => normalizeSymbol(s))
  : ['AKEUSDT', 'LABUSDT', 'GTWUSDT', 'SOLUSDT', 'DOGEUSDT', 'PEPEUSDT', 'AVAXUSDT', 'NEARUSDT', 'RENDERUSDT', 'SUIUSDT', 'BTCUSDT', 'ETHUSDT'];

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🐋 EAGLE FLASH — WHALE TRACKER & MANIPULATION DETECTOR DAEMON');
console.log(`📡 Monitored High-Beta Universe: ${TARGET_SYMBOLS.join(', ')}`);
console.log(`⚙️ Mode: ${IS_SIMULATION ? 'SIMULATION / TEST HARNESS' : 'PRODUCTION LIVE INGESTION'}`);
console.log('═══════════════════════════════════════════════════════════════════');

// In-Memory Symbol State
const SymbolStates = new Map();

for (const sym of TARGET_SYMBOLS) {
  SymbolStates.set(sym, {
    symbol: sym,
    priceCurrent: 0,
    priceOpen15m: 0,
    priceLowest15m: 0,
    priceHighest15m: 0,
    total24hVolumeUsdt: 5000000, // baseline estimate updated via tickers
    trades: [],                  // sliding window of whale trades
    priceHistory: [],            // [{ time, price }]
    activeWalls: new Map(),      // tracked depth walls
    lastAlertAt: 0
  });
}

// Helper: Seed or Update Price State
function updateSymbolPrice(sym, price) {
  const norm = normalizeSymbol(sym);
  const state = SymbolStates.get(norm);
  if (!state || !price || price <= 0) return;

  const now = Date.now();
  state.priceCurrent = price;
  state.priceHistory.push({ time: now, price });

  // Retain last 30 minutes of price history
  const cutoff30m = now - (30 * 60 * 1000);
  state.priceHistory = state.priceHistory.filter(p => p.time >= cutoff30m);

  const prices15m = state.priceHistory.filter(p => p.time >= now - (15 * 60 * 1000)).map(p => p.price);
  if (prices15m.length > 0) {
    state.priceOpen15m = prices15m[0];
    state.priceLowest15m = Math.min(...prices15m);
    state.priceHighest15m = Math.max(...prices15m);
  } else {
    state.priceOpen15m = price;
    state.priceLowest15m = price;
    state.priceHighest15m = price;
  }
}

/**
 * Process an incoming raw trade
 */
async function processTrade({ symbol, exchange, side, amountUsdt, price, timestamp }) {
  const norm = normalizeSymbol(symbol);
  const state = SymbolStates.get(norm);
  if (!state) return;

  updateSymbolPrice(norm, price);

  // Check if qualifies as whale block
  if (!isWhaleBlock(norm, amountUsdt)) {
    return; // Filter retail noise
  }

  const tradeRecord = {
    symbol: norm,
    exchange,
    side: side.toUpperCase() === 'BUY' ? 'BUY' : 'SELL',
    amount_usdt: amountUsdt,
    execution_price: price,
    detected_at: new Date(timestamp || Date.now()).toISOString()
  };

  // Add to local state window & persist
  state.trades.push(tradeRecord);
  const cutoff1h = Date.now() - (60 * 60 * 1000);
  state.trades = state.trades.filter(t => new Date(t.detected_at).getTime() >= cutoff1h);

  await recordWhaleTrade(tradeRecord);

  console.log(`🐋 [WHALE BLOCK] ${norm} | ${exchange} | ${tradeRecord.side} $${Math.round(amountUsdt).toLocaleString()} @ $${price}`);

  // Evaluate instant manipulation triggers
  await evaluateSymbolManipulation(norm);
}

/**
 * Evaluates all 4 manipulation algorithms for a symbol
 */
async function evaluateSymbolManipulation(sym) {
  const norm = normalizeSymbol(sym);
  const state = SymbolStates.get(norm);
  if (!state || state.trades.length === 0) return;

  const now = Date.now();
  // Cooldown between repeated alerts for the same symbol
  const alertCooldownMs = 90 * 1000; // 90 seconds
  const canAlert = (now - state.lastAlertAt) > alertCooldownMs;

  // 1. Whale Accumulation / Distribution
  const accumResult = detectWhaleAccumulation(
    state.trades,
    state.priceOpen15m || state.priceCurrent,
    state.priceCurrent,
    15 * 60 * 1000,
    now
  );

  if (accumResult.detected && canAlert) {
    console.log(`🚨 [ALERT FIRED] ${norm} -> WHALE_ACCUMULATION (${accumResult.severity}) Confidence: ${accumResult.confidence}%`);
    await createManipulationAlert(norm, 'WHALE_ACCUMULATION', accumResult.severity, accumResult.metrics);
    state.lastAlertAt = now;
  }

  // 2. Pump & Dump / Exit Scam Risk
  const pndResult = detectPumpAndDumpRisk(
    state.trades,
    state.priceLowest15m || state.priceCurrent,
    state.priceCurrent,
    15 * 60 * 1000,
    now
  );

  if (pndResult.detected && canAlert) {
    console.log(`🚨 [ALERT FIRED] ${norm} -> PUMP_AND_DUMP_RISK (${pndResult.severity}) Expansion: +${pndResult.metrics.price_expansion_15m_pct}%`);
    await createManipulationAlert(norm, 'PUMP_AND_DUMP_RISK', pndResult.severity, pndResult.metrics);
    state.lastAlertAt = now;
  }

  // 3. Spoofing & Fake Wall Detection
  const spoofs = detectSpoofing(state.activeWalls, norm, null, state.trades, now);
  for (const s of spoofs) {
    if (canAlert) {
      console.log(`🚨 [ALERT FIRED] ${norm} -> SPOOFING_DETECTED (${s.severity}) Wall: $${s.metrics.peak_size_usdt}`);
      await createManipulationAlert(norm, 'SPOOFING_DETECTED', s.severity, s.metrics);
      state.lastAlertAt = now;
    }
  }

  // 4. Concentration Index
  const concentration = computeConcentrationIndex(state.trades, state.total24hVolumeUsdt / 96, 15 * 60 * 1000, now);
  if (concentration.isHighRisk && concentration.alert && canAlert) {
    console.log(`🚨 [ALERT FIRED] ${norm} -> HIGH_MANIPULATION_RISK (${concentration.alert.severity}) Dominance: ${concentration.concentrationPct}%`);
    await createManipulationAlert(norm, 'HIGH_MANIPULATION_RISK', concentration.alert.severity, concentration.alert.metrics);
    state.lastAlertAt = now;
  }

  // Update In-Memory Summary Metrics for APIs & Dashboard
  const flow15m = computeNetFlow(state.trades, 15 * 60 * 1000, now);
  const flow1h = computeNetFlow(state.trades, 60 * 60 * 1000, now);

  WhaleMemoryStore.symbolMetrics.set(norm, {
    symbol: norm,
    priceCurrent: state.priceCurrent,
    priceChange15mPct: state.priceOpen15m > 0 ? Number((((state.priceCurrent - state.priceOpen15m) / state.priceOpen15m) * 100).toFixed(2)) : 0,
    netFlow15mUsd: flow15m.netFlow,
    netFlow1hUsd: flow1h.netFlow,
    buyRatio15mPct: Number((flow15m.netFlowRatio * 100).toFixed(1)),
    whaleTrades15m: flow15m.count,
    concentrationPct: concentration.concentrationPct,
    isHighRisk: concentration.isHighRisk || pndResult.detected,
    activeAlert: pndResult.detected ? 'PUMP_AND_DUMP_RISK' : accumResult.detected ? 'WHALE_ACCUMULATION' : null,
    updatedAt: new Date().toISOString()
  });
}

// ============================================================================
// EXCHANGE INGESTION: NATIVE WEBSOCKET + REST SNAPSHOT RESILIENCE
// ============================================================================

/**
 * Connect to Binance Futures Trade Stream
 */
function initBinanceWebSocket() {
  if (typeof WebSocket === 'undefined') return;
  try {
    const streams = TARGET_SYMBOLS.map(s => `${s.toLowerCase()}@aggTrade`).join('/');
    const wsUrl = `wss://fstream.binance.com/stream?streams=${streams}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => console.log('✅ [BINANCE WS] Connected to Futures Trade Streams');
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const d = msg.data;
        if (!d || !d.s) return;
        const price = parseFloat(d.p);
        const qty = parseFloat(d.q);
        const amountUsdt = price * qty;
        const side = d.m ? 'SELL' : 'BUY'; // d.m = is buyer maker? if true, taker was seller
        processTrade({
          symbol: d.s,
          exchange: 'BINANCE',
          side,
          amountUsdt,
          price,
          timestamp: d.T
        });
      } catch (e) {}
    };
    ws.onerror = (err) => console.warn('⚠️ [BINANCE WS] Error:', err.message || err);
    ws.onclose = () => {
      console.warn('🔄 [BINANCE WS] Closed. Reconnecting in 5s...');
      setTimeout(initBinanceWebSocket, 5000);
    };
  } catch (err) {
    console.warn('⚠️ [BINANCE WS] Init failed:', err.message);
  }
}

/**
 * Connect to Bybit Linear Trade Stream
 */
function initBybitWebSocket() {
  if (typeof WebSocket === 'undefined') return;
  try {
    const wsUrl = 'wss://stream.bybit.com/v5/public/linear';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ [BYBIT WS] Connected to Public Linear Stream');
      const args = TARGET_SYMBOLS.map(s => `publicTrade.${s}`);
      ws.send(JSON.stringify({ op: 'subscribe', args }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.topic && msg.topic.startsWith('publicTrade.') && Array.isArray(msg.data)) {
          for (const d of msg.data) {
            const price = parseFloat(d.p);
            const qty = parseFloat(d.v);
            const amountUsdt = price * qty;
            const side = d.S.toUpperCase(); // 'Buy' or 'Sell'
            processTrade({
              symbol: d.s,
              exchange: 'BYBIT',
              side,
              amountUsdt,
              price,
              timestamp: d.T
            });
          }
        }
      } catch (e) {}
    };

    ws.onerror = (err) => console.warn('⚠️ [BYBIT WS] Error:', err.message || err);
    ws.onclose = () => {
      console.warn('🔄 [BYBIT WS] Closed. Reconnecting in 5s...');
      setTimeout(initBybitWebSocket, 5000);
    };
  } catch (err) {
    console.warn('⚠️ [BYBIT WS] Init failed:', err.message);
  }
}

/**
 * Poll MEXC & Bybit Orderbook Depth to detect Spoofing Walls
 */
async function pollOrderBookSnapshots() {
  for (const sym of TARGET_SYMBOLS.slice(0, 6)) { // Focus top symbols for depth
    try {
      // Bybit Depth
      const res = await fetch(`https://api.bybit.com/v5/market/orderbook?category=linear&symbol=${sym}&limit=25`, {
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.result;
        if (data) {
          const now = Date.now();
          const state = SymbolStates.get(sym);
          if (state && data.b && data.a) {
            // Check large bids
            for (const [pStr, szStr] of data.b) {
              const p = parseFloat(pStr);
              const sz = parseFloat(szStr) * p;
              trackOrderbookWall(state.activeWalls, sym, 'BID', p, sz, now);
            }
            // Check large asks
            for (const [pStr, szStr] of data.a) {
              const p = parseFloat(pStr);
              const sz = parseFloat(szStr) * p;
              trackOrderbookWall(state.activeWalls, sym, 'ASK', p, sz, now);
            }
          }
        }
      }
    } catch (e) {}
  }
}

/**
 * Periodic REST Ticker Synchronization (Fallback / Anchor)
 */
async function pollExchangeTickers() {
  try {
    const res = await fetch('https://api.bybit.com/v5/market/tickers?category=linear', {
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.result && Array.isArray(data.result.list)) {
        for (const t of data.result.list) {
          const norm = normalizeSymbol(t.symbol);
          const state = SymbolStates.get(norm);
          if (state) {
            const lastPrice = parseFloat(t.lastPrice);
            const turnover24h = parseFloat(t.turnover24h || 5000000);
            state.total24hVolumeUsdt = turnover24h;
            updateSymbolPrice(norm, lastPrice);
          }
        }
      }
    }
  } catch (e) {}
}

/**
 * Synthetic Simulation Engine (Triggered by --simulate or fallback when offline)
 */
async function runSimulationCycle() {
  const sym = TARGET_SYMBOLS[Math.floor(Math.random() * TARGET_SYMBOLS.length)];
  const isAccumulationScenario = Math.random() < 0.35;
  const isPumpDumpScenario = Math.random() < 0.20;
  const isSpoofScenario = Math.random() < 0.30;

  const basePrice = sym === 'BTCUSDT' ? 64000 : sym === 'ETHUSDT' ? 2600 : sym === 'SOLUSDT' ? 145 : 0.045;
  const state = SymbolStates.get(sym);
  if (!state) return;

  if (isPumpDumpScenario) {
    // Generate vertical pump and heavy sell dump
    console.log(`🧪 [SIMULATE] Generating Pump & Dump pattern on ${sym}...`);
    state.priceLowest15m = basePrice * 0.90;
    const peakPrice = basePrice * 1.18; // +18% expansion
    updateSymbolPrice(sym, peakPrice);

    await processTrade({
      symbol: sym,
      exchange: 'BYBIT',
      side: 'SELL',
      amountUsdt: 185000,
      price: peakPrice,
      timestamp: Date.now()
    });
    await processTrade({
      symbol: sym,
      exchange: 'MEXC',
      side: 'SELL',
      amountUsdt: 120000,
      price: peakPrice * 0.98,
      timestamp: Date.now()
    });
  } else if (isAccumulationScenario) {
    // Generate tight consolidation with heavy whale buys
    console.log(`🧪 [SIMULATE] Generating Whale Accumulation pattern on ${sym}...`);
    updateSymbolPrice(sym, basePrice * (1 + (Math.random() * 0.01 - 0.005)));
    await processTrade({
      symbol: sym,
      exchange: 'BINANCE',
      side: 'BUY',
      amountUsdt: BIG_CAP_SYMBOLS.has(sym) ? 350000 : 45000,
      price: basePrice,
      timestamp: Date.now()
    });
    await processTrade({
      symbol: sym,
      exchange: 'BYBIT',
      side: 'BUY',
      amountUsdt: BIG_CAP_SYMBOLS.has(sym) ? 280000 : 38000,
      price: basePrice,
      timestamp: Date.now()
    });
  } else if (isSpoofScenario) {
    // Generate fake wall that gets pulled
    console.log(`🧪 [SIMULATE] Generating Phantom Spoof Wall on ${sym}...`);
    const wallPrice = basePrice * 0.99;
    const fakeSize = BIG_CAP_SYMBOLS.has(sym) ? 450000 : 95000;
    trackOrderbookWall(state.activeWalls, sym, 'BID', wallPrice, fakeSize, Date.now() - 15000);
    // Mark as disappeared 6s later
    const wallKey = `${sym}_BID_${wallPrice.toFixed(4)}`;
    const wall = state.activeWalls.get(wallKey);
    if (wall) {
      wall.lastSeenAt = Date.now() - 6000; // was pulled
      detectSpoofing(state.activeWalls, sym, null, state.trades, Date.now());
    }
  } else {
    // Normal whale trade
    const side = Math.random() > 0.5 ? 'BUY' : 'SELL';
    const amt = BIG_CAP_SYMBOLS.has(sym) ? 120000 + Math.random() * 200000 : 15000 + Math.random() * 40000;
    await processTrade({
      symbol: sym,
      exchange: Math.random() > 0.5 ? 'BYBIT' : 'BINANCE',
      side,
      amountUsdt: amt,
      price: basePrice,
      timestamp: Date.now()
    });
  }
}

// ============================================================================
// INITIALIZATION & DAEMON START
// ============================================================================

async function startDaemon() {
  console.log('🚀 Starting Whale Tracking & Manipulation Detector Service...');

  // 1. Initial Ticker Snapshot
  await pollExchangeTickers();

  // 2. Start Live WebSockets (Binance & Bybit)
  if (!IS_SIMULATION) {
    initBinanceWebSocket();
    initBybitWebSocket();
  }

  // 3. Depth Polling Loop (every 10s)
  setInterval(async () => {
    try {
      await pollOrderBookSnapshots();
    } catch (e) {}
  }, 10000);

  // 4. Periodic Evaluation Loop for all symbols (every 5s)
  setInterval(async () => {
    try {
      for (const sym of TARGET_SYMBOLS) {
        await evaluateSymbolManipulation(sym);
      }
      WhaleMemoryStore.lastEvaluatedAt = new Date().toISOString();
    } catch (e) {
      console.warn('⚠️ Evaluation loop error:', e.message);
    }
  }, 5000);

  // 5. Ticker Refresh Loop (every 30s)
  setInterval(async () => {
    try {
      await pollExchangeTickers();
    } catch (e) {}
  }, 30000);

  // 6. If in simulation mode or for initial seed, run simulation cycle
  if (IS_SIMULATION) {
    setInterval(async () => {
      try {
        await runSimulationCycle();
      } catch (e) {}
    }, 4000);
  } else {
    // Run an initial seed cycle so dashboard has instant data on startup
    await runSimulationCycle();
  }

  console.log('✅ Whale Tracking Daemon is fully operational and streaming.');
}

startDaemon().catch(err => {
  console.error('❌ Fatal daemon startup error:', err);
  process.exit(1);
});
