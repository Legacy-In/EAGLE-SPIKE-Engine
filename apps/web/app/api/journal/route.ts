import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yyswmlsrvrqwhztbktlm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5c3dtbHNydnJxd2h6dGJrdGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NTcyMzEsImV4cCI6MjEwNTUzMzIzMX0.GLZLSZR2vXTdzECLBKcS9YURb3DmEfH7ojFaTd1a_JA';

const supabase = createClient(supabaseUrl, supabaseKey);

function computeDataConfidence(updatedAtStr?: string | null): 'LIVE' | 'FRESH' | 'STALE' | 'DEGRADED' | 'UNAVAILABLE' {
  if (!updatedAtStr) return 'UNAVAILABLE';
  const deltaSec = (Date.now() - new Date(updatedAtStr).getTime()) / 1000;
  if (isNaN(deltaSec) || deltaSec < 0) return 'UNAVAILABLE';
  if (deltaSec <= 5) return 'LIVE';
  if (deltaSec <= 30) return 'FRESH';
  if (deltaSec <= 60) return 'STALE';
  if (deltaSec <= 300) return 'DEGRADED';
  return 'UNAVAILABLE';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const exchange = searchParams.get('exchange');
    const direction = searchParams.get('direction');
    const status = searchParams.get('status');
    const symbol = searchParams.get('symbol');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50', 10)));

    // 1. Fetch total count of all signals in database (Unfiltered Canonical Count)
    const { count: totalCanonicalCount, error: totalCountErr } = await supabase
      .from('signals')
      .select('*', { count: 'exact', head: true });

    if (totalCountErr) {
      console.warn('Warning fetching total count:', totalCountErr.message);
    }

    // 2. Build filtered query for signals
    let query = supabase.from('signals').select('*', { count: 'exact' });

    if (exchange && exchange !== 'ALL') {
      query = query.eq('exchange_id', exchange);
    }
    if (direction && direction !== 'ALL') {
      query = query.eq('direction', direction);
    }
    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }
    if (symbol && symbol !== 'ALL') {
      query = query.ilike('symbol', `%${symbol}%`);
    }

    // Order most recent first and apply pagination range
    const offset = (page - 1) * limit;
    query = query.order('detected_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: rawSignals, count: filteredCount, error: signalsErr } = await query;
    if (signalsErr) {
      return NextResponse.json({ success: false, error: signalsErr.message }, { status: 500 });
    }

    const signalIds = (rawSignals || []).map((s) => s.signal_id);

    // 3. Batch query checkpoints and extremes for these signal IDs
    let checkpointsMap: Record<string, Record<string, number>> = {};
    let extremesMap: Record<string, any> = {};

    if (signalIds.length > 0) {
      const [cpRes, exRes] = await Promise.all([
        supabase.from('signal_checkpoints').select('*').in('signal_id', signalIds),
        supabase.from('signal_extremes').select('*').in('signal_id', signalIds),
      ]);

      if (cpRes.data) {
        for (const row of cpRes.data) {
          if (!checkpointsMap[row.signal_id]) checkpointsMap[row.signal_id] = {};
          if (row.horizon) {
            checkpointsMap[row.signal_id][row.horizon] = parseFloat(row.return_pct || 0);
          }
        }
      }

      if (exRes.data) {
        for (const row of exRes.data) {
          extremesMap[row.signal_id] = row;
        }
      }
    }

    // 4. Transform raw database rows into Named-Field Data Contract
    const transformedSignals = (rawSignals || []).map((row) => {
      const cp = checkpointsMap[row.signal_id] || {};
      const ex = extremesMap[row.signal_id] || {};

      const entryPrice = parseFloat(row.entry_price || 0);
      const exitPrice = row.exit_price ? parseFloat(row.exit_price) : null;
      const currentPrice = exitPrice !== null ? exitPrice : entryPrice;

      // Directional ROI
      let currentRoiPct = parseFloat(row.net_pnl_pct || row.gross_pnl_pct || 0);
      if (isNaN(currentRoiPct) && entryPrice > 0 && currentPrice > 0) {
        currentRoiPct = row.direction === 'SHORT'
          ? parseFloat((((entryPrice - currentPrice) / entryPrice) * 100).toFixed(2))
          : parseFloat((((currentPrice - entryPrice) / entryPrice) * 100).toFixed(2));
      }

      // Qualification & Lifecycle state resolution
      let qualificationStatus: 'WATCH' | 'CANDIDATE' | 'QUALIFIED' | 'CONFIRMED' | 'DISQUALIFIED' = 'QUALIFIED';
      let lifecycleStatus: 'DETECTED' | 'ACTIVE' | 'STOP_HIT' | 'CLOSED' | 'EXPIRED' = 'ACTIVE';

      const rawStatus = (row.status || '').toUpperCase();
      if (rawStatus === 'REJECTED') {
        const hasActivation = Boolean(row.entry_price && row.entry_price > 0 && row.created_at);
        const hasStopHit = Boolean(row.resolved_at && (ex.mae_pct <= -2.0 || currentRoiPct < -2.0));
        if (hasActivation && hasStopHit) {
          qualificationStatus = 'QUALIFIED';
          lifecycleStatus = 'STOP_HIT';
        } else {
          qualificationStatus = 'DISQUALIFIED';
          lifecycleStatus = 'CLOSED';
        }
      } else if (rawStatus === 'STOP_HIT' || rawStatus === 'INVALIDATED') {
        qualificationStatus = 'QUALIFIED';
        lifecycleStatus = 'STOP_HIT';
      } else if (rawStatus === 'CLOSED' || rawStatus === 'T1_HIT' || rawStatus === 'T2_HIT' || rawStatus === 'T3_HIT') {
        qualificationStatus = 'QUALIFIED';
        // Note: For legacy records where status was stored as T1_HIT, if resolved_at is set, it's CLOSED
        lifecycleStatus = row.resolved_at ? 'CLOSED' : 'ACTIVE';
      } else if (rawStatus === 'EXPIRED') {
        lifecycleStatus = 'EXPIRED';
      } else if (rawStatus === 'DETECTED') {
        lifecycleStatus = 'DETECTED';
      } else {
        lifecycleStatus = 'ACTIVE';
      }

      // Milestones
      const t1HitAt = rawStatus === 'T1_HIT' || rawStatus === 'T2_HIT' || rawStatus === 'T3_HIT' || (ex.mfe_pct >= 2.0)
        ? (row.resolved_at || row.updated_at || row.detected_at)
        : null;
      const t2HitAt = rawStatus === 'T2_HIT' || rawStatus === 'T3_HIT' || (ex.mfe_pct >= 4.0)
        ? (row.resolved_at || row.updated_at)
        : null;
      const t3HitAt = rawStatus === 'T3_HIT' || (ex.mfe_pct >= 8.0)
        ? (row.resolved_at || row.updated_at)
        : null;
      const stopHitAt = lifecycleStatus === 'STOP_HIT'
        ? (row.resolved_at || row.updated_at)
        : null;

      const normSymbol = (row.symbol || '').toUpperCase().replace(/[-_]/g, '');
      const exchange = (row.exchange_id || 'BYBIT').toUpperCase();
      const exchangeSymbol = row.market_id || `${exchange}:${normSymbol}`;

      return {
        signal_id: row.signal_id,
        canonical_symbol: normSymbol,
        exchange_symbol: exchangeSymbol,
        exchange,
        direction: row.direction || 'LONG',
        qualification_status: qualificationStatus,
        lifecycle_status: lifecycleStatus,
        entry_price: entryPrice,
        current_price: currentPrice,
        current_roi_pct: currentRoiPct,
        target_1_price: parseFloat(row.target_1_price || 0),
        target_2_price: parseFloat(row.target_2_price || 0),
        target_3_price: parseFloat(row.target_3_price || 0),
        stop_price: parseFloat(row.stop_price || 0),
        checkpoint_4h_pct: cp['4H'] !== undefined ? cp['4H'] : null,
        checkpoint_8h_pct: cp['8H'] !== undefined ? cp['8H'] : null,
        checkpoint_1d_pct: cp['1D'] !== undefined ? cp['1D'] : null,
        mfe_pct: ex.mfe_pct !== undefined ? parseFloat(ex.mfe_pct) : 0.0,
        mae_pct: ex.mae_pct !== undefined ? parseFloat(ex.mae_pct) : 0.0,
        eagle_score: parseInt(row.eagle_score || '75', 10),
        detected_at: row.detected_at,
        t1_hit_at: t1HitAt,
        t2_hit_at: t2HitAt,
        t3_hit_at: t3HitAt,
        stop_hit_at: stopHitAt,
        closed_at: row.resolved_at || null,
        last_checkpoint_at: ex.updated_at || row.updated_at || row.detected_at,
        data_confidence: computeDataConfidence(row.updated_at || row.detected_at),
        market_class: normSymbol === 'BTCUSDT' || normSymbol === 'ETHUSDT' || normSymbol === 'SOLUSDT' ? 'BIG_CAP' : 'MID_CAP',
        chronology_precision: 'TICK',
      };
    });

    return NextResponse.json({
      success: true,
      total_count: totalCanonicalCount ?? filteredCount ?? transformedSignals.length,
      filtered_count: filteredCount ?? transformedSignals.length,
      page,
      limit,
      signals: transformedSignals,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Journal API error' },
      { status: 500 }
    );
  }
}
