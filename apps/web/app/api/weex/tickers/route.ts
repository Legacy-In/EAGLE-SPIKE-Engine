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
    const apiKey = searchParams.get('apiKey') || process.env.WEEX_API_KEY || 'weex_48ca99a066414970ce63820f55970691';
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
    const res = await fetch('https://api-contract.weex.com/capi/v3/market/ticker/24hr', {
      headers: {
        'ACCESS-KEY': apiKey,
        'User-Agent': 'EAGLE-FLASH/2.0'
      },
      next: { revalidate: 4 }
    });

    if (!res.ok) {
      throw new Error(`WEEX API responded with status ${res.status}`);
    }

    const list = await res.json();
    const latency = Date.now() - startTime;

    if (!Array.isArray(list)) {
      throw new Error('Invalid WEEX API response format');
    }

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
    console.error('WEEX Ticker API Error:', error);
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
      { success: false, error: error.message || 'Failed to fetch WEEX tickers' },
      { status: 502 }
    );
  }
}
