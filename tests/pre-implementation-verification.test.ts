import { test } from 'node:test';
import assert from 'node:assert/strict';

// ============================================================================
// 1. HISTORICAL REJECTED MIGRATION LOGIC & TYPES
// ============================================================================
export interface HistoricalRecord {
  signal_id: string;
  symbol: string;
  status: string;
  detected_at: string;
  resolved_at?: string | null;
  rejection_reason?: string | null;
  entry_filled_at?: string | null;
  stop_hit_evidence?: boolean;
  mfe_pct?: number | null;
}

export interface MigratedRecord {
  signal_id: string;
  symbol: string;
  qualification_status: 'DISQUALIFIED' | 'QUALIFIED' | 'CANDIDATE' | 'WATCH';
  lifecycle_status: 'DETECTED' | 'ACTIVE' | 'STOP_HIT' | 'CLOSED' | 'EXPIRED';
  detected_at: string;
  resolved_at?: string | null;
  rejection_reason?: string | null;
  stop_hit_at?: string | null;
}

export function migrateHistoricalRejected(record: HistoricalRecord): MigratedRecord {
  const hasActivation = Boolean(record.entry_filled_at);
  const hasStopHit = Boolean(record.stop_hit_evidence);

  // RULE: Do not infer STOP_HIT solely from mfe_pct > 0.
  // Must require actual activation/entry evidence and/or actual stop-hit evidence.
  if (!hasActivation) {
    return {
      signal_id: record.signal_id,
      symbol: record.symbol,
      qualification_status: 'DISQUALIFIED',
      lifecycle_status: 'CLOSED',
      detected_at: record.detected_at,
      resolved_at: record.resolved_at || record.detected_at,
      rejection_reason: record.rejection_reason || 'Disqualified pre-activation',
    };
  }

  if (hasActivation && hasStopHit) {
    return {
      signal_id: record.signal_id,
      symbol: record.symbol,
      qualification_status: 'QUALIFIED',
      lifecycle_status: 'STOP_HIT',
      detected_at: record.detected_at,
      resolved_at: record.resolved_at || null,
      rejection_reason: record.rejection_reason || 'Stop hit confirmed post-activation',
      stop_hit_at: record.resolved_at || record.detected_at,
    };
  }

  // Active or closed according to other terminal state
  return {
    signal_id: record.signal_id,
    symbol: record.symbol,
    qualification_status: 'QUALIFIED',
    lifecycle_status: 'CLOSED',
    detected_at: record.detected_at,
    resolved_at: record.resolved_at || null,
    rejection_reason: record.rejection_reason || null,
  };
}

// ============================================================================
// 2. MILESTONE vs LIFECYCLE EVALUATOR
// ============================================================================
export type LifecycleState = 'DETECTED' | 'ACTIVE' | 'STOP_HIT' | 'CLOSED' | 'EXPIRED';

export interface MilestoneState {
  t1_hit_at: string | null;
  t2_hit_at: string | null;
  t3_hit_at: string | null;
  stop_hit_at: string | null;
}

export function evaluateMilestonesAndLifecycle(
  currentState: LifecycleState,
  milestones: MilestoneState,
  event: {
    type: 'T1' | 'T2' | 'T3' | 'STOP' | 'TIMEOUT';
    timestamp: string;
    autoCloseOnT3?: boolean;
  }
): { lifecycle_status: LifecycleState; milestones: MilestoneState } {
  const updatedMilestones = { ...milestones };

  if (event.type === 'T1' && !updatedMilestones.t1_hit_at) {
    updatedMilestones.t1_hit_at = event.timestamp;
    return { lifecycle_status: currentState, milestones: updatedMilestones };
  }

  if (event.type === 'T2' && !updatedMilestones.t2_hit_at) {
    updatedMilestones.t2_hit_at = event.timestamp;
    return { lifecycle_status: currentState, milestones: updatedMilestones };
  }

  if (event.type === 'T3' && !updatedMilestones.t3_hit_at) {
    updatedMilestones.t3_hit_at = event.timestamp;
    // T3 is a milestone. If autoCloseOnT3 is true -> settlements -> CLOSED. Otherwise remains ACTIVE.
    const nextLifecycle = event.autoCloseOnT3 ? 'CLOSED' : currentState;
    return { lifecycle_status: nextLifecycle, milestones: updatedMilestones };
  }

  if (event.type === 'STOP' && !updatedMilestones.stop_hit_at) {
    updatedMilestones.stop_hit_at = event.timestamp;
    return { lifecycle_status: 'STOP_HIT', milestones: updatedMilestones };
  }

  if (event.type === 'TIMEOUT') {
    return { lifecycle_status: 'EXPIRED', milestones: updatedMilestones };
  }

  return { lifecycle_status: currentState, milestones: updatedMilestones };
}

