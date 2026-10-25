'use strict';
const assert = require('assert');
const S = require('../backend/engine/confluenceStrategy.js');
const { ema, rsi, adx, atr } = S._internals;

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('  ok  -', name); };

// deterministic PRNG
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function makeCandles(n, drift, noise, seed, opts = {}) {
  const r = rng(seed), H = 3600000, t0 = 1700000000000;
  let p = 100; const out = [];
  for (let i = 0; i < n; i++) {
    const o = p;
    const shape = opts.sine ? opts.sine * (Math.sin((i + 1) / 6) - Math.sin(i / 6)) : 0;
    p = p * (1 + drift + shape + (r() - 0.5) * 2 * noise);
    const h = Math.max(o, p) * (1 + r() * noise * 0.5), l = Math.min(o, p) * (1 - r() * noise * 0.5);
    out.push({ t: t0 + i * H, o, h, l, c: p, v: 1000 * (0.7 + r() * 0.6) });
  }
  return out;
}

console.log('Indicator correctness');
test('EMA matches hand calculation', () => {
  const e = ema([1, 2, 3, 4, 5, 6], 3); // seed=2 at idx2, k=0.5
  assert.deepStrictEqual(e.slice(0, 2), [null, null]);
  assert.ok(Math.abs(e[2] - 2) < 1e-12);
  assert.ok(Math.abs(e[3] - 3) < 1e-12);
  assert.ok(Math.abs(e[5] - 5) < 1e-12);
});
test('RSI(14) matches the classic Wilder worked example', () => {
  const closes = [44.3389, 44.0902, 44.1497, 43.6124, 44.3278, 44.8264, 45.0955, 45.4245, 45.8433, 46.0826, 45.8931, 46.0328, 45.6140, 46.2820, 46.2820, 46.0003, 46.0328, 46.4116, 46.2222, 45.6439];
  const r = rsi(closes, 14);
  console.log('        RSI values:', r.slice(14).map((x) => x.toFixed(2)).join(', '));
  assert.ok(Math.abs(r[14] - 70.53) < 0.2, 'first RSI ' + r[14]);
  assert.ok(Math.abs(r[15] - 66.32) < 0.2, 'second RSI ' + r[15]);
});
test('ADX is high in a clean trend, low in a range', () => {
  const up = makeCandles(300, 0.003, 0.002, 7), rg = makeCandles(300, 0, 0.004, 8, { sine: 0.02 });
  const au = adx(up.map((c) => c.h), up.map((c) => c.l), up.map((c) => c.c), 14).adx.pop();
  const ar = adx(rg.map((c) => c.h), rg.map((c) => c.l), rg.map((c) => c.c), 14).adx.pop();
  console.log('        ADX trend/range:', au.toFixed(1), ar.toFixed(1));
  assert.ok(au > 30 && au > ar);
});

test('ATR equals the true range on constant-range candles and is exposed in evaluate()', () => {
  const n = 300, hi = [], lo = [], cl = [];
  for (let i = 0; i < n; i++) { cl.push(100); hi.push(101); lo.push(99); }   // true range = 2 every candle
  const a = atr(hi, lo, cl, 14);
  assert.ok(Math.abs(a[n - 1] - 2) < 1e-9, 'ATR ' + a[n - 1]);
  const r = S.evaluate(makeCandles(320, 0.0025, 0.004, 11));
  assert.ok(r.indicators.atr > 0 && r.indicators.atrPct > 0 && r.indicators.atrPct < 20);
});

