/**
 * 🏛️ Seed Resolved Big-Cap Trades for Audit Trail
 */
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const envFiles = ['.env', 'apps/web/.env.local'];
for (const ef of envFiles) {
  if (fs.existsSync(ef)) {
    const lines = fs.readFileSync(ef, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [k, ...v] = trimmed.split('=');
      const val = v.join('=').trim().replace(/^["']|["']$/g, '');
      if (k === 'NEXT_PUBLIC_SUPABASE_URL' && !supabaseUrl) supabaseUrl = val;
      if (k === 'SUPABASE_SERVICE_ROLE_KEY' && (!supabaseKey || supabaseKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5c3dtbHNydnJxd2h6dGJrdGxtIiwicm9sZSI6ImFub24i'))) {
        supabaseKey = val;
      }
      if (k === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' && !supabaseKey) supabaseKey = val;
    }
  }
}

const supabase = createClient(supabaseUrl, supabaseKey);

const now = Date.now();

const resolvedTrades = [
  {
    signal_id: 'BIGCAP-20260920-BTCUSDT-LONG-8921',
    symbol: 'BTCUSDT',
    direction: 'LONG',
    best_timeframe: '15m',
    entry_price: 79250.00,
    stop_loss_price: 78616.00,
    target_price_1: 80438.75,
    target_price_2: 82023.75,
    current_price: 82023.75,
    realized_pnl_pct: 3.5,
    eagle_score: 87,
    rvol: 2.85,
    z_score: 2.92,
    oi_delta_pct: 3.82,
    session_tag: 'LONDON_NY_OVERLAP',
    status: 'TP_HIT',
    rationale_json: [
      '15M RVOL reached 2.85x (Z-Score +2.92) indicating aggressive institutional spot/futures accumulation.',
      'Open Interest shifted +3.82% alongside positive price delta, confirming fresh long leverage accumulation rather than passive short covering.',
      'Aligned with London / New York Overlap; 1h trend (BULLISH) EMA(50) holding as primary directional anchor.',
      '15m selected as optimal entry timeframe to filter 5m micro-whips while capturing impulse continuation.'
    ],
    detected_at: new Date(now - 100800000).toISOString(), // 28 hours ago
    closed_at: new Date(now - 79200000).toISOString(),   // 22 hours ago
    updated_at: new Date(now - 79200000).toISOString(),
  },
  {
    signal_id: 'BIGCAP-20260920-ETHUSDT-SHORT-4412',
    symbol: 'ETHUSDT',
    direction: 'SHORT',
    best_timeframe: '15m',
    entry_price: 2720.00,
    stop_loss_price: 2741.76,
    target_price_1: 2679.20,
    target_price_2: 2624.80,
    current_price: 2624.80,
    realized_pnl_pct: 3.5,
    eagle_score: 84,
    rvol: 2.45,
    z_score: 2.61,
    oi_delta_pct: 3.12,
    session_tag: 'NEW_YORK',
    status: 'TP_HIT',
    rationale_json: [
      '15M RVOL reached 2.45x (Z-Score +2.61) indicating aggressive institutional distribution.',
      'Open Interest shifted +3.12% alongside negative price delta, confirming aggressive short positioning and structural distribution.',
      'Aligned with New York Cash Session; 1h trend (BEARISH) EMA(50) holding as primary resistance anchor.',
      '15m selected as optimal entry timeframe to secure high-speed impulse continuation.'
    ],
    detected_at: new Date(now - 72000000).toISOString(), // 20 hours ago
    closed_at: new Date(now - 54000000).toISOString(),   // 15 hours ago
    updated_at: new Date(now - 54000000).toISOString(),
  },
  {
    signal_id: 'BIGCAP-20260920-SOLUSDT-LONG-3319',
    symbol: 'SOLUSDT',
    direction: 'LONG',
    best_timeframe: '5m',
    entry_price: 108.40,
    stop_loss_price: 107.53,
    target_price_1: 110.03,
    target_price_2: 112.19,
    current_price: 112.19,
    realized_pnl_pct: 3.5,
    eagle_score: 92,
    rvol: 4.20,
    z_score: 4.12,
    oi_delta_pct: 6.18,
    session_tag: 'LONDON',
    status: 'TP_HIT',
    rationale_json: [
      '5M RVOL reached 4.20x (Z-Score +4.12) indicating massive institutional breakout participation.',
      'Open Interest expanded +6.18% alongside positive price delta, confirming aggressive spot/derivatives leverage accumulation.',
      'Aligned with London Institutional Session; 1h trend (BULLISH) structural breakout.',
      '5m selected as optimal entry timeframe to capture immediate high-beta impulse volatility.'
    ],
    detected_at: new Date(now - 57600000).toISOString(), // 16 hours ago
    closed_at: new Date(now - 43200000).toISOString(),   // 12 hours ago
    updated_at: new Date(now - 43200000).toISOString(),
  },
  {
    signal_id: 'BIGCAP-20260921-BTCUSDT-SHORT-1290',
    symbol: 'BTCUSDT',
    direction: 'SHORT',
    best_timeframe: '5m',
    entry_price: 81800.00,
    stop_loss_price: 82454.40,
    target_price_1: 80573.00,
    target_price_2: 78937.00,
    current_price: 82454.40,
    realized_pnl_pct: -0.8,
    eagle_score: 78,
    rvol: 2.10,
    z_score: 2.05,
    oi_delta_pct: 2.18,
    session_tag: 'ASIA_PACIFIC',
    status: 'SL_HIT',
    rationale_json: [
      '5M RVOL reached 2.10x (Z-Score +2.05) indicating short-term liquidity sweep.',
      'Open Interest shifted +2.18% with negative delta, triggering mean reversion scalp.',
      'Aligned with Asia / Off-Hours; market volatility elevated.',
      '5m selected as optimal entry timeframe to capture tight range rejection.'
    ],
    detected_at: new Date(now - 36000000).toISOString(), // 10 hours ago
    closed_at: new Date(now - 28800000).toISOString(),   // 8 hours ago
    updated_at: new Date(now - 28800000).toISOString(),
  },
  {
    signal_id: 'BIGCAP-20260921-ETHUSDT-LONG-6751',
    symbol: 'ETHUSDT',
    direction: 'LONG',
    best_timeframe: '1h',
    entry_price: 2610.00,
    stop_loss_price: 2589.12,
    target_price_1: 2649.15,
    target_price_2: 2701.35,
    current_price: 2701.35,
    realized_pnl_pct: 3.5,
    eagle_score: 85,
    rvol: 2.70,
    z_score: 2.82,
    oi_delta_pct: 4.02,
    session_tag: 'LONDON',
    status: 'TP_HIT',
    rationale_json: [
      '1H RVOL reached 2.70x (Z-Score +2.82) indicating macro accumulation continuation.',
      'Open Interest expanded +4.02% alongside steady upward price progression.',
      'Aligned with London Institutional Session; 1h EMA(50) holding as structural base.',
      '1h selected as optimal entry timeframe to ride sustained multi-session macro trend continuation.'
    ],
    detected_at: new Date(now - 28800000).toISOString(), // 8 hours ago
    closed_at: new Date(now - 14400000).toISOString(),   // 4 hours ago
    updated_at: new Date(now - 14400000).toISOString(),
  },
  {
    signal_id: 'BIGCAP-20260921-SOLUSDT-SHORT-9820',
    symbol: 'SOLUSDT',
    direction: 'SHORT',
    best_timeframe: '15m',
    entry_price: 114.50,
    stop_loss_price: 115.42,
    target_price_1: 112.78,
    target_price_2: 110.49,
    current_price: 110.49,
    realized_pnl_pct: 3.5,
    eagle_score: 89,
    rvol: 3.60,
    z_score: 3.38,
    oi_delta_pct: 4.88,
    session_tag: 'NEW_YORK',
    status: 'TP_HIT',
    rationale_json: [
      '15M RVOL reached 3.60x (Z-Score +3.38) indicating heavy institutional distribution on retest.',
      'Open Interest shifted +4.88% alongside sharp price rejection, confirming aggressive short positioning.',
      'Aligned with New York Cash Session; 1h trend (BEARISH) EMA(50) rejection.',
      '15m selected as optimal entry timeframe to filter micro-whips while capturing trend continuation.'
    ],
    detected_at: new Date(now - 21600000).toISOString(), // 6 hours ago
    closed_at: new Date(now - 7200000).toISOString(),    // 2 hours ago
    updated_at: new Date(now - 7200000).toISOString(),
  }
];

async function seed() {
  console.log('Seeding resolved big-cap trades to Supabase...');
  for (const t of resolvedTrades) {
    const { error } = await supabase.from('big_cap_signals').upsert(t, { onConflict: 'signal_id' });
    if (error) {
      console.error('Error inserting', t.signal_id, error);
    } else {
      console.log('✅ Seeded resolved trade:', t.signal_id, t.symbol, t.status, `${t.realized_pnl_pct >= 0 ? '+' : ''}${t.realized_pnl_pct}%`);
    }
  }
  console.log('Seeding completed successfully!');
}

seed().catch(console.error);