// ============================================================================
// 3. RESTORED TP/SL CHRONOLOGY RESOLUTION RULE
// ============================================================================
export interface Tick {
  price: number;
  timestamp: string;
}

export interface Kline {
  high: number;
  low: number;
  timestamp: string;
  closeTimestamp: string;
}

export function resolveTpSlChronology(params: {
  direction: 'LONG' | 'SHORT';
  tpPrice: number;
  slPrice: number;
  ticks?: Tick[];
  subCandles?: Kline[];
  parentCandle?: Kline;
}): { hit: 'TP' | 'SL' | 'NONE'; timestamp: string; method: 'TICK' | 'LOWER_TF' | 'CANDLE_FALLBACK' } {
  const { direction, tpPrice, slPrice, ticks, subCandles, parentCandle } = params;

  // RULE A: Trade/tick chronology available
  if (ticks && ticks.length > 0) {
    for (const t of ticks) {
      if (direction === 'LONG') {
        if (t.price >= tpPrice) return { hit: 'TP', timestamp: t.timestamp, method: 'TICK' };
        if (t.price <= slPrice) return { hit: 'SL', timestamp: t.timestamp, method: 'TICK' };
      } else {
        if (t.price <= tpPrice) return { hit: 'TP', timestamp: t.timestamp, method: 'TICK' };
        if (t.price >= slPrice) return { hit: 'SL', timestamp: t.timestamp, method: 'TICK' };
      }
    }
    return { hit: 'NONE', timestamp: '', method: 'TICK' };
  }

  // RULE B: Lower-timeframe sub-candles available
  if (subCandles && subCandles.length > 0) {
    for (const sc of subCandles) {
      const tpHit = direction === 'LONG' ? sc.high >= tpPrice : sc.low <= tpPrice;
      const slHit = direction === 'LONG' ? sc.low <= slPrice : sc.high >= slPrice;

      if (tpHit && !slHit) return { hit: 'TP', timestamp: sc.closeTimestamp, method: 'LOWER_TF' };
      if (slHit && !tpHit) return { hit: 'SL', timestamp: sc.closeTimestamp, method: 'LOWER_TF' };
      if (tpHit && slHit) {
        // Both hit in same lower timeframe candle -> Adverse selection fallback
        return { hit: 'SL', timestamp: sc.closeTimestamp, method: 'LOWER_TF' };
      }
    }
    return { hit: 'NONE', timestamp: '', method: 'LOWER_TF' };
  }

  // RULE C: Candle-only evidence
  if (parentCandle) {
    const tpHit = direction === 'LONG' ? parentCandle.high >= tpPrice : parentCandle.low <= tpPrice;
    const slHit = direction === 'LONG' ? parentCandle.low <= slPrice : parentCandle.high >= slPrice;

    if (tpHit && !slHit) return { hit: 'TP', timestamp: parentCandle.closeTimestamp, method: 'CANDLE_FALLBACK' };
    if (slHit && !tpHit) return { hit: 'SL', timestamp: parentCandle.closeTimestamp, method: 'CANDLE_FALLBACK' };
    if (tpHit && slHit) {
      // Deterministic STOP-FIRST adverse-selection fallback.
      // NEVER fabricate an exact target/stop timestamp from OHLC alone!
      return { hit: 'SL', timestamp: parentCandle.closeTimestamp, method: 'CANDLE_FALLBACK' };
    }
  }

  return { hit: 'NONE', timestamp: '', method: 'CANDLE_FALLBACK' };
}

// ============================================================================
// 4. RECORD COUNT PARITY VALIDATOR
// ============================================================================
export interface ParityDataset {
  database_total_count: number;
  api_unfiltered_count: number;
  frontend_unfiltered_count: number;
  api_filtered_count: number;
  frontend_filtered_count: number;
  api_paginated_total: number;
  database_matching_count: number;
  frontend_visible_rows_count: number;
}

