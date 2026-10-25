'use strict';
// ================================================================
// confluenceStrategy.js
// 11-vote BUY/SELL confluence engine (1H default).
// Trend + momentum + flow votes -> Score % = winning-side votes / 11.
//
// NOTE: this is OUR OWN 11-vote design inspired by a screenshot of a
// third-party screener. The screener's real 11 conditions are not
// visible, so this is NOT a copy. Thresholds are untested defaults.
//
// Input candles: ascending, CLOSED candles only:
//   { t (ms, candle start), o, h, l, c, v }
// Optional oi: ascending [{ t (ms), oi (number) }]
// ================================================================

const TOTAL_VOTES = 11;

const DEFAULTS = {
  intervalMs: 60 * 60 * 1000,
  minCandles: 260,
  minVotes: 7,          // votes needed on one side
  minMargin: 3,         // winning side must lead by this many votes
  freshCandles: 3,      // MACD/QQE/EMA flip must be this recent
  ema: { fast: 9, slow: 21, mid: 50, long: 200 },
  macd: { fast: 12, slow: 26, signal: 9 },
  rsi: { period: 14, bull: 55, bear: 45 },
  adx: { period: 14, min: 20 },
  range: { lookback: 20, hi: 0.8, lo: 0.2 },
  qqe: { rsi: 14, smooth: 5, factor: 4.236 },
  rvol: { lookback: 48, min: 1.5 },
  oi: { lookbackCandles: 4, minPct: 1.0 },
};

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

// ---------- smoothing primitives (null-prefix aware) ----------
function smooth(arr, period, alpha) {
  const out = new Array(arr.length).fill(null);
  let prev = null, count = 0, sum = 0;
  for (let i = 0; i < arr.length; i++) {
    const x = arr[i];
    if (!isNum(x)) continue;
    if (prev === null) {
      count++; sum += x;
      if (count === period) { prev = sum / period; out[i] = prev; }
    } else {
      prev = prev + alpha * (x - prev);
      out[i] = prev;
    }
  }
  return out;
}
const ema = (arr, period) => smooth(arr, period, 2 / (period + 1));
const rma = (arr, period) => smooth(arr, period, 1 / period); // Wilder

// ---------- indicators ----------
function rsi(close, period) {
  const n = close.length, out = new Array(n).fill(null);
  if (n <= period) return out;
  let g = 0, l = 0;
  for (let i = 1; i <= period; i++) {
    const d = close[i] - close[i - 1];
    if (d >= 0) g += d; else l -= d;
  }
  let avgG = g / period, avgL = l / period;
  const val = () => (avgG === 0 && avgL === 0) ? 50 : (avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL));
  out[period] = val();
  for (let i = period + 1; i < n; i++) {
    const d = close[i] - close[i - 1];
    avgG = (avgG * (period - 1) + (d > 0 ? d : 0)) / period;
    avgL = (avgL * (period - 1) + (d < 0 ? -d : 0)) / period;
    out[i] = val();
  }
  return out;
}

function macd(close, fast, slow, sig) {
  const ef = ema(close, fast), es = ema(close, slow);
  const line = close.map((_, i) => (isNum(ef[i]) && isNum(es[i])) ? ef[i] - es[i] : null);
  const signal = ema(line, sig);
  const hist = line.map((v, i) => (isNum(v) && isNum(signal[i])) ? v - signal[i] : null);
  return { line, signal, hist };
}

function adx(high, low, close, period) {
  const n = close.length;
  const tr = new Array(n).fill(null), pdm = new Array(n).fill(null), mdm = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    const up = high[i] - high[i - 1], dn = low[i - 1] - low[i];
    pdm[i] = (up > dn && up > 0) ? up : 0;
    mdm[i] = (dn > up && dn > 0) ? dn : 0;
    tr[i] = Math.max(high[i] - low[i], Math.abs(high[i] - close[i - 1]), Math.abs(low[i] - close[i - 1]));
  }
  const str = rma(tr, period), sp = rma(pdm, period), sm = rma(mdm, period);
  const pdi = new Array(n).fill(null), mdi = new Array(n).fill(null), dx = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (!isNum(str[i])) continue;
    if (str[i] === 0) { pdi[i] = 0; mdi[i] = 0; dx[i] = 0; continue; }
    pdi[i] = 100 * sp[i] / str[i];
    mdi[i] = 100 * sm[i] / str[i];
    const s = pdi[i] + mdi[i];
    dx[i] = s === 0 ? 0 : 100 * Math.abs(pdi[i] - mdi[i]) / s;
  }
  return { adx: rma(dx, period), pdi, mdi };
}

