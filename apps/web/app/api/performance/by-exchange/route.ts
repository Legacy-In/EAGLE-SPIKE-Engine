import { NextRequest, NextResponse } from 'next/server';
import { getExchangeBreakdown } from '../../../../../../backend/services/performance/performance-service.mjs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const data = await getExchangeBreakdown();
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch exchange breakdown' },
      { status: 500 }
    );
  }
}
