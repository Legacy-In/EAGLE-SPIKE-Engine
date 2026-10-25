-- ═══════════════════════════════════════════════════════════════════
-- 010_paper_trading.sql
-- EAGLE FLASH / SIGMA TERMINAL: Paper Trading & Sandbox Execution Tables
-- ═══════════════════════════════════════════════════════════════════

-- 1. Paper Accounts Table (Tracks virtual balance and overall metrics)
CREATE TABLE IF NOT EXISTS public.paper_accounts (
    id TEXT PRIMARY KEY DEFAULT 'DEFAULT_SANDBOX',
    initial_balance NUMERIC(16, 2) NOT NULL DEFAULT 10000.00,
    current_balance NUMERIC(16, 2) NOT NULL DEFAULT 10000.00,
    allocated_margin NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
    realized_pnl NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
    total_trades INT NOT NULL DEFAULT 0,
    winning_trades INT NOT NULL DEFAULT 0,
    losing_trades INT NOT NULL DEFAULT 0,
    win_rate_pct NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    profit_factor NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed initial default sandbox account if not present
INSERT INTO public.paper_accounts (id, initial_balance, current_balance, allocated_margin, realized_pnl)
VALUES ('DEFAULT_SANDBOX', 10000.00, 10000.00, 0.00, 0.00)
ON CONFLICT (id) DO NOTHING;

-- 2. Paper Trades Table (Stores virtual orders, executions, and resolutions)
CREATE TABLE IF NOT EXISTS public.paper_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_trade_id TEXT UNIQUE NOT NULL,
    signal_id TEXT,
    symbol TEXT NOT NULL,
    exchange TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
    entry_price NUMERIC(18, 8) NOT NULL,
    exit_price NUMERIC(18, 8),
    position_size_usd NUMERIC(16, 2) NOT NULL DEFAULT 100.00,
    quantity NUMERIC(18, 8) NOT NULL,
    leverage INT NOT NULL DEFAULT 5,
    margin_usd NUMERIC(16, 2) NOT NULL DEFAULT 100.00,
    take_profit_1 NUMERIC(18, 8) NOT NULL,
    take_profit_2 NUMERIC(18, 8),
    take_profit_3 NUMERIC(18, 8),
    stop_loss NUMERIC(18, 8) NOT NULL,
    risk_r NUMERIC(10, 4),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'TP_HIT', 'SL_HIT', 'CANCELLED')),
    realized_pnl_usd NUMERIC(16, 2) DEFAULT 0.00,
    realized_pnl_pct NUMERIC(10, 2) DEFAULT 0.00,
    realized_r NUMERIC(10, 4) DEFAULT 0.00,
    outcome TEXT CHECK (outcome IN ('WIN', 'LOSS', 'UNRESOLVED')),
    exit_reason TEXT,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_paper_trades_status ON public.paper_trades(status);
CREATE INDEX IF NOT EXISTS idx_paper_trades_symbol ON public.paper_trades(symbol);
CREATE INDEX IF NOT EXISTS idx_paper_trades_opened_at ON public.paper_trades(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_paper_trades_signal_id ON public.paper_trades(signal_id);

-- Enable Row Level Security (RLS) & Grant Public Read
ALTER TABLE public.paper_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read on paper_accounts" ON public.paper_accounts FOR SELECT USING (true);
CREATE POLICY "Allow anon read on paper_trades" ON public.paper_trades FOR SELECT USING (true);
CREATE POLICY "Allow service_role full access on paper_accounts" ON public.paper_accounts USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full access on paper_trades" ON public.paper_trades USING (true) WITH CHECK (true);
