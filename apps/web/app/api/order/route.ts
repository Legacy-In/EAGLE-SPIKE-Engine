import { NextRequest, NextResponse } from 'next/server';
import { executionEngineService } from '../../../../../services/execution';
import { portfolioService } from '../../../../../services/portfolio';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'CLOSE_POSITION') {
      const { positionId, exitPrice } = body;
      const closedTrade = portfolioService.closePosition(positionId, exitPrice);
      if (!closedTrade) {
        return NextResponse.json({ success: false, error: 'Position not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, trade: closedTrade });
    }

    if (action === 'SUBMIT_ORDER') {
      const { symbol = 'BTCUSDT', side, type = 'MARKET', amountBtc, price, stopPrice } = body;
      if (!side || !amountBtc || amountBtc <= 0) {
        return NextResponse.json({ success: false, error: 'Invalid order parameters' }, { status: 400 });
      }

      const res = await executionEngineService.executeOrder({
        symbol,
        side,
        type,
        amountBtc,
        price,
        stopPrice,
      });

      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 422 });
      }

      return NextResponse.json({ success: true, order: res.order });
    }

    if (action === 'SET_TRADING_MODE') {
      const { mode, confirmationToken } = body;
      executionEngineService.setTradingMode(mode, confirmationToken);
      return NextResponse.json({ success: true, mode });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown execution error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
