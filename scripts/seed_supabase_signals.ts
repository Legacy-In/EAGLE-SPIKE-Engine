import 'dotenv/config';
import { SignalsRepository } from '../backend/db/signals.repo';

async function seed() {
  const repo = SignalsRepository.getInstance();

  const signals = [
    {
      signalId: 'EGL-20260921-BYBIT-SOLUSDT-001',
      idempotencyKey: 'IDEMP-EGL-SOL-001',
      exchange: 'BYBIT',
      symbol: 'SOLUSDT',
      direction: 'LONG' as const,
      strategyVersion: 'v1.5',
      entryPrice: 148.50,
      target1Price: 153.00,
      target2Price: 157.50,
      target3Price: 165.00,
      stopPrice: 144.20,
      eagleScore: 88,
      rvol: 3.4,
      volumeZScore: 3.1,
      oiChangePct: 5.8,
      detectedAt: Date.now() - 7200000,
      snapshot: {
        price: 148.50,
        turnover24hUsd: 1250000000,
        rvol: 3.4,
        volumeZScore: 3.1,
        openInterestUsd: 450000000,
        oiChangePct: 5.8,
        fundingRate: 0.00012,
        takerFlow: 42.5,
        rsi: 64.2,
        trend: 'BULLISH',
        spikePhase: 'ACCELERATION',
        positioningState: 'LEVERAGE_EXPANSION',
        marketBreadth: 78,
        btcRegime: 'RISK_ON'
      },
      extremes: {
        mfePrice: 153.80,
        mfePct: 3.57,
        mfeTimestamp: Date.now() - 3600000,
        timeToMfeMs: 3600000,
        maePrice: 147.90,
        maePct: -0.40,
        maeTimestamp: Date.now() - 6000000,
        timeToMaeMs: 1200000
      },
      checkpoints: [
        { type: '15M', price: 150.20, ret: 1.14 },
        { type: '1H', price: 152.80, ret: 2.90 },
        { type: '4H', price: 153.50, ret: 3.37 }
      ],
      status: 'T1_HIT',
      exitPrice: 153.00,
      grossPnl: 3.03,
      netPnl: 2.90
    },
    {
      signalId: 'EGL-20260921-BINANCE-NEARUSDT-002',
      idempotencyKey: 'IDEMP-EGL-NEAR-002',
      exchange: 'BINANCE',
      symbol: 'NEARUSDT',
      direction: 'LONG' as const,
      strategyVersion: 'v1.5',
      entryPrice: 5.12,
      target1Price: 5.38,
      target2Price: 5.65,
      target3Price: 6.10,
      stopPrice: 4.95,
      eagleScore: 82,
      rvol: 2.8,
      volumeZScore: 2.6,
      oiChangePct: 4.2,
      detectedAt: Date.now() - 14400000,
      snapshot: {
        price: 5.12,
        turnover24hUsd: 380000000,
        rvol: 2.8,
        volumeZScore: 2.6,
        openInterestUsd: 120000000,
        oiChangePct: 4.2,
        fundingRate: 0.00015,
        takerFlow: 28.0,
        rsi: 59.4,
        trend: 'BULLISH',
        spikePhase: 'ACCELERATION',
        positioningState: 'LEVERAGE_EXPANSION',
        marketBreadth: 74,
        btcRegime: 'RISK_ON'
      },
      extremes: {
        mfePrice: 5.42,
        mfePct: 5.86,
        mfeTimestamp: Date.now() - 7200000,
        timeToMfeMs: 7200000,
        maePrice: 5.08,
        maePct: -0.78,
        maeTimestamp: Date.now() - 12000000,
        timeToMaeMs: 2400000
      },
      checkpoints: [
        { type: '15M', price: 5.20, ret: 1.56 },
        { type: '1H', price: 5.35, ret: 4.49 },
        { type: '4H', price: 5.40, ret: 5.47 }
      ],
      status: 'T1_HIT',
      exitPrice: 5.38,
      grossPnl: 5.08,
      netPnl: 4.95
    },
    {
      signalId: 'EGL-20260921-MEXC-RENDERUSDT-003',
      idempotencyKey: 'IDEMP-EGL-RENDER-003',
      exchange: 'MEXC',
      symbol: 'RENDERUSDT',
      direction: 'SHORT' as const,
      strategyVersion: 'v1.5',
      entryPrice: 6.45,
      target1Price: 6.20,
      target2Price: 5.95,
      target3Price: 5.50,
      stopPrice: 6.65,
      eagleScore: 79,
      rvol: 2.6,
      volumeZScore: 2.4,
      oiChangePct: 3.8,
      detectedAt: Date.now() - 21600000,
      snapshot: {
        price: 6.45,
        turnover24hUsd: 140000000,
        rvol: 2.6,
        volumeZScore: 2.4,
        openInterestUsd: 45000000,
        oiChangePct: 3.8,
        fundingRate: -0.00018,
        takerFlow: -31.5,
        rsi: 38.6,
        trend: 'BEARISH',
        spikePhase: 'BREAKOUT',
        positioningState: 'SHORT_EXPANSION',
        marketBreadth: 48,
        btcRegime: 'NEUTRAL'
      },
      extremes: {
        mfePrice: 6.18,
        mfePct: 4.19,
        mfeTimestamp: Date.now() - 10800000,
        timeToMfeMs: 10800000,
        maePrice: 6.49,
        maePct: -0.62,
        maeTimestamp: Date.now() - 18000000,
        timeToMaeMs: 3600000
      },
      checkpoints: [
        { type: '15M', price: 6.38, ret: 1.09 },
        { type: '1H', price: 6.25, ret: 3.10 },
        { type: '4H', price: 6.19, ret: 4.03 }
      ],
      status: 'T1_HIT',
      exitPrice: 6.20,
      grossPnl: 3.88,
      netPnl: 3.75
    },
    {
      signalId: 'EGL-20260921-WEEX-PEPEUSDT-004',
      idempotencyKey: 'IDEMP-EGL-PEPE-004',
      exchange: 'WEEX',
      symbol: 'PEPEUSDT',
      direction: 'LONG' as const,
      strategyVersion: 'v1.5',
      entryPrice: 0.00001050,
      target1Price: 0.00001120,
      target2Price: 0.00001200,
      target3Price: 0.00001350,
      stopPrice: 0.00001010,
      eagleScore: 84,
      rvol: 3.9,
      volumeZScore: 3.5,
      oiChangePct: 6.5,
      detectedAt: Date.now() - 28800000,
      snapshot: {
        price: 0.00001050,
        turnover24hUsd: 890000000,
        rvol: 3.9,
        volumeZScore: 3.5,
        openInterestUsd: 210000000,
        oiChangePct: 6.5,
        fundingRate: 0.00022,
        takerFlow: 55.0,
        rsi: 71.3,
        trend: 'BULLISH',
        spikePhase: 'ACCELERATION',
        positioningState: 'LEVERAGE_EXPANSION',
        marketBreadth: 81,
        btcRegime: 'RISK_ON'
      },
      extremes: {
        mfePrice: 0.00001135,
        mfePct: 8.10,
        mfeTimestamp: Date.now() - 14400000,
        timeToMfeMs: 14400000,
        maePrice: 0.00001042,
        maePct: -0.76,
        maeTimestamp: Date.now() - 25000000,
        timeToMaeMs: 3800000
      },
      checkpoints: [
        { type: '15M', price: 0.00001075, ret: 2.38 },
        { type: '1H', price: 0.00001110, ret: 5.71 },
        { type: '4H', price: 0.00001130, ret: 7.62 }
      ],
      status: 'T1_HIT',
      exitPrice: 0.00001120,
      grossPnl: 6.67,
      netPnl: 6.54
    },
    {
      signalId: 'EGL-20260921-BYBIT-AVAXUSDT-005',
      idempotencyKey: 'IDEMP-EGL-AVAX-005',
      exchange: 'BYBIT',
      symbol: 'AVAXUSDT',
      direction: 'LONG' as const,
      strategyVersion: 'v1.5',
      entryPrice: 28.40,
      target1Price: 29.50,
      target2Price: 30.60,
      target3Price: 32.50,
      stopPrice: 27.50,
      eagleScore: 86,
      rvol: 3.1,
      volumeZScore: 2.9,
      oiChangePct: 4.8,
      detectedAt: Date.now() - 3600000,
      snapshot: {
        price: 28.40,
        turnover24hUsd: 410000000,
        rvol: 3.1,
        volumeZScore: 2.9,
        openInterestUsd: 155000000,
        oiChangePct: 4.8,
        fundingRate: 0.00014,
        takerFlow: 38.0,
        rsi: 62.1,
        trend: 'BULLISH',
        spikePhase: 'ACCELERATION',
        positioningState: 'LEVERAGE_EXPANSION',
        marketBreadth: 76,
        btcRegime: 'RISK_ON'
      },
      extremes: {
        mfePrice: 29.10,
        mfePct: 2.46,
        mfeTimestamp: Date.now() - 1800000,
        timeToMfeMs: 1800000,
        maePrice: 28.32,
        maePct: -0.28,
        maeTimestamp: Date.now() - 3000000,
        timeToMaeMs: 600000
      },
      checkpoints: [
        { type: '15M', price: 28.75, ret: 1.23 },
        { type: '1H', price: 29.05, ret: 2.29 }
      ],
      status: 'ACTIVE',
      exitPrice: null,
      grossPnl: 2.46,
      netPnl: 2.33
    }
  ];

  for (const s of signals) {
    const ok = await repo.insertSignal({
      signalId: s.signalId,
      idempotencyKey: s.idempotencyKey,
      exchange: s.exchange,
      symbol: s.symbol,
      direction: s.direction,
      strategyVersion: s.strategyVersion,
      entryPrice: s.entryPrice,
      target1Price: s.target1Price,
      target2Price: s.target2Price,
      target3Price: s.target3Price,
      stopPrice: s.stopPrice,
      eagleScore: s.eagleScore,
      rvol: s.rvol,
      volumeZScore: s.volumeZScore,
      oiChangePct: s.oiChangePct,
      detectedAt: s.detectedAt,
    }, {
      signalId: s.signalId,
      ...s.snapshot
    });

    console.log(`Insert ${s.signalId}: ${ok}`);
    await repo.batchUpdateExtremes([{
      signalId: s.signalId,
      ...s.extremes
    }]);
    for (const cp of s.checkpoints) {
      await repo.recordCheckpoint(s.signalId, cp.type, s.detectedAt + 900000, cp.price, cp.ret);
    }
    if (s.status !== 'ACTIVE' && s.exitPrice != null) {
      await repo.updateSignalStatus(s.signalId, s.status, s.exitPrice, s.grossPnl, s.netPnl);
    }
  }
  console.log('Seeding finished successfully.');
}

seed().catch(console.error);
