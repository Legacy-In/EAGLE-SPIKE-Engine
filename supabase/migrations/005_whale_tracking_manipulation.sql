-- ============================================================================
-- Migration 005: Whale Tracking & Market Manipulation Detector Schema
-- ============================================================================

-- 1. WHALE TRADES (Large Block Trades)
create table if not exists whale_trades (
  id uuid default gen_random_uuid() primary key,
  symbol text not null,
  exchange text not null,
  side text not null check (side in ('BUY', 'SELL')),
  amount_usdt numeric not null,
  execution_price numeric not null,
  detected_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. MANIPULATION ALERTS
create table if not exists manipulation_alerts (
  id uuid default gen_random_uuid() primary key,
  alert_id text unique not null,
  symbol text not null,
  alert_type text not null check (alert_type in ('WHALE_ACCUMULATION', 'PUMP_AND_DUMP_RISK', 'SPOOFING_DETECTED', 'HIGH_MANIPULATION_RISK')),
  severity text not null check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  metrics_json jsonb not null,
  status text default 'ACTIVE' check (status in ('ACTIVE', 'RESOLVED', 'EXPIRED')),
  detected_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. INDEXES FOR HIGH-THROUGHPUT LOOKUPS & REAL-TIME DASHBOARD
create index if not exists idx_whale_alerts_symbol_status on manipulation_alerts(symbol, status);
create index if not exists idx_whale_trades_symbol on whale_trades(symbol, detected_at desc);
create index if not exists idx_whale_alerts_detected on manipulation_alerts(detected_at desc);
create index if not exists idx_whale_trades_detected on whale_trades(detected_at desc);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
alter table whale_trades enable row level security;
alter table manipulation_alerts enable row level security;

-- Public / Anonymous read access
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'whale_trades' and policyname = 'Allow public read on whale_trades'
  ) then
    create policy "Allow public read on whale_trades"
      on whale_trades for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'whale_trades' and policyname = 'Allow service role insert/update on whale_trades'
  ) then
    create policy "Allow service role insert/update on whale_trades"
      on whale_trades for all using (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'manipulation_alerts' and policyname = 'Allow public read on manipulation_alerts'
  ) then
    create policy "Allow public read on manipulation_alerts"
      on manipulation_alerts for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'manipulation_alerts' and policyname = 'Allow service role insert/update on manipulation_alerts'
  ) then
    create policy "Allow service role insert/update on manipulation_alerts"
      on manipulation_alerts for all using (true);
  end if;
end $$;

-- 5. ATOMIC RPC HELPER: create_manipulation_alert_atomic
create or replace function create_manipulation_alert_atomic(
  p_alert_id text,
  p_symbol text,
  p_alert_type text,
  p_severity text,
  p_metrics_json jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_inserted record;
begin
  insert into manipulation_alerts (
    alert_id,
    symbol,
    alert_type,
    severity,
    metrics_json,
    status,
    detected_at,
    updated_at
  ) values (
    p_alert_id,
    p_symbol,
    p_alert_type,
    p_severity,
    p_metrics_json,
    'ACTIVE',
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  on conflict (alert_id) do update set
    metrics_json = excluded.metrics_json,
    severity = excluded.severity,
    updated_at = timezone('utc'::text, now())
  returning * into v_inserted;

  return jsonb_build_object(
    'success', true,
    'alert_id', v_inserted.alert_id,
    'symbol', v_inserted.symbol,
    'alert_type', v_inserted.alert_type,
    'severity', v_inserted.severity,
    'status', v_inserted.status
  );
end;
$$;