console.log('Strategy behaviour');
test('score % mapping matches the screenshot (votes/11)', () => {
  const m = (v) => Math.round(v / 11 * 100);
  assert.deepStrictEqual([5, 6, 7, 8].map(m), [45, 55, 64, 73]);
});
test('insufficient history is refused, not guessed', () => {
  const r = S.evaluate(makeCandles(100, 0.001, 0.003, 1));
  assert.strictEqual(r.reason, 'INSUFFICIENT_HISTORY'); assert.strictEqual(r.signal, null);
});
test('strong uptrend -> BUY side with majority bullish votes', () => {
  const r = S.evaluate(makeCandles(320, 0.0025, 0.004, 11));
  console.log('        uptrend:', r.side, r.votesLabel, r.strength, 'bull/bear', r.bull, r.bear);
  assert.strictEqual(r.side, 'BUY'); assert.ok(r.bull >= 7 && r.bear <= 2);
});
test('strong downtrend -> SELL side', () => {
  const r = S.evaluate(makeCandles(320, -0.0025, 0.004, 12));
  console.log('        downtrend:', r.side, r.votesLabel, r.strength, 'bull/bear', r.bull, r.bear);
  assert.strictEqual(r.side, 'SELL'); assert.ok(r.bear >= 7 && r.bull <= 2);
});
test('random-walk noise flags fewer sides than a real trend (and we record the noise rate)', () => {
  const gen = (kind, seed) => {
    const r = rng(seed); let lp = Math.log(100); const out = [];
    for (let i = 0; i < 1500; i++) {
      const o = Math.exp(lp); lp += (kind === 'trend' ? 0.0025 : 0) + (r() - 0.5) * 0.012; const c = Math.exp(lp);
      out.push({ t: 1.7e12 + i * 3600000, o, h: Math.max(o, c) * (1 + r() * 0.003), l: Math.min(o, c) * (1 - r() * 0.003), c, v: 1000 * (0.7 + r() * 0.6) });
    }
    return out;
  };
  const stat = (kind) => { let side = 0, n = 0, fresh = 0; for (let s = 1; s <= 10; s++) { const h = S.evaluateHistory(gen(kind, s), null, {}, 260); n += h.length; side += h.filter((x) => x.side !== 'NEUTRAL').length; fresh += h.filter((x) => x.isNew).length; } return { side: side / n, newPer100: fresh / n * 100 }; };
  const rw = stat('rw'), tr = stat('trend');
  console.log('        pure noise : side set ' + (rw.side * 100).toFixed(1) + '% of candles, new signals/100 candles ' + rw.newPer100.toFixed(2));
  console.log('        real trend : side set ' + (tr.side * 100).toFixed(1) + '% of candles, new signals/100 candles ' + tr.newPer100.toFixed(2));
  assert.ok(rw.side < tr.side);
});
test('edge trigger: isNew fires only on a state change, never every candle', () => {
  const h = S.evaluateHistory(makeCandles(1500, 0.0004, 0.006, 31, { sine: 0.012 }), null, {}, 260);
  let sigs = 0;
  h.forEach((x, i) => { if (x.isNew) { sigs++; assert.ok(x.signal); if (i > 0) assert.notStrictEqual(h[i - 1].signal, x.signal); } });
  const active = h.filter((x) => x.signal).length;
  console.log('        isNew events:', sigs, 'candles with active signal:', active);
  assert.ok(sigs < active || active === 0);
});
test('OI vote: price up + OI up = +1, price down + OI up = -1, no OI = 0 & flagged', () => {
  const up = makeCandles(320, 0.0025, 0.004, 41), n = up.length;
  const oiUp = up.map((c, i) => ({ t: c.t, oi: 1e6 * Math.pow(1.005, i) }));
  const v = (r) => r.votes.find((x) => x.id === 'oi_price');
  assert.strictEqual(v(S.evaluate(up, oiUp)).vote, 1);
  const dn = makeCandles(320, -0.0025, 0.004, 42);
  const oiDn = dn.map((c, i) => ({ t: c.t, oi: 1e6 * Math.pow(1.005, i) }));
  assert.strictEqual(v(S.evaluate(dn, oiDn)).vote, -1);
  const none = S.evaluate(up, null);
  assert.strictEqual(v(none).vote, 0); assert.strictEqual(none.oiAvailable, false);
});
test('Bybit adapter reverses to ascending and drops the forming candle', () => {
  const H = 3600000, now = 10 * H + 1000;
  const list = [[String(10 * H), '1', '2', '0.5', '1.5', '10', '0'], [String(9 * H), '1', '2', '0.5', '1.2', '10', '0'], [String(8 * H), '1', '2', '0.5', '1.1', '10', '0']];
  const c = S.fromBybitKlines(list, H, now);
  assert.deepStrictEqual(c.map((x) => x.t), [8 * H, 9 * H]);
});

console.log(`\n${passed} tests passed`);
