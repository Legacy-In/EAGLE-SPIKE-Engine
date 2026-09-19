import { NextRequest, NextResponse } from 'next/server';
import { backtestingService } from '../../../../../services/backtesting';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const results = backtestingService.runBacktest(body);
    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Backtest execution failed';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
