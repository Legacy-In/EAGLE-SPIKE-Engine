import { NextRequest, NextResponse } from 'next/server';
import { statefulSignalEngine } from '../../../../../../backend/engine/signals';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100;
    const direction = searchParams.get('direction');
    const exchange = searchParams.get('exchange');

    let signals = statefulSignalEngine.getSignals(limit);

    if (direction) {
      signals = signals.filter((s) => s.direction === direction.toUpperCase());
    }

    if (exchange && exchange !== 'ALL') {
      signals = signals.filter((s) => s.exchange.toUpperCase() === exchange.toUpperCase());
    }

    return NextResponse.json({
      success: true,
      count: signals.length,
      signals,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch signals' },
      { status: 500 }
    );
  }
}
