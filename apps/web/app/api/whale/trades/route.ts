import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OnChainWhaleStore } from '@sigma/backend/services/etherscan-scanner.mjs';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
  : null;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    const exchange = searchParams.get('exchange');
    const side = searchParams.get('side');
    const minAmount = parseFloat(searchParams.get('minAmount') || '0');
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    let trades: any[] = [];

    if (supabase) {
      try {
        let query = supabase.from('whale_trades').select('*').order('detected_at', { ascending: false }).limit(limit);

        if (symbol && symbol !== 'ALL') {
          query = query.ilike('symbol', `%${symbol.replace(/[-_/]/g, '')}%`);
        }
        if (exchange && exchange !== 'ALL') {
          query = query.eq('exchange', exchange.toUpperCase());
        }
        if (side && side !== 'ALL') {
          query = query.eq('side', side.toUpperCase());
        }
        if (minAmount > 0) {
          query = query.gte('amount_usdt', minAmount);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          trades = data;
        }
      } catch (err: any) {
        console.warn('[WHALE_TRADES_API] Supabase query notice:', err.message);
      }
    }

    // Fallback to real memory-scanned transfers
    if (trades.length === 0 && OnChainWhaleStore.transfers.length > 0) {
      trades = OnChainWhaleStore.transfers.map((t: any) => ({
        id: t.txHash,
        symbol: `${t.symbol}USDT`,
        exchange: t.targetName || 'ONCHAIN',
        side: t.action.includes('ACCUMULATION') ? 'BUY' : 'SELL',
        amount_usdt: t.amountUsd,
        execution_price: t.amountUsd / (t.amountTokens || 1),
        detected_at: t.timestamp,
        tx_hash: t.txHash,
      }));
    }

    return NextResponse.json({
      success: true,
      source: 'CANONICAL_WHALE_PERSISTENCE',
      total: trades.length,
      trades,
      freshness: trades.length > 0 ? 'LIVE' : 'AWAITING_PRINTS',
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to fetch whale trades',
        status: 'UNAVAILABLE',
      },
      { status: 500 }
    );
  }
}
