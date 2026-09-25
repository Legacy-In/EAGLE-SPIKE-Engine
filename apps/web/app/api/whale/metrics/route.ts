import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const summary = {
      timestamp: new Date().toISOString(),
      activeMonitoredSymbols: ['AKEUSDT', 'LABUSDT', 'GTWUSDT', 'SOLUSDT', 'DOGEUSDT', 'PEPEUSDT', 'AVAXUSDT', 'NEARUSDT', 'RENDERUSDT', 'SUIUSDT', 'BTCUSDT', 'ETHUSDT'],
      kpis: {
        total24hWhaleVolumeUsdt: 18450000,
        activeAlertsCount: 4,
        criticalAlertsCount: 1,
        topAccumulationSymbol: 'AKEUSDT',
        topAccumulationRatio: 88.3,
        topDistributionSymbol: 'LABUSDT',
        topDistributionNetFlow: -198000,
        averageConcentrationIndex: 58.4,
        phantomWallsDetected24h: 14
      },
      symbolsSummary: [
        {
          symbol: 'AKEUSDT',
          priceCurrent: 0.0482,
          priceChange15mPct: 0.84,
          netFlow15mUsd: 342500,
          netFlow1hUsd: 890000,
          buyRatio15mPct: 88.3,
          whaleTrades15m: 7,
          concentrationPct: 54.2,
          isHighRisk: false,
          activeAlert: 'WHALE_ACCUMULATION',
          riskLevel: 'MEDIUM'
        },
        {
          symbol: 'LABUSDT',
          priceCurrent: 0.1250,
          priceChange15mPct: 18.4,
          netFlow15mUsd: -198000,
          netFlow1hUsd: -450000,
          buyRatio15mPct: 25.8,
          whaleTrades15m: 11,
          concentrationPct: 76.5,
          isHighRisk: true,
          activeAlert: 'PUMP_AND_DUMP_RISK',
          riskLevel: 'CRITICAL'
        },
        {
          symbol: 'GTWUSDT',
          priceCurrent: 0.0089,
          priceChange15mPct: -1.2,
          netFlow15mUsd: 45000,
          netFlow1hUsd: 112000,
          buyRatio15mPct: 62.0,
          whaleTrades15m: 4,
          concentrationPct: 42.1,
          isHighRisk: false,
          activeAlert: 'SPOOFING_DETECTED',
          riskLevel: 'HIGH'
        },
        {
          symbol: 'PEPEUSDT',
          priceCurrent: 0.0000105,
          priceChange15mPct: 3.4,
          netFlow15mUsd: 180000,
          netFlow1hUsd: 520000,
          buyRatio15mPct: 64.5,
          whaleTrades15m: 9,
          concentrationPct: 73.5,
          isHighRisk: true,
          activeAlert: 'HIGH_MANIPULATION_RISK',
          riskLevel: 'HIGH'
        },
        {
          symbol: 'SOLUSDT',
          priceCurrent: 154.20,
          priceChange15mPct: 1.1,
          netFlow15mUsd: 780000,
          netFlow1hUsd: 2150000,
          buyRatio15mPct: 71.4,
          whaleTrades15m: 14,
          concentrationPct: 38.0,
          isHighRisk: false,
          activeAlert: null,
          riskLevel: 'LOW'
        },
        {
          symbol: 'BTCUSDT',
          priceCurrent: 64250.00,
          priceChange15mPct: 0.45,
          netFlow15mUsd: 1250000,
          netFlow1hUsd: 4800000,
          buyRatio15mPct: 68.2,
          whaleTrades15m: 22,
          concentrationPct: 29.5,
          isHighRisk: false,
          activeAlert: null,
          riskLevel: 'LOW'
        }
      ]
    };

    return NextResponse.json({
      success: true,
      data: summary
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to fetch whale metrics'
    }, { status: 500 });
  }
}
