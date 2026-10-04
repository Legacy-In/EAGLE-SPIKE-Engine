import { NextRequest, NextResponse } from 'next/server';
import { getCurrentWeekPerformance } from '../../../../../../backend/services/performance/performance-service.mjs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const data = await getCurrentWeekPerformance();
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch current week performance' },
      { status: 500 }
    );
  }
}
