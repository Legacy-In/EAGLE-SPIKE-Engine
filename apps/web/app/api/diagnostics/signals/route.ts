import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSignalEngineDiagnostics } from '@sigma/backend/services/signal-creation.mjs';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yyswmlsrvrqwhztbktlm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5c3dtbHNydnJxd2h6dGJrdGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NTcyMzEsImV4cCI6MjEwNTUzMzIzMX0.GLZLSZR2vXTdzECLBKcS9YURb3DmEfH7ojFaTd1a_JA';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function GET(req: NextRequest) {
  const timestamp = new Date().toISOString();
  const engineDiagnostics = getSignalEngineDiagnostics();

  let dbStatus = 'DISCONNECTED';
  let totalSignals = 0;
  let totalBigCapSignals = 0;
  let latestSignal = null;

  if (supabase) {
    try {
      const [sigCountRes, bcCountRes, latestSigRes] = await Promise.all([
        supabase.from('signals').select('*', { count: 'exact', head: true }),
        supabase.from('big_cap_signals').select('*', { count: 'exact', head: true }),
        supabase.from('signals').select('signal_id, symbol, exchange_id, detected_at, entry_price').order('detected_at', { ascending: false }).limit(1),
      ]);

      if (!sigCountRes.error) {
        dbStatus = 'CONNECTED';
        totalSignals = sigCountRes.count ?? 0;
      }
      if (!bcCountRes.error) {
        totalBigCapSignals = bcCountRes.count ?? 0;
      }
      if (latestSigRes.data && latestSigRes.data.length > 0) {
        latestSignal = latestSigRes.data[0];
      }
    } catch (err: any) {
      dbStatus = 'ERROR';
    }
  }

  return NextResponse.json({
    success: true,
    timestamp,
    service: 'EAGLE_FLASH_SIGNAL_ENGINE',
    signal_engine: engineDiagnostics,
    database: {
      status: dbStatus,
      total_canonical_signals: totalSignals,
      total_big_cap_signals: totalBigCapSignals,
      latest_signal: latestSignal,
    },
    journal: {
      canonical_endpoint: '/api/journal',
      authoritative_table: 'public.signals',
      live_price_service: 'ACTIVE',
    },
    realtime: {
      server_publication_configured: true,
      publication_name: 'supabase_realtime',
      publication_tables: ['signals', 'big_cap_signals'],
      client_state_reported_separately: true,
      diagnostic_notice: 'Backend reports publication configuration. Active WebSocket client connection state (SUBSCRIBED / CONNECTING / CLOSED) is tracked client-side in the browser.',
    },
  });
}
