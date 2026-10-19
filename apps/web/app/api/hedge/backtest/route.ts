import { NextRequest, NextResponse } from 'next/server';
import { executeHistoricalBacktest } from '../../../../../../backend/services/btc-backtest-engine.mjs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// In-memory 10-minute cache per timeframe
const cacheMap = new Map<number, { data: any; cachedAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const daysParam = parseInt(searchParams.get('days') || '15', 10);
    const days = [7, 15, 30].includes(daysParam) ? daysParam : 15;

    const now = Date.now();
    const cached = cacheMap.get(days);

    if (cached && (now - cached.cachedAt) < CACHE_TTL_MS) {
      return NextResponse.json({
        ...cached.data,
        cached: true,
        cacheAgeSeconds: Math.floor((now - cached.cachedAt) / 1000)
      });
    }

    const backtestResult = await executeHistoricalBacktest(days);
    cacheMap.set(days, { data: backtestResult, cachedAt: now });

    return NextResponse.json({
      ...backtestResult,
      cached: false
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to execute historical backtest simulation'
      },
      { status: 500 }
    );
  }
}
