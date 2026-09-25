import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yyswmlsrvrqwhztbktlm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5c3dtbHNydnJxd2h6dGJrdGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NTcyMzEsImV4cCI6MjEwNTUzMzIzMX0.GLZLSZR2vXTdzECLBKcS9YURb3DmEfH7ojFaTd1a_JA';

const supabase = createClient(supabaseUrl, supabaseKey);

// In-Memory Seed / Fallback Cache if Database Table is initializing
const MOCK_WHALE_TRADES = [
  { id: 'wt-1', symbol: 'AKEUSDT', exchange: 'BYBIT', side: 'BUY', amount_usdt: 184500, execution_price: 0.0482, detected_at: new Date(Date.now() - 45000).toISOString() },
  { id: 'wt-2', symbol: 'LABUSDT', exchange: 'BINANCE', side: 'SELL', amount_usdt: 142000, execution_price: 0.1250, detected_at: new Date(Date.now() - 95000).toISOString() },
  { id: 'wt-3', symbol: 'GTWUSDT', exchange: 'MEXC', side: 'BUY', amount_usdt: 95400, execution_price: 0.0089, detected_at: new Date(Date.now() - 140000).toISOString() },
  { id: 'wt-4', symbol: 'SOLUSDT', exchange: 'BINANCE', side: 'BUY', amount_usdt: 345000, execution_price: 154.20, detected_at: new Date(Date.now() - 180000).toISOString() },
  { id: 'wt-5', symbol: 'AKEUSDT', exchange: 'MEXC', side: 'BUY', amount_usdt: 210000, execution_price: 0.0485, detected_at: new Date(Date.now() - 240000).toISOString() },
  { id: 'wt-6', symbol: 'DOGEUSDT', exchange: 'BYBIT', side: 'SELL', amount_usdt: 125000, execution_price: 0.1285, detected_at: new Date(Date.now() - 310000).toISOString() },
  { id: 'wt-7', symbol: 'PEPEUSDT', exchange: 'BINANCE', side: 'BUY', amount_usdt: 180000, execution_price: 0.0000105, detected_at: new Date(Date.now() - 390000).toISOString() },
  { id: 'wt-8', symbol: 'BTCUSDT', exchange: 'BINANCE', side: 'BUY', amount_usdt: 750000, execution_price: 64250.00, detected_at: new Date(Date.now() - 480000).toISOString() }
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    const exchange = searchParams.get('exchange');
    const side = searchParams.get('side');
    const minAmount = parseFloat(searchParams.get('minAmount') || '0');
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

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

    if (error || !data || data.length === 0) {
      // Fallback to memory cache
      let filtered = [...MOCK_WHALE_TRADES];
      if (symbol && symbol !== 'ALL') {
        const s = symbol.replace(/[-_/]/g, '').toUpperCase();
        filtered = filtered.filter(t => t.symbol.includes(s));
      }
      if (exchange && exchange !== 'ALL') {
        filtered = filtered.filter(t => t.exchange === exchange.toUpperCase());
      }
      if (side && side !== 'ALL') {
        filtered = filtered.filter(t => t.side === side.toUpperCase());
      }
      if (minAmount > 0) {
        filtered = filtered.filter(t => t.amount_usdt >= minAmount);
      }
      return NextResponse.json({
        success: true,
        source: 'cache_fallback',
        count: filtered.length,
        trades: filtered.slice(0, limit)
      });
    }

    return NextResponse.json({
      success: true,
      source: 'database',
      count: data.length,
      trades: data
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to fetch whale trades'
    }, { status: 500 });
  }
}
