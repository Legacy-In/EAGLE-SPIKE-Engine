/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — INSTITUTIONAL PERFORMANCE & WIN-RATE WORKER DAEMON
 * 
 * Responsibilities:
 * 1. Maintains live pinned embed in #🏆-winning-rate (refreshed continuously)
 * 2. Automated Daily Quantitative Report at 00:05 Asia/Dhaka in #📅-daily-performance
 * 3. Automated Weekly Institutional Audit on Monday 00:05 Asia/Dhaka in #📊-weekly-performance
 * 4. Zero estimation, strict canonical PostgreSQL ledger reproducibility
 * ═══════════════════════════════════════════════════════════════════════════
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { DiscordClient } from '../backend/services/discord/discord-client.mjs';
import {
  getWinningRateChannel,
  getDailyPerformanceChannel,
  getWeeklyPerformanceChannel,
} from '../backend/services/discord/discord-router.mjs';
import {
  buildLiveWinRateEmbed,
  buildDailyPerformanceEmbed,
  buildWeeklyPerformanceEmbed,
} from '../backend/services/discord/discord-message-builder.mjs';
import {
  getAllTimePerformance,
  getPreviousWeekPerformance,
  aggregateOutcomes,
  getAllCanonicalOutcomes,
  getDhakaDayBounds,
  getDhakaWeekBounds,
  getWinningSignals,
  getLosingSignals,
  supabase,
} from '../backend/services/performance/performance-service.mjs';

const STATE_FILE = path.resolve(process.cwd(), 'data', 'performance_worker_state.json');
const discordClient = new DiscordClient();

function loadWorkerState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch {}
  return {
    pinnedMessageId: null,
    lastDailyReportDate: null,
    lastWeeklyReportWeek: null,
  };
}

function saveWorkerState(state) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[PERF_WORKER] Warning: Failed to save worker state:', err.message);
  }
}

/**
 * 1. Maintain Live Pinned Message in #🏆-winning-rate
 */
export async function updateLiveWinningRatePinnedMessage(workerState) {
  if (process.env.NODE_ENV === 'test') return;
  const channelId = getWinningRateChannel();
  if (!channelId || !discordClient.isConfigured()) return;

  try {
    const stats = await getAllTimePerformance();
    const embedPayload = buildLiveWinRateEmbed(stats);

    if (workerState.pinnedMessageId) {
      const editResult = await discordClient.editMessage(channelId, workerState.pinnedMessageId, embedPayload);
      if (editResult.success) {
        console.log(`[PERF_WORKER] Successfully updated live win-rate message (${workerState.pinnedMessageId}) in #${channelId}`);
        return;
      }
      console.log(`[PERF_WORKER] Existing pinned message failed to edit, recreating...`);
    }

    // Send new message & pin it
    const sendResult = await discordClient.sendMessage(channelId, embedPayload);
    if (sendResult.success && sendResult.messageId) {
      workerState.pinnedMessageId = sendResult.messageId;
      saveWorkerState(workerState);
      await discordClient.pinMessage(channelId, sendResult.messageId);
      console.log(`[PERF_WORKER] Dispatched & pinned new live win-rate message (${sendResult.messageId}) in #${channelId}`);
    }
  } catch (err) {
    console.error('[PERF_WORKER] Error updating live win-rate embed:', err.message);
  }
}

/**
 * 2. Automated Daily Report at 00:05 Asia/Dhaka for Yesterday's Signals
 */
export async function checkAndSendDailyReport(workerState) {
  if (process.env.NODE_ENV === 'test') return;
  const channelId = getDailyPerformanceChannel();
  if (!channelId || !discordClient.isConfigured()) return;

  // Determine current Dhaka time
  const now = new Date();
  const dhakaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  const dhakaHour = dhakaNow.getHours();
  const dhakaMinute = dhakaNow.getMinutes();

  // Daily report window: 00:05 to 23:59 (targets yesterday)
  // For automated cron, we trigger once per completed day
  const yesterday = new Date(dhakaNow);
  yesterday.setDate(dhakaNow.getDate() - 1);
  const { dateStr: yesterdayStr, startUtc, endUtc } = getDhakaDayBounds(yesterday);

  if (workerState.lastDailyReportDate === yesterdayStr) {
    return; // Already executed for yesterday
  }

  // Idempotency check in Supabase if available
  if (supabase) {
    const { data: existingRun } = await supabase
      .from('performance_report_runs')
      .select('id')
      .eq('report_type', 'DAILY')
      .eq('period_start', startUtc.toISOString())
      .maybeSingle();

    if (existingRun) {
      workerState.lastDailyReportDate = yesterdayStr;
      saveWorkerState(workerState);
      return;
    }
  }

  console.log(`[PERF_WORKER] Generating daily performance report for ${yesterdayStr} (Dhaka time)...`);
  const allOutcomes = await getAllCanonicalOutcomes();
  const dayOutcomes = allOutcomes.filter(o => {
    const t = new Date(o.detected_at).getTime();
    return t >= startUtc.getTime() && t <= endUtc.getTime();
  });

  const stats = aggregateOutcomes(dayOutcomes, { date: yesterdayStr, timezone: 'Asia/Dhaka' });
  const topWinners = dayOutcomes.filter(o => o.primary_outcome === 'WIN').sort((a, b) => (b.realized_r || 0) - (a.realized_r || 0)).slice(0, 5);
  const topLosers = dayOutcomes.filter(o => o.primary_outcome === 'LOSS').sort((a, b) => (a.realized_r || 0) - (b.realized_r || 0)).slice(0, 5);

  const embedPayload = buildDailyPerformanceEmbed(stats, topWinners, topLosers);
  const sendRes = await discordClient.sendMessage(channelId, embedPayload);

  if (sendRes.success) {
    console.log(`[PERF_WORKER] Successfully sent daily performance report to #${channelId}`);
    workerState.lastDailyReportDate = yesterdayStr;
    saveWorkerState(workerState);

    // Record run in Supabase
    if (supabase) {
      try {
        await supabase.from('performance_report_runs').insert({
          report_type: 'DAILY',
          period_start: startUtc.toISOString(),
          period_end: endUtc.toISOString(),
          timezone: 'Asia/Dhaka',
          metrics_snapshot: stats,
        });
      } catch (err) {
        console.warn('[PERF_WORKER] Run log notice:', err.message);
      }
    }
  }
}

