-- ============================================================================
-- 🦅 EAGLE FLASH / SIGMA TERMINAL — CONSOLIDATED PRODUCTION DATABASE MIGRATION
-- ============================================================================
-- Execute this script in your Supabase Dashboard:
-- 1. Log in to https://supabase.com/dashboard/project/yyswmlsrvrqwhztbktlm
-- 2. Navigate to "SQL Editor" on the left menu
-- 3. Click "New Query", paste this entire script, and click "RUN"
-- ============================================================================

-- ============================================================================
-- 1. WHALE TRADES (Large Block Trades & On-Chain Inflow / Outflow)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.whale_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    exchange TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    amount_usdt NUMERIC NOT NULL,
    execution_price NUMERIC NOT NULL,
    detected_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_whale_trades_symbol ON public.whale_trades(symbol, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_whale_trades_detected ON public.whale_trades(detected_at DESC);

ALTER TABLE public.whale_trades ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whale_trades' AND policyname = 'Allow public read on whale_trades') THEN
        CREATE POLICY "Allow public read on whale_trades" ON public.whale_trades FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whale_trades' AND policyname = 'Allow service role all on whale_trades') THEN
        CREATE POLICY "Allow service role all on whale_trades" ON public.whale_trades FOR ALL USING (true);
    END IF;
END $$;

-- ============================================================================
-- 2. MANIPULATION ALERTS (Whale Accumulation, Spoofing, Pump & Dump)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.manipulation_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id TEXT UNIQUE NOT NULL,
    symbol TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    metrics_json JSONB NOT NULL,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED', 'EXPIRED')),
    detected_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_whale_alerts_symbol_status ON public.manipulation_alerts(symbol, status);
CREATE INDEX IF NOT EXISTS idx_whale_alerts_detected ON public.manipulation_alerts(detected_at DESC);

ALTER TABLE public.manipulation_alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'manipulation_alerts' AND policyname = 'Allow public read on manipulation_alerts') THEN
        CREATE POLICY "Allow public read on manipulation_alerts" ON public.manipulation_alerts FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'manipulation_alerts' AND policyname = 'Allow service role all on manipulation_alerts') THEN
        CREATE POLICY "Allow service role all on manipulation_alerts" ON public.manipulation_alerts FOR ALL USING (true);
    END IF;
END $$;

-- ============================================================================
-- 3. TELEGRAM SIGNAL OUTBOX (Durable Delivery Queue)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.telegram_signal_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id TEXT NOT NULL REFERENCES public.signals(signal_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL DEFAULT 'NEW_SIGNAL',
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENDING', 'SENT', 'RETRY', 'FAILED', 'CANCELLED')),
    attempt_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    last_attempt_at TIMESTAMPTZ,
    last_error TEXT,
    telegram_message_id BIGINT,
    chat_id TEXT,
    deduplication_key TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_telegram_outbox_queue ON public.telegram_signal_outbox (status, scheduled_at) WHERE status IN ('PENDING', 'RETRY');
CREATE INDEX IF NOT EXISTS idx_telegram_outbox_signal_id ON public.telegram_signal_outbox (signal_id);
CREATE INDEX IF NOT EXISTS idx_telegram_outbox_created_at ON public.telegram_signal_outbox (created_at DESC);

ALTER TABLE public.telegram_signal_outbox ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'telegram_signal_outbox' AND policyname = 'Allow service role on telegram_signal_outbox') THEN
        CREATE POLICY "Allow service role on telegram_signal_outbox" ON public.telegram_signal_outbox FOR ALL USING (true);
    END IF;
END $$;

