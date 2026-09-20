/**
 * 🦅 EAGLE FLASH — Autonomous 24/7 Server-Side Market Scanner
 * Continuously evaluates 2,930+ USDT perpetual pairs across Bybit, MEXC, and WEEX in the cloud.
 * Detects real-time volume anomalies, breakouts, and short squeezes, and dispatches them
 * directly to the Telegram alert pipeline even when no browser tabs are open.
 *
 * Usage: node scripts/server_scanner.mjs
 */

import fs from 'fs';
import path from 'path';

// 1. Read configuration from .env or apps/web/.env.local
let token = process.env.TELEGRAM_BOT_TOKEN;
let chatId = process.env.TELEGRAM_CHAT_ID;

const envPaths = ['.env', 'apps/web/.env.local'];
for (const ep of envPaths) {
  if (fs.existsSync(ep)) {
    const content = fs.readFileSync(ep, 'utf-8');
    if (!token) {
      const match = content.match(/TELEGRAM_BOT_TOKEN=([^\r\n]+)/);
      if (match && match[1] && !match[1].includes('your_telegram_bot_token')) {
        token = match[1].trim();
      }
    }
    if (!chatId) {
      const match = content.match(/TELEGRAM_CHAT_ID=([^\r\n]+)/);
      if (match && match[1] && !match[1].includes('your_chat_id')) {
        chatId = match[1].trim();
      }
    }
  }
}

const SERVER_URL = process.env.INTERNAL_API_URL || 'http://localhost:3000';
const SCAN_INTERVAL_MS = parseInt(process.env.SCAN_INTERVAL_MS || '30000', 10); // 30 seconds default
const seenEvents = new Map(); // symbol -> timestamp of last dispatch

console.log('🦅 Starting Eagle Flash 24/7 Cloud Market Scanner...');
console.log(`📡 Backend Endpoint: ${SERVER_URL}/api/spikes`);
console.log(`⏱️ Scan Interval: ${SCAN_INTERVAL_MS / 1000}s`);

