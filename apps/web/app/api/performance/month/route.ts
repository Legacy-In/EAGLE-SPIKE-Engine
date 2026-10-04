import { NextRequest, NextResponse } from 'next/server';
import { getMonthPerformance } from '../../../../../../backend/services/performance/performance-service.mjs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const data = await getMonthPerformance();
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch month performance' },
      { status: 500 }
    );
  }
}
