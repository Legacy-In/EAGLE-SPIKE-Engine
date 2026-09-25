-- ═══════════════════════════════════════════════════════════════════════════
-- 🦅 EAGLE FLASH — ATOMIC SIGNAL TRANSACTION & INTEGRITY CONSTRAINTS
-- Production Schema Migration v3.0
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Ensure Table Constraints on signals
DO $$ BEGIN
    ALTER TABLE signals ADD CONSTRAINT chk_signals_entry_positive CHECK (entry_price > 0);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE signals ADD CONSTRAINT chk_signals_target1_positive CHECK (target_1_price > 0);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE signals ADD CONSTRAINT chk_signals_stop_positive CHECK (stop_price > 0);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Foreign Key link between big_cap_signals and signals (if big_cap_signals exists)
DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'big_cap_signals') THEN
        -- Add foreign key constraint if not already present
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_bigcap_signals_signal_id'
        ) THEN
            ALTER TABLE big_cap_signals
            ADD CONSTRAINT fk_bigcap_signals_signal_id
            FOREIGN KEY (signal_id) REFERENCES signals(signal_id) ON DELETE CASCADE;
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- 3. Atomic Signal Creation Stored Function
-- Executes inside a single PostgreSQL transaction block.
-- If any insert fails, PostgreSQL automatically rolls back the entire operation.
CREATE OR REPLACE FUNCTION create_signal_atomic(
    p_signal JSONB,
    p_snapshot JSONB,
    p_extremes JSONB,
    p_checkpoints JSONB DEFAULT '[]'::jsonb,
    p_bigcap JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_signal_id VARCHAR(64);
    v_idempotency_key VARCHAR(128);
    v_exchange_id VARCHAR(16);
    v_market_id VARCHAR(64);
    v_symbol VARCHAR(32);
    v_direction signal_direction;
    v_strategy_version VARCHAR(16);
    v_entry_price NUMERIC(18, 8);
    v_target_1 NUMERIC(18, 8);
    v_target_2 NUMERIC(18, 8);
    v_target_3 NUMERIC(18, 8);
    v_stop_price NUMERIC(18, 8);
    v_eagle_score INT;
    v_rvol NUMERIC(8, 2);
    v_volume_z NUMERIC(8, 2);
    v_oi_change NUMERIC(8, 2);
    v_detected_at TIMESTAMPTZ;
    v_cp JSONB;
BEGIN
    -- Extract values from p_signal
    v_signal_id := p_signal->>'signal_id';
    v_idempotency_key := p_signal->>'idempotency_key';
    v_exchange_id := p_signal->>'exchange_id';
    v_market_id := p_signal->>'market_id';
    v_symbol := p_signal->>'symbol';
    v_direction := (p_signal->>'direction')::signal_direction;
    v_strategy_version := COALESCE(p_signal->>'strategy_version', 'v1.5');
    v_entry_price := (p_signal->>'entry_price')::NUMERIC;
    v_target_1 := (p_signal->>'target_1_price')::NUMERIC;
    v_target_2 := (p_signal->>'target_2_price')::NUMERIC;
    v_target_3 := (p_signal->>'target_3_price')::NUMERIC;
    v_stop_price := (p_signal->>'stop_price')::NUMERIC;
    v_eagle_score := (p_signal->>'eagle_score')::INT;
    v_rvol := (p_signal->>'rvol')::NUMERIC;
    v_volume_z := (p_signal->>'volume_z_score')::NUMERIC;
    v_oi_change := (p_signal->>'oi_change_pct')::NUMERIC;
    v_detected_at := (p_signal->>'detected_at')::TIMESTAMPTZ;

    -- Ensure strategy_version exists
    INSERT INTO strategy_versions (version, description)
    VALUES (v_strategy_version, 'Eagle Flash Automated Strategy')
    ON CONFLICT (version) DO NOTHING;

    -- Ensure asset exists
    INSERT INTO assets (id, name)
    VALUES (split_part(v_symbol, 'USDT', 1), split_part(v_symbol, 'USDT', 1) || ' Perpetual')
    ON CONFLICT (id) DO NOTHING;

    -- Ensure exchange exists
    INSERT INTO exchanges (id, name, api_url)
    VALUES (v_exchange_id, v_exchange_id || ' Exchange', 'https://api.' || lower(v_exchange_id) || '.com')
    ON CONFLICT (id) DO NOTHING;

    -- Ensure market exists
    INSERT INTO markets (id, exchange_id, asset_id, symbol, base_coin)
    VALUES (v_market_id, v_exchange_id, split_part(v_symbol, 'USDT', 1), v_symbol, split_part(v_symbol, 'USDT', 1))
    ON CONFLICT (id) DO NOTHING;

    -- 1. Insert primary signal row
    INSERT INTO signals (
        signal_id,
        idempotency_key,
        exchange_id,
        market_id,
        symbol,
        direction,
        strategy_version,
        entry_price,
        target_1_price,
        target_2_price,
        target_3_price,
        stop_price,
        status,
        eagle_score,
        rvol,
        volume_z_score,
        oi_change_pct,
        detected_at,
        created_at,
        updated_at
    ) VALUES (
        v_signal_id,
        v_idempotency_key,
        v_exchange_id,
        v_market_id,
        v_symbol,
        v_direction,
        v_strategy_version,
        v_entry_price,
        v_target_1,
        v_target_2,
        v_target_3,
        v_stop_price,
        'ACTIVE',
        v_eagle_score,
        v_rvol,
        v_volume_z,
        v_oi_change,
        v_detected_at,
        NOW(),
        NOW()
    );

    -- 2. Insert immutable snapshot
    INSERT INTO signal_snapshots (
        signal_id,
        price,
        mark_price,
        index_price,
        price_24h_change,
        turnover_24h_usd,
        rvol,
        volume_z_score,
        open_interest_usd,
        oi_change_pct,
        funding_rate,
        taker_flow,
        rsi,
        trend,
        spike_phase,
        positioning_state,
        market_breadth,
        btc_regime,
        captured_at
    ) VALUES (
        v_signal_id,
        (p_snapshot->>'price')::NUMERIC,
        COALESCE((p_snapshot->>'mark_price')::NUMERIC, (p_snapshot->>'price')::NUMERIC),
        COALESCE((p_snapshot->>'index_price')::NUMERIC, (p_snapshot->>'price')::NUMERIC),
        (p_snapshot->>'price_24h_change')::NUMERIC,
        (p_snapshot->>'turnover_24h_usd')::NUMERIC,
        (p_snapshot->>'rvol')::NUMERIC,
        (p_snapshot->>'volume_z_score')::NUMERIC,
        (p_snapshot->>'open_interest_usd')::NUMERIC,
        (p_snapshot->>'oi_change_pct')::NUMERIC,
        (p_snapshot->>'funding_rate')::NUMERIC,
        (p_snapshot->>'taker_flow')::NUMERIC,
        COALESCE((p_snapshot->>'rsi')::NUMERIC, 50.0),
        COALESCE(p_snapshot->>'trend', 'NEUTRAL'),
        COALESCE(p_snapshot->>'spike_phase', 'BREAKOUT'),
        COALESCE(p_snapshot->>'positioning_state', 'LEVERAGE_EXPANSION'),
        COALESCE((p_snapshot->>'market_breadth')::NUMERIC, 50.0),
        COALESCE(p_snapshot->>'btc_regime', 'NEUTRAL'),
        NOW()
    );

    -- 3. Insert initial signal extremes (MFE / MAE)
    INSERT INTO signal_extremes (
        signal_id,
        mfe_price,
        mfe_pct,
        mfe_timestamp,
        time_to_mfe_ms,
        mae_price,
        mae_pct,
        mae_timestamp,
        time_to_mae_ms,
        updated_at
    ) VALUES (
        v_signal_id,
        (p_extremes->>'mfe_price')::NUMERIC,
        (p_extremes->>'mfe_pct')::NUMERIC,
        (p_extremes->>'mfe_timestamp')::TIMESTAMPTZ,
        0,
        (p_extremes->>'mae_price')::NUMERIC,
        (p_extremes->>'mae_pct')::NUMERIC,
        (p_extremes->>'mae_timestamp')::TIMESTAMPTZ,
        0,
        NOW()
    );

    -- 4. Insert initial checkpoint slots if provided
    IF jsonb_array_length(p_checkpoints) > 0 THEN
        FOR v_cp IN SELECT * FROM jsonb_array_elements(p_checkpoints)
        LOOP
            INSERT INTO signal_checkpoints (
                signal_id,
                checkpoint_type,
                scheduled_at,
                is_available
            ) VALUES (
                v_signal_id,
                (v_cp->>'checkpoint_type')::checkpoint_interval,
                (v_cp->>'scheduled_at')::TIMESTAMPTZ,
                false
            ) ON CONFLICT (signal_id, checkpoint_type) DO NOTHING;
        END LOOP;
    END IF;

    -- 5. Insert into big_cap_signals if big_cap payload provided
    IF p_bigcap IS NOT NULL AND p_bigcap != 'null'::jsonb THEN
        INSERT INTO big_cap_signals (
            signal_id,
            symbol,
            direction,
            best_timeframe,
            entry_price,
            stop_loss_price,
            target_price_1,
            target_price_2,
            current_price,
            realized_pnl_pct,
            eagle_score,
            rvol,
            z_score,
            oi_delta_pct,
            session_tag,
            status,
            rationale_json,
            detected_at,
            updated_at
        ) VALUES (
            v_signal_id,
            p_bigcap->>'symbol',
            p_bigcap->>'direction',
            p_bigcap->>'best_timeframe',
            (p_bigcap->>'entry_price')::NUMERIC,
            (p_bigcap->>'stop_loss_price')::NUMERIC,
            (p_bigcap->>'target_price_1')::NUMERIC,
            (p_bigcap->>'target_price_2')::NUMERIC,
            (p_bigcap->>'current_price')::NUMERIC,
            0,
            (p_bigcap->>'eagle_score')::INT,
            (p_bigcap->>'rvol')::NUMERIC,
            (p_bigcap->>'z_score')::NUMERIC,
            (p_bigcap->>'oi_delta_pct')::NUMERIC,
            p_bigcap->>'session_tag',
            'ACTIVE',
            COALESCE(p_bigcap->'rationale_json', '[]'::jsonb),
            v_detected_at,
            NOW()
        );
    END IF;

    -- 6. Insert audit timeline event
    INSERT INTO signal_events (
        signal_id,
        event_type,
        price,
        details,
        timestamp
    ) VALUES (
        v_signal_id,
        'SIGNAL_DETECTED',
        v_entry_price,
        jsonb_build_object(
            'direction', v_direction,
            'eagle_score', v_eagle_score,
            'rvol', v_rvol,
            'strategy_version', v_strategy_version
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'signal_id', v_signal_id,
        'idempotency_key', v_idempotency_key,
        'status', 'ACTIVE'
    );
EXCEPTION 
    WHEN unique_violation THEN
        -- Safely handle duplicate signal_id or idempotency_key
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'DUPLICATE_SIGNAL',
            'signal_id', v_signal_id,
            'message', 'Signal already exists with this idempotency key'
        );
    WHEN OTHERS THEN
        -- Explicitly rollback transaction and return error
        RAISE EXCEPTION 'create_signal_atomic failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;