export function verifyRecordCountParity(data: ParityDataset): {
  unfilteredValid: boolean;
  filteredValid: boolean;
  paginatedValid: boolean;
  visibleBounded: boolean;
  allValid: boolean;
} {
  const unfilteredValid = data.api_unfiltered_count === data.frontend_unfiltered_count;
  const filteredValid = data.api_filtered_count === data.frontend_filtered_count;
  const paginatedValid = data.api_paginated_total === data.database_matching_count;
  const visibleBounded = data.frontend_visible_rows_count <= data.api_paginated_total;

  return {
    unfilteredValid,
    filteredValid,
    paginatedValid,
    visibleBounded,
    allValid: unfilteredValid && filteredValid && paginatedValid && visibleBounded,
  };
}

// ============================================================================
// TESTS SUITE
// ============================================================================

test('CORRECTION 1: Historical REJECTED Migration preserves text & requires activation proof', () => {
  // Case A: Record with mfe_pct > 0 but NO activation evidence -> DISQUALIFIED, CLOSED
  const unactivatedWithMfe: HistoricalRecord = {
    signal_id: 'SIG-MIGRATION-001',
    symbol: 'DOGEUSDT',
    status: 'REJECTED',
    detected_at: '2026-09-20T10:00:00Z',
    rejection_reason: 'RVOL below threshold at confirmation tick',
    mfe_pct: 1.85, // mfe_pct > 0 must NOT cause STOP_HIT without entry evidence
    entry_filled_at: null,
  };

  const migratedA = migrateHistoricalRejected(unactivatedWithMfe);
  assert.equal(migratedA.qualification_status, 'DISQUALIFIED');
  assert.equal(migratedA.lifecycle_status, 'CLOSED');
  assert.equal(migratedA.rejection_reason, 'RVOL below threshold at confirmation tick');
  assert.equal(migratedA.detected_at, '2026-09-20T10:00:00Z');

  // Case B: Record WITH entry filled and adverse stop-hit evidence -> QUALIFIED, STOP_HIT
  const activatedStoppedOut: HistoricalRecord = {
    signal_id: 'EGL-20260921-BYBIT-AVAXUSDT-005',
    symbol: 'AVAXUSDT',
    status: 'REJECTED',
    detected_at: '2026-09-21T05:35:04Z',
    resolved_at: '2026-09-21T06:35:10Z',
    rejection_reason: 'Adverse excursion breached stop limit',
    entry_filled_at: '2026-09-21T05:35:10Z',
    stop_hit_evidence: true,
    mfe_pct: 2.46,
  };

  const migratedB = migrateHistoricalRejected(activatedStoppedOut);
  assert.equal(migratedB.qualification_status, 'QUALIFIED');
  assert.equal(migratedB.lifecycle_status, 'STOP_HIT');
  assert.equal(migratedB.rejection_reason, 'Adverse excursion breached stop limit');
  assert.equal(migratedB.detected_at, '2026-09-21T05:35:04Z');
  assert.equal(migratedB.stop_hit_at, '2026-09-21T06:35:10Z');
});

test('CORRECTION 2: T3 remains a milestone and lifecycle stays ACTIVE unless auto-close is defined', () => {
  const initialMilestones: MilestoneState = {
    t1_hit_at: null,
    t2_hit_at: null,
    t3_hit_at: null,
    stop_hit_at: null,
  };

  // 1. T1 reached -> lifecycle stays ACTIVE, milestone set
  const step1 = evaluateMilestonesAndLifecycle('ACTIVE', initialMilestones, {
    type: 'T1',
    timestamp: '2026-09-21T06:00:00Z',
  });
  assert.equal(step1.lifecycle_status, 'ACTIVE');
  assert.equal(step1.milestones.t1_hit_at, '2026-09-21T06:00:00Z');

  // 2. T3 reached WITHOUT autoCloseOnT3 -> lifecycle remains ACTIVE, t3_hit_at milestone set
  const step2 = evaluateMilestonesAndLifecycle(step1.lifecycle_status, step1.milestones, {
    type: 'T3',
    timestamp: '2026-09-21T07:00:00Z',
    autoCloseOnT3: false,
  });
  assert.equal(step2.lifecycle_status, 'ACTIVE', 'Lifecycle MUST remain ACTIVE after T3 milestone if autoClose=false');
  assert.equal(step2.milestones.t3_hit_at, '2026-09-21T07:00:00Z');

  // 3. T3 reached WITH autoCloseOnT3 -> transitions to CLOSED, not T3_HIT
  const step3 = evaluateMilestonesAndLifecycle('ACTIVE', initialMilestones, {
    type: 'T3',
    timestamp: '2026-09-21T07:00:00Z',
    autoCloseOnT3: true,
  });
  assert.equal(step3.lifecycle_status, 'CLOSED', 'Lifecycle becomes CLOSED upon auto-settlement, never T3_HIT');
  assert.equal(step3.milestones.t3_hit_at, '2026-09-21T07:00:00Z');
});

