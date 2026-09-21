import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMovingAverage,
  calculateStdDev,
  calculateRvolAndZScore,
  calculateEma,
  getMacroSession,
  selectBestTimeframe,
  synthesizeRationale,
  calculateTradeTargets,
  evaluatePositionExit,
  formatBigCapTelegramMessage,
  COOLDOWN_MS
} from '../scripts/bigcap_worker.mjs';

test('BigCap Engine: Moving Average and StdDev Math', () => {
  const volumes = [100, 100, 100, 100, 100];
  const ma = calculateMovingAverage(volumes, 5);
  assert.equal(ma, 100);

  const std = calculateStdDev(volumes, ma, 5);
  assert.equal(std, 0);

  const varied = [10, 20, 30, 40, 50];
  const maVaried = calculateMovingAverage(varied, 5);
  assert.equal(maVaried, 30);
});

test('BigCap Engine: RVOL and Z-Score calculation', () => {
  const history = Array(20).fill(1000);
  const currentSpike = 3000;
  const allVolumes = [...history, currentSpike];

  const { rvol, zScore } = calculateRvolAndZScore(allVolumes, 20);
  assert.ok(rvol >= 3.0, 'RVOL should reflect 3.0x multiple');
  assert.ok(typeof zScore === 'number' && !isNaN(zScore));
});

test('BigCap Engine: Macro Session Weighting', () => {
  const londonDate = new Date('2026-09-21T09:00:00Z');
  const sessionLondon = getMacroSession(londonDate);
  assert.equal(sessionLondon.tag, 'LONDON');
  assert.equal(sessionLondon.rvolThreshold, 1.5);

  const overlapDate = new Date('2026-09-21T14:00:00Z');
  const sessionOverlap = getMacroSession(overlapDate);
  assert.equal(sessionOverlap.tag, 'LONDON_NY_OVERLAP');
  assert.equal(sessionOverlap.rvolThreshold, 1.5);

  const asiaDate = new Date('2026-09-21T02:00:00Z');
  const sessionAsia = getMacroSession(asiaDate);
  assert.equal(sessionAsia.tag, 'ASIA_PACIFIC');
  assert.equal(sessionAsia.rvolThreshold, 2.1);
});

test('BigCap Engine: Confluence and Best Timeframe Selection', () => {
  // Case 1: Extreme 5m breakout Z-score > 4.0
  const tf1 = selectBestTimeframe({ zScore: 4.2 }, { priceDelta: 1.0 }, { trend: 'BULLISH' });
  assert.equal(tf1.bestTf, '5m');
  assert.ok(tf1.tag.includes('Breakout Scalp'));

  // Case 2: 15m and 1h align
  const tf2 = selectBestTimeframe({ zScore: 1.8 }, { priceDelta: 1.2 }, { trend: 'BULLISH' });
  assert.equal(tf2.bestTf, '15m');
  assert.ok(tf2.tag.includes('15m Institutional Flow Alignment'));

  // Case 3: 1h macro continuation
  const tf3 = selectBestTimeframe({ zScore: 1.2 }, { priceDelta: -0.4 }, { trend: 'BULLISH' });
  assert.equal(tf3.bestTf, '1h');
});

test('BigCap Engine: 4-Bullet Deterministic Rationale Synthesizer', () => {
  const bullets = synthesizeRationale({
    symbol: 'BTCUSDT',
    direction: 'LONG',
    bestTf: '15m',
    rvol: 2.85,
    zScore: 3.12,
    oiDelta: 2.45,
    priceDelta: 1.15,
    session: { name: 'New York Cash Session' },
    trend1h: 'BULLISH'
  });

  assert.equal(bullets.length, 4, 'Must produce exactly 4 structured bullets');
  assert.ok(bullets[0].includes('RVOL reached 2.85x'), 'Bullet 1 must contain RVOL footprint');
  assert.ok(bullets[1].includes('Open Interest shifted +2.45%'), 'Bullet 2 must contain OI regime');
  assert.ok(bullets[2].includes('New York Cash Session'), 'Bullet 3 must contain session attribution');
  assert.ok(bullets[3].includes('15m selected as optimal entry timeframe'), 'Bullet 4 must state timeframe rationale');
});

