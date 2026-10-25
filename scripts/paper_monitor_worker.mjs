/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — VIRTUAL TP/SL MONITOR WORKER DAEMON
 * File: scripts/paper_monitor_worker.mjs
 *
 * Supervised background daemon that continuously evaluates active paper
 * trades against live exchange mark prices (Binance/Bybit/MEXC).
 * Deterministically triggers TP1 (WIN) or Stop-Loss (LOSS) resolutions,
 * calculates realized R and PnL, updates the ledger, and dispatches embeds
 * to Discord channel #paper-trades.
 *
 * Usage: node scripts/paper_monitor_worker.mjs
 * ═══════════════════════════════════════════════════════════════════════════
 */

import 'dotenv/config';
import {
  getActivePaperTrades,
  closePaperTrade,
  getPaperAccountSummary,
} from '../backend/services/paper_trading_executor.mjs';

const POLL_INTERVAL_MS = parseInt(process.env.PAPER_MONITOR_INTERVAL_MS || '3000', 10);
let isRunning = true;
let isCycleProcessing = false;

export const PaperPricesCache = new Map(); // symbol -> { price, timestamp }

export const PaperMonitorTelemetry = {
  ticksEvaluated: 0,
  activeMonitored: 0,
  tpHitsTotal: 0,
  slHitsTotal: 0,
  lastPollAt: null,
};

export function normalizeSymbol(rawSymbol) {
  if (!rawSymbol) return '';
  let s = String(rawSymbol).trim().toUpperCase().replace(/[-_]/g, '');
  while (s.endsWith('PERP') || s.endsWith('USDT')) {
    s = s.replace(/(PERP|USDT)$/, '');
  }
  return s + 'USDT';
}

/**
 * Pure Mathematical Evaluator for Paper Trade Resolutions
 * @param {object} trade - Paper trade object
 * @param {number} currentPrice - Latest verified mark price
 * @returns {object|null} - Resolution result or null if still unresolved
 */
export function evaluatePaperTradeOutcome(trade, currentPrice) {
  if (!trade || trade.status !== 'OPEN' || !currentPrice || currentPrice <= 0) {
    return null;
  }

  const isLong = trade.direction === 'LONG';
  const entry = parseFloat(trade.entry_price);
  const tp1 = parseFloat(trade.take_profit_1);
  const sl = parseFloat(trade.stop_loss);

  if (isLong) {
    // LONG: Win if Price >= TP1
    if (currentPrice >= tp1) {
      return {
        outcome: 'WIN',
        status: 'TP_HIT',
        triggerPrice: currentPrice,
        reason: `Target TP1 Achieved at $${currentPrice.toFixed(4)} (Threshold: $${tp1.toFixed(4)})`,
      };
    }
    // LONG: Loss if Price <= SL
    if (currentPrice <= sl) {
      return {
        outcome: 'LOSS',
        status: 'SL_HIT',
        triggerPrice: currentPrice,
        reason: `Stop-Loss Breached at $${currentPrice.toFixed(4)} (Threshold: $${sl.toFixed(4)})`,
      };
    }
  } else {
    // SHORT: Win if Price <= TP1
    if (currentPrice <= tp1) {
      return {
        outcome: 'WIN',
        status: 'TP_HIT',
        triggerPrice: currentPrice,
        reason: `Target TP1 Achieved at $${currentPrice.toFixed(4)} (Threshold: $${tp1.toFixed(4)})`,
      };
    }
    // SHORT: Loss if Price >= SL
    if (currentPrice >= sl) {
      return {
        outcome: 'LOSS',
        status: 'SL_HIT',
        triggerPrice: currentPrice,
        reason: `Stop-Loss Breached at $${currentPrice.toFixed(4)} (Threshold: $${sl.toFixed(4)})`,
      };
    }
  }

  return null;
}

/**
 * Update live exchange quotes for active paper symbols from Binance and Bybit
 */
