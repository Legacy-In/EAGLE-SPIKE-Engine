import { NextRequest, NextResponse } from 'next/server';
import { getWeeklyHistory } from '../../../../../../backend/services/performance/performance-service.mjs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 12;
    const data = await getWeeklyHistory(limit);
    return NextResponse.json({ success: true, count: data.length, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch weekly performance history' },
      { status: 500 }
    );
  }
}
