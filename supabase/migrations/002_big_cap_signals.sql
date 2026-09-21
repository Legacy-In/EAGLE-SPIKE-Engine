-- ═══════════════════════════════════════════════════════════════════════════
-- 🏛️ BIG-CAP SPIKE & PNL INTELLIGENCE TERMINAL (BTC, ETH, SOL)
-- Production Schema Migration v2.0
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists big_cap_signals (
  id uuid default gen_random_uuid() primary key,
  signal_id text unique not null,
  symbol text not null check (symbol in ('BTCUSDT', 'ETHUSDT', 'SOLUSDT')),
  direction text not null check (direction in ('LONG', 'SHORT')),
  best_timeframe text not null check (best_timeframe in ('5m', '15m', '1h')),
  entry_price numeric not null,
  stop_loss_price numeric not null,
  target_price_1 numeric not null,
  target_price_2 numeric not null,
  current_price numeric not null,
  realized_pnl_pct numeric default 0,
  eagle_score integer not null,
  rvol numeric not null,
  z_score numeric not null,
  oi_delta_pct numeric not null,
  session_tag text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'TP_HIT', 'SL_HIT', 'INVALIDATED', 'EXPIRED')),
  rationale_json jsonb not null,
  detected_at timestamp with time zone default timezone('utc'::text, now()),
  closed_at timestamp with time zone,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Performance & Query Indexes
create index if not exists idx_bigcap_symbol_status on big_cap_signals(symbol, status);
create index if not exists idx_bigcap_detected_at on big_cap_signals(detected_at desc);

-- Exclusive Non-Overlapping Position Lock (At most 1 ACTIVE signal per symbol)
create unique index if not exists idx_bigcap_active_lock on big_cap_signals(symbol) where status = 'ACTIVE';

-- Row Level Security
alter table big_cap_signals enable row level security;

do $$ begin
  create policy "Allow public read on big_cap_signals"
    on big_cap_signals for select
    using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Allow service role all on big_cap_signals"
    on big_cap_signals for all
    using (true)
    with check (true);
exception when duplicate_object then null;
end $$;
