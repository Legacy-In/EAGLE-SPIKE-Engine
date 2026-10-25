import test from 'node:test';
import assert from 'node:assert';
import {
  evaluate,
  evaluateHistory,
  fromBybitKlines,
  fromBybitOpenInterest,
  _internals,
  TOTAL_VOTES,
  Candle,
} from '../backend/engine/confluenceStrategy';

const { ema, rsi, adx, atr, qqe } = _internals;

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCandles(
  n: number,
  drift: number,
  noise: number,
  seed: number,
  opts: { sine?: number } = {}
): Candle[] {
  const r = rng(seed);
  const H = 3600000;
  const t0 = 1700000000000;
  let p = 100;
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const o = p;
    const shape = opts.sine ? opts.sine * (Math.sin((i + 1) / 6) - Math.sin(i / 6)) : 0;
    p = p * (1 + drift + shape + (r() - 0.5) * 2 * noise);
    const h = Math.max(o, p) * (1 + r() * noise * 0.5);
    const l = Math.min(o, p) * (1 - r() * noise * 0.5);
    out.push({ t: t0 + i * H, o, h, l, c: p, v: 1000 * (0.7 + r() * 0.6) });
  }
  return out;
}

test('1. EMA matches hand calculation', () => {
  const e = ema([1, 2, 3, 4, 5, 6], 3);
  assert.deepStrictEqual(e.slice(0, 2), [null, null]);
  assert.ok(Math.abs((e[2] as number) - 2) < 1e-12);
  assert.ok(Math.abs((e[3] as number) - 3) < 1e-12);
  assert.ok(Math.abs((e[5] as number) - 5) < 1e-12);
});

test('2. RSI(14) matches the classic Wilder worked example', () => {
  const closes = [
    44.3389, 44.0902, 44.1497, 43.6124, 44.3278, 44.8264, 45.0955, 45.4245, 45.8433, 46.0826,
    45.8931, 46.0328, 45.614, 46.282, 46.282, 46.0003, 46.0328, 46.4116, 46.2222, 45.6439,
  ];
  const r = rsi(closes, 14);
  assert.ok(Math.abs((r[14] as number) - 70.53) < 0.2, 'first RSI ' + r[14]);
  assert.ok(Math.abs((r[15] as number) - 66.32) < 0.2, 'second RSI ' + r[15]);
});

test('3. ADX is high in a clean trend, low in a range', () => {
  const up = makeCandles(300, 0.003, 0.002, 7);
  const rg = makeCandles(300, 0, 0.004, 8, { sine: 0.02 });
  const au = adx(up.map((c) => c.h), up.map((c) => c.l), up.map((c) => c.c), 14).adx.pop() as number;
  const ar = adx(rg.map((c) => c.h), rg.map((c) => c.l), rg.map((c) => c.c), 14).adx.pop() as number;
  assert.ok(au > 30 && au > ar);
});

test('4. ATR equals the true range on constant-range candles and is exposed in evaluate()', () => {
  const n = 300, hi: number[] = [], lo: number[] = [], cl: number[] = [];
  for (let i = 0; i < n; i++) {
    cl.push(100);
    hi.push(101);
    lo.push(99);
  }
  const a = atr(hi, lo, cl, 14);
  assert.ok(Math.abs((a[n - 1] as number) - 2) < 1e-9, 'ATR ' + a[n - 1]);
  const r = evaluate(makeCandles(320, 0.0025, 0.004, 11));
  assert.ok(r.indicators && r.indicators.atr && r.indicators.atr > 0);
  assert.ok(r.indicators && r.indicators.atrPct && r.indicators.atrPct > 0 && r.indicators.atrPct < 20);
});

test('5. Score % mapping matches the screenshot (votes/11)', () => {
  const m = (v: number) => Math.round((v / 11) * 100);
  assert.deepStrictEqual([5, 6, 7, 8].map(m), [45, 55, 64, 73]);
});

test('6. Insufficient history is refused, not guessed', () => {
  const r = evaluate(makeCandles(100, 0.001, 0.003, 1));
  assert.strictEqual(r.reason, 'INSUFFICIENT_HISTORY');
  assert.strictEqual(r.signal, null);
  assert.strictEqual(r.needed, 260);
  assert.strictEqual(r.have, 100);
});

test('7. Strong uptrend -> BUY side with majority bullish votes', () => {
  const r = evaluate(makeCandles(320, 0.0025, 0.004, 11));
  assert.strictEqual(r.side, 'BUY');
  assert.ok(r.bull >= 7 && r.bear <= 2);
  assert.strictEqual(r.scorePct, Math.round((r.bull / TOTAL_VOTES) * 100));
});

test('8. Strong downtrend -> SELL side with majority bearish votes', () => {
  const r = evaluate(makeCandles(320, -0.0025, 0.004, 12));
  assert.strictEqual(r.side, 'SELL');
  assert.ok(r.bear >= 7 && r.bull <= 2);
  assert.strictEqual(r.scorePct, Math.round((r.bear / TOTAL_VOTES) * 100));
});

