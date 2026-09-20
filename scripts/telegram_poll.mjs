/**
 * 🦅 EAGLE FLASH — Telegram Development Polling Runner
 * Runs Telegram long polling (getUpdates) for local development when HTTPS webhook is not available.
 * Usage: node scripts/telegram_poll.mjs
 */

import fs from 'fs';
import path from 'path';

// 1. Read token from .env or apps/web/.env.local
let token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  const envPaths = ['.env', 'apps/web/.env.local'];
  for (const ep of envPaths) {
    if (fs.existsSync(ep)) {
      const content = fs.readFileSync(ep, 'utf-8');
      const match = content.match(/TELEGRAM_BOT_TOKEN=([^\r\n]+)/);
      if (match && match[1] && !match[1].includes('your_telegram_bot_token')) {
        token = match[1].trim();
        break;
      }
    }
  }
}

if (!token) {
  console.log('ℹ️  TELEGRAM_BOT_TOKEN not configured in environment or .env.');
  console.log('   To start the Telegram polling agent:');
  console.log('   1. Get your bot token from @BotFather for @eaglespike_bot');
  console.log('   2. Set TELEGRAM_BOT_TOKEN=<YOUR_TOKEN> in .env or apps/web/.env.local');
  console.log('   3. Run: node scripts/telegram_poll.mjs\n');
  process.exit(0);
}

console.log('🦅 Starting Eagle Flash Telegram Bot Polling Service (@eaglespike_bot)...');

async function main() {
  // Clear any existing webhook to enable getUpdates
  try {
    const delRes = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
    const delJson = await delRes.json();
    console.log('✅ Webhook status reset:', delJson.description || 'OK');
  } catch (e) {
    console.warn('⚠️ Webhook clear warning:', e.message);
  }

  let offset = 0;
  console.log('🟢 Polling active. Listening for commands (/start, /status, /btc, /spikes, /top, /health)...');

  while (true) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=25`);
      if (!res.ok) {
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      const json = await res.json();
      if (json.ok && Array.isArray(json.result)) {
        for (const update of json.result) {
          offset = update.update_id + 1;
          // Forward update to local Next.js webhook endpoint
          try {
            await fetch('http://localhost:3000/api/telegram/webhook', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(update),
            });
          } catch (err) {
            console.error('Failed to forward update to local server:', err.message);
          }
        }
      }
    } catch (err) {
      console.error('Polling error:', err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

main().catch(console.error);