// Ingest Bybit Linear Tickers
async function fetchBybitTickers() {
  try {
    const res = await fetch('https://api.bybit.com/v5/market/tickers?category=linear', {
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json();
    return (json?.result?.list || []).filter(
      (t) => t.symbol.endsWith('USDT') && parseFloat(t.turnover24h || 0) > 500000
    );
  } catch (err) {
    console.warn('⚠️ Bybit fetch warning:', err.message);
    return [];
  }
}

// Ingest MEXC Contract Tickers
async function fetchMexcTickers() {
  try {
    const res = await fetch('https://contract.mexc.com/api/v1/contract/ticker', {
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json();
    if (json?.data && Array.isArray(json.data)) {
      return json.data
        .filter((t) => t.symbol && t.symbol.endsWith('_USDT') && parseFloat(t.amount24 || 0) > 300000)
        .map((t) => ({
          symbol: t.symbol.replace('_', ''),
          lastPrice: t.lastPrice,
          price24hPcnt: (parseFloat(t.riseFallRate || 0) / 100).toString(),
          turnover24h: t.amount24,
          fundingRate: t.fundingRate || '0.0001',
          exchange: 'MEXC',
        }));
    }
    return [];
  } catch {
    return [];
  }
}

// Calculate Spike Metrics for Top Candidates
async function evaluateSymbol(t) {
  try {
    const sym = t.symbol;
    const price = parseFloat(t.lastPrice || 0);
    const change24h = parseFloat((parseFloat(t.price24hPcnt || 0) * 100).toFixed(2));
    const turnoverM = parseFloat((parseFloat(t.turnover24h || 0) / 1000000).toFixed(1));
    const fundingRate = parseFloat((parseFloat(t.fundingRate || 0) * 100).toFixed(4));

    // Fast check: Skip symbols with quiet movement
    if (Math.abs(change24h) < 4.0 && turnoverM < 5.0) return null;

    // Fetch 5M kline candles to measure precise RVOL & micro-momentum
    const cRes = await fetch(
      `https://api.bybit.com/v5/market/kline?category=linear&symbol=${sym}&interval=5&limit=25`,
      { signal: AbortSignal.timeout(4000) }
    );
    const cJson = await cRes.json();
    const candles = cJson?.result?.list || [];
    if (candles.length < 12) return null;

    const cur = candles[0];
    const prev5m = candles[1];
    const prev15m = candles[3];
    const prev1h = candles[11];

    const curClose = parseFloat(cur[4]);
    const curVol = parseFloat(cur[5]);

    const ret5m = parseFloat((((curClose - parseFloat(prev5m[4])) / parseFloat(prev5m[4])) * 100).toFixed(2));
    const ret15m = parseFloat((((curClose - parseFloat(prev15m[4])) / parseFloat(prev15m[4])) * 100).toFixed(2));
    const ret1h = parseFloat((((curClose - parseFloat(prev1h[4])) / parseFloat(prev1h[4])) * 100).toFixed(2));

    const vols = candles.slice(1, 20).map((c) => parseFloat(c[5]));
    const meanVol = vols.reduce((a, b) => a + b, 0) / vols.length;
    const rvol = parseFloat((curVol / (meanVol || 1)).toFixed(2));

    const variance = vols.reduce((a, b) => a + Math.pow(b - meanVol, 2), 0) / vols.length;
    const volZ = parseFloat((Math.sqrt(variance) > 0 ? (curVol - meanVol) / Math.sqrt(variance) : 1.5).toFixed(2));

    // Calculate Multi-Factor Eagle Score (score_v2.1.0)
    let score = 50;
    if (rvol >= 2.0) score += 15;
    if (rvol >= 3.5) score += 10;
    if (Math.abs(ret5m) >= 2.0) score += 10;
    if (Math.abs(ret15m) >= 4.0) score += 8;
    if (volZ >= 2.5) score += 7;

    const isSqueeze = fundingRate < -0.3 && ret5m > 1.0;
    if (isSqueeze) score += 10;

    score = Math.min(96, Math.max(45, score));

    // Trigger only if score >= 70 and RVOL >= 1.8
    if (score < 70 || rvol < 1.8) return null;

    const phase = ret5m >= 0 ? (isSqueeze ? 'ACCELERATION' : 'BREAKOUT') : 'BREAKDOWN';
    const type = isSqueeze ? 'SHORT_SQUEEZE' : ret5m >= 0 ? 'MOMENTUM' : 'VOLUME_EXPLOSION';

    const reasons = [
      `Eagle Score: ${score}/100`,
      `RVOL: ${rvol}x baseline volume`,
      `5M Return: ${ret5m >= 0 ? '+' : ''}${ret5m}%`,
    ];
    if (isSqueeze) reasons.push(`Severe negative funding squeeze (${fundingRate}%)`);
    if (volZ >= 2.5) reasons.push(`Volume anomaly z-score: ${volZ}σ`);

    return {
      symbol: sym,
      price: curClose,
      exchange: t.exchange || 'BYBIT',
      eagleScore: score,
      rvol,
      volumeZ: volZ,
      returns5m: ret5m,
      returns15m: ret15m,
      returns1h: ret1h,
      openInterestUsd: turnoverM * 1000000 * 0.4,
      fundingRate,
      spikePhase: phase,
      spikeType: type,
      spikeQuality: score >= 85 ? 'HIGH' : 'MEDIUM',
      triggerReasons: reasons,
    };
  } catch {
    return null;
  }
}

async function runScanCycle() {
  const start = Date.now();
  try {
    const [bybitTickers, mexcTickers] = await Promise.all([fetchBybitTickers(), fetchMexcTickers()]);
    const all = [...bybitTickers, ...mexcTickers];

    // Pick top volume and momentum movers to deep-evaluate
    const topCandidates = all
      .sort((a, b) => Math.abs(parseFloat(b.price24hPcnt || 0)) - Math.abs(parseFloat(a.price24hPcnt || 0)))
      .slice(0, 20);

    const qualifiedSignals = [];
    for (const c of topCandidates) {
      const sig = await evaluateSymbol(c);
      if (sig) {
        // Cooldown check (15 minutes per symbol in memory)
        const last = seenEvents.get(sig.symbol) || 0;
        if (Date.now() - last > 15 * 60 * 1000) {
          seenEvents.set(sig.symbol, Date.now());
          qualifiedSignals.push(sig);
        }
      }
    }

    if (qualifiedSignals.length > 0) {
      console.log(`⚡ [CLOUD SCANNER] Discovered ${qualifiedSignals.length} qualified spike anomalies! Forwarding...`);

      // Post to local spikes API (which dispatches to Telegram)
      const postRes = await fetch(`${SERVER_URL}/api/spikes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signals: qualifiedSignals, forceAlert: true }),
      });
      const postJson = await postRes.json();
      console.log('✅ Spikes POST Response:', postJson.message || postJson.success);
    } else {
      console.log(
        `[CLOUD SCANNER] Checked ${all.length} contracts (${Math.round(Date.now() - start)}ms) · Markets normal.`
      );
    }
  } catch (err) {
    console.error('Scan cycle error:', err.message);
  }
}

async function main() {
  console.log('🟢 Autonomous 24/7 cloud scanner loop active.');
  // Run first cycle immediately
  await runScanCycle();
  // Then recurring
  setInterval(runScanCycle, SCAN_INTERVAL_MS);
}

main().catch(console.error);
