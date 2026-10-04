-- ═══════════════════════════════════════════════════════════════════════════
-- 🦅 EAGLE FLASH — PERFORMANCE & WIN-RATE ENGINE SCHEMA MIGRATION
-- Production Migration v9.0
-- Adds:
-- 1. signal_outcomes: Deterministic outcome projection for every canonical signal
-- 2. daily_performance: Aggregated daily statistics (Asia/Dhaka & UTC)
-- 3. weekly_performance: Aggregated weekly statistics (Monday to Sunday)
-- 4. monthly_performance: Aggregated monthly performance rollups
-- 5. performance_report_runs: Idempotent reporting runs tracker
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. EXTEND SIGNALS TABLE WITH RISK_R IF MISSING
DO $$ BEGIN
    ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS risk_r NUMERIC(18, 8);
    ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS tp1_hit_at TIMESTAMPTZ;
    ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS tp2_hit_at TIMESTAMPTZ;
    ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS tp3_hit_at TIMESTAMPTZ;
    ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS stop_hit_at TIMESTAMPTZ;
    ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS tp1_hit_price NUMERIC(18, 8);
    ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS tp2_hit_price NUMERIC(18, 8);
    ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS tp3_hit_price NUMERIC(18, 8);
    ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS stop_hit_price NUMERIC(18, 8);
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- 2. CANONICAL SIGNAL OUTCOMES TABLE
CREATE TABLE IF NOT EXISTS public.signal_outcomes (
    id BIGSERIAL PRIMARY KEY,
    signal_id VARCHAR(64) UNIQUE NOT NULL REFERENCES public.signals(signal_id) ON DELETE CASCADE,
    symbol VARCHAR(32) NOT NULL,
    exchange VARCHAR(16) NOT NULL DEFAULT 'BYBIT',
    contract VARCHAR(64),
    direction VARCHAR(8) NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
    strategy VARCHAR(32) NOT NULL DEFAULT 'BREAKOUT',
    strategy_version VARCHAR(16) DEFAULT 'v1.5',
    eagle_score INT NOT NULL DEFAULT 75,

    detected_at TIMESTAMPTZ NOT NULL,
    activated_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,

    entry_price NUMERIC(18, 8) NOT NULL,
    stop_price NUMERIC(18, 8) NOT NULL,
    tp1_price NUMERIC(18, 8) NOT NULL,
    tp2_price NUMERIC(18, 8) NOT NULL,
    tp3_price NUMERIC(18, 8) NOT NULL,
    exit_price NUMERIC(18, 8),
    risk_r NUMERIC(18, 8) NOT NULL,

    tp1_hit BOOLEAN DEFAULT false,
    tp2_hit BOOLEAN DEFAULT false,
    tp3_hit BOOLEAN DEFAULT false,
    stop_hit BOOLEAN DEFAULT false,

    tp1_hit_at TIMESTAMPTZ,
    tp2_hit_at TIMESTAMPTZ,
    tp3_hit_at TIMESTAMPTZ,
    stop_hit_at TIMESTAMPTZ,

    primary_outcome VARCHAR(16) NOT NULL DEFAULT 'UNRESOLVED' 
        CHECK (primary_outcome IN ('PENDING', 'WIN', 'LOSS', 'BREAKEVEN', 'EXPIRED', 'UNRESOLVED')),
    realized_r NUMERIC(10, 4) DEFAULT 0.0,
    max_r NUMERIC(10, 4) DEFAULT 0.0,
    mfe_pct NUMERIC(10, 4) DEFAULT 0.0,
    mae_pct NUMERIC(10, 4) DEFAULT 0.0,

    time_to_tp1_ms BIGINT,
    time_to_stop_ms BIGINT,
    time_to_resolution_ms BIGINT,

    outcome_reason TEXT,
    data_quality VARCHAR(16) DEFAULT 'LIVE',
    resolution_precision VARCHAR(16) DEFAULT 'TICK',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_so_resolved_at ON public.signal_outcomes(resolved_at DESC);
CREATE INDEX IF NOT EXISTS idx_so_primary_outcome ON public.signal_outcomes(primary_outcome);
CREATE INDEX IF NOT EXISTS idx_so_strategy ON public.signal_outcomes(strategy);
CREATE INDEX IF NOT EXISTS idx_so_exchange ON public.signal_outcomes(exchange);
CREATE INDEX IF NOT EXISTS idx_so_direction ON public.signal_outcomes(direction);
CREATE INDEX IF NOT EXISTS idx_so_detected_at ON public.signal_outcomes(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_so_composite ON public.signal_outcomes(primary_outcome, resolved_at DESC);

-- 3. DAILY PERFORMANCE TABLE
CREATE TABLE IF NOT EXISTS public.daily_performance (
    date DATE NOT NULL,
    timezone VARCHAR(32) NOT NULL DEFAULT 'Asia/Dhaka',
    total_signals INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    breakevens INT DEFAULT 0,
    unresolved INT DEFAULT 0,
    expired INT DEFAULT 0,
    resolved INT DEFAULT 0,
    win_rate NUMERIC(6, 2),
    tp1_rate NUMERIC(6, 2),
    tp2_rate NUMERIC(6, 2),
    tp3_rate NUMERIC(6, 2),
    stop_rate NUMERIC(6, 2),
    gross_win_r NUMERIC(12, 4) DEFAULT 0.0,
    gross_loss_r NUMERIC(12, 4) DEFAULT 0.0,
    net_r NUMERIC(12, 4) DEFAULT 0.0,
    avg_r NUMERIC(10, 4),
    expectancy NUMERIC(10, 4),
    profit_factor NUMERIC(10, 4),
    avg_mfe NUMERIC(8, 4),
    avg_mae NUMERIC(8, 4),
    avg_time_to_resolution_ms BIGINT,
    best_signal JSONB,
    worst_signal JSONB,
    strategy_breakdown JSONB DEFAULT '{}'::jsonb,
    exchange_breakdown JSONB DEFAULT '{}'::jsonb,
    direction_breakdown JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (date, timezone)
);

CREATE INDEX IF NOT EXISTS idx_daily_perf_date ON public.daily_performance(date DESC);

-- 4. WEEKLY PERFORMANCE TABLE
CREATE TABLE IF NOT EXISTS public.weekly_performance (
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    timezone VARCHAR(32) NOT NULL DEFAULT 'Asia/Dhaka',
    total_signals INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    breakevens INT DEFAULT 0,
    unresolved INT DEFAULT 0,
    expired INT DEFAULT 0,
    resolved INT DEFAULT 0,
    win_rate NUMERIC(6, 2),
    tp1_rate NUMERIC(6, 2),
    tp2_rate NUMERIC(6, 2),
    tp3_rate NUMERIC(6, 2),
    stop_rate NUMERIC(6, 2),
    gross_win_r NUMERIC(12, 4) DEFAULT 0.0,
    gross_loss_r NUMERIC(12, 4) DEFAULT 0.0,
    net_r NUMERIC(12, 4) DEFAULT 0.0,
    avg_r NUMERIC(10, 4),
    expectancy NUMERIC(10, 4),
    profit_factor NUMERIC(10, 4),
    avg_mfe NUMERIC(8, 4),
    avg_mae NUMERIC(8, 4),
    avg_time_to_resolution_ms BIGINT,
    best_signal JSONB,
    worst_signal JSONB,
    strategy_breakdown JSONB DEFAULT '{}'::jsonb,
    exchange_breakdown JSONB DEFAULT '{}'::jsonb,
    direction_breakdown JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (week_start, timezone)
);

CREATE INDEX IF NOT EXISTS idx_weekly_perf_start ON public.weekly_performance(week_start DESC);

-- 5. MONTHLY PERFORMANCE TABLE
CREATE TABLE IF NOT EXISTS public.monthly_performance (
    month_start DATE NOT NULL,
    month_end DATE NOT NULL,
    timezone VARCHAR(32) NOT NULL DEFAULT 'Asia/Dhaka',
    total_signals INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    resolved INT DEFAULT 0,
    win_rate NUMERIC(6, 2),
    net_r NUMERIC(12, 4) DEFAULT 0.0,
    avg_r NUMERIC(10, 4),
    expectancy NUMERIC(10, 4),
    profit_factor NUMERIC(10, 4),
    summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (month_start, timezone)
);

-- 6. PERFORMANCE REPORT RUNS (IDEMPOTENCY LEDGER)
CREATE TABLE IF NOT EXISTS public.performance_report_runs (
    id BIGSERIAL PRIMARY KEY,
    report_type VARCHAR(32) NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(32) NOT NULL DEFAULT 'Asia/Dhaka',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(16) NOT NULL DEFAULT 'SUCCESS',
    discord_message_id VARCHAR(64),
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_report_run UNIQUE (report_type, period_start, period_end, timezone)
);

CREATE INDEX IF NOT EXISTS idx_perf_runs_type ON public.performance_report_runs(report_type, period_start DESC);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.signal_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_report_runs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'signal_outcomes' AND policyname = 'Allow public read on signal_outcomes') THEN
        CREATE POLICY "Allow public read on signal_outcomes" ON public.signal_outcomes FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'signal_outcomes' AND policyname = 'Allow service role all on signal_outcomes') THEN
        CREATE POLICY "Allow service role all on signal_outcomes" ON public.signal_outcomes FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_performance' AND policyname = 'Allow public read on daily_performance') THEN
        CREATE POLICY "Allow public read on daily_performance" ON public.daily_performance FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_performance' AND policyname = 'Allow service role all on daily_performance') THEN
        CREATE POLICY "Allow service role all on daily_performance" ON public.daily_performance FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weekly_performance' AND policyname = 'Allow public read on weekly_performance') THEN
        CREATE POLICY "Allow public read on weekly_performance" ON public.weekly_performance FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weekly_performance' AND policyname = 'Allow service role all on weekly_performance') THEN
        CREATE POLICY "Allow service role all on weekly_performance" ON public.weekly_performance FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'monthly_performance' AND policyname = 'Allow public read on monthly_performance') THEN
        CREATE POLICY "Allow public read on monthly_performance" ON public.monthly_performance FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'monthly_performance' AND policyname = 'Allow service role all on monthly_performance') THEN
        CREATE POLICY "Allow service role all on monthly_performance" ON public.monthly_performance FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'performance_report_runs' AND policyname = 'Allow service role all on performance_report_runs') THEN
        CREATE POLICY "Allow service role all on performance_report_runs" ON public.performance_report_runs FOR ALL USING (true);
    END IF;
END $$;