/**
 * 3. Automated Weekly Institutional Audit on Monday at 00:05 Asia/Dhaka
 */
export async function checkAndSendWeeklyReport(workerState) {
  if (process.env.NODE_ENV === 'test') return;
  const channelId = getWeeklyPerformanceChannel();
  if (!channelId || !discordClient.isConfigured()) return;

  const now = new Date();
  const dhakaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  const dayOfWeek = dhakaNow.getDay(); // 1 is Monday

  // Only trigger on Monday (or when previous week's audit has not run yet)
  const lastWeekDate = new Date(dhakaNow.getTime() - 7 * 24 * 3600 * 1000);
  const { mondayStr, sundayStr, startUtc, endUtc } = getDhakaWeekBounds(lastWeekDate);
  const weekKey = `${mondayStr}_${sundayStr}`;

  if (workerState.lastWeeklyReportWeek === weekKey) {
    return; // Already audited
  }

  // Idempotency check in Supabase
  if (supabase) {
    const { data: existingRun } = await supabase
      .from('performance_report_runs')
      .select('id')
      .eq('report_type', 'WEEKLY')
      .eq('period_start', startUtc.toISOString())
      .maybeSingle();

    if (existingRun) {
      workerState.lastWeeklyReportWeek = weekKey;
      saveWorkerState(workerState);
      return;
    }
  }

  console.log(`[PERF_WORKER] Generating weekly performance audit for ${weekKey}...`);
  const allOutcomes = await getAllCanonicalOutcomes();
  const weekOutcomes = allOutcomes.filter(o => {
    const t = new Date(o.detected_at).getTime();
    return t >= startUtc.getTime() && t <= endUtc.getTime();
  });

  const stats = aggregateOutcomes(weekOutcomes, {
    weekStart: mondayStr,
    weekEnd: sundayStr,
    timezone: 'Asia/Dhaka',
  });
  const topWinners = weekOutcomes.filter(o => o.primary_outcome === 'WIN').sort((a, b) => (b.realized_r || 0) - (a.realized_r || 0)).slice(0, 5);
  const topLosers = weekOutcomes.filter(o => o.primary_outcome === 'LOSS').sort((a, b) => (a.realized_r || 0) - (b.realized_r || 0)).slice(0, 5);

  const embedPayload = buildWeeklyPerformanceEmbed(stats, topWinners, topLosers);
  const sendRes = await discordClient.sendMessage(channelId, embedPayload);

  if (sendRes.success) {
    console.log(`[PERF_WORKER] Successfully sent weekly performance audit to #${channelId}`);
    workerState.lastWeeklyReportWeek = weekKey;
    saveWorkerState(workerState);

    if (supabase) {
      try {
        await supabase.from('performance_report_runs').insert({
          report_type: 'WEEKLY',
          period_start: startUtc.toISOString(),
          period_end: endUtc.toISOString(),
          timezone: 'Asia/Dhaka',
          metrics_snapshot: stats,
        });
      } catch (err) {
        console.warn('[PERF_WORKER] Run log notice:', err.message);
      }
    }
  }
}

/**
 * Main Loop
 */
export async function runPerformanceWorker() {
  console.log('═════════════════════════════════════════════════════════════════');
  console.log('🦅 EAGLE FLASH — PERFORMANCE & WIN-RATE WORKER DAEMON STARTED');
  console.log(`Timezone: Asia/Dhaka (UTC+6)`);
  console.log(`Channel #winning-rate: ${getWinningRateChannel() || 'Not configured'}`);
  console.log(`Channel #daily-performance: ${getDailyPerformanceChannel() || 'Not configured'}`);
  console.log(`Channel #weekly-performance: ${getWeeklyPerformanceChannel() || 'Not configured'}`);
  console.log('═════════════════════════════════════════════════════════════════\n');

  const workerState = loadWorkerState();

  // Initial execution
  await updateLiveWinningRatePinnedMessage(workerState);
  await checkAndSendDailyReport(workerState);
  await checkAndSendWeeklyReport(workerState);

  // Periodic polling every 60 seconds
  setInterval(async () => {
    try {
      await updateLiveWinningRatePinnedMessage(workerState);
      await checkAndSendDailyReport(workerState);
      await checkAndSendWeeklyReport(workerState);
    } catch (err) {
      console.error('[PERF_WORKER] Periodic cycle error:', err.message);
    }
  }, 60000);
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('performance_worker.mjs')) {
  runPerformanceWorker().catch(err => {
    console.error('Fatal Performance Worker crash:', err);
    process.exit(1);
  });
}
