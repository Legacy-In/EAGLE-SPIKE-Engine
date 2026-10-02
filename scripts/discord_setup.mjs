/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — DISCORD SERVER AUTO-SETUP & CHANNEL PROVISIONER
 * Automatically detects the Discord server, provisions dedicated channels,
 * writes IDs to .env, and sends verification test signals.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { DiscordClient } from '../backend/services/discord/discord-client.mjs';
import {
  buildNewSignalDiscordEmbed,
  buildWhaleRadarDiscordEmbed,
  buildTpMilestoneDiscordEmbed,
} from '../backend/services/discord/discord-message-builder.mjs';

const client = new DiscordClient();
const DISCORD_API_BASE = 'https://discord.com/api/v10';
const CLIENT_ID = '1554042633733668907';

// The 1-click OAuth2 authorization URL with Administrator permissions (permissions=8)
const INVITE_URL = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;

console.log('═════════════════════════════════════════════════════════════════');
console.log('🦅 EAGLE FLASH — DISCORD SERVER PROVISIONING & SETUP ASSISTANT');
console.log('═════════════════════════════════════════════════════════════════\n');

async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      Authorization: `Bot ${client.botToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'EagleFlashDiscordSetup (v1.0.0)',
    },
  };
  if (body) options.body = JSON.stringify(body);

  let attempts = 0;
  while (attempts < 5) {
    attempts++;
    const res = await fetch(`${DISCORD_API_BASE}${endpoint}`, options);
    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      const retryAfter = Math.ceil((data.retry_after || 2) * 1000) + 500;
      await new Promise(r => setTimeout(r, retryAfter));
      continue;
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }
    return res.json();
  }
  throw new Error(`Exceeded maximum retries for ${endpoint}`);
}

const REQUIRED_CHANNELS = [
  { key: 'DISCORD_CHANNEL_SIGNALS', name: '📢-signals', topic: 'Authoritative Eagle Flash quantitative signals' },
  { key: 'DISCORD_CHANNEL_QUICK_PUMP', name: '🚀-quick-pump', topic: 'High-velocity early momentum & ignition alerts' },
  { key: 'DISCORD_CHANNEL_BREAKOUTS', name: '📈-breakouts', topic: 'Volume breakout and structural range expansion' },
  { key: 'DISCORD_CHANNEL_WHALES', name: '🐋-whale-alerts', topic: 'On-chain whale transfers and orderbook manipulation' },
  { key: 'DISCORD_CHANNEL_SQUEEZES', name: '🔥-squeezes', topic: 'Short and long leverage squeeze alerts' },
  { key: 'DISCORD_CHANNEL_BIG_CAP', name: '🎯-big-cap', topic: 'Institutional Bitcoin, Ethereum, and Solana desk' },
  { key: 'DISCORD_CHANNEL_TP_HITS', name: '✅-tp-hits', topic: 'Take Profit milestone hits (TP1, TP2, TP3)' },
  { key: 'DISCORD_CHANNEL_STOP_LOSS', name: '🛑-stop-loss', topic: 'Invalidation stop loss executions' },
  { key: 'DISCORD_CHANNEL_MARKET_ALERTS', name: '📊-market-alerts', topic: 'Market regime, volatility spikes, and diagnostics' },
  { key: 'DISCORD_CHANNEL_BLOCKCHAIN_PROOF', name: '🔗-blockchain-proof', topic: 'On-chain cryptographic commitment proofs' },
  { key: 'DISCORD_CHANNEL_BOT_STATUS', name: '🛠-bot-status', topic: 'Eagle Flash bot engine diagnostics and heartbeat' },
  { key: 'DISCORD_CHANNEL_PRE_BREAKOUT', name: '🟡-pre-breakout', topic: 'Pre-breakout coiling, volatility compression, and smart money order-book absorption signals' },
  { key: 'DISCORD_CHANNEL_NEW_LISTINGS', name: '✨-new-listing-alert', topic: 'New cryptocurrency token and perpetual pair listings' },
  { key: 'DISCORD_CHANNEL_RSI_LONGS', name: '⚡-rsi-heatmap-setup', topic: 'RSI Heatmap & High-OI Long Opportunities (Mid-cap, deep liquidity, non-overbought momentum)' },
];

function updateEnvKey(filePath, key, value) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let found = false;
  const newLines = lines.map(line => {
    if (line.startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) {
    newLines.push(`${key}=${value}`);
  }
  fs.writeFileSync(filePath, newLines.join('\n').trim() + '\n', 'utf-8');
}

export async function checkAndSetupServer() {
  const user = await client.getBotUser();
  if (!user.connected) {
    console.error('❌ Bot token invalid or failed to connect:', user.error);
    return { success: false, error: user.error };
  }

  console.log(`🤖 Authenticated as: ${user.username}#${user.discriminator} (Application ID: ${user.id})\n`);

  // Fetch guilds
  const guilds = await apiRequest('/users/@me/guilds');

  if (guilds.length === 0) {
    console.log('⚠️ [ACTION REQUIRED] The bot is NOT currently added to your Discord server!');
    console.log('\n👉 PLEASE CLICK THIS LINK TO INVITE THE BOT TO YOUR SERVER:');
    console.log(`   ${INVITE_URL}\n`);
    console.log('Select your server ("EAGLE SPIKE") and click Authorize.');
    return {
      success: false,
      needsInvite: true,
      inviteUrl: INVITE_URL,
      message: 'Bot needs to be invited to the Discord server.',
    };
  }

  const targetGuild = guilds[0]; // First guild (e.g. EAGLE SPIKE)
  console.log(`🏰 Found Discord Server: "${targetGuild.name}" (ID: ${targetGuild.id})`);

  // Update Guild ID in .env
  updateEnvKey('.env', 'DISCORD_GUILD_ID', targetGuild.id);
  updateEnvKey('apps/web/.env.local', 'DISCORD_GUILD_ID', targetGuild.id);
  process.env.DISCORD_GUILD_ID = targetGuild.id;

  // Fetch channels in guild
  const existingChannels = await apiRequest(`/guilds/${targetGuild.id}/channels`);
  console.log(`📋 Found ${existingChannels.length} existing channel(s) in server.`);

  const channelMap = {};
  existingChannels.forEach(c => {
    channelMap[c.name.toLowerCase()] = c.id;
  });

  // Find or create category
  let categoryId = null;
  const cat = existingChannels.find(c => c.type === 4 && c.name.toLowerCase().includes('eagle flash'));
  if (cat) {
    categoryId = cat.id;
  } else {
    try {
      const newCat = await apiRequest(`/guilds/${targetGuild.id}/channels`, 'POST', {
        name: '🦅 EAGLE FLASH TERMINAL',
        type: 4, // GUILD_CATEGORY
      });
      categoryId = newCat.id;
      console.log(`📁 Created Category: "🦅 EAGLE FLASH TERMINAL" (ID: ${categoryId})`);
    } catch (e) {
      console.warn('Could not create category, creating text channels directly:', e.message);
    }
  }

  // Provision each required channel
  for (const rc of REQUIRED_CHANNELS) {
    let chanId = channelMap[rc.name.toLowerCase()] || channelMap[rc.name.replace(/^[^\w]+/, '').toLowerCase()];

    if (!chanId) {
      // Create channel
      try {
        const payload = {
          name: rc.name,
          type: 0, // GUILD_TEXT
          topic: rc.topic,
        };
        if (categoryId) payload.parent_id = categoryId;

        const newChan = await apiRequest(`/guilds/${targetGuild.id}/channels`, 'POST', payload);
        chanId = newChan.id;
        channelMap[rc.name.toLowerCase()] = chanId;
        console.log(`✅ Created Channel: #${rc.name} (ID: ${chanId})`);
      } catch (err) {
        console.warn(`⚠️ Could not create channel #${rc.name}:`, err.message);
        // Fall back to general if exists
        const gen = existingChannels.find(c => c.name === 'general');
        if (gen) chanId = gen.id;
      }
    } else {
      console.log(`✓ Channel exists: #${rc.name} (ID: ${chanId})`);
    }

    if (chanId) {
      updateEnvKey('.env', rc.key, chanId);
      updateEnvKey('apps/web/.env.local', rc.key, chanId);
      process.env[rc.key] = chanId;
    }
  }

  // Send initial welcome & verification test signals to #signals and #bot-status
  const signalsChanId = process.env.DISCORD_CHANNEL_SIGNALS || channelMap['📢-signals'] || existingChannels.find(c => c.name === 'general')?.id;
  const statusChanId = process.env.DISCORD_CHANNEL_BOT_STATUS || channelMap['🛠-bot-status'] || signalsChanId;

  if (statusChanId) {
    try {
      await client.sendMessage(statusChanId, {
        content: `🦅 **EAGLE FLASH QUANTITATIVE SYSTEM ONLINE**\nServer **${targetGuild.name}** linked successfully! Connected to 4 exchanges (Bybit, Binance, MEXC, WEEX) and Ethereum/Base RPC.`,
      });
      console.log(`📡 Dispatched system status message to #${statusChanId}`);
    } catch (e) {}
  }

  if (signalsChanId) {
    try {
      const sampleSignal = {
        signal_id: `EGL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-BYBIT-BTCUSDT-SETUP`,
        symbol: 'BTCUSDT',
        exchange: 'BYBIT',
        direction: 'LONG',
        entry_price: 65420.50,
        current_price: 65580.00,
        stop_price: 63800.00,
        target_1_price: 67100.00,
        target_2_price: 68800.00,
        target_3_price: 71000.00,
        risk_r: 1620.50,
        eagle_score: 92,
        primary_strategy: 'BREAKOUT_ACCELERATION',
        entry_quality: 'OPTIMAL',
        chase_risk: 'LOW',
        data_confidence: 'HIGH',
        price_age_ms: 85,
        detected_at: new Date().toISOString(),
      };
      const embedPayload = buildNewSignalDiscordEmbed(sampleSignal);
      await client.sendMessage(signalsChanId, embedPayload);
      console.log(`🎯 Dispatched live verification signal embed to #${signalsChanId}`);
    } catch (e) {}
  }

  console.log('\n🎉 DISCORD SERVER PROVISIONING COMPLETE!');
  console.log('All channels configured and active in .env.');
  return { success: true, guild: targetGuild.name, guildId: targetGuild.id };
}

if (process.argv[1] && process.argv[1].endsWith('discord_setup.mjs')) {
  const isWatch = process.argv.includes('--watch');

  async function run() {
    const res = await checkAndSetupServer();
    if (res.needsInvite && isWatch) {
      console.log('⏳ Polling Discord API every 5s... Waiting for bot to be authorized in your server.');
      setTimeout(run, 5000);
    } else if (res.success) {
      process.exit(0);
    }
  }

  run();
}
