import { NextRequest, NextResponse } from 'next/server';
import { resetPaperAccount } from '../../../../../../backend/services/paper_trading_executor.mjs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    let initialBalance = 10000;
    try {
      const body = await req.json();
      if (body && body.initialBalance) {
        initialBalance = parseFloat(body.initialBalance) || 10000;
      }
    } catch {}

    const account = await resetPaperAccount(initialBalance);
    return NextResponse.json({
      success: true,
      message: `Paper account reset to $${initialBalance.toLocaleString()}`,
      account,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to reset paper account' },
      { status: 500 }
    );
  }
}