// ATR (Wilder). Used by the risk gate for stop-loss distance.
function atr(high, low, close, period) {
  const n = close.length, tr = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    tr[i] = Math.max(high[i] - low[i], Math.abs(high[i] - close[i - 1]), Math.abs(low[i] - close[i - 1]));
  }
  return rma(tr, period);
}

// Classic QQE: smoothed RSI vs a volatility-adaptive trailing band.
function qqe(close, cfg) {
  const n = close.length;
  const r = rsi(close, cfg.rsi);
  const rsiMa = ema(r, cfg.smooth);
  const wilders = cfg.rsi * 2 - 1;
  const atrRsi = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    if (isNum(rsiMa[i]) && isNum(rsiMa[i - 1])) atrRsi[i] = Math.abs(rsiMa[i - 1] - rsiMa[i]);
  }
  const maAtr = ema(atrRsi, wilders);
  const dar = ema(maAtr, wilders).map((v) => (isNum(v) ? v * cfg.factor : null));
  const trend = new Array(n).fill(null);
  let longP = null, shortP = null, trendP = 1;
  for (let i = 0; i < n; i++) {
    if (!isNum(rsiMa[i]) || !isNum(dar[i])) continue;
    const nl = rsiMa[i] - dar[i], ns = rsiMa[i] + dar[i];
    let lb, sb, tr = trendP;
    if (longP === null) { lb = nl; sb = ns; }
    else {
      const pr = rsiMa[i - 1];
      lb = (pr > longP && rsiMa[i] > longP) ? Math.max(longP, nl) : nl;
      sb = (pr < shortP && rsiMa[i] < shortP) ? Math.min(shortP, ns) : ns;
      if (pr <= shortP && rsiMa[i] > shortP) tr = 1;
      else if (pr >= longP && rsiMa[i] < longP) tr = -1;
    }
    trend[i] = tr; trendP = tr; longP = lb; shortP = sb;
  }
  return { rsiMa, trend };
}

// candles since the sign last changed (0 = flipped on this candle)
function ageOf(signArr, i) {
  if (!isNum(signArr[i])) return null;
  let j = i;
  while (j > 0 && isNum(signArr[j - 1]) && signArr[j - 1] === signArr[i]) j--;
  return i - j;
}
const sgn = (x) => (isNum(x) ? (x > 0 ? 1 : x < 0 ? -1 : 0) : null);