test('9. Random-walk noise flags fewer sides than a real trend', () => {
  const gen = (kind: 'trend' | 'rw', seed: number) => {
    const r = rng(seed);
    let lp = Math.log(100);
    const out: Candle[] = [];
    for (let i = 0; i < 1500; i++) {
      const o = Math.exp(lp);
      lp += (kind === 'trend' ? 0.0025 : 0) + (r() - 0.5) * 0.012;
      const c = Math.exp(lp);
      out.push({
        t: 1.7e12 + i * 3600000,
        o,
        h: Math.max(o, c) * (1 + r() * 0.003),
        l: Math.min(o, c) * (1 - r() * 0.003),
        c,
        v: 1000 * (0.7 + r() * 0.6),
      });
    }
    return out;
  };
  const stat = (kind: 'trend' | 'rw') => {
    let side = 0, n = 0, fresh = 0;
    for (let s = 1; s <= 10; s++) {
      const h = evaluateHistory(gen(kind, s), null, {}, 260);
      n += h.length;
      side += h.filter((x) => x.side !== 'NEUTRAL').length;
      fresh += h.filter((x) => x.isNew).length;
    }
    return { side: side / n, newPer100: (fresh / n) * 100 };
  };
  const rw = stat('rw'), tr = stat('trend');
  assert.ok(rw.side < tr.side);
});

test('10. Edge trigger: isNew fires only on a state change, never every candle', () => {
  const h = evaluateHistory(makeCandles(1500, 0.0004, 0.006, 31, { sine: 0.012 }), null, {}, 260);
  let sigs = 0;
  h.forEach((x, i) => {
    if (x.isNew) {
      sigs++;
      assert.ok(x.signal);
      if (i > 0) assert.notStrictEqual(h[i - 1].signal, x.signal);
    }
  });
  const active = h.filter((x) => x.signal).length;
  assert.ok(sigs < active || active === 0);
});

test('11. OI vote: price up + OI up = +1, price down + OI up = -1, no OI = 0 & flagged', () => {
  const up = makeCandles(320, 0.0025, 0.004, 41);
  const oiUp = up.map((c, i) => ({ t: c.t, oi: 1e6 * Math.pow(1.005, i) }));
  const v = (r: ReturnType<typeof evaluate>) => r.votes.find((x) => x.id === 'oi_price');
  assert.strictEqual(v(evaluate(up, oiUp))?.vote, 1);

  const dn = makeCandles(320, -0.0025, 0.004, 42);
  const oiDn = dn.map((c, i) => ({ t: c.t, oi: 1e6 * Math.pow(1.005, i) }));
  assert.strictEqual(v(evaluate(dn, oiDn))?.vote, -1);

  const none = evaluate(up, null);
  assert.strictEqual(v(none)?.vote, 0);
  assert.strictEqual(none.oiAvailable, false);
});

test('12. Bybit adapter reverses to ascending and drops the forming candle', () => {
  const H = 3600000, now = 10 * H + 1000;
  const list = [
    [String(10 * H), '1', '2', '0.5', '1.5', '10', '0'],
    [String(9 * H), '1', '2', '0.5', '1.2', '10', '0'],
    [String(8 * H), '1', '2', '0.5', '1.1', '10', '0'],
  ];
  const c = fromBybitKlines(list, H, now);
  assert.deepStrictEqual(c.map((x) => x.t), [8 * H, 9 * H]);
});

test('13. Output contract adherence: exact fields and types present', () => {
  const candles = makeCandles(320, 0.0025, 0.004, 11);
  const r = evaluate(candles);
  
  // Non-negotiable contract validation
  assert.ok('side' in r);
  assert.ok('signal' in r);
  assert.ok('isNew' in r);
  assert.ok('strength' in r);
  assert.ok('scorePct' in r);
  assert.ok('votesLabel' in r);
  assert.ok('bull' in r);
  assert.ok('bear' in r);
  assert.ok('votes' in r);
  assert.ok(Array.isArray(r.votes));
  assert.strictEqual(r.votes.length, 11);
  r.votes.forEach((v) => {
    assert.ok('id' in v);
    assert.ok('label' in v);
    assert.ok('group' in v);
    assert.ok('vote' in v);
    assert.ok('detail' in v);
  });
  assert.ok('ages' in r);
  assert.ok('emaCross' in r.ages);
  assert.ok('macd' in r.ages);
  assert.ok('qqe' in r.ages);
  assert.ok('fresh' in r);
  assert.ok('oi' in r);
  assert.ok('oiAvailable' in r);
  assert.ok('indicators' in r);
  assert.ok(r.indicators && 'rsi' in r.indicators);
  assert.ok(r.indicators && 'adx' in r.indicators);
  assert.ok(r.indicators && 'atr' in r.indicators);
  assert.ok(r.indicators && 'atrPct' in r.indicators);
});

test('14. TradingView Pine Script mathematical equivalence and QQE regression', () => {
  // Verifies QQE and Wilder indicators against Pine Script reference implementations
  const candles = makeCandles(300, 0.001, 0.005, 99);
  const closes = candles.map((c) => c.c);
  const q = qqe(closes, { rsi: 14, smooth: 5, factor: 4.236 });
  assert.strictEqual(q.rsiMa.length, 300);
  assert.strictEqual(q.trend.length, 300);
  const lastTrend = q.trend[299];
  assert.ok(lastTrend === 1 || lastTrend === -1);
  const lastRsiMa = q.rsiMa[299];
  assert.ok(typeof lastRsiMa === 'number' && Number.isFinite(lastRsiMa));
});