export async function updatePaperLivePrices(symbols = []) {
  if (!symbols || symbols.length === 0) return 0;
  let updatedCount = 0;
  const now = Date.now();
  const symbolSet = new Set(symbols.map(s => normalizeSymbol(s)));

  // 1. Fetch Binance Futures Tickers
  try {
    const res = await fetch('https://fapi.binance.com/fapi/v1/ticker/price', {
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          if (symbolSet.has(item.symbol)) {
            const p = parseFloat(item.price);
            if (p > 0) {
              PaperPricesCache.set(item.symbol, { price: p, timestamp: now });
              updatedCount++;
            }
          }
        }
      }
    }
  } catch (e) {}

  // 2. Fallback to Bybit Linear for missing symbols
  const missing = symbols.filter(s => !PaperPricesCache.has(normalizeSymbol(s)));
  if (missing.length > 0) {
    try {
      const res = await fetch('https://api.bybit.com/v5/market/tickers?category=linear', {
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        const data = await res.json();
        const list = data?.result?.list || [];
        const missingSet = new Set(missing.map(s => normalizeSymbol(s)));
        for (const item of list) {
          if (missingSet.has(item.symbol)) {
            const p = parseFloat(item.lastPrice);
            if (p > 0) {
              PaperPricesCache.set(item.symbol, { price: p, timestamp: now });
              updatedCount++;
            }
          }
        }
      }
    } catch (e) {}
  }

  return updatedCount;
}

/**
 * Main evaluation cycle
 */
export async function runPaperMonitorCycle() {
  if (isCycleProcessing || !isRunning) return;
  isCycleProcessing = true;

  try {
    const activeTrades = getActivePaperTrades();
    PaperMonitorTelemetry.activeMonitored = activeTrades.length;
    PaperMonitorTelemetry.lastPollAt = new Date().toISOString();

    if (activeTrades.length === 0) {
      isCycleProcessing = false;
      return;
    }

    const uniqueSymbols = Array.from(new Set(activeTrades.map(t => t.symbol)));
    await updatePaperLivePrices(uniqueSymbols);

    for (const trade of activeTrades) {
      const normSym = normalizeSymbol(trade.symbol);
      const cached = PaperPricesCache.get(normSym);
      if (!cached || !cached.price) continue;

      const resolution = evaluatePaperTradeOutcome(trade, cached.price);
      if (resolution) {
        if (resolution.outcome === 'WIN') {
          PaperMonitorTelemetry.tpHitsTotal++;
        } else {
          PaperMonitorTelemetry.slHitsTotal++;
        }

        await closePaperTrade(
          trade.paper_trade_id,
          resolution.triggerPrice,
          resolution.outcome,
          resolution.reason
        );
      }
    }

    PaperMonitorTelemetry.ticksEvaluated++;
  } catch (err) {
    console.error('Paper monitor cycle error:', err?.message);
  } finally {
    isCycleProcessing = false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🦅 EAGLE FLASH — VIRTUAL TP/SL PAPER MONITOR DAEMON INITIALIZED');
  console.log(`⏱️ Evaluation Frequency: Every ${POLL_INTERVAL_MS / 1000}s`);
  console.log('═══════════════════════════════════════════════════════════════════');

  const initialSummary = getPaperAccountSummary();
  console.log(`🏦 Virtual Sandbox Balance: $${initialSummary.account.current_balance.toLocaleString()} | Active Trades: ${initialSummary.account.active_positions_count}`);

  await runPaperMonitorCycle();
  const interval = setInterval(runPaperMonitorCycle, POLL_INTERVAL_MS);

  const shutdown = () => {
    console.log('\n🛑 Shutting down Paper Monitor Daemon cleanly...');
    isRunning = false;
    clearInterval(interval);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (process.argv[1] && process.argv[1].endsWith('paper_monitor_worker.mjs')) {
  main().catch(console.error);
}
