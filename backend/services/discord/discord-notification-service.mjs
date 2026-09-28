/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — DISCORD NOTIFICATION DISPATCHER SERVICE
 * Coordinates message construction, channel resolution, rate-limit backoff,
 * and external delivery verification for the Discord notification pipeline.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { DiscordClient } from './discord-client.mjs';
import { resolveDiscordChannel } from './discord-router.mjs';
import {
  buildNewSignalDiscordEmbed,
  buildTpMilestoneDiscordEmbed,
  buildStopHitDiscordEmbed,
  buildWhaleRadarDiscordEmbed,
  buildBlockchainProofDiscordEmbed,
} from './discord-message-builder.mjs';

const discordClient = new DiscordClient();

export class DiscordNotificationService {
  static getClient() {
    return discordClient;
  }

  /**
   * Process and dispatch a single outbox record to Discord
   */
  static async dispatchOutboxItem(item) {
    const p = item.payload || {};
    const eventType = item.event_type || 'NEW_SIGNAL';

    // 1. Guard against corrupt trade signals (Entry <= 0 or Stop <= 0)
    if (eventType === 'NEW_SIGNAL') {
      const entry = parseFloat(p.entry_price || p.entryPrice || 0);
      const stop = parseFloat(p.stop_price || p.stop_loss_price || 0);
      if (entry <= 0 || stop <= 0) {
        console.warn(`⚠️ [DISCORD_GUARD_REJECT] Rejecting signal ${item.signal_id}: invalid entry ($${entry}) or stop ($${stop})`);
        return { success: false, error: 'INVALID_PRICE_GUARD' };
      }
    }

    if (!discordClient.isConfigured()) {
      return {
        success: false,
        error: 'DISCORD_BOT_TOKEN_NOT_CONFIGURED',
        isConfigured: false,
      };
    }

    // 2. Resolve destination Discord channel ID
    const targetChannelId = resolveDiscordChannel(item);
    if (!targetChannelId) {
      console.warn(`[DISCORD_NOTICE] No destination channel configured for event ${eventType}. Signal: ${item.signal_id}`);
      return { success: false, error: 'NO_CHANNEL_CONFIGURED' };
    }

    // 3. Build rich message payload based on event type
    let messagePayload = null;
    switch (eventType) {
      case 'TP1_HIT':
        messagePayload = buildTpMilestoneDiscordEmbed(item, 'TP1');
        break;
      case 'TP2_HIT':
        messagePayload = buildTpMilestoneDiscordEmbed(item, 'TP2');
        break;
      case 'TP3_HIT':
        messagePayload = buildTpMilestoneDiscordEmbed(item, 'TP3');
        break;
      case 'STOP_HIT':
        messagePayload = buildStopHitDiscordEmbed(item);
        break;
      case 'WHALE_ALERT':
      case 'WHALE_EVENT':
      case 'ONCHAIN_WHALE_ALERT':
        messagePayload = buildWhaleRadarDiscordEmbed(item);
        break;
      case 'BLOCKCHAIN_PROOF':
        messagePayload = buildBlockchainProofDiscordEmbed(item);
        break;
      case 'NEW_SIGNAL':
      default:
        messagePayload = buildNewSignalDiscordEmbed(item);
        break;
    }

    if (!messagePayload) {
      return { success: false, error: 'FAILED_TO_BUILD_PAYLOAD' };
    }

    // 4. Send via Discord REST client
    const sendResult = await discordClient.sendMessage(targetChannelId, messagePayload);
    return sendResult;
  }
}
