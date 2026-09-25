-- Migration 004: Telegram Signal Outbox & Notification Pipeline
-- Establishes a durable PostgreSQL outbox table and atomic transaction procedures
-- to guarantee that Telegram alerts are downstream of canonical signal creation.

-- 1. Create durable telegram_signal_outbox table
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

-- 2. Indexes for high-performance outbox polling and signal queries
CREATE INDEX IF NOT EXISTS idx_telegram_outbox_queue 
ON public.telegram_signal_outbox (status, scheduled_at) 
WHERE status IN ('PENDING', 'RETRY');

CREATE INDEX IF NOT EXISTS idx_telegram_outbox_signal_id 
ON public.telegram_signal_outbox (signal_id);

CREATE INDEX IF NOT EXISTS idx_telegram_outbox_created_at 
ON public.telegram_signal_outbox (created_at DESC);

-- 3. Update create_signal_atomic procedure to include telegram outbox atomically
CREATE OR REPLACE FUNCTION public.create_signal_atomic(
    p_signal JSONB,
    p_snapshot JSONB,
    p_extremes JSONB,
    p_checkpoints JSONB,
    p_bigcap JSONB DEFAULT NULL,
    p_telegram_outbox JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_signal_id TEXT;
    v_checkpoint JSONB;
BEGIN
    v_signal_id := p_signal->>'signal_id';

    -- 1. Insert into authoritative signals table
    INSERT INTO public.signals (
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
        eagle_score,
        rvol,
        volume_z_score,
        oi_change_pct,
        status,
        detected_at
    ) VALUES (
        v_signal_id,
        p_signal->>'idempotency_key',
        p_signal->>'exchange_id',
        p_signal->>'market_id',
        p_signal->>'symbol',
        p_signal->>'direction',
        p_signal->>'strategy_version',
        (p_signal->>'entry_price')::NUMERIC,
        (p_signal->>'target_1_price')::NUMERIC,
        (p_signal->>'target_2_price')::NUMERIC,
        (p_signal->>'target_3_price')::NUMERIC,
        (p_signal->>'stop_price')::NUMERIC,
        (p_signal->>'eagle_score')::NUMERIC,
        (p_signal->>'rvol')::NUMERIC,
        (p_signal->>'volume_z_score')::NUMERIC,
        (p_signal->>'oi_change_pct')::NUMERIC,
        COALESCE(p_signal->>'status', 'DETECTED'),
        COALESCE((p_signal->>'detected_at')::TIMESTAMPTZ, NOW())
    );

    -- 2. Insert into signal_snapshots
    IF p_snapshot IS NOT NULL THEN
        INSERT INTO public.signal_snapshots (
            signal_id,
            entry_price,
            high_24h,
            low_24h,
            turnover_24h,
            relative_volume,
            volume_z_score,
            open_interest_usd,
            funding_rate,
            taker_imbalance_pct,
            rsi,
            trend,
            spike_phase,
            positioning_state,
            market_breadth,
            btc_regime
        ) VALUES (
            v_signal_id,
            (p_snapshot->>'entry_price')::NUMERIC,
            (p_snapshot->>'high_24h')::NUMERIC,
            (p_snapshot->>'low_24h')::NUMERIC,
            (p_snapshot->>'turnover_24h')::NUMERIC,
            (p_snapshot->>'relative_volume')::NUMERIC,
            (p_snapshot->>'volume_z_score')::NUMERIC,
            (p_snapshot->>'open_interest_usd')::NUMERIC,
            (p_snapshot->>'funding_rate')::NUMERIC,
            (p_snapshot->>'taker_imbalance_pct')::NUMERIC,
            (p_snapshot->>'rsi')::NUMERIC,
            p_snapshot->>'trend',
            p_snapshot->>'spike_phase',
            p_snapshot->>'positioning_state',
            (p_snapshot->>'market_breadth')::NUMERIC,
            p_snapshot->>'btc_regime'
        );
    END IF;

    -- 3. Insert into signal_extremes
    IF p_extremes IS NOT NULL THEN
        INSERT INTO public.signal_extremes (
            signal_id,
            mfe_price,
            mfe_pct,
            mfe_timestamp,
            mae_price,
            mae_pct,
            mae_timestamp
        ) VALUES (
            v_signal_id,
            (p_extremes->>'mfe_price')::NUMERIC,
            (p_extremes->>'mfe_pct')::NUMERIC,
            (p_extremes->>'mfe_timestamp')::TIMESTAMPTZ,
            (p_extremes->>'mae_price')::NUMERIC,
            (p_extremes->>'mae_pct')::NUMERIC,
            (p_extremes->>'mae_timestamp')::TIMESTAMPTZ
        );
    END IF;

    -- 4. Insert into signal_checkpoints
    IF p_checkpoints IS NOT NULL AND jsonb_array_length(p_checkpoints) > 0 THEN
        FOR v_checkpoint IN SELECT * FROM jsonb_array_elements(p_checkpoints)
        LOOP
            INSERT INTO public.signal_checkpoints (
                signal_id,
                checkpoint_type,
                scheduled_at,
                is_available
            ) VALUES (
                v_signal_id,
                v_checkpoint->>'checkpoint_type',
                (v_checkpoint->>'scheduled_at')::TIMESTAMPTZ,
                FALSE
            );
        END LOOP;
    END IF;

    -- 5. Optional Big Cap desk table synchronization
    IF p_bigcap IS NOT NULL THEN
        INSERT INTO public.big_cap_signals (
            signal_id,
            symbol,
            direction,
            best_timeframe,
            entry_price,
            stop_loss_price,
            target_price_1,
            target_price_2,
            current_price,
            eagle_score,
            rvol,
            z_score,
            oi_delta_pct,
            session_tag,
            status,
            rationale_json,
            detected_at
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
            (p_bigcap->>'eagle_score')::NUMERIC,
            (p_bigcap->>'rvol')::NUMERIC,
            (p_bigcap->>'z_score')::NUMERIC,
            (p_bigcap->>'oi_delta_pct')::NUMERIC,
            p_bigcap->>'session_tag',
            COALESCE(p_bigcap->>'status', 'ACTIVE'),
            p_bigcap->'rationale_json',
            COALESCE((p_bigcap->>'detected_at')::TIMESTAMPTZ, NOW())
        );
    END IF;

    -- 6. Atomic Telegram Outbox Entry
    IF p_telegram_outbox IS NOT NULL THEN
        INSERT INTO public.telegram_signal_outbox (
            signal_id,
            event_type,
            payload,
            status,
            attempt_count,
            scheduled_at,
            chat_id,
            deduplication_key
        ) VALUES (
            v_signal_id,
            COALESCE(p_telegram_outbox->>'event_type', 'NEW_SIGNAL'),
            p_telegram_outbox->'payload',
            'PENDING',
            0,
            COALESCE((p_telegram_outbox->>'scheduled_at')::TIMESTAMPTZ, NOW()),
            p_telegram_outbox->>'chat_id',
            COALESCE(p_telegram_outbox->>'deduplication_key', 'OUTBOX-' || v_signal_id || '-NEW_SIGNAL')
        );
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'signal_id', v_signal_id,
        'message', 'Signal and Telegram outbox entry atomically created.'
    );
EXCEPTION
    WHEN OTHERS THEN
        -- PostgreSQL automatically rolls back the entire transaction upon unhandled exception
        RAISE;
END;
$$;
