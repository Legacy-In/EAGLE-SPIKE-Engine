/**
 * 🦅 EAGLE FLASH — Dedicated Telegram Notification Outbox Worker (@eaglespike_bot)
 * Continuously polls the durable outbox for pending signal notifications,
 * securely locks records, dispatches canonical alerts via the Telegram Bot API,
 * and manages exponential backoff retries without blocking signal creation.
 *
 * Usage: node scripts/telegram_worker.mjs
 */

import fs from 'fs';
import path from 'path';
import {
  fetchPendingOutbox,
  lockOutboxRecord,
  markOutboxSent,
  markOutboxFailure,
  formatEagleFlashTelegramAlert,
  OutboxTelemetry,
} from '../backend/services/telegram-outbox.mjs';

// 1. Read token & default chat ID
let token = process.env.TELEGRAM_BOT_TOKEN;
let defaultChatId = process.env.TELEGRAM_CHAT_ID;

const envPaths = ['.env', 'apps/web/.env.local'];
for (const ep of envPaths) {
  if (fs.existsSync(ep)) {
    const content = fs.readFileSync(ep, 'utf-8');
    if (!token) {
      const match = content.match(/TELEGRAM_BOT_TOKEN=([^\r\n]+)/);
      if (match && match[1] && !match[1].includes('your_telegram_bot_token')) {
        token = match[1].trim();
      }
    }
    if (!defaultChatId) {
      const match = content.match(/TELEGRAM_CHAT_ID=([^\r\n]+)/);
      if (match && match[1] && !match[1].includes('your_chat_id')) {
        defaultChatId = match[1].trim();
      }
    }
  }
}

const POLL_INTERVAL_MS = parseInt(process.env.TELEGRAM_POLL_INTERVAL_MS || '1000', 10);
let isProcessing = false;

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🦅 EAGLE FLASH — TELEGRAM OUTBOX NOTIFICATION WORKER (@eaglespike_bot)');
console.log('═══════════════════════════════════════════════════════════════════');
console.log(`Bot Token: ${token ? 'CONFIGURED (' + token.slice(0, 10) + '...)' : 'MISSING'}`);
console.log(`Default Chat ID: ${defaultChatId || 'NOT_CONFIGURED'}`);
console.log(`Poll Interval: ${POLL_INTERVAL_MS}ms`);

export async function sendTelegramMessage(chatId, text) {
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }
  if (!chatId) {
    throw new Error('Telegram Chat ID is not configured');
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(8000),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    throw new Error(json.description || `HTTP ${res.status}: ${res.statusText}`);
  }
  return json.result;
}

export async function processOutboxBatch() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const pendingItems = await fetchPendingOutbox(5);
    if (!pendingItems || pendingItems.length === 0) return;

    for (const item of pendingItems) {
      const targetChatId = item.chat_id || defaultChatId;
      const attemptCount = (item.attempt_count || 0) + 1;

      // Lock record
      await lockOutboxRecord(item.id);

      try {
        const messageText = formatEagleFlashTelegramAlert(item);
        const result = await sendTelegramMessage(targetChatId, messageText);
        await markOutboxSent(item.id, result.message_id);
        console.log(`📢 [TELEGRAM_ALERT_SENT] Signal: ${item.signal_id} -> Chat: ${targetChatId} (Msg ID: ${result.message_id})`);
      } catch (err) {
        console.warn(`⚠️ [TELEGRAM_ALERT_FAILURE] Signal: ${item.signal_id} (Attempt ${attemptCount}/5): ${err.message}`);
        await markOutboxFailure(item.id, err.message, attemptCount);
      }
    }
  } catch (err) {
    console.error('Outbox cycle error:', err?.message);
  } finally {
    isProcessing = false;
  }
}

// Start worker loop if run directly
if (process.argv[1] && (import.meta.url.includes(path.basename(process.argv[1])) || process.argv[1].includes('telegram_worker'))) {
  console.log('🟢 Autonomous Telegram outbox worker active.');
  setInterval(processOutboxBatch, POLL_INTERVAL_MS);
}
