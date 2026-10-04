import { NextRequest, NextResponse } from 'next/server';
import { getWinningSignals } from '../../../../../../../backend/services/performance/performance-service.mjs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;
    const data = await getWinningSignals(limit);
    return NextResponse.json({ success: true, count: data.length, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch winning signals' },
      { status: 500 }
    );
  }
}
