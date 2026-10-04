import { NextRequest, NextResponse } from 'next/server';
import { getAllTimePerformance } from '../../../../../../backend/services/performance/performance-service.mjs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const strategy = searchParams.get('strategy') || 'ALL';
    const exchange = searchParams.get('exchange') || 'ALL';
    const direction = searchParams.get('direction') || 'ALL';

    const data = await getAllTimePerformance({ strategy, exchange, direction });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch all-time performance' },
      { status: 500 }
    );
  }
}
