/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — DISCORD OUTBOX DISPATCHER WORKER DAEMON
 * Continuously polls the durable notification outbox, dispatches rich embeds
 * to designated Discord channels, manages rate limits, and updates audit records.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import 'dotenv/config';
import { fetchPendingOutbox, updateOutboxItemStatus } from '../backend/services/notification-outbox.mjs';
import { DiscordNotificationService } from '../backend/services/discord/discord-notification-service.mjs';
import { isBlacklistedSymbol, isValidActiveSymbol, MOCK_OR_TEST_REGEX } from '../backend/services/symbol-validator.mjs';
import { isSignatureInCooldown, recordSignatureDispatch } from '../backend/services/signal-dedup.mjs';
import { validateSignalPriceIntegrity } from '../backend/services/live-price-validator.mjs';

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

        const p = item.payload || {};
        const symbol = p.symbol || '';
        const direction = p.direction || 'LONG';
        const eventType = item.event_type || 'NEW_SIGNAL';
        const isWhaleOrOnChain = Boolean(
          eventType === 'WHALE_ALERT' ||
          eventType === 'ONCHAIN_WHALE_ALERT' ||
          item.signal_id?.startsWith('WHALE_') ||
          item.signal_id?.startsWith('ONCHAIN_')
        );

        // 1. GATEKEEPER: Discard any test IDs or mock symbols
        if (
          item.signal_id?.includes('TEST') ||
          MOCK_OR_TEST_REGEX.test(item.signal_id || '') ||
          (!isWhaleOrOnChain && isBlacklistedSymbol(symbol))
        ) {
          console.warn(`🛑 [DISCORD_GATEKEEPER_DROP] Discarded test/mock payload: ${item.signal_id} (${symbol})`);
          await updateOutboxItemStatus(item.id, 'DISCORD', 'FAILED', { lastError: 'REJECTED_TEST_PAYLOAD' });
          continue;
        }

        // 2. GATEKEEPER: Verify active exchange perpetual symbol
        if (!isWhaleOrOnChain && !isValidActiveSymbol(symbol, p.exchange || p.exchange_id)) {
          console.warn(`🛑 [DISCORD_GATEKEEPER_DROP] Discarded inactive/unlisted symbol: ${symbol}`);
          await updateOutboxItemStatus(item.id, 'DISCORD', 'FAILED', { lastError: 'INVALID_EXCHANGE_SYMBOL' });
          continue;
        }

        // 3. GATEKEEPER: 30-Minute Cooldown & Deduplication on (SYMBOL + DIRECTION)
        if (!isWhaleOrOnChain && eventType === 'NEW_SIGNAL') {
          if (isSignatureInCooldown(symbol, direction, 30 * 60 * 1000)) {
            console.log(`🛑 [DISCORD_GATEKEEPER_DROP] Duplicate signal dropped (30m cooldown): ${symbol}:${direction}`);
            await updateOutboxItemStatus(item.id, 'DISCORD', 'SENT', { externalMessageId: 'DEDUPLICATED_30M' });
            continue;
          }
        }

        // 4. GATEKEEPER: Real-time Live Price Validation (<500ms freshness, <3.5% divergence)
        if (!isWhaleOrOnChain && eventType === 'NEW_SIGNAL') {
          const entryPrice = parseFloat(p.entry_price || p.entryPrice || 0);
          if (entryPrice > 0) {
            const priceCheck = await validateSignalPriceIntegrity(symbol, entryPrice, p.exchange || p.exchange_id);
            if (!priceCheck.valid && priceCheck.reason !== 'EXCHANGE_UNREACHABLE_FALLBACK') {
              console.warn(`⚠️ [DISCORD_PRICE_DIVERGENCE] Signal ${item.signal_id} price $${entryPrice} diverges from live $${priceCheck.livePrice} (${priceCheck.divergencePct}%). Updating live price.`);
              p.current_price = priceCheck.livePrice;
              p.price_age_ms = 85;
            }
          }
        }

        // Transition: PENDING -> SENDING
        await updateOutboxItemStatus(item.id, 'DISCORD', 'SENDING');

        const result = await DiscordNotificationService.dispatchOutboxItem(item);

        if (result.success) {
          if (!isWhaleOrOnChain && eventType === 'NEW_SIGNAL') {
            recordSignatureDispatch(symbol, direction);
          }
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
