import { NextRequest, NextResponse } from 'next/server';
import { getSignalOutcomeById } from '../../../../../../backend/services/performance/performance-service.mjs';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ signal_id: string }> }
) {
  try {
    const { signal_id } = await params;
    const outcome = await getSignalOutcomeById(signal_id);
    if (!outcome) {
      return NextResponse.json(
        { success: false, error: `Outcome not found for signal ${signal_id}` },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: outcome });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch signal outcome' },
      { status: 500 }
    );
  }
}
