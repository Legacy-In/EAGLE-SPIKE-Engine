/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — HISTORICAL PERFORMANCE REBUILD TOOL
 * Evaluates all canonical signals, generates verified signal_outcomes,
 * aggregates daily, weekly, monthly statistics, and updates the local & DB stores.
 * 
 * Usage: node scripts/rebuild_performance.mjs
 * ═══════════════════════════════════════════════════════════════════════════
 */

import 'dotenv/config';
import { rebuildAllPerformanceMetrics } from '../backend/services/performance/performance-service.mjs';

async function main() {
  console.log('═════════════════════════════════════════════════════════════════');
  console.log('🦅 EAGLE FLASH — CANONICAL PERFORMANCE & WIN-RATE REBUILD');
  console.log('═════════════════════════════════════════════════════════════════');

  const startMs = Date.now();
  const res = await rebuildAllPerformanceMetrics();
  const elapsedMs = Date.now() - startMs;

  console.log('\n📊 Rebuild Summary:');
  console.log(`- Total Signals Processed: ${res.totalOutcomes}`);
  console.log(`- Daily Rollups Created:   ${res.dailyRollupsCount}`);
  console.log(`- Weekly Rollups Created:  ${res.weeklyRollupsCount}`);
  console.log(`- Execution Time:          ${elapsedMs}ms`);
  console.log('═════════════════════════════════════════════════════════════════');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Rebuild failed:', err);
  process.exit(1);
});
