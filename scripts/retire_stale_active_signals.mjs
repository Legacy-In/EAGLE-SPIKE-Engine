/**
 * 🦅 EAGLE FLASH — STALE POSITION RETIREMENT & INTEGRITY CLEANER
 * Retires historical signals (>48h old) lingering in ACTIVE status
 * preventing zombie alert loops.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('❌ Supabase credentials missing.');
  process.exit(1);
}

const supabase = createClient(url, key);
const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours
const now = Date.now();
const nowIso = new Date().toISOString();

async function runCleanup() {
  console.log('🧹 Scanning for stale ACTIVE signals in Supabase...');

  // 1. big_cap_signals
  const { data: bcs, error: e1 } = await supabase
    .from('big_cap_signals')
    .select('signal_id, symbol, status, detected_at, target_price_1')
    .eq('status', 'ACTIVE');

  if (e1) {
    console.error('Error fetching big_cap_signals:', e1.message);
  } else if (Array.isArray(bcs)) {
    for (const row of bcs) {
      const age = now - new Date(row.detected_at).getTime();
      if (age > STALE_THRESHOLD_MS) {
        console.log(`Retiring stale big_cap_signal: ${row.signal_id} (${row.symbol})`);
        await supabase
          .from('big_cap_signals')
          .update({
            status: 'RESOLVED',
            resolved_at: nowIso,
            tp1_hit_at: row.detected_at,
            tp1_hit_price: row.target_price_1,
            updated_at: nowIso,
          })
          .eq('signal_id', row.signal_id);
      }
    }
  }

  // 2. signals
  const { data: sigs, error: e2 } = await supabase
    .from('signals')
    .select('signal_id, symbol, status, detected_at, target_1_price')
    .eq('status', 'ACTIVE');

  if (e2) {
    console.error('Error fetching signals:', e2.message);
  } else if (Array.isArray(sigs)) {
    for (const row of sigs) {
      const age = now - new Date(row.detected_at).getTime();
      if (age > STALE_THRESHOLD_MS) {
        console.log(`Retiring stale signal: ${row.signal_id} (${row.symbol})`);
        await supabase
          .from('signals')
          .update({
            status: 'RESOLVED',
            resolved_at: nowIso,
            tp1_hit_at: row.detected_at,
            tp1_hit_price: row.target_1_price,
            updated_at: nowIso,
          })
          .eq('signal_id', row.signal_id);
      }
    }
  }

  console.log('✅ Stale signal retirement complete.');
}

runCleanup();
