/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — DISCORD OUTBOX DISPATCHER WORKER DAEMON
 * Continuously polls the durable notification outbox, dispatches rich embeds
 * to designated Discord channels, manages rate limits, and updates audit records.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { fetchPendingOutbox, updateOutboxItemStatus } from '../backend/services/notification-outbox.mjs';
import { DiscordNotificationService } from '../backend/services/discord/discord-notification-service.mjs';

const POLL_INTERVAL_MS = 2000;
let isRunning = true;
let isProcessing = false;

console.log('═════════════════════════════════════════════════════════════════');
console.log('🦅 EAGLE FLASH — DISCORD OUTBOX DISPATCHER DAEMON INITIALIZED');
console.log('═════════════════════════════════════════════════════════════════');

const client = DiscordNotificationService.getClient();
if (client.isConfigured()) {
  console.log('🔒 Discord bot token: [CONFIGURED IN ENVIRONMENT]');
  client.getBotUser().then(user => {
    if (user.connected) {
      console.log(`🤖 Logged into Discord API as: ${user.username}#${user.discriminator} (ID: ${user.id})`);
    } else {
      console.log(`⚠️ Discord connection status: ${user.error || 'Awaiting gateway handshake'}`);
    }
  }).catch(() => {});
} else {
  console.log('⚠️ DISCORD_BOT_TOKEN is not configured in .env. Worker will run in idle state.');
}

async function runDispatchCycle() {
  if (isProcessing || !isRunning) return;
  isProcessing = true;

  try {
    const pendingItems = await fetchPendingOutbox('DISCORD', 10);

    if (pendingItems && pendingItems.length > 0) {
      console.log(`📬 [DISCORD_OUTBOX] Found ${pendingItems.length} pending notification(s).`);

      for (const item of pendingItems) {
        if (!isRunning) break;

        // Transition: PENDING -> SENDING
        await updateOutboxItemStatus(item.id, 'DISCORD', 'SENDING');

        const result = await DiscordNotificationService.dispatchOutboxItem(item);

        if (result.success) {
          console.log(`✅ [DISCORD_SENT] Signal: ${item.signal_id} -> Message ID: ${result.messageId}`);
          await updateOutboxItemStatus(item.id, 'DISCORD', 'SENT', {
            externalMessageId: result.messageId,
          });
        } else {
          const attemptCount = (item.attempt_count || 0) + 1;
          console.warn(`⚠️ [DISCORD_DISPATCH_FAIL] Signal: ${item.signal_id} (Attempt ${attemptCount}/5): ${result.error}`);

          if (attemptCount >= 5) {
            await updateOutboxItemStatus(item.id, 'DISCORD', 'FAILED', {
              lastError: result.error,
            });
          } else {
            await updateOutboxItemStatus(item.id, 'DISCORD', 'RETRY', {
              attemptCount,
              lastError: result.error,
            });
          }

          // If rate limited, sleep before next iteration
          if (result.error === 'RATE_LIMITED' && result.retryAfterMs) {
            console.log(`⏳ [DISCORD_RATE_LIMIT] Sleeping worker for ${result.retryAfterMs}ms...`);
            await new Promise(r => setTimeout(r, result.retryAfterMs));
          }
        }

        // Polite throttle: 300ms between Discord dispatches
        await new Promise(r => setTimeout(r, 300));
      }
    }
  } catch (err) {
    console.error('❌ [DISCORD_WORKER_ERROR] Exception in dispatch cycle:', err.message);
  } finally {
    isProcessing = false;
  }
}

// Start continuous polling loop
const interval = setInterval(runDispatchCycle, POLL_INTERVAL_MS);

// Graceful termination
const shutdown = () => {
  console.log('\n🛑 Shutting down Discord Outbox Worker...');
  isRunning = false;
  clearInterval(interval);
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
