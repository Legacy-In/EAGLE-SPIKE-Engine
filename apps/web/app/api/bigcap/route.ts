import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yyswmlsrvrqwhztbktlm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5c3dtbHNydnJxd2h6dGJrdGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NTcyMzEsImV4cCI6MjEwNTUzMzIzMX0.GLZLSZR2vXTdzECLBKcS9YURb3DmEfH7ojFaTd1a_JA';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let query = supabase
      .from('big_cap_signals')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(limit);

    if (symbol && symbol !== 'ALL') {
      query = query.eq('symbol', symbol);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const activeSignals = (data || []).filter(s => s.status === 'ACTIVE');
    const historicalSignals = (data || []).filter(s => s.status !== 'ACTIVE');

    // Aggregate telemetry
    const closed = (data || []).filter(s => s.status === 'TP_HIT' || s.status === 'SL_HIT');
    const tpCount = closed.filter(s => s.status === 'TP_HIT').length;
    const winRate = closed.length > 0 ? parseFloat(((tpCount / closed.length) * 100).toFixed(1)) : 0;
    const netPnl = closed.reduce((acc, s) => acc + (parseFloat(s.realized_pnl_pct) || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        activeSignals,
        historicalSignals,
        stats: {
          totalLogged: data?.length || 0,
          activeCount: activeSignals.length,
          closedCount: closed.length,
          winRate,
          netPnlPct: parseFloat(netPnl.toFixed(2)),
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
