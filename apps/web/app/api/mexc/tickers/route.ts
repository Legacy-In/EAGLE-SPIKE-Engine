import { NextRequest, NextResponse } from 'next/server';

interface CacheEntry {
  timestamp: number;
  data: any[];
}

let tickerCache: CacheEntry | null = null;
const CACHE_TTL_MS = 4000; // 4 second in-memory cache

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const apiKey = searchParams.get('apiKey') || process.env.MEXC_API_KEY || '6c164b31390e4c0484cdda7f9d6dd0ea';
    const now = Date.now();

    // Serve cached tickers if within TTL
    if (tickerCache && (now - tickerCache.timestamp < CACHE_TTL_MS)) {
      return NextResponse.json({
        success: true,
        cached: true,
        count: tickerCache.data.length,
        timestamp: tickerCache.timestamp,
        data: tickerCache.data
      });
    }

    const startTime = Date.now();
    const res = await fetch('https://contract.mexc.com/api/v1/contract/ticker', {
      headers: {
        'ApiKey': apiKey,
        'User-Agent': 'EAGLE-FLASH/2.0'
      },
      next: { revalidate: 4 }
    });

    if (!res.ok) {
      throw new Error(`MEXC API responded with status ${res.status}`);
    }

    const json = await res.json();
    const list = json?.data || [];
    const latency = Date.now() - startTime;

    // Filter to USDT perpetual contracts
    const usdtContracts = list.filter((t: any) => t.symbol && t.symbol.endsWith('USDT'));

    tickerCache = {
      timestamp: now,
      data: usdtContracts.length > 0 ? usdtContracts : list
    };

    return NextResponse.json({
      success: true,
      cached: false,
      count: tickerCache.data.length,
      latency,
      timestamp: now,
      data: tickerCache.data
    });
  } catch (error: any) {
    console.error('MEXC Ticker API Error:', error);
    // If cache exists, serve stale data on error
    if (tickerCache) {
      return NextResponse.json({
        success: true,
        cached: true,
        stale: true,
        count: tickerCache.data.length,
        data: tickerCache.data
      });
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch MEXC tickers' },
      { status: 502 }
    );
  }
}