-- ============================================================================
-- 4. GENERALIZED NOTIFICATION OUTBOX (Discord & Telegram Multi-Channel Queue)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id TEXT NOT NULL REFERENCES public.signals(signal_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL DEFAULT 'NEW_SIGNAL',
    channel_type TEXT NOT NULL CHECK (channel_type IN ('TELEGRAM', 'DISCORD')),
    channel_id TEXT,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENDING', 'SENT', 'RETRY', 'FAILED', 'CANCELLED')),
    attempt_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    last_attempt_at TIMESTAMPTZ,
    last_error TEXT,
    external_message_id TEXT,
    deduplication_key TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_queue ON public.notification_outbox (channel_type, status, scheduled_at) WHERE status IN ('PENDING', 'RETRY');
CREATE INDEX IF NOT EXISTS idx_notification_outbox_signal_id ON public.notification_outbox (signal_id);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_created_at ON public.notification_outbox (created_at DESC);

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_outbox' AND policyname = 'Allow service role on notification_outbox') THEN
        CREATE POLICY "Allow service role on notification_outbox" ON public.notification_outbox FOR ALL USING (true);
    END IF;
END $$;

-- ============================================================================
-- 5. BLOCKCHAIN PROOF & COMMITMENTS (Cryptographic Signal Verification)
-- ============================================================================
DO $$ BEGIN
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS event_hash VARCHAR(66);
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS blockchain_network VARCHAR(32) DEFAULT 'ethereum';
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 1;
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS transaction_hash VARCHAR(66);
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS block_number BIGINT;
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS confirmation_status VARCHAR(24) DEFAULT 'UNCOMMITTED';
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
EXCEPTION WHEN OTHERS THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.blockchain_commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(32) NOT NULL,
    canonical_payload JSONB NOT NULL,
    event_hash VARCHAR(66) NOT NULL,
    blockchain_network VARCHAR(32) NOT NULL DEFAULT 'ethereum',
    chain_id INTEGER NOT NULL DEFAULT 1,
    contract_address VARCHAR(42),
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    publisher_address VARCHAR(42),
    confirmation_status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    confirmed_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_commitment_signal_event UNIQUE (signal_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_blockchain_commitments_signal ON public.blockchain_commitments(signal_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_commitments_hash ON public.blockchain_commitments(event_hash);

CREATE TABLE IF NOT EXISTS public.blockchain_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_hash VARCHAR(66) NOT NULL,
    log_index INTEGER NOT NULL DEFAULT 0,
    event_name VARCHAR(64) NOT NULL,
    chain_id INTEGER NOT NULL DEFAULT 1,
    contract_address VARCHAR(42) NOT NULL,
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_blockchain_tx_log UNIQUE (tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_blockchain_events_tx ON public.blockchain_events(tx_hash);

ALTER TABLE public.blockchain_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blockchain_commitments' AND policyname = 'Allow public read on blockchain_commitments') THEN
        CREATE POLICY "Allow public read on blockchain_commitments" ON public.blockchain_commitments FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blockchain_commitments' AND policyname = 'Allow service role all on blockchain_commitments') THEN
        CREATE POLICY "Allow service role all on blockchain_commitments" ON public.blockchain_commitments FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blockchain_events' AND policyname = 'Allow public read on blockchain_events') THEN
        CREATE POLICY "Allow public read on blockchain_events" ON public.blockchain_events FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blockchain_events' AND policyname = 'Allow service role all on blockchain_events') THEN
        CREATE POLICY "Allow service role all on blockchain_events" ON public.blockchain_events FOR ALL USING (true);
    END IF;
END $$;

-- ============================================================================
-- 6. PRE-BREAKOUT & ACCUMULATION AUDIT TRAIL
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.prep_signal_audits (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    exchange TEXT NOT NULL DEFAULT 'BYBIT',
    entry_market_status TEXT NOT NULL,
    current_market_status TEXT NOT NULL,
    prep_score NUMERIC NOT NULL,
    confirmation_score NUMERIC NOT NULL,
    base_price_v1 NUMERIC NOT NULL,
    entry_price NUMERIC NOT NULL,
    atr_15m NUMERIC,
    initial_stop_price NUMERIC,
    target_1r_price NUMERIC,
    chase_risk_level TEXT DEFAULT 'LOW',
    iceberg_likelihood TEXT DEFAULT 'LOW',
    detected_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    confirmed_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    did_breakout BOOLEAN DEFAULT false,
    reached_1r BOOLEAN DEFAULT false,
    stopped_out BOOLEAN DEFAULT false,
    is_false_breakout BOOLEAN DEFAULT false,
    time_to_confirm_ms BIGINT,
    time_to_confirm_min NUMERIC,
    peak_price NUMERIC,
    trough_price NUMERIC,
    mfe_pct NUMERIC DEFAULT 0,
    mae_pct NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'OPEN',
    discord_message_id TEXT,
    notification_event_id TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_prep_audits_symbol ON public.prep_signal_audits(symbol, status);
CREATE INDEX IF NOT EXISTS idx_prep_audits_detected ON public.prep_signal_audits(detected_at DESC);

ALTER TABLE public.prep_signal_audits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prep_signal_audits' AND policyname = 'Allow public read on prep_signal_audits') THEN
        CREATE POLICY "Allow public read on prep_signal_audits" ON public.prep_signal_audits FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prep_signal_audits' AND policyname = 'Allow service role all on prep_signal_audits') THEN
        CREATE POLICY "Allow service role all on prep_signal_audits" ON public.prep_signal_audits FOR ALL USING (true);
    END IF;
END $$;
