import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    service: 'EAGLE_FLASH_MARKET_DATA_ROUTER',
    timestamp: new Date().toISOString(),
    status: 'OPERATIONAL',
    exchanges: [
      { id: 'BYBIT', name: 'Bybit Linear Perpetual', status: 'ACTIVE', type: 'USDT_PERP' },
      { id: 'BINANCE', name: 'Binance USDⓈ-M Futures', status: 'ACTIVE', type: 'USDT_PERP' },
      { id: 'MEXC', name: 'MEXC Futures Contract', status: 'ACTIVE', type: 'USDT_PERP' },
      { id: 'WEEX', name: 'WEEX Futures Contract', status: 'ACTIVE', type: 'USDT_PERP' },
    ],
    freshness_contract: {
      LIVE: '< 5000ms',
      FRESH: '< 30000ms',
      DEGRADED: '< 60000ms',
      STALE: '< 300000ms',
      UNAVAILABLE: '>= 300000ms',
    },
    tick_precision_model: {
      micro_assets: 'Up to 8 decimal places (e.g. PEPE, SHIB)',
      standard_assets: '2 to 4 decimal places (e.g. SOL, ETH, BTC)',
      invariant: 'Never rounded to $0.0000',
    },
  });
}
