-- Migration 008: Generalized Notification Outbox & Multi-Channel Atomic Dispatch
-- Unifies Telegram and Discord notification pipelines into a high-throughput,
-- durable, and idempotent outbox pattern anchored to canonical signals.

-- 1. Create durable generalized notification_outbox table
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

-- 2. Indexes for high-performance outbox polling and channel filtering
CREATE INDEX IF NOT EXISTS idx_notification_outbox_queue 
ON public.notification_outbox (channel_type, status, scheduled_at) 
WHERE status IN ('PENDING', 'RETRY');

CREATE INDEX IF NOT EXISTS idx_notification_outbox_signal_id 
ON public.notification_outbox (signal_id);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_created_at 
ON public.notification_outbox (created_at DESC);

-- 3. Procedure to atomically record signal and multi-channel notifications
CREATE OR REPLACE FUNCTION public.create_signal_atomic_v2(
    p_signal JSONB,
    p_snapshot JSONB,
    p_extremes JSONB,
    p_checkpoints JSONB,
    p_bigcap JSONB DEFAULT NULL,
    p_notifications JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_signal_id TEXT;
    v_checkpoint JSONB;
    v_notif JSONB;
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
            volume_24h,
            rvol,
            volume_z_score,
            open_interest,
            oi_change_pct,
            funding_rate,
            taker_flow,
            rsi,
            trend,
            spike_phase,
            positioning_state,
            market_breadth,
            btc_regime
        ) VALUES (
            v_signal_id,
            (p_snapshot->>'price')::NUMERIC,
            COALESCE((p_snapshot->>'high_24h')::NUMERIC, (p_snapshot->>'price')::NUMERIC),
            COALESCE((p_snapshot->>'low_24h')::NUMERIC, (p_snapshot->>'price')::NUMERIC),
            COALESCE((p_snapshot->>'turnover_24h_usd')::NUMERIC, 0),
            COALESCE((p_snapshot->>'rvol')::NUMERIC, 1.0),
            COALESCE((p_snapshot->>'volume_z_score')::NUMERIC, 0),
            COALESCE((p_snapshot->>'open_interest_usd')::NUMERIC, 0),
            COALESCE((p_snapshot->>'oi_change_pct')::NUMERIC, 0),
            COALESCE((p_snapshot->>'funding_rate')::NUMERIC, 0.0001),
            COALESCE((p_snapshot->>'taker_flow')::NUMERIC, 0),
            COALESCE((p_snapshot->>'rsi')::NUMERIC, 50.0),
            COALESCE(p_snapshot->>'trend', 'NEUTRAL'),
            COALESCE(p_snapshot->>'spike_phase', 'ACCELERATION'),
            COALESCE(p_snapshot->>'positioning_state', 'BREAKOUT'),
            COALESCE((p_snapshot->>'market_breadth')::NUMERIC, 50.0),
            COALESCE(p_snapshot->>'btc_regime', 'NEUTRAL')
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

    -- 5. Insert into big_cap_signals if applicable
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
            target_price_3,
            current_price,
            eagle_score,
            rvol,
            z_score,
            oi_delta_pct,
            session_tag,
            rationale_json,
            status,
            detected_at
        ) VALUES (
            v_signal_id,
            p_bigcap->>'symbol',
            p_bigcap->>'direction',
            COALESCE(p_bigcap->>'best_timeframe', '15m'),
            (p_bigcap->>'entry_price')::NUMERIC,
            (p_bigcap->>'stop_loss_price')::NUMERIC,
            (p_bigcap->>'target_price_1')::NUMERIC,
            (p_bigcap->>'target_price_2')::NUMERIC,
            (p_bigcap->>'target_price_3')::NUMERIC,
            (p_bigcap->>'current_price')::NUMERIC,
            (p_bigcap->>'eagle_score')::NUMERIC,
            (p_bigcap->>'rvol')::NUMERIC,
            (p_bigcap->>'z_score')::NUMERIC,
            (p_bigcap->>'oi_delta_pct')::NUMERIC,
            COALESCE(p_bigcap->>'session_tag', 'REGULAR'),
            COALESCE(p_bigcap->'rationale_json', '[]'::JSONB),
            'ACTIVE',
            NOW()
        );
    END IF;

    -- 6. Insert multi-channel notification outbox records
    IF p_notifications IS NOT NULL AND jsonb_array_length(p_notifications) > 0 THEN
        FOR v_notif IN SELECT * FROM jsonb_array_elements(p_notifications)
        LOOP
            INSERT INTO public.notification_outbox (
                signal_id,
                event_type,
                channel_type,
                channel_id,
                payload,
                status,
                deduplication_key
            ) VALUES (
                v_signal_id,
                COALESCE(v_notif->>'event_type', 'NEW_SIGNAL'),
                v_notif->>'channel_type',
                v_notif->>'channel_id',
                v_notif->'payload',
                'PENDING',
                v_notif->>'deduplication_key'
            )
            ON CONFLICT (deduplication_key) DO NOTHING;

            -- Also mirror to legacy telegram_signal_outbox if Telegram
            IF (v_notif->>'channel_type') = 'TELEGRAM' THEN
                BEGIN
                    INSERT INTO public.telegram_signal_outbox (
                        signal_id,
                        event_type,
                        payload,
                        status,
                        chat_id,
                        deduplication_key
                    ) VALUES (
                        v_signal_id,
                        COALESCE(v_notif->>'event_type', 'NEW_SIGNAL'),
                        v_notif->'payload',
                        'PENDING',
                        v_notif->>'channel_id',
                        v_notif->>'deduplication_key'
                    )
                    ON CONFLICT (deduplication_key) DO NOTHING;
                EXCEPTION WHEN OTHERS THEN
                    -- Ignore legacy table failures
                END;
            END IF;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'signal_id', v_signal_id,
        'created_at', NOW()
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', FALSE,
        'error', SQLERRM,
        'sqlstate', SQLSTATE
    );
END;
$$;
