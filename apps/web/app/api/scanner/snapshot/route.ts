import { NextRequest, NextResponse } from 'next/server';
import { scannerAggregator } from '../../../../../../backend/aggregator';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const exchange = searchParams.get('exchange');
    const minScore = searchParams.get('minScore') ? parseInt(searchParams.get('minScore')!, 10) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

    const snapshot = await scannerAggregator.getSnapshot();
    let tickers = snapshot.tickers;

    if (exchange && exchange !== 'ALL') {
      tickers = tickers.filter((t) => t.exchange.toUpperCase() === exchange.toUpperCase());
    }

    if (minScore !== undefined) {
      tickers = tickers.filter((t) => t.signalScore >= minScore);
    }

    if (limit) {
      tickers = tickers.slice(0, limit);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...snapshot,
        tickers,
        filteredCount: tickers.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch scanner snapshot' },
      { status: 500 }
    );
  }
}
