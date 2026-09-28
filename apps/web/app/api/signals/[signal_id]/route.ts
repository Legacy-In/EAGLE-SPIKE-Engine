import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yyswmlsrvrqwhztbktlm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5c3dtbHNydnJxd2h6dGJrdGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NTcyMzEsImV4cCI6MjEwNTUzMzIzMX0.GLZLSZR2vXTdzECLBKcS9YURb3DmEfH7ojFaTd1a_JA';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ signal_id: string }> }
) {
  try {
    const { signal_id } = await params;
    if (!signal_id) {
      return NextResponse.json({ success: false, error: 'MISSING_SIGNAL_ID' }, { status: 400 });
    }

    // Query canonical signal record
    const { data: signal, error: sigErr } = await supabase
      .from('signals')
      .select('*')
      .eq('signal_id', signal_id)
      .single();

    if (sigErr || !signal) {
      return NextResponse.json({ success: false, error: 'SIGNAL_NOT_FOUND' }, { status: 404 });
    }

    const entryPrice = parseFloat(signal.entry_price || 0);
    const stopPrice = parseFloat(signal.stop_price || signal.stop_loss_price || 0);
    const tp1 = parseFloat(signal.target_1_price || signal.tp1_price || 0);
    const tp2 = parseFloat(signal.target_2_price || signal.tp2_price || 0);
    const tp3 = parseFloat(signal.target_3_price || signal.tp3_price || 0);
    const riskR = parseFloat(signal.risk_r || Math.abs(entryPrice - stopPrice) || 0);

    const primaryStrategy = signal.primary_strategy || 'BREAKOUT';
    const secondaryStrategies = Array.isArray(signal.secondary_strategies)
      ? signal.secondary_strategies
      : [];
    const strategyCombination = Array.isArray(signal.strategy_combination) && signal.strategy_combination.length > 0
      ? signal.strategy_combination
      : [primaryStrategy, ...secondaryStrategies];

    return NextResponse.json({
      success: true,
      signal_id: signal.signal_id,
      exchange: signal.exchange_id || 'BYBIT',
      symbol: signal.symbol,
      direction: signal.direction,
      entry_price: entryPrice,
      stop_loss_price: stopPrice,
      tp1_price: tp1,
      tp2_price: tp2,
      tp3_price: tp3,
      risk_r: riskR,
      primary_strategy: primaryStrategy,
      secondary_strategies: secondaryStrategies,
      strategy_combination: strategyCombination,
      eagle_score: parseInt(signal.eagle_score || 75, 10),
      entry_quality: signal.entry_quality || 'GOOD',
      chase_risk: signal.chase_risk || 'LOW',
      status: signal.status || 'ACTIVE',
      tp_sl_version: signal.tp_sl_version || 'v1.0',
      detected_at: signal.detected_at,
      resolved_at: signal.resolved_at,
      event_hash: signal.event_hash || null,
      blockchain_network: signal.blockchain_network || 'ethereum',
      chain_id: signal.chain_id || 1,
      transaction_hash: signal.transaction_hash || null,
      block_number: signal.block_number || null,
      confirmation_status: signal.confirmation_status || 'CONFIRMED',
      blockchain_proof_url: signal.transaction_hash ? `https://etherscan.io/tx/${signal.transaction_hash}` : null,
      verification_api: `/api/blockchain/verify/${signal.signal_id}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve canonical signal' },
      { status: 500 }
    );
  }
}
