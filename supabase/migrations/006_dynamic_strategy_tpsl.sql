-- ═══════════════════════════════════════════════════════════════════════════
-- 🦅 EAGLE FLASH — STRATEGY COMBINATION & DYNAMIC TP/SL SCHEMA MIGRATION
-- Production Migration v6.0
-- Adds strategy combination, risk unit R, entry quality, chase risk, and
-- milestone chronology tracking to signals and signal_snapshots tables.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Extend signals table
DO $$ BEGIN
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS primary_strategy VARCHAR(32) DEFAULT 'BREAKOUT';
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS secondary_strategies TEXT[] DEFAULT '{}';
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS strategy_combination TEXT[] DEFAULT '{"BREAKOUT"}';
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS risk_r NUMERIC(18, 8);
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS atr_value NUMERIC(18, 8);
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS atr_multiplier NUMERIC(6, 2) DEFAULT 1.5;
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS entry_quality VARCHAR(16) DEFAULT 'GOOD';
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS chase_risk VARCHAR(16) DEFAULT 'LOW';
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS tp1_hit_at TIMESTAMPTZ;
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS tp2_hit_at TIMESTAMPTZ;
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS tp3_hit_at TIMESTAMPTZ;
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS stop_hit_at TIMESTAMPTZ;
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS tp1_hit_price NUMERIC(18, 8);
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS tp2_hit_price NUMERIC(18, 8);
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS tp3_hit_price NUMERIC(18, 8);
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS stop_hit_price NUMERIC(18, 8);
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS tp_sl_version VARCHAR(16) DEFAULT 'v1.0';
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS hit_time_precision VARCHAR(16) DEFAULT 'TICK';
    ALTER TABLE signals ADD COLUMN IF NOT EXISTS resolution_observed_at TIMESTAMPTZ;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- 2. Extend signal_snapshots table
DO $$ BEGIN
    ALTER TABLE signal_snapshots ADD COLUMN IF NOT EXISTS primary_strategy VARCHAR(32);
    ALTER TABLE signal_snapshots ADD COLUMN IF NOT EXISTS secondary_strategies TEXT[] DEFAULT '{}';
    ALTER TABLE signal_snapshots ADD COLUMN IF NOT EXISTS strategy_combination TEXT[] DEFAULT '{}';
    ALTER TABLE signal_snapshots ADD COLUMN IF NOT EXISTS risk_r NUMERIC(18, 8);
    ALTER TABLE signal_snapshots ADD COLUMN IF NOT EXISTS atr_value NUMERIC(18, 8);
    ALTER TABLE signal_snapshots ADD COLUMN IF NOT EXISTS atr_multiplier NUMERIC(6, 2) DEFAULT 1.5;
    ALTER TABLE signal_snapshots ADD COLUMN IF NOT EXISTS entry_quality VARCHAR(16);
    ALTER TABLE signal_snapshots ADD COLUMN IF NOT EXISTS chase_risk VARCHAR(16);
    ALTER TABLE signal_snapshots ADD COLUMN IF NOT EXISTS tp_sl_version VARCHAR(16) DEFAULT 'v1.0';
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- 3. Extend big_cap_signals table if present
DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'big_cap_signals') THEN
        ALTER TABLE big_cap_signals ADD COLUMN IF NOT EXISTS primary_strategy VARCHAR(32);
        ALTER TABLE big_cap_signals ADD COLUMN IF NOT EXISTS secondary_strategies TEXT[] DEFAULT '{}';
        ALTER TABLE big_cap_signals ADD COLUMN IF NOT EXISTS strategy_combination TEXT[] DEFAULT '{}';
        ALTER TABLE big_cap_signals ADD COLUMN IF NOT EXISTS risk_r NUMERIC(18, 8);
        ALTER TABLE big_cap_signals ADD COLUMN IF NOT EXISTS target_price_3 NUMERIC(18, 8);
        ALTER TABLE big_cap_signals ADD COLUMN IF NOT EXISTS entry_quality VARCHAR(16);
        ALTER TABLE big_cap_signals ADD COLUMN IF NOT EXISTS chase_risk VARCHAR(16);
        ALTER TABLE big_cap_signals ADD COLUMN IF NOT EXISTS tp_sl_version VARCHAR(16) DEFAULT 'v1.0';
    END IF;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- 4. Update atomic signal creation function
