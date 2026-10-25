#!/usr/bin/env node
// ================================================================
// confluence_hourly_worker.mjs
// Runs the 1H Confluence Strategy pipeline at :00:30 after each
// hourly candle close.
// ================================================================

import dotenv from 'dotenv';
dotenv.config();

import { ConfluencePipeline } from '../backend/services/confluence_pipeline.ts';
import { ConfluenceRepository } from '../backend/db/confluence_repo.ts';

const args = process.argv.slice(2);
const isOnce = args.includes('--once');
const isDryRun = args.includes('--dry-run');
const pipeline = ConfluencePipeline.getInstance();
const repo = ConfluenceRepository.getInstance();

// Clean up locks on process termination
function setupSignalHandlers() {
  const cleanup = () => {
    console.log('\n🛑 [ConfluenceWorker] Received shutdown signal, releasing locks...');
    repo.releaseLock();
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

// Calculates milliseconds until the next :00:30 (30 seconds after next UTC hour)
function getMsUntilNextHourClose() {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setUTCMinutes(0, 30, 0); // :00:30
  if (nextHour.getTime() <= now.getTime()) {
    nextHour.setUTCHours(nextHour.getUTCHours() + 1);
  }
  return nextHour.getTime() - now.getTime();
}

async function runCycle() {
  console.log(`\n⏰ [ConfluenceWorker] Initiating 1H Confluence Scan at ${new Date().toISOString()}...`);
  try {
    const summary = await pipeline.runHourlyScan({ dryRun: isDryRun });
    console.log(`✅ [ConfluenceWorker] Scan Complete:`, {
      runId: summary.runId,
      symbolsScanned: summary.symbolsScanned,
      signalsEmitted: summary.signalsEmitted,
      signalsGated: summary.signalsGated,
      btcChange1h: summary.btcChange1hPct !== null ? `${summary.btcChange1hPct.toFixed(2)}%` : 'N/A',
      status: summary.status,
    });
  } catch (err) {
    console.error('❌ [ConfluenceWorker] Scan failed:', err.message);
  }
}

async function main() {
  setupSignalHandlers();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🦅 EAGLE FLASH — 1H CONFLUENCE PIPELINE WORKER');
  console.log(`Mode: ${isOnce ? 'ONCE' : 'HOURLY DAEMON (:00:30 UTC)'}${isDryRun ? ' (DRY-RUN)' : ''}`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (isOnce) {
    await runCycle();
    process.exit(0);
  }

  // Initial immediate scan
  await runCycle();

  // Schedule loop for subsequent :00:30 runs
  while (true) {
    const waitMs = getMsUntilNextHourClose();
    const nextTarget = new Date(Date.now() + waitMs).toISOString();
    console.log(`⏳ [ConfluenceWorker] Next scan scheduled in ${(waitMs / 60000).toFixed(1)} minutes at ${nextTarget}...`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    await runCycle();
  }
}

main().catch((err) => {
  console.error('Fatal worker error:', err);
  repo.releaseLock();
  process.exit(1);
});
