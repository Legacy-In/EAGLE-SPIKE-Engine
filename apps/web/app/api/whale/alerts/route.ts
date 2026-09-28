import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { WhaleMemoryStore } from '@sigma/backend/services/whale-detector.mjs';
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
    const alertType = searchParams.get('type');
    const severity = searchParams.get('severity');
    const status = searchParams.get('status') || 'ACTIVE';
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    let alerts: any[] = [];

    // 1. Query Supabase manipulation_alerts
    if (supabase) {
      try {
        let query = supabase.from('manipulation_alerts').select('*').order('detected_at', { ascending: false }).limit(limit);

        if (status && status !== 'ALL') {
          query = query.eq('status', status.toUpperCase());
        }
        if (symbol && symbol !== 'ALL') {
          query = query.ilike('symbol', `%${symbol.replace(/[-_/]/g, '')}%`);
        }
        if (alertType && alertType !== 'ALL') {
          query = query.eq('alert_type', alertType.toUpperCase());
        }
        if (severity && severity !== 'ALL') {
          query = query.eq('severity', severity.toUpperCase());
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          alerts = data;
        }
      } catch (err: any) {
        console.warn('[WHALE_ALERTS_API] Supabase query notice:', err.message);
      }
    }

    // 2. Fallback to active runtime alerts from memory
    if (alerts.length === 0) {
      const activeMemAlerts = Array.isArray(WhaleMemoryStore.alerts) ? WhaleMemoryStore.alerts : [];
      alerts = activeMemAlerts;

      if (symbol && symbol !== 'ALL') {
        const s = symbol.replace(/[-_/]/g, '').toUpperCase();
        alerts = alerts.filter((a) => a.symbol && a.symbol.includes(s));
      }
      if (alertType && alertType !== 'ALL') {
        alerts = alerts.filter((a) => a.alert_type === alertType.toUpperCase());
      }
    }

    // 3. Fallback to on-chain alerts
    if (alerts.length === 0 && OnChainWhaleStore.alerts.length > 0) {
      alerts = OnChainWhaleStore.alerts;
    }

    return NextResponse.json({
      success: true,
      source: 'CANONICAL_MANIPULATION_RADAR',
      total: alerts.length,
      alerts,
      freshness: alerts.length > 0 ? 'LIVE' : 'CLEAR_OF_ANOMALIES',
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to fetch whale alerts',
        status: 'UNAVAILABLE',
      },
      { status: 500 }
    );
  }
}
