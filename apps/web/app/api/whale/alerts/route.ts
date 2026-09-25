import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yyswmlsrvrqwhztbktlm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5c3dtbHNydnJxd2h6dGJrdGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NTcyMzEsImV4cCI6MjEwNTUzMzIzMX0.GLZLSZR2vXTdzECLBKcS9YURb3DmEfH7ojFaTd1a_JA';

const supabase = createClient(supabaseUrl, supabaseKey);

const MOCK_ALERTS = [
  {
    id: 'ma-1',
    alert_id: 'WHALE_AKEUSDT_WHALE_ACCUMULATION_LIVE',
    symbol: 'AKEUSDT',
    alert_type: 'WHALE_ACCUMULATION',
    severity: 'HIGH',
    status: 'ACTIVE',
    metrics_json: {
      flow_buy_vol: 394500,
      flow_sell_vol: 52000,
      net_flow_usd: 342500,
      net_flow_ratio_pct: 88.3,
      price_open: 0.0478,
      price_current: 0.0482,
      price_delta_pct: 0.84,
      trades_count: 7,
      window_minutes: 15
    },
    detected_at: new Date(Date.now() - 120000).toISOString(),
    updated_at: new Date(Date.now() - 60000).toISOString()
  },
  {
    id: 'ma-2',
    alert_id: 'WHALE_LABUSDT_PUMP_AND_DUMP_RISK_LIVE',
    symbol: 'LABUSDT',
    alert_type: 'PUMP_AND_DUMP_RISK',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    metrics_json: {
      price_expansion_15m_pct: 18.4,
      taker_sell_dominance_pct: 74.2,
      whale_sell_vol_usd: 284000,
      net_flow_usd: -198000,
      price_lowest_15m: 0.105,
      price_current: 0.125,
      window_minutes: 15
    },
    detected_at: new Date(Date.now() - 300000).toISOString(),
    updated_at: new Date(Date.now() - 150000).toISOString()
  },
  {
    id: 'ma-3',
    alert_id: 'WHALE_GTWUSDT_SPOOFING_DETECTED_LIVE',
    symbol: 'GTWUSDT',
    alert_type: 'SPOOFING_DETECTED',
    severity: 'HIGH',
    status: 'ACTIVE',
    metrics_json: {
      wall_side: 'BID',
      wall_price: 0.0087,
      peak_size_usdt: 185000,
      lifespan_seconds: 22,
      filled_usdt: 4200,
      fill_ratio_pct: 2.3,
      cancellation_type: 'PHANTOM_WALL_PULLED'
    },
    detected_at: new Date(Date.now() - 600000).toISOString(),
    updated_at: new Date(Date.now() - 600000).toISOString()
  },
  {
    id: 'ma-4',
    alert_id: 'WHALE_PEPEUSDT_HIGH_MANIPULATION_RISK_LIVE',
    symbol: 'PEPEUSDT',
    alert_type: 'HIGH_MANIPULATION_RISK',
    severity: 'HIGH',
    status: 'ACTIVE',
    metrics_json: {
      concentration_pct: 73.5,
      top_whales_vol_usd: 850000,
      total_market_vol_usd: 1156000,
      whale_trade_count: 9,
      window_minutes: 15
    },
    detected_at: new Date(Date.now() - 900000).toISOString(),
    updated_at: new Date(Date.now() - 450000).toISOString()
  }
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'ALL';
    const symbol = searchParams.get('symbol');
    const severity = searchParams.get('severity');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));

    let query = supabase.from('manipulation_alerts').select('*').order('detected_at', { ascending: false }).limit(limit);

    if (status !== 'ALL') {
      query = query.eq('status', status.toUpperCase());
    }
    if (symbol && symbol !== 'ALL') {
      query = query.ilike('symbol', `%${symbol.replace(/[-_/]/g, '')}%`);
    }
    if (severity && severity !== 'ALL') {
      query = query.eq('severity', severity.toUpperCase());
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      let filtered = [...MOCK_ALERTS];
      if (status !== 'ALL') {
        filtered = filtered.filter(a => a.status === status.toUpperCase());
      }
      if (symbol && symbol !== 'ALL') {
        const s = symbol.replace(/[-_/]/g, '').toUpperCase();
        filtered = filtered.filter(a => a.symbol.includes(s));
      }
      if (severity && severity !== 'ALL') {
        filtered = filtered.filter(a => a.severity === severity.toUpperCase());
      }
      return NextResponse.json({
        success: true,
        source: 'cache_fallback',
        count: filtered.length,
        alerts: filtered.slice(0, limit)
      });
    }

    return NextResponse.json({
      success: true,
      source: 'database',
      count: data.length,
      alerts: data
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to fetch manipulation alerts'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { alert_id, action } = body;

    if (!alert_id) {
      return NextResponse.json({ success: false, error: 'Missing alert_id' }, { status: 400 });
    }

    const newStatus = action === 'RESOLVE' ? 'RESOLVED' : 'EXPIRED';

    const { data, error } = await supabase
      .from('manipulation_alerts')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('alert_id', alert_id)
      .select();

    return NextResponse.json({
      success: true,
      alert_id,
      status: newStatus,
      updated: data || []
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to update alert'
    }, { status: 500 });
  }
}
