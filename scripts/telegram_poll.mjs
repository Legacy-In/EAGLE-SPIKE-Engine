/**
 * 🦅 EAGLE FLASH — Telegram Polling & Command Runner (@eaglespike_bot)
 * Runs Telegram long polling (getUpdates) for local development & production servers.
 * Forward incoming updates to Next.js webhook endpoint at http://localhost:3000/api/telegram/webhook.
 * Automatically discovers channels when the bot is added as an administrator.
 *
 * Usage: node scripts/telegram_poll.mjs
 */

import fs from 'fs';
import path from 'path';

// 1. Read token & chat ID from .env or apps/web/.env.local
let token = process.env.TELEGRAM_BOT_TOKEN;
let chatId = process.env.TELEGRAM_CHAT_ID;

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
    if (!chatId) {
      const match = content.match(/TELEGRAM_CHAT_ID=([^\r\n]+)/);
      if (match && match[1] && !match[1].includes('your_chat_id')) {
        chatId = match[1].trim();
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

console.log('🦅 Starting Eagle Flash Telegram Bot Service (@eaglespike_bot)...');

async function autoSaveChannelId(detectedChatId, title) {
  try {
    for (const ep of envPaths) {
      if (fs.existsSync(ep)) {
        let content = fs.readFileSync(ep, 'utf-8');
        if (content.includes('TELEGRAM_CHAT_ID=')) {
          content = content.replace(/TELEGRAM_CHAT_ID=[^\r\n]*/, `TELEGRAM_CHAT_ID=${detectedChatId}`);
        } else {
          content += `\nTELEGRAM_CHAT_ID=${detectedChatId}`;
        }
        fs.writeFileSync(ep, content);
      }
    }
    console.log(`✅ Automatically saved Telegram Channel ID: ${detectedChatId} (${title || 'Channel'}) to .env`);
  } catch (err) {
    console.warn('Could not auto-save channel ID:', err?.message);
  }
}

async function main() {
  // Clear any existing webhook to enable long-polling getUpdates
  try {
    const delRes = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
    const delJson = await delRes.json();
    console.log('✅ Telegram Webhook status reset:', delJson.description || 'OK');
  } catch (e) {
    console.warn('⚠️ Webhook clear warning:', e.message);
  }

  // Register commands with Telegram API
  try {
    const commands = [
      { command: 'signals', description: 'Recent high-confidence signals from the lifecycle engine' },
      { command: 'top', description: 'Top ranked spikes sorted by Eagle Score' },
      { command: 'spikes', description: 'Active high-volume spike anomalies' },
      { command: 'btc', description: 'Bitcoin macro regime & volatility' },
      { command: 'status', description: 'System health & market feeds status' },
      { command: 'forward', description: 'Forward current top signals to channel' },
      { command: 'channel', description: 'Check Telegram channel link & permissions' },
      { command: 'long', description: 'High-probability Long candidates' },
      { command: 'short', description: 'High-probability Short candidates' },
      { command: 'health', description: 'Diagnostics, latencies & data freshness' },
      { command: 'start', description: 'Overview & quick access menu' },
    ];

    await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands }),
    });
    console.log('✅ Telegram official commands registered (/signals, /top, /spikes, /forward, etc.)');
  } catch (e) {
    console.warn('Command registration warning:', e.message);
  }

  let offset = 0;
  console.log('🟢 Polling active. Listening for user commands and channel events...');

  while (true) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=25`);
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      const json = await res.json();
      if (json.ok && Array.isArray(json.result)) {
        for (const update of json.result) {
          offset = update.update_id + 1;

          // Check for channel post or admin addition to discover channel ID
          if (update.channel_post) {
            const cChat = update.channel_post.chat;
            console.log(`📢 Discovered Channel Post from: "${cChat.title}" (ID: ${cChat.id}, Type: ${cChat.type})`);
            if (!chatId) {
              chatId = String(cChat.id);
              await autoSaveChannelId(cChat.id, cChat.title);
            }
          } else if (update.my_chat_member) {
            const mChat = update.my_chat_member.chat;
            const newStatus = update.my_chat_member.new_chat_member?.status;
            console.log(`🤖 Bot membership update in "${mChat.title}" (ID: ${mChat.id}) -> Status: ${newStatus}`);
            if (newStatus === 'administrator' && !chatId) {
              chatId = String(mChat.id);
              await autoSaveChannelId(mChat.id, mChat.title);
            }
          }

          // Forward update to local Next.js webhook endpoint
          try {
            const fwdRes = await fetch('http://localhost:3000/api/telegram/webhook', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(update),
            });
            if (update.message?.text) {
              console.log(`💬 Handled command: "${update.message.text}" from chat ${update.message.chat.id}`);
            }
          } catch (err) {
            console.error('Failed to forward update to Next.js webhook route:', err.message);
          }
        }
      }
    } catch (err) {
      console.error('Polling error:', err.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

main().catch(console.error);
