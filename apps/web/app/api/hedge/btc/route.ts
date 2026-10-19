import { NextResponse } from 'next/server';
import { getBtcDerivativesIntelligence } from '../../../../../../backend/services/btc-hedge-engine.mjs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// In-memory 5-second cache buffer
let cachedData: any = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5000;

export async function GET() {
  const now = Date.now();
  if (cachedData && (now - lastCacheTime) < CACHE_TTL_MS) {
    return NextResponse.json({
      success: true,
      cached: true,
      data: cachedData
    });
  }

  try {
    const data = await getBtcDerivativesIntelligence();
    cachedData = data;
    lastCacheTime = now;

    return NextResponse.json({
      success: true,
      cached: false,
      data
    });
  } catch (err: any) {
    if (cachedData) {
      return NextResponse.json({
        success: true,
        cached: true,
        stale: true,
        data: cachedData
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to compute hedge intelligence'
      },
      { status: 500 }
    );
  }
}
