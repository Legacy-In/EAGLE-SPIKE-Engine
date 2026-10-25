import { NextRequest, NextResponse } from 'next/server';
import {
  getPaperAccountSummary,
  openPaperTrade,
  closePaperTrade,
  isPaperTradingActive
} from '../../../../../backend/services/paper_trading_executor.mjs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const summary = getPaperAccountSummary();
    return NextResponse.json({
      success: true,
      tradingMode: isPaperTradingActive() ? 'paper' : 'live',
      account: summary.account,
      activeTrades: summary.activeTrades,
      closedTrades: summary.closedTrades,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch paper trading data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'OPEN_TRADE') {
      const { signal, options } = body;
      if (!signal || !signal.symbol || !signal.entry_price) {
        return NextResponse.json({ success: false, error: 'Missing signal parameters' }, { status: 400 });
      }
      const trade = await openPaperTrade(signal, options);
      return NextResponse.json({ success: true, trade });
    }

    if (action === 'CLOSE_TRADE') {
      const { paperTradeId, exitPrice, outcome = 'WIN', reason = 'Manual Close' } = body;
      if (!paperTradeId || !exitPrice) {
        return NextResponse.json({ success: false, error: 'Missing paperTradeId or exitPrice' }, { status: 400 });
      }
      const trade = await closePaperTrade(paperTradeId, exitPrice, outcome, reason);
      if (!trade) {
        return NextResponse.json({ success: false, error: 'Trade not found or not active' }, { status: 404 });
      }
      return NextResponse.json({ success: true, trade });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Paper trade execution error' },
      { status: 500 }
    );
  }
}
