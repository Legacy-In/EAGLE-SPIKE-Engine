/**
 * 🦅 EAGLE FLASH — Telegram State-Change Alert Dispatcher
 * Manages event deduplication, cooldowns, rate limits, batching, and mobile-friendly alert formatting.
 */

import { telegramService, TelegramService } from './telegram-service';
import { TelegramAlertPayload } from '../spike-intelligence/types';

export class AlertDispatcher {
  // Deduplication cache: key -> timestamp of last sent alert
  private alertHistory: Map<string, number> = new Map();
  // Queue for batching spikes if multiple trigger simultaneously
  private pendingBatch: TelegramAlertPayload[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private defaultCooldownMs: number = 20 * 60 * 1000; // 20 minutes
  private globalSentTimestamps: number[] = [];
  private maxGlobalPerMinute: number = 20;

  /**
   * Formats a single spike alert for Telegram.
   */
  public static formatAlertMessage(payload: TelegramAlertPayload): string {
    const isBull = payload.returns5m >= 0;
    const dirSign = isBull ? '+' : '';

    let whyList = '';
    if (payload.triggerReasons && payload.triggerReasons.length > 0) {
      whyList = '\n<b>Why:</b>\n' + payload.triggerReasons.map((r) => `• ${TelegramService.escapeHtml(r)}`).join('\n');
    }

    return (
      `⚡ <b>EAGLE FLASH SPIKE</b>\n\n` +
      `<b>${payload.symbol}</b>\n\n` +
      `<b>Price:</b> $${payload.price}\n` +
      `<b>5M:</b> ${dirSign}${payload.returns5m}%\n` +
      `<b>15M:</b> ${payload.returns15m >= 0 ? '+' : ''}${payload.returns15m}%\n` +
      `<b>1H:</b> ${payload.returns1h >= 0 ? '+' : ''}${payload.returns1h}%\n` +
      `<b>RVOL:</b> ${payload.rvol}x\n` +
      `<b>Volume Z:</b> ${payload.volumeZ}\n` +
      `<b>OI:</b> $${(payload.openInterestUsd / 1000000).toFixed(1)}M (${payload.oiChangePct >= 0 ? '+' : ''}${payload.oiChangePct}%)\n` +
      `<b>Taker Flow:</b> ${payload.takerFlowPct >= 0 ? '+' : ''}${payload.takerFlowPct}%\n` +
      `<b>RSI:</b> ${payload.rsi}\n` +
      `<b>Eagle Score:</b> ${payload.eagleScore}/100\n` +
      `<b>Phase:</b> <code>${payload.state}</code>\n` +
      `<b>Type:</b> <code>${payload.spikeType}</code>\n` +
      `<b>Quality:</b> <code>${payload.spikeQuality}</code>\n` +
      `<b>Data Confidence:</b> ${payload.dataConfidence}%\n` +
      `<b>BTC Regime:</b> <code>${payload.btcRegime}</code>\n` +
      `${whyList}\n\n` +
      `⚠️ <i>Spike detection is market intelligence, not a guaranteed trade signal.</i>`
    );
  }

  /**
   * Resolves configured target chat and channel IDs from environment variables.
   */
  public getRecipientChatIds(explicitChatId?: string | number): string[] {
    if (explicitChatId !== undefined && explicitChatId !== null && String(explicitChatId).trim() !== '') {
      return [String(explicitChatId).trim()];
    }

    const targets: string[] = [];
    const envTargets = [
      process.env.TELEGRAM_CHAT_ID,
      process.env.TELEGRAM_CHANNEL_ID,
      process.env.TELEGRAM_AUTHORIZED_CHATS,
    ];

    for (const val of envTargets) {
      if (val && typeof val === 'string' && val.trim() !== '') {
        const parts = val.split(',').map((p) => p.trim()).filter((p) => p.length > 0);
        for (const p of parts) {
          if (!targets.includes(p)) targets.push(p);
        }
      }
    }

    return targets;
  }

  /**
   * Dispatches a spike alert with deduplication and cooldown checks.
   * If chatId is omitted, automatically routes to all configured environment channels/chats.
   */
  public async dispatchAlert(
    chatId: string | number | undefined,
    payload: TelegramAlertPayload,
    options: { force?: boolean } = {}
  ): Promise<boolean> {
    const recipients = this.getRecipientChatIds(chatId);
    if (recipients.length === 0) {
      console.warn('⚠️ No Telegram recipient chat or channel configured in TELEGRAM_CHAT_ID or TELEGRAM_CHANNEL_ID.');
      return false;
    }

    const dedupKey = `${payload.symbol}_${payload.state}`;
    const now = Date.now();
    const lastSent = this.alertHistory.get(dedupKey) || 0;
    const cooldown = payload.cooldownSeconds ? payload.cooldownSeconds * 1000 : this.defaultCooldownMs;

    // 1. Cooldown & Deduplication check (unless force is true)
    if (!options.force && now - lastSent < cooldown) {
      // Cooldown active, suppress duplicate alert
      return false;
    }

    // 2. Global Rate Limit check
    this.cleanRateLimitTimestamps(now);
    if (this.globalSentTimestamps.length >= this.maxGlobalPerMinute) {
      console.warn('⚠️ Global Telegram rate limit hit, queueing alert for batching');
      for (const recipient of recipients) {
        this.queueForBatch(recipient, payload);
      }
      return false;
    }

    // 3. Format and Send Message to each target
    const messageText = AlertDispatcher.formatAlertMessage(payload);
    let anySuccess = false;

    for (const target of recipients) {
      try {
        const success = await telegramService.sendMessage(target, messageText);
        if (success) {
          anySuccess = true;
        }
      } catch (err: any) {
        console.error(`❌ Failed to dispatch alert to chat ${target}:`, err?.message);
      }
    }

    if (anySuccess) {
      this.alertHistory.set(dedupKey, now);
      this.globalSentTimestamps.push(now);
    }

    return anySuccess;
  }

  /**
   * Dispatches a batch of signals in one concise message to avoid spamming the channel.
   */
  public async dispatchBatchSummary(
    items: TelegramAlertPayload[],
    chatId?: string | number
  ): Promise<boolean> {
    if (!items || items.length === 0) return false;
    const recipients = this.getRecipientChatIds(chatId);
    if (recipients.length === 0) return false;

    let text = `⚡ <b>EAGLE FLASH — SPIKE SCANNER SIGNALS</b>\n\n`;
    text += `<b>${items.length} high-confidence spikes detected across Bybit, MEXC, and WEEX:</b>\n\n`;

    items.slice(0, 8).forEach((item, idx) => {
      const isBull = item.returns5m >= 0;
      const dirSign = isBull ? '+' : '';
      text +=
        `<b>${idx + 1}. ${item.symbol}</b> [Score: <b>${item.eagleScore}/100</b>]\n` +
        `• 5M: ${dirSign}${item.returns5m}% | RVOL: <b>${item.rvol}x</b>\n` +
        `• Phase: <code>${item.state}</code> | Quality: <code>${item.spikeQuality}</code>\n\n`;
    });

    if (items.length > 8) {
      text += `<i>...and ${items.length - 8} more candidates active in terminal.</i>\n\n`;
    }

    text += `⚠️ <i>Spike detection is market intelligence, not financial advice.</i>`;

    let anySuccess = false;
    for (const target of recipients) {
      const ok = await telegramService.sendMessage(target, text);
      if (ok) anySuccess = true;
    }
    return anySuccess;
  }

  /**
   * Batches multiple spikes into a single summary message when market is exploding.
   */
  private queueForBatch(chatId: string | number, payload: TelegramAlertPayload) {
    this.pendingBatch.push(payload);
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(async () => {
        await this.flushBatch(chatId);
      }, 15000); // 15-second batch window
    }
  }

  private async flushBatch(chatId: string | number) {
    this.batchTimer = null;
    if (this.pendingBatch.length === 0) return;

    const batch = [...this.pendingBatch];
    this.pendingBatch = [];

    let text = `⚡ <b>EAGLE FLASH SPIKE BATCH</b>\n\n`;
    text += `<b>${batch.length} spike events detected across markets:</b>\n\n`;

    batch.slice(0, 10).forEach((item, idx) => {
      text += `${idx + 1}. <b>${item.symbol}</b> — Score: <b>${item.eagleScore}</b> | Phase: <code>${item.state}</code> | RVOL: ${item.rvol}x\n`;
    });

    if (batch.length > 10) {
      text += `\n<i>...and ${batch.length - 10} more symbols in scanner.</i>\n`;
    }

    text += `\n⚠️ <i>Open Eagle Flash terminal for full order flow & depth breakdown.</i>`;

    await telegramService.sendMessage(chatId, text);
  }

  private cleanRateLimitTimestamps(now: number) {
    const oneMinAgo = now - 60000;
    this.globalSentTimestamps = this.globalSentTimestamps.filter((t) => t > oneMinAgo);
  }
}

export const alertDispatcher = new AlertDispatcher();