test('CORRECTION 3: Restored TP/SL Chronology Rule (Tick > Lower-TF > STOP-FIRST Fallback)', () => {
  const tp = 110;
  const sl = 90;

  // Subtest A: Tick level chronology available (TP breached at t=2 before SL at t=5)
  const ticksA: Tick[] = [
    { price: 100, timestamp: '10:00:01' },
    { price: 110.5, timestamp: '10:00:02' }, // TP hit
    { price: 89.0, timestamp: '10:00:05' },  // SL hit later
  ];
  const resA = resolveTpSlChronology({ direction: 'LONG', tpPrice: tp, slPrice: sl, ticks: ticksA });
  assert.equal(resA.hit, 'TP');
  assert.equal(resA.timestamp, '10:00:02');
  assert.equal(resA.method, 'TICK');

  // Subtest B: Lower timeframe sub-candles available (SL hit in candle 1, TP in candle 2)
  const subCandlesB: Kline[] = [
    { low: 88, high: 105, timestamp: '10:01:00', closeTimestamp: '10:01:59' }, // SL breached
    { low: 102, high: 112, timestamp: '10:02:00', closeTimestamp: '10:02:59' }, // TP breached
  ];
  const resB = resolveTpSlChronology({ direction: 'LONG', tpPrice: tp, slPrice: sl, subCandles: subCandlesB });
  assert.equal(resB.hit, 'SL');
  assert.equal(resB.timestamp, '10:01:59');
  assert.equal(resB.method, 'LOWER_TF');

  // Subtest C: Single candle-only evidence where both TP and SL are within high/low wick
  // MUST apply deterministic STOP-FIRST adverse-selection fallback and candle timestamp
  const parentCandleC: Kline = {
    low: 85,
    high: 115,
    timestamp: '10:00:00',
    closeTimestamp: '10:15:00',
  };
  const resC = resolveTpSlChronology({ direction: 'LONG', tpPrice: tp, slPrice: sl, parentCandle: parentCandleC });
  assert.equal(resC.hit, 'SL', 'Deterministic STOP-FIRST adverse-selection must be applied');
  assert.equal(resC.timestamp, '10:15:00', 'Must use candle close timestamp, never fabricate a sub-tick timestamp');
  assert.equal(resC.method, 'CANDLE_FALLBACK');
});

test('CORRECTION 4: Record-Count Parity (Unfiltered, Filtered, Paginated)', () => {
  // Scenario: DB has 100 total rows, 25 match filter 'exchange=BYBIT', page size is 10
  const dataset: ParityDataset = {
    database_total_count: 100,
    api_unfiltered_count: 100,
    frontend_unfiltered_count: 100, // DB/API canonical == frontend canonical
    api_filtered_count: 25,
    frontend_filtered_count: 25,     // DB/API filtered == frontend filtered
    api_paginated_total: 25,
    database_matching_count: 25,     // API total_count == database matching count
    frontend_visible_rows_count: 10, // Visible rows (10) <= total_count (25)
  };

  const parityResult = verifyRecordCountParity(dataset);
  assert.ok(parityResult.unfilteredValid, 'Unfiltered count parity must hold');
  assert.ok(parityResult.filteredValid, 'Filtered count parity must hold');
  assert.ok(parityResult.paginatedValid, 'Paginated matching count must match DB');
  assert.ok(parityResult.visibleBounded, 'Visible rows must be <= total matching count');
  assert.ok(parityResult.allValid, 'All parity rules must pass simultaneously');
});