function median(a) {
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function computeIndicators(candles, cfg) {
  const close = candles.map((c) => c.c), high = candles.map((c) => c.h), low = candles.map((c) => c.l);
  const e = cfg.ema;
  const eFast = ema(close, e.fast), eSlow = ema(close, e.slow), eMid = ema(close, e.mid), eLong = ema(close, e.long);
  const m = macd(close, cfg.macd.fast, cfg.macd.slow, cfg.macd.signal);
  const a = adx(high, low, close, cfg.adx.period);
  return {
    close, eFast, eSlow, eMid, eLong, m, a,
    rsi: rsi(close, cfg.rsi.period),
    atr: atr(high, low, close, cfg.adx.period),
    q: qqe(close, cfg.qqe),
    emaSign: close.map((_, i) => (isNum(eFast[i]) && isNum(eSlow[i])) ? sgn(eFast[i] - eSlow[i]) : null),
    macdSign: close.map((_, i) => (isNum(m.line[i]) && isNum(m.signal[i])) ? sgn(m.line[i] - m.signal[i]) : null),
  };
}

function oiInfoAt(candles, oi, i, cfg) {
  if (!Array.isArray(oi) || oi.length === 0) return null;
  const k = cfg.oi.lookbackCandles;
  const cut = candles[i].t + cfg.intervalMs;
  let j = -1;
  for (let x = oi.length - 1; x >= 0; x--) { if (oi[x].t <= cut) { j = x; break; } }
  if (j - k < 0 || i - k < 0) return null;
  const base = oi[j - k].oi;
  if (!isNum(base) || base <= 0) return null;
  const oiPct = (oi[j].oi - base) / base * 100;
  const pricePct = (candles[i].c / candles[i - k].c - 1) * 100;
  return { oiPct, pricePct };
}

function evaluateAt(candles, ind, i, cfg, oi) {
  const f = (x, d = 2) => (isNum(x) ? x.toFixed(d) : 'n/a');
  const votes = [];
  const add = (id, label, group, vote, detail) => votes.push({ id, label, group, vote, detail });
  const c = candles[i];

  // --- TREND ---
  { const s = ind.emaSign[i];
    add('ema_cross', `EMA${cfg.ema.fast}/${cfg.ema.slow}`, 'trend', s || 0, `fast ${f(ind.eFast[i])} vs slow ${f(ind.eSlow[i])}`); }
  { const ok = isNum(ind.eMid[i]);
    add('price_vs_ema_mid', `Price vs EMA${cfg.ema.mid}`, 'trend', ok ? sgn(c.c - ind.eMid[i]) : 0, `close ${f(c.c)} vs ${f(ind.eMid[i])}`); }
  { const ok = isNum(ind.eMid[i]) && isNum(ind.eLong[i]);
    add('ema_regime', `EMA${cfg.ema.mid}/${cfg.ema.long}`, 'trend', ok ? sgn(ind.eMid[i] - ind.eLong[i]) : 0, `${f(ind.eMid[i])} vs ${f(ind.eLong[i])}`); }
  { const ax = ind.a.adx[i], p = ind.a.pdi[i], m = ind.a.mdi[i];
    const v = (isNum(ax) && ax >= cfg.adx.min) ? sgn(p - m) : 0;
    add('adx_di', `ADX/DI (≥${cfg.adx.min})`, 'trend', v || 0, `ADX ${f(ax, 1)} +DI ${f(p, 1)} -DI ${f(m, 1)}`); }
  { const lb = cfg.range.lookback;
    let v = 0, det = 'n/a';
    if (i >= lb - 1) {
      let hh = -Infinity, ll = Infinity;
      for (let x = i - lb + 1; x <= i; x++) { hh = Math.max(hh, candles[x].h); ll = Math.min(ll, candles[x].l); }
      const pos = hh === ll ? 0.5 : (c.c - ll) / (hh - ll);
      v = pos >= cfg.range.hi ? 1 : pos <= cfg.range.lo ? -1 : 0;
      det = `range pos ${(pos * 100).toFixed(0)}%`;
    }
    add('range_pos', `${lb}-candle range`, 'trend', v, det); }

  // --- MOMENTUM ---
  { const s = ind.macdSign[i];
    add('macd_cross', 'MACD vs signal', 'momentum', s || 0, `macd ${f(ind.m.line[i], 4)} sig ${f(ind.m.signal[i], 4)}`); }
  { const h = ind.m.hist[i], hp = ind.m.hist[i - 1];
    let v = 0;
    if (isNum(h) && isNum(hp)) v = (h > 0 && h > hp) ? 1 : (h < 0 && h < hp) ? -1 : 0;
    add('macd_hist', 'MACD histogram', 'momentum', v, `hist ${f(h, 4)} prev ${f(hp, 4)}`); }
  { const t = ind.q.trend[i];
    add('qqe', 'QQE', 'momentum', isNum(t) ? t : 0, `trend ${isNum(t) ? t : 'n/a'} rsiMa ${f(ind.q.rsiMa[i], 1)}`); }
  { const r = ind.rsi[i];
    const v = !isNum(r) ? 0 : r >= cfg.rsi.bull ? 1 : r <= cfg.rsi.bear ? -1 : 0;
    add('rsi', `RSI${cfg.rsi.period} (${cfg.rsi.bear}/${cfg.rsi.bull})`, 'momentum', v, `RSI ${f(r, 1)}`); }

  // --- FLOW ---
  const oiInfo = oiInfoAt(candles, oi, i, cfg);
  { let v = 0, det = 'OI n/a';
    if (oiInfo) {
      det = `OI ${oiInfo.oiPct >= 0 ? '+' : ''}${oiInfo.oiPct.toFixed(2)}% / price ${oiInfo.pricePct >= 0 ? '+' : ''}${oiInfo.pricePct.toFixed(2)}%`;
      if (oiInfo.oiPct >= cfg.oi.minPct) v = oiInfo.pricePct > 0 ? 1 : oiInfo.pricePct < 0 ? -1 : 0; // fresh leverage in price direction
    }
    add('oi_price', 'OI × price', 'flow', v, det); }
  { let v = 0, det = 'n/a';
    const lb = cfg.rvol.lookback;
    if (i >= lb) {
      const base = median(candles.slice(i - lb, i).map((x) => x.v));
      const rv = base > 0 ? c.v / base : 0;
      v = rv >= cfg.rvol.min ? (c.c > c.o ? 1 : c.c < c.o ? -1 : 0) : 0;
      det = `RVOL ${rv.toFixed(2)}x`;
    }
    add('volume', 'Volume (RVOL)', 'flow', v, det); }

  const bull = votes.filter((x) => x.vote === 1).length;
  const bear = votes.filter((x) => x.vote === -1).length;
  let side = 'NEUTRAL';
  if (bull >= cfg.minVotes && bull - bear >= cfg.minMargin) side = 'BUY';
  else if (bear >= cfg.minVotes && bear - bull >= cfg.minMargin) side = 'SELL';

  const dir = side === 'BUY' ? 1 : side === 'SELL' ? -1 : 0;
  const ages = { emaCross: ageOf(ind.emaSign, i), macd: ageOf(ind.macdSign, i), qqe: ageOf(ind.q.trend, i) };
  const dirs = { emaCross: ind.emaSign[i], macd: ind.macdSign[i], qqe: ind.q.trend[i] };
  const fresh = dir !== 0 && Object.keys(ages).some((k) => dirs[k] === dir && isNum(ages[k]) && ages[k] <= cfg.freshCandles);

  const win = side === 'BUY' ? bull : side === 'SELL' ? bear : Math.max(bull, bear);
  const strength = side === 'NEUTRAL' ? null : win >= 10 ? 'VERY_STRONG' : win >= 8 ? 'STRONG' : win >= 7 ? 'MODERATE' : 'WEAK';
  return {
    t: c.t, price: c.c, votes, bull, bear, neutral: TOTAL_VOTES - bull - bear,
    side, strength, scorePct: Math.round(win / TOTAL_VOTES * 100),
    votesLabel: `${win}/${TOTAL_VOTES}`,
    ages, fresh, oi: oiInfo, oiAvailable: !!oiInfo,
    signal: (side !== 'NEUTRAL' && fresh) ? side : null,
  };
}

function evaluate(candles, oi, userCfg) {
  const cfg = { ...DEFAULTS, ...(userCfg || {}) };
  if (!Array.isArray(candles) || candles.length < cfg.minCandles) {
    return { side: 'NEUTRAL', signal: null, isNew: false, reason: 'INSUFFICIENT_HISTORY', needed: cfg.minCandles, have: candles ? candles.length : 0 };
  }
  const ind = computeIndicators(candles, cfg);
  const n = candles.length;
  const cur = evaluateAt(candles, ind, n - 1, cfg, oi);
  const prev = evaluateAt(candles, ind, n - 2, cfg, oi);
  cur.isNew = !!cur.signal && prev.signal !== cur.signal; // edge-trigger: fire once, not every candle
  cur.indicators = {
    rsi: ind.rsi[n - 1], adx: ind.a.adx[n - 1], emaFast: ind.eFast[n - 1], emaSlow: ind.eSlow[n - 1],
    emaMid: ind.eMid[n - 1], emaLong: ind.eLong[n - 1], macd: ind.m.line[n - 1], macdSignal: ind.m.signal[n - 1],
    atr: ind.atr[n - 1], atrPct: isNum(ind.atr[n - 1]) ? ind.atr[n - 1] / candles[n - 1].c * 100 : null,
  };
  cur.config = { minVotes: cfg.minVotes, minMargin: cfg.minMargin, freshCandles: cfg.freshCandles };
  return cur;
}

// evaluate every candle from `startIdx` (for backtests / audits)
function evaluateHistory(candles, oi, userCfg, startIdx) {
  const cfg = { ...DEFAULTS, ...(userCfg || {}) };
  const ind = computeIndicators(candles, cfg);
  const out = [];
  let prevSignal = null;
  for (let i = Math.max(startIdx || cfg.minCandles - 1, 1); i < candles.length; i++) {
    const r = evaluateAt(candles, ind, i, cfg, oi);
    r.isNew = !!r.signal && prevSignal !== r.signal;
    prevSignal = r.signal;
    out.push(r);
  }
  return out;
}

// ---------- Bybit v5 adapters ----------
// kline list: newest-first [startMs, o, h, l, c, volume, turnover] (strings)
function fromBybitKlines(list, intervalMs, nowMs) {
  const asc = list.map((k) => ({ t: +k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] })).reverse();
  const now = nowMs || Date.now();
  if (asc.length && asc[asc.length - 1].t + intervalMs > now) asc.pop(); // drop the still-forming candle
  return asc;
}
// open-interest list: newest-first [{openInterest, timestamp}]
function fromBybitOpenInterest(list) {
  return list.map((x) => ({ t: +x.timestamp, oi: +x.openInterest })).reverse();
}

module.exports = {
  TOTAL_VOTES, DEFAULTS, evaluate, evaluateHistory, fromBybitKlines, fromBybitOpenInterest,
  _internals: { ema, rma, rsi, macd, adx, atr, qqe, ageOf, computeIndicators },
};
