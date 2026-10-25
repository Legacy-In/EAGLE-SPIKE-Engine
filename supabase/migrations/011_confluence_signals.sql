-- ═══════════════════════════════════════════════════════════════════════════
-- 🦅 EAGLE FLASH — 1H CONFLUENCE STRATEGY & JOB RUNS SCHEMA
-- Migration 011: confluence_signals and job_runs
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CONFLUENCE SIGNALS TABLE
CREATE TABLE IF NOT EXISTS confluence_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_key text UNIQUE NOT NULL,            -- symbol|strategy|side|candle_t (idempotency)
  strategy text NOT NULL DEFAULT 'CONFLUENCE_1H',
  symbol text NOT NULL,                       -- normalized BASEUSDT
  exchange text NOT NULL DEFAULT 'BYBIT',
  timeframe text NOT NULL DEFAULT '1h',
  side text NOT NULL CHECK (side IN ('BUY', 'SELL')),
  strength text,
  votes_bull smallint NOT NULL,
  votes_bear smallint NOT NULL,
  score_pct smallint NOT NULL,
  votes_json jsonb NOT NULL,
  ages_json jsonb,
  indicators_json jsonb,
  oi_available boolean NOT NULL DEFAULT false,
  price numeric NOT NULL,
  atr numeric,
  candle_t timestamptz NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'ACTIVE',
  skip_reason text,
  config_version text NOT NULL DEFAULT '1.0.0'
);

CREATE INDEX IF NOT EXISTS idx_confluence_signals_detected_at ON confluence_signals (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_confluence_signals_symbol_detected ON confluence_signals (symbol, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_confluence_signals_status ON confluence_signals (status);

-- 2. JOB RUNS TABLE
CREATE TABLE IF NOT EXISTS job_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL,
  symbols_scanned int DEFAULT 0,
  signals_emitted int DEFAULT 0,
  error text
);

CREATE INDEX IF NOT EXISTS idx_job_runs_job_started ON job_runs (job_name, started_at DESC);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE confluence_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;

-- Anonymous and authenticated clients may SELECT only
DO $$ BEGIN
  CREATE POLICY "Allow public select on confluence_signals" 
    ON confluence_signals FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public select on job_runs" 
    ON job_runs FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
