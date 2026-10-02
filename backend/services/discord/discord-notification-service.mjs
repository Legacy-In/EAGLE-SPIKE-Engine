/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — DISCORD NOTIFICATION DISPATCHER SERVICE
 * Coordinates message construction, channel resolution, rate-limit backoff,
 * and external delivery verification for the Discord notification pipeline.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { DiscordClient } from './discord-client.mjs';
import { resolveDiscordChannel, resolveDiscordChannels } from './discord-router.mjs';
import {
  buildNewSignalDiscordEmbed,
  buildTpMilestoneDiscordEmbed,
  buildStopHitDiscordEmbed,
  buildWhaleRadarDiscordEmbed,
  buildBlockchainProofDiscordEmbed,
  buildPreBreakoutDiscordEmbed,
  buildPreBreakoutStatusDiscordEmbed,
  buildNewListingDiscordEmbed,
  buildRsiLongDiscordEmbed,
  validateRoiInvariant,
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
    if (eventType === 'NEW_SIGNAL' || eventType === 'CONFIRMED') {
      const entry = parseFloat(p.entry_price || p.entryPrice || 0);
      const stop = parseFloat(p.stop_price || p.stop_loss_price || 0);
      if (entry <= 0 || (eventType === 'NEW_SIGNAL' && stop <= 0)) {
        console.warn(`⚠️ [DISCORD_GUARD_REJECT] Rejecting signal ${item.signal_id}: invalid entry ($${entry}) or stop ($${stop})`);
        return { success: false, error: 'INVALID_PRICE_GUARD' };
      }
    }

    // 2. Guard against ROI Invariant Violations (Section 14)
    const reportedRoi = p.current_roi_pct ?? p.roi_pct;
    const entryPrice = p.entry_price ?? p.entryPrice;
    const currentPrice = p.current_price ?? p.price;
    if (reportedRoi !== undefined && reportedRoi !== null && entryPrice && currentPrice) {
      const roiCheck = validateRoiInvariant(entryPrice, currentPrice, p.direction || 'LONG', reportedRoi);
      if (!roiCheck.valid) {
        console.warn(`⚠️ [DISCORD_GUARD_REJECT] Rejecting event ${eventType} (${item.signal_id}): ROI invariant violated (Expected ${roiCheck.expectedRoi}%, Reported ${reportedRoi}%)`);
        return { success: false, error: 'ROI_INVARIANT_VIOLATION' };
      }
    }

    if (!discordClient.isConfigured()) {
      return {
        success: false,
        error: 'DISCORD_BOT_TOKEN_NOT_CONFIGURED',
        isConfigured: false,
      };
    }

    // 3. Resolve destination Discord channel IDs
    const targetChannels = typeof resolveDiscordChannels === 'function'
      ? resolveDiscordChannels(item)
      : [resolveDiscordChannel(item)].filter(Boolean);

    if (!targetChannels || targetChannels.length === 0) {
      console.warn(`[DISCORD_NOTICE] No destination channel configured for event ${eventType}. Signal: ${item.signal_id}`);
      return { success: false, error: 'NO_CHANNEL_CONFIGURED' };
    }

    // 4. Build rich message payload based on event type
    let messagePayload = null;
    switch (eventType) {
      case 'TP_HIT':
      case 'TP1_HIT': {
        const milestone = p.milestone || (eventType === 'TP_HIT' ? (p.target_hit || 'TP1') : 'TP1');
        messagePayload = buildTpMilestoneDiscordEmbed(item, milestone);
        break;
      }
      case 'TP2_HIT':
        messagePayload = buildTpMilestoneDiscordEmbed(item, 'TP2');
        break;
      case 'TP3_HIT':
        messagePayload = buildTpMilestoneDiscordEmbed(item, 'TP3');
        break;
      case 'SL_HIT':
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
      case 'NEW_COIN_LISTED':
      case 'NEW_LISTING':
      case 'MARKET_ALERT':
      case 'LISTING_ALERT':
        messagePayload = buildNewListingDiscordEmbed(item);
        break;
      case 'RSI_LONG_SETUP':
      case 'RSI_HEATMAP_LONG':
      case 'RSI_LONG':
        messagePayload = buildRsiLongDiscordEmbed(item);
        break;
      case 'PREP_DETECTED':
      case 'READY_DETECTED':
      case 'PREP':
      case 'READY':
      case 'CONFIRMED':
      case 'CHASE_RISK_ELEVATED':
      case 'CHASE_RISK_BLOCKED':
      case 'FALSE_BREAKOUT':
      case 'PRE_BREAKOUT_CLOSED':
      case 'PRE_BREAKOUT_EXPIRED':
      case 'PRE_BREAKOUT':
      case 'ACCUMULATION':
        messagePayload = buildPreBreakoutDiscordEmbed(item);
        break;
      case 'BOT_STATUS':
        if (p.isPreBreakout || p.healthType === 'PRE_BREAKOUT') {
          messagePayload = buildPreBreakoutStatusDiscordEmbed(p);
        }
        break;
      case 'NEW_SIGNAL':
      default:
        if (p.marketStatus === 'PREP' || p.marketStatus === 'READY' || (p.type || '').includes('ACCUMULATION') || (p.type || '').includes('PRE_BREAKOUT')) {
          messagePayload = buildPreBreakoutDiscordEmbed(item);
        } else {
          messagePayload = buildNewSignalDiscordEmbed(item);
        }
        break;
    }

    if (!messagePayload) {
      return { success: false, error: 'FAILED_TO_BUILD_PAYLOAD' };
    }

    // 4. Send via Discord REST client to dedicated target channel(s)
    let lastResult = null;
    let anySuccess = false;
    for (const channelId of targetChannels) {
      try {
        console.log(`📡 [DISCORD_ROUTER] Routing ${eventType} (${p.symbol || 'ASSET'}) strictly to channel: ${channelId}`);
        const res = await discordClient.sendMessage(channelId, messagePayload);
        if (res && res.success) {
          anySuccess = true;
          lastResult = res;
        }
      } catch (err) {
        console.warn(`⚠️ [DISCORD_SEND_WARN] Channel ${channelId} send failed:`, err?.message);
      }
    }

    return anySuccess
      ? { success: true, messageId: lastResult?.messageId }
      : (lastResult || { success: false, error: 'DISPATCH_FAILED' });
  }
}