CREATE OR REPLACE FUNCTION create_signal_atomic(
    p_signal JSONB,
    p_snapshot JSONB,
    p_extremes JSONB,
    p_checkpoints JSONB DEFAULT '[]'::jsonb,
    p_bigcap JSONB DEFAULT NULL,
    p_telegram_outbox JSONB DEFAULT NULL
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
    v_primary_strat VARCHAR(32);
    v_sec_strats TEXT[];
    v_strat_combo TEXT[];
    v_risk_r NUMERIC(18, 8);
    v_atr_val NUMERIC(18, 8);
    v_atr_mult NUMERIC(6, 2);
    v_entry_qual VARCHAR(16);
    v_chase_rsk VARCHAR(16);
    v_tpsl_ver VARCHAR(16);
    v_cp JSONB;
BEGIN
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

    v_primary_strat := COALESCE(p_signal->>'primary_strategy', 'BREAKOUT');
    v_risk_r := (p_signal->>'risk_r')::NUMERIC;
    v_atr_val := (p_signal->>'atr_value')::NUMERIC;
    v_atr_mult := COALESCE((p_signal->>'atr_multiplier')::NUMERIC, 1.5);
    v_entry_qual := COALESCE(p_signal->>'entry_quality', 'GOOD');
    v_chase_rsk := COALESCE(p_signal->>'chase_risk', 'LOW');
    v_tpsl_ver := COALESCE(p_signal->>'tp_sl_version', 'v1.0');

    -- Insert primary signal row
    INSERT INTO signals (
        signal_id, idempotency_key, exchange_id, market_id, symbol,
        direction, strategy_version, entry_price, target_1_price, target_2_price,
        target_3_price, stop_price, eagle_score, rvol, volume_z_score,
        oi_change_pct, detected_at, status,
        primary_strategy, risk_r, atr_value, atr_multiplier,
        entry_quality, chase_risk, tp_sl_version
    ) VALUES (
        v_signal_id, v_idempotency_key, v_exchange_id, v_market_id, v_symbol,
        v_direction, v_strategy_version, v_entry_price, v_target_1, v_target_2,
        v_target_3, v_stop_price, v_eagle_score, v_rvol, v_volume_z,
        v_oi_change, v_detected_at, 'ACTIVE',
        v_primary_strat, v_risk_r, v_atr_val, v_atr_mult,
        v_entry_qual, v_chase_rsk, v_tpsl_ver
    );

    -- Insert immutable snapshot
    INSERT INTO signal_snapshots (
        signal_id, price, mark_price, index_price, price_24h_change,
        turnover_24h_usd, rvol, volume_z_score, open_interest_usd, oi_change_pct,
        funding_rate, taker_flow, rsi, trend, spike_phase,
        positioning_state, market_breadth, btc_regime,
        primary_strategy, risk_r, atr_value, atr_multiplier,
        entry_quality, chase_risk, tp_sl_version
    ) VALUES (
        v_signal_id,
        (p_snapshot->>'price')::NUMERIC,
        (p_snapshot->>'mark_price')::NUMERIC,
        (p_snapshot->>'index_price')::NUMERIC,
        (p_snapshot->>'price_24h_change')::NUMERIC,
        (p_snapshot->>'turnover_24h_usd')::NUMERIC,
        (p_snapshot->>'rvol')::NUMERIC,
        (p_snapshot->>'volume_z_score')::NUMERIC,
        (p_snapshot->>'open_interest_usd')::NUMERIC,
        (p_snapshot->>'oi_change_pct')::NUMERIC,
        (p_snapshot->>'funding_rate')::NUMERIC,
        (p_snapshot->>'taker_flow')::NUMERIC,
        (p_snapshot->>'rsi')::NUMERIC,
        p_snapshot->>'trend',
        p_snapshot->>'spike_phase',
        p_snapshot->>'positioning_state',
        (p_snapshot->>'market_breadth')::NUMERIC,
        p_snapshot->>'btc_regime',
        v_primary_strat, v_risk_r, v_atr_val, v_atr_mult,
        v_entry_qual, v_chase_rsk, v_tpsl_ver
    );

    -- Insert extremes initial tracking
    INSERT INTO signal_extremes (
        signal_id, mfe_price, mfe_pct, mfe_timestamp,
        mae_price, mae_pct, mae_timestamp
    ) VALUES (
        v_signal_id, v_entry_price, 0.0, v_detected_at,
        v_entry_price, 0.0, v_detected_at
    );

    -- Insert checkpoints if provided
    IF p_checkpoints IS NOT NULL AND jsonb_array_length(p_checkpoints) > 0 THEN
        FOR v_cp IN SELECT * FROM jsonb_array_elements(p_checkpoints) LOOP
            INSERT INTO signal_checkpoints (
                signal_id, checkpoint_type, scheduled_at, is_available
            ) VALUES (
                v_signal_id,
                (v_cp->>'checkpoint_type')::checkpoint_interval,
                (v_cp->>'scheduled_at')::TIMESTAMPTZ,
                false
            );
        END LOOP;
    END IF;

    -- Insert big cap signal if provided
    IF p_bigcap IS NOT NULL THEN
        INSERT INTO big_cap_signals (
            signal_id, symbol, direction, best_timeframe, entry_price,
            stop_loss_price, target_price_1, target_price_2, current_price,
            eagle_score, rvol, z_score, oi_delta_pct, session_tag,
            status, rationale_json, detected_at,
            primary_strategy, risk_r, target_price_3, entry_quality, chase_risk, tp_sl_version
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
            (p_bigcap->>'eagle_score')::INT,
            (p_bigcap->>'rvol')::NUMERIC,
            (p_bigcap->>'z_score')::NUMERIC,
            (p_bigcap->>'oi_delta_pct')::NUMERIC,
            p_bigcap->>'session_tag',
            'ACTIVE',
            COALESCE(p_bigcap->'rationale_json', '[]'::jsonb),
            COALESCE((p_bigcap->>'detected_at')::TIMESTAMPTZ, v_detected_at),
            v_primary_strat, v_risk_r, v_target_3, v_entry_qual, v_chase_rsk, v_tpsl_ver
        );
    END IF;

    -- Insert telegram outbox if provided
    IF p_telegram_outbox IS NOT NULL THEN
        INSERT INTO telegram_signal_outbox (
            signal_id, event_type, payload, status, deduplication_key, chat_id
        ) VALUES (
            v_signal_id,
            COALESCE(p_telegram_outbox->>'event_type', 'NEW_SIGNAL'),
            COALESCE(p_telegram_outbox->'payload', '{}'::jsonb),
            'PENDING',
            COALESCE(p_telegram_outbox->>'deduplication_key', 'OUTBOX-' || v_signal_id || '-NEW_SIGNAL'),
            p_telegram_outbox->>'chat_id'
        ) ON CONFLICT (deduplication_key) DO NOTHING;
    END IF;

    RETURN jsonb_build_object('success', true, 'signal_id', v_signal_id);
END;
$$;
