import { NextResponse } from 'next/server';
import { aiIntelligenceService } from '../../../../../services/ai';

export async function GET() {
  try {
    const brief = aiIntelligenceService.generateMarketBrief();
    return NextResponse.json({ success: true, brief });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'AI brief generator failed';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
