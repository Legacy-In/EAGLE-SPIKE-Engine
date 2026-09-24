import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yyswmlsrvrqwhztbktlm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPipeline() {
  console.log('--- 1. Querying raw signals table structure & top 20 rows ---');
  const { data: sampleRow, error: sampleErr } = await supabase
    .from('signals')
    .select('*')
    .limit(1);

  if (sampleErr) {
    console.error('Error querying signals:', sampleErr);
  } else if (sampleRow && sampleRow.length > 0) {
    console.log('Available columns in signals table:', Object.keys(sampleRow[0]));
  } else {
    console.log('Signals table is currently empty.');
  }

  console.log('\n--- 2. Attempting user query: SELECT signal_id, detected_at, ... ---');
  const { data: userQueryData, error: userQueryErr } = await supabase
    .from('signals')
    .select('signal_id, detected_at, last_checkpoint_at, checkpoint_4h_done, checkpoint_8h_done, checkpoint_1d_done')
    .order('detected_at', { ascending: false })
    .limit(20);

  if (userQueryErr) {
    console.log('User query error (expected if schema uses separate columns/tables):', userQueryErr.message);
  } else {
    console.log('User query result count:', userQueryData?.length);
    console.table(userQueryData);
  }

  console.log('\n--- 3. Querying signals with signal_checkpoints and signal_extremes joined ---');
  const { data: joinedData, error: joinedErr } = await supabase
    .from('signals')
    .select('signal_id, symbol, direction, entry_price, status, detected_at, signal_checkpoints(*), signal_extremes(*)')
    .order('detected_at', { ascending: false })
    .limit(20);

  if (joinedErr) {
    console.log('Joined query error:', joinedErr.message);
  } else {
    console.log(`Found ${joinedData?.length || 0} signals in DB:`);
    joinedData?.forEach((s, idx) => {
      console.log(`[${idx+1}] ${s.signal_id} (${s.symbol} ${s.direction} @ $${s.entry_price}) - Detected: ${s.detected_at}, Status: ${s.status}`);
      console.log('    Checkpoints:', JSON.stringify(s.signal_checkpoints));
      console.log('    Extremes:', JSON.stringify(s.signal_extremes));
    });
  }

  // Also query oldest 3 signals
  const { data: oldestSignals, error: oldestErr } = await supabase
    .from('signals')
    .select('signal_id, symbol, direction, detected_at, status, signal_checkpoints(*)')
    .order('detected_at', { ascending: true })
    .limit(3);

  console.log('\n--- 4. Oldest 3 signals in Supabase ---');
  console.log(JSON.stringify(oldestSignals, null, 2));

  // Check if signal_checkpoints has any data at all
  const { data: allCp, error: cpErr } = await supabase
    .from('signal_checkpoints')
    .select('*')
    .limit(10);
  console.log('\n--- 5. Sample rows in signal_checkpoints table ---');
  console.log(JSON.stringify(allCp, null, 2));

  // Check if signal_events has any data
  const { data: allEv, error: evErr } = await supabase
    .from('signal_events')
    .select('*')
    .limit(10);
  console.log('\n--- 6. Sample rows in signal_events table ---');
  console.log(JSON.stringify(allEv, null, 2));
}

checkPipeline().catch(console.error);
