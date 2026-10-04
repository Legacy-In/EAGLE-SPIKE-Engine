import { NextRequest, NextResponse } from 'next/server';
import {
  getTodayPerformance,
  getCurrentWeekPerformance,
  getPreviousWeekPerformance,
  getAllTimePerformance,
  getWinningSignals,
  getLosingSignals,
  getAllCanonicalOutcomes,
} from '../../../../../backend/services/performance/performance-service.mjs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get('period') || 'current-week').toLowerCase();
    const strategy = searchParams.get('strategy') || 'ALL';
    const exchange = searchParams.get('exchange') || 'ALL';
    const direction = searchParams.get('direction') || 'ALL';

    let result;
    if (period === 'today') {
      result = await getTodayPerformance();
    } else if (period === 'previous-week') {
      result = await getPreviousWeekPerformance();
    } else if (period === 'all-time') {
      result = await getAllTimePerformance({ strategy, exchange, direction });
    } else {
      result = await getCurrentWeekPerformance();
    }

    return NextResponse.json({
      success: true,
      period,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch performance' },
      { status: 500 }
    );
  }
}