test('BigCap Engine: Target and Stop-Loss Calculation', () => {
  const entryLong = 100000;
  const longTargets = calculateTradeTargets(entryLong, 'LONG');
  assert.equal(longTargets.stopLossPrice, 99200, 'LONG Stop-Loss must be -0.8%');
  assert.equal(longTargets.targetPrice1, 101500, 'LONG TP1 must be +1.5%');
  assert.equal(longTargets.targetPrice2, 103500, 'LONG TP2 must be +3.5%');

  const entryShort = 100000;
  const shortTargets = calculateTradeTargets(entryShort, 'SHORT');
  assert.equal(shortTargets.stopLossPrice, 100800, 'SHORT Stop-Loss must be +0.8%');
  assert.equal(shortTargets.targetPrice1, 98500, 'SHORT TP1 must be -1.5%');
  assert.equal(shortTargets.targetPrice2, 96500, 'SHORT TP2 must be -3.5%');
});

test('BigCap Engine: Automated Exit State Machine', () => {
  const activeLong = {
    direction: 'LONG',
    status: 'ACTIVE',
    entry_price: 100000,
    stop_loss_price: 99200,
    target_price_1: 101500,
    target_price_2: 103500,
  };

  // 1. Reaching TP2
  const exitTp = evaluatePositionExit(activeLong, 103600);
  assert.equal(exitTp?.status, 'TP_HIT');
  assert.equal(exitTp?.realizedPnl, 3.5);

  // 2. Reaching SL
  const exitSl = evaluatePositionExit(activeLong, 99100);
  assert.equal(exitSl?.status, 'SL_HIT');
  assert.equal(exitSl?.realizedPnl, -0.8);

  // 3. Continuing Active
  const exitHold = evaluatePositionExit(activeLong, 101000);
  assert.equal(exitHold?.status, 'ACTIVE');
  assert.equal(exitHold?.unrealizedPnl, 1.0);
});

test('BigCap Engine: Cooldown constant is 45 minutes', () => {
  assert.equal(COOLDOWN_MS, 45 * 60 * 1000);
});

test('BigCap Engine: Telegram Message Format Contract (Institutional Markdown)', () => {
  const signal = {
    symbol: 'BTCUSDT',
    direction: 'LONG',
    best_timeframe: '15m',
    entry_price: 64250,
    stop_loss_price: 63736,
    target_price_1: 65213.75,
    target_price_2: 66500,
    eagle_score: 88,
    rvol: 2.85,
    rationale_json: [
      'Volume breakout: RVOL reached 2.85x with 3.12σ statistical surge',
      'Open Interest expanded +2.45% confirming institutional positioning',
      'New York Cash Session liquidity window active',
      '15m selected as optimal entry timeframe based on momentum alignment'
    ]
  };

  const message = formatBigCapTelegramMessage(signal);

  assert.ok(message.includes('🦅 BIG-CAP SPIKE DETECTED'));
  assert.ok(message.includes('🪙 Symbol: BTCUSDT'));
  assert.ok(message.includes('📈 Direction: LONG'));
  assert.ok(message.includes('⚡ Best TF: 15m'));
  assert.ok(message.includes('🎯 Entry: $64250'));
  assert.ok(message.includes('🛑 Stop-Loss: $63736'));
  assert.ok(message.includes('🚀 TP1 / TP2: $65213.75 / $66500'));
  assert.ok(message.includes('📊 Eagle Score: 88 | RVOL: 2.85x'));
  assert.ok(message.includes('Deterministic Rationale:'));
  assert.ok(message.includes('• Volume breakout: RVOL reached 2.85x'));
  assert.ok(message.includes('• Open Interest expanded +2.45%'));
  assert.ok(message.includes('• New York Cash Session liquidity window active'));
  assert.ok(message.includes('• 15m selected as optimal entry timeframe'));
});
