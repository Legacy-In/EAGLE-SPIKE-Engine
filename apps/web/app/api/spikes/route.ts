import { NextRequest, NextResponse } from 'next/server';
import { spikeEventStore } from '@sigma/services/spike-intelligence/event-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol') || undefined;
    const exchange = searchParams.get('exchange') || undefined;
    const minScore = searchParams.get('minScore') ? parseInt(searchParams.get('minScore')!, 10) : undefined;
    const phase = searchParams.get('phase') || undefined;
    const type = searchParams.get('type') || undefined;
    const quality = searchParams.get('quality') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100;
    const analyticsOnly = searchParams.get('analytics') === 'true';

    if (analyticsOnly) {
      const analytics = spikeEventStore.getAnalytics({ minScore, quality });
      return NextResponse.json({ success: true, analytics });
    }

    const events = spikeEventStore.queryEvents({
      symbol,
      exchange,
      minScore,
      phase,
      type,
      quality,
      limit,
    });

    const analytics = spikeEventStore.getAnalytics({ minScore, quality });

    return NextResponse.json({
      success: true,
      count: events.length,
      events,
      analytics,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to query spike events' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.symbol || !body.price) {
      return NextResponse.json({ success: false, error: 'Symbol and price are required' }, { status: 400 });
    }

    const recorded = spikeEventStore.recordEvent(body);
    return NextResponse.json({ success: true, event: recorded });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to record event' }, { status: 500 });
  }
}
