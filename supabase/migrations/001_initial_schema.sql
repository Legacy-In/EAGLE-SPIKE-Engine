-- ═══════════════════════════════════════════════════════════════════════════
-- 🦅 EAGLE FLASH — DATABASE-BACKED SIGNAL INTELLIGENCE
-- Production Schema Migration v1.0
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE signal_direction AS ENUM ('LONG', 'SHORT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE signal_status AS ENUM (
        'DETECTED', 'ACTIVE', 'T1_HIT', 'T2_HIT', 'T3_HIT', 'STOP_HIT', 'EXPIRED', 'CLOSED'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE checkpoint_interval AS ENUM (
        '15M', '30M', '1H', '2H', '4H', '8H', '12H', '1D', '2D', '3D', '7D'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. ASSETS TABLE (BASE COIN REGISTRY)
CREATE TABLE IF NOT EXISTS assets (
    id VARCHAR(16) PRIMARY KEY, -- 'BTC', 'ETH', 'SOL', 'AVAX'
    name VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EXCHANGES TABLE
CREATE TABLE IF NOT EXISTS exchanges (
    id VARCHAR(16) PRIMARY KEY, -- 'BYBIT', 'BINANCE', 'MEXC', 'WEEX'
    name VARCHAR(64) NOT NULL,
    api_url TEXT NOT NULL,
    ws_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MARKETS TABLE (CONTRACT SPECIFICATIONS)
CREATE TABLE IF NOT EXISTS markets (
    id VARCHAR(64) PRIMARY KEY, -- e.g. 'BYBIT:BTCUSDT'
    exchange_id VARCHAR(16) NOT NULL REFERENCES exchanges(id),
    asset_id VARCHAR(16) NOT NULL REFERENCES assets(id),
    symbol VARCHAR(32) NOT NULL,
    base_coin VARCHAR(16) NOT NULL,
    quote_coin VARCHAR(16) NOT NULL DEFAULT 'USDT',
    price_precision INT NOT NULL DEFAULT 4,
    tick_size NUMERIC(18, 8) NOT NULL DEFAULT 0.0001,
    min_order_qty NUMERIC(18, 8) DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. STRATEGY VERSIONS
CREATE TABLE IF NOT EXISTS strategy_versions (
    version VARCHAR(16) PRIMARY KEY, -- 'v1.4', 'v1.5'
    description TEXT,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SIGNALS (CENTRAL RECORD)
CREATE TABLE IF NOT EXISTS signals (
    id BIGSERIAL PRIMARY KEY,
    signal_id VARCHAR(64) UNIQUE NOT NULL, -- 'EGL-20260921-BYBIT-AVAXUSDT-0001'
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    exchange_id VARCHAR(16) NOT NULL REFERENCES exchanges(id),
    market_id VARCHAR(64) NOT NULL REFERENCES markets(id),
    symbol VARCHAR(32) NOT NULL,
    direction signal_direction NOT NULL,
    strategy_version VARCHAR(16) NOT NULL REFERENCES strategy_versions(version),
    entry_price NUMERIC(18, 8) NOT NULL,
    target_1_price NUMERIC(18, 8) NOT NULL,
    target_2_price NUMERIC(18, 8) NOT NULL,
    target_3_price NUMERIC(18, 8) NOT NULL,
    stop_price NUMERIC(18, 8) NOT NULL,
    exit_price NUMERIC(18, 8),
    gross_pnl_pct NUMERIC(10, 4) DEFAULT 0.0,
    estimated_fee_pct NUMERIC(10, 4) DEFAULT 0.10,
    slippage_pct NUMERIC(10, 4),
    funding_pct NUMERIC(10, 4),
    net_pnl_pct NUMERIC(10, 4),
    status signal_status NOT NULL DEFAULT 'DETECTED',
    eagle_score INT NOT NULL,
    rvol NUMERIC(8, 2) NOT NULL,
    volume_z_score NUMERIC(8, 2) NOT NULL,
    oi_change_pct NUMERIC(8, 2) NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. IMMUTABLE SNAPSHOT
CREATE TABLE IF NOT EXISTS signal_snapshots (
    signal_id VARCHAR(64) PRIMARY KEY REFERENCES signals(signal_id) ON DELETE CASCADE,
    price NUMERIC(18, 8) NOT NULL,
    mark_price NUMERIC(18, 8),
    index_price NUMERIC(18, 8),
    price_24h_change NUMERIC(10, 4),
    turnover_24h_usd NUMERIC(24, 2),
    rvol NUMERIC(8, 2) NOT NULL,
    volume_z_score NUMERIC(8, 2) NOT NULL,
    open_interest_usd NUMERIC(24, 2) NOT NULL,
    oi_change_pct NUMERIC(8, 2) NOT NULL,
    funding_rate NUMERIC(10, 6) NOT NULL,
    taker_flow NUMERIC(8, 2) NOT NULL,
    rsi NUMERIC(6, 2),
    trend VARCHAR(32),
    spike_phase VARCHAR(32),
    positioning_state VARCHAR(32),
    market_breadth NUMERIC(6, 2),
    btc_regime VARCHAR(32),
    captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. STANDARDIZED CHECKPOINTS
CREATE TABLE IF NOT EXISTS signal_checkpoints (
    id BIGSERIAL PRIMARY KEY,
    signal_id VARCHAR(64) NOT NULL REFERENCES signals(signal_id) ON DELETE CASCADE,
    checkpoint_type checkpoint_interval NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    captured_at TIMESTAMPTZ,
    price NUMERIC(18, 8),
    directional_return_pct NUMERIC(10, 4),
    is_available BOOLEAN DEFAULT false,
    CONSTRAINT uq_signal_checkpoint UNIQUE (signal_id, checkpoint_type)
);

-- 9. SIGNAL EXTREMES (MFE & MAE TRACKER)
CREATE TABLE IF NOT EXISTS signal_extremes (
    signal_id VARCHAR(64) PRIMARY KEY REFERENCES signals(signal_id) ON DELETE CASCADE,
    mfe_price NUMERIC(18, 8) NOT NULL,
    mfe_pct NUMERIC(10, 4) NOT NULL DEFAULT 0.0,
    mfe_timestamp TIMESTAMPTZ NOT NULL,
    time_to_mfe_ms BIGINT DEFAULT 0,
    mae_price NUMERIC(18, 8) NOT NULL,
    mae_pct NUMERIC(10, 4) NOT NULL DEFAULT 0.0,
    mae_timestamp TIMESTAMPTZ NOT NULL,
    time_to_mae_ms BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. AUDIT EVENTS TIMELINE
CREATE TABLE IF NOT EXISTS signal_events (
    id BIGSERIAL PRIMARY KEY,
    signal_id VARCHAR(64) NOT NULL REFERENCES signals(signal_id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    price NUMERIC(18, 8),
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 11. DAILY PERFORMANCE ROLLUPS
CREATE TABLE IF NOT EXISTS daily_signal_performance (
    date DATE PRIMARY KEY,
    total_signals INT DEFAULT 0,
    long_signals INT DEFAULT 0,
    short_signals INT DEFAULT 0,
    t1_hit_count INT DEFAULT 0,
    t2_hit_count INT DEFAULT 0,
    t3_hit_count INT DEFAULT 0,
    stop_hit_count INT DEFAULT 0,
    win_rate_pct NUMERIC(6, 2) DEFAULT 0.0,
    avg_gross_pnl_pct NUMERIC(8, 4) DEFAULT 0.0,
    median_gross_pnl_pct NUMERIC(8, 4) DEFAULT 0.0,
    avg_mfe_pct NUMERIC(8, 4) DEFAULT 0.0,
    median_mfe_pct NUMERIC(8, 4) DEFAULT 0.0,
    avg_mae_pct NUMERIC(8, 4) DEFAULT 0.0,
    median_mae_pct NUMERIC(8, 4) DEFAULT 0.0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. HIGH-PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_signals_detected_at ON signals(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_symbol ON signals(symbol);
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_composite ON signals(exchange_id, direction, status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkpoints_lookup ON signal_checkpoints(signal_id, checkpoint_type);
CREATE INDEX IF NOT EXISTS idx_events_timeline ON signal_events(signal_id, timestamp ASC);

-- 13. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_extremes ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_signal_performance ENABLE ROW LEVEL SECURITY;

-- Anonymous public read policies
DO $$ BEGIN
    CREATE POLICY "Allow public read assets" ON assets FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public read exchanges" ON exchanges FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public read markets" ON markets FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public read strategy_versions" ON strategy_versions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public read signals" ON signals FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public read snapshots" ON signal_snapshots FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public read checkpoints" ON signal_checkpoints FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public read extremes" ON signal_extremes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public read events" ON signal_events FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public read daily rollups" ON daily_signal_performance FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Service role write policies
DO $$ BEGIN
    CREATE POLICY "Allow service_role write assets" ON assets FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow service_role write exchanges" ON exchanges FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow service_role write markets" ON markets FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow service_role write strategy_versions" ON strategy_versions FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow service_role write signals" ON signals FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow service_role write snapshots" ON signal_snapshots FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow service_role write checkpoints" ON signal_checkpoints FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow service_role write extremes" ON signal_extremes FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow service_role write events" ON signal_events FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow service_role write daily rollups" ON daily_signal_performance FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 14. SEED INITIAL EXCHANGES & STRATEGY VERSION
INSERT INTO exchanges (id, name, api_url, ws_url) VALUES
    ('BYBIT', 'Bybit V5 Linear', 'https://api.bybit.com', 'wss://stream.bybit.com/v5/public/linear'),
    ('BINANCE', 'Binance USD-M Futures', 'https://fapi.binance.com', 'wss://fstream.binance.com/ws'),
    ('MEXC', 'MEXC Futures', 'https://contract.mexc.com', 'wss://contract.mexc.com/edge'),
    ('WEEX', 'WEEX Futures', 'https://api.weex.com', 'wss://ws.weex.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO strategy_versions (version, description, config) VALUES
    ('v1.5', 'EAGLE FLASH Production Signal Intelligence with 15m ATR dynamic targets', '{
        "score_threshold": 65,
        "rvol_threshold": 2.0,
        "oi_change_threshold": 3.0,
        "atr_period": 14,
        "atr_timeframe": "15m",
        "stop_loss_multiplier": 1.5,
        "stop_loss_min_pct": 2.0,
        "stop_loss_max_pct": 3.5,
        "target_1_multiplier": 1.2,
        "target_2_multiplier": 2.5,
        "target_3_multiplier": 5.0,
        "cooldown_minutes": 15
    }'::jsonb)
ON CONFLICT (version) DO NOTHING;
