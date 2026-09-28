-- ═══════════════════════════════════════════════════════════════════════════
-- 🦅 EAGLE FLASH — BLOCKCHAIN SIGNAL PROOF & IMMUTABLE AUDIT TRAIL MIGRATION
-- Production Migration v7.0
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Extend signals table with blockchain verification proof attributes
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

-- 2. Create blockchain_commitments table for cryptographic audit trail
CREATE TABLE IF NOT EXISTS blockchain_commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(32) NOT NULL, -- SIGNAL_CREATED, SIGNAL_CONFIRMED, TP1_HIT, TP2_HIT, TP3_HIT, STOP_HIT, SIGNAL_CLOSED
    canonical_payload JSONB NOT NULL,
    event_hash VARCHAR(66) NOT NULL,
    blockchain_network VARCHAR(32) NOT NULL DEFAULT 'ethereum',
    chain_id INTEGER NOT NULL DEFAULT 1,
    contract_address VARCHAR(42),
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    publisher_address VARCHAR(42),
    confirmation_status VARCHAR(24) NOT NULL DEFAULT 'PENDING', -- PENDING, CONFIRMED, VERIFIED, MISMATCH, FAILED
    confirmed_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_commitment_signal_event UNIQUE (signal_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_blockchain_commitments_signal ON blockchain_commitments(signal_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_commitments_hash ON blockchain_commitments(event_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_commitments_status ON blockchain_commitments(confirmation_status);

-- 3. Create blockchain_events table for on-chain indexed telemetry
CREATE TABLE IF NOT EXISTS blockchain_events (
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

CREATE INDEX IF NOT EXISTS idx_blockchain_events_tx ON blockchain_events(tx_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_events_name ON blockchain_events(event_name);
CREATE INDEX IF NOT EXISTS idx_blockchain_events_block ON blockchain_events(block_number DESC);
