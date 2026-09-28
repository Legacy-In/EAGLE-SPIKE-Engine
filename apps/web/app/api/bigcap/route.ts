import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    if (!supabase) {
      return NextResponse.json({ success: true, active: [], history: [] });
    }
    let activeQuery = supabase
      .from('big_cap_signals')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('detected_at', { ascending: false });

    if (symbol && symbol !== 'ALL') {
      activeQuery = activeQuery.eq('symbol', symbol);
    }

    // 2. Strict Query for Resolved Audit Trail (Status IN ('TP_HIT', 'SL_HIT', 'INVALIDATED', 'EXPIRED'))
    let historyQuery = supabase
      .from('big_cap_signals')
      .select('*')
      .in('status', ['TP_HIT', 'SL_HIT', 'INVALIDATED', 'EXPIRED'])
      .order('closed_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (symbol && symbol !== 'ALL') {
      historyQuery = historyQuery.eq('symbol', symbol);
    }

    const [activeRes, historyRes] = await Promise.all([activeQuery, historyQuery]);

    if (activeRes.error) {
      return NextResponse.json({ success: false, error: activeRes.error.message }, { status: 500 });
    }
    if (historyRes.error) {
      return NextResponse.json({ success: false, error: historyRes.error.message }, { status: 500 });
    }

    const activeSignals = activeRes.data || [];
    const historicalSignals = historyRes.data || [];

    // Calculate institutional stats strictly from resolved trades
    const closed = historicalSignals.filter(s => s.status === 'TP_HIT' || s.status === 'SL_HIT');
    const tpCount = closed.filter(s => s.status === 'TP_HIT').length;
    const winRate = closed.length > 0 ? parseFloat(((tpCount / closed.length) * 100).toFixed(1)) : 0;
    const netPnl = closed.reduce((acc, s) => acc + (parseFloat(s.realized_pnl_pct) || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        activeSignals,
        historicalSignals,
        historicalRecords: historicalSignals,
        stats: {
          totalLogged: activeSignals.length + historicalSignals.length,
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
