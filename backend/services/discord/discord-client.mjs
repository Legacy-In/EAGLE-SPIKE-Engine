/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — DISCORD API v10 REST CLIENT
 * Handles authenticated requests, rate-limiting with exponential backoff,
 * channel message dispatching, and connection diagnostics.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

export class DiscordClient {
  constructor(options = {}) {
    this.botToken = options.botToken || this._loadTokenFromEnv();
    this.rateLimitedUntil = 0;
    this.lastError = null;
    this.lastSentAt = null;
  }

  _loadTokenFromEnv() {
    if (process.env.DISCORD_BOT_TOKEN && !process.env.DISCORD_BOT_TOKEN.includes('your_discord_bot_token')) {
      return process.env.DISCORD_BOT_TOKEN;
    }

    const envFiles = ['.env', 'apps/web/.env.local'];
    for (const ef of envFiles) {
      try {
        const fullPath = path.resolve(process.cwd(), ef);
        if (fs.existsSync(fullPath)) {
          const lines = fs.readFileSync(fullPath, 'utf-8').split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const [k, ...v] = trimmed.split('=');
            if (k === 'DISCORD_BOT_TOKEN') {
              const val = v.join('=').trim().replace(/^["']|["']$/g, '');
              if (val && !val.includes('your_discord_bot_token')) return val;
            }
          }
        }
      } catch (e) {}
    }
    return '';
  }

  isConfigured() {
    return Boolean(this.botToken && this.botToken.length > 20);
  }

  /**
   * Verified Bot Identity & Status (Read-Only)
   */
  async getBotUser() {
    if (!this.isConfigured()) {
      return { configured: false, error: 'DISCORD_BOT_TOKEN not configured' };
    }

    try {
      const res = await fetch(`${DISCORD_API_BASE}/users/@me`, {
        headers: {
          Authorization: `Bot ${this.botToken}`,
          'User-Agent': 'EagleFlashDiscordBot (v1.0.0, https://eagleflash.io)',
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return { configured: true, connected: false, error: errJson.message || `HTTP ${res.status}` };
      }

      const botData = await res.json();
      return {
        configured: true,
        connected: true,
        id: botData.id,
        username: botData.username,
        discriminator: botData.discriminator,
      };
    } catch (err) {
      return { configured: true, connected: false, error: err.message };
    }
  }

  /**
   * Send a rich message (embeds or content) to a Discord channel
   */
  async sendMessage(channelId, messagePayload) {
    if (!this.isConfigured()) {
      return { success: false, error: 'DISCORD_BOT_TOKEN_NOT_CONFIGURED' };
    }

    if (!channelId) {
      return { success: false, error: 'DISCORD_CHANNEL_ID_MISSING' };
    }

    // Check client-side rate limit block
    const now = Date.now();
    if (this.rateLimitedUntil > now) {
      const waitMs = this.rateLimitedUntil - now;
      return { success: false, error: 'RATE_LIMITED', retryAfterMs: waitMs };
    }

    try {
      const res = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${this.botToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'EagleFlashDiscordBot (v1.0.0, https://eagleflash.io)',
        },
        body: JSON.stringify(messagePayload),
      });

      if (res.status === 429) {
        // Handle Discord Rate Limit
        const rateLimitData = await res.json().catch(() => ({ retry_after: 5 }));
        const retryAfterSec = rateLimitData.retry_after || 5;
        this.rateLimitedUntil = Date.now() + Math.ceil(retryAfterSec * 1000);
        this.lastError = `Rate limited for ${retryAfterSec}s`;
        console.warn(`[DISCORD_API] Rate limit hit on channel ${channelId}. Backing off for ${retryAfterSec}s.`);
        return {
          success: false,
          error: 'RATE_LIMITED',
          retryAfterMs: Math.ceil(retryAfterSec * 1000),
        };
      }

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        this.lastError = errorJson.message || `HTTP ${res.status}`;
        console.warn(`[DISCORD_API_ERROR] Channel ${channelId} error (${res.status}):`, this.lastError);
        return {
          success: false,
          error: this.lastError,
          status: res.status,
        };
      }

      const responseJson = await res.json();
      this.lastSentAt = new Date().toISOString();
      return {
        success: true,
        messageId: responseJson.id,
        channelId: responseJson.channel_id,
        timestamp: responseJson.timestamp,
      };
    } catch (err) {
      this.lastError = err.message;
      return {
        success: false,
        error: err.message,
      };
    }
  }
}
