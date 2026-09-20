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
   * Dispatches a spike alert with deduplication and cooldown checks.
   */
  public async dispatchAlert(chatId: string | number, payload: TelegramAlertPayload): Promise<boolean> {
    const dedupKey = `${payload.symbol}_${payload.state}`;
    const now = Date.now();
    const lastSent = this.alertHistory.get(dedupKey) || 0;
    const cooldown = (payload.cooldownSeconds ? payload.cooldownSeconds * 1000 : this.defaultCooldownMs);

    // 1. Cooldown & Deduplication check
    if (now - lastSent < cooldown) {
      // Cooldown active, suppress duplicate alert
      return false;
    }

    // 2. Global Rate Limit check
    this.cleanRateLimitTimestamps(now);
    if (this.globalSentTimestamps.length >= this.maxGlobalPerMinute) {
      console.warn('⚠️ Global Telegram rate limit hit, queueing alert for batching');
      this.queueForBatch(chatId, payload);
      return false;
    }

    // 3. Format and Send Message
    const messageText = AlertDispatcher.formatAlertMessage(payload);
    const success = await telegramService.sendMessage(chatId, messageText);

    if (success) {
      this.alertHistory.set(dedupKey, now);
      this.globalSentTimestamps.push(now);
    }

    return success;
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
