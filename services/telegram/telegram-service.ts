/**
 * 🦅 EAGLE FLASH — Telegram Bot Service
 * Server-side client for Telegram Bot API (@eaglespike_bot) with rate-limiting,
 * HTML message formatting, and resilient error recovery.
 */

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface SendMessageOptions {
  parse_mode?: 'HTML' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
  reply_markup?: {
    inline_keyboard?: InlineKeyboardButton[][];
  };
}

export class TelegramService {
  private botToken: string | null = null;
  private isConfigured: boolean = false;
  private messageCount: number = 0;
  private errorCount: number = 0;
  private lastMessageTimestamp: number = 0;

  constructor() {
    this.initToken();
  }

  private initToken() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || null;
    this.isConfigured = !!(this.botToken && !this.botToken.includes('your_telegram_bot_token'));
  }

  public getStatus() {
    this.initToken();
    return {
      configured: this.isConfigured,
      messageCount: this.messageCount,
      errorCount: this.errorCount,
      lastMessageTime: this.lastMessageTimestamp,
    };
  }

  /**
   * Safe HTML escaping for Telegram messages.
   */
  public static escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Sends a message to a specific Telegram chat ID.
   */
  public async sendMessage(chatId: string | number, text: string, options: SendMessageOptions = {}): Promise<boolean> {
    this.initToken();
    if (!this.isConfigured || !this.botToken) {
      console.warn('⚠️ Telegram bot not configured: TELEGRAM_BOT_TOKEN missing in environment.');
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const body = {
        chat_id: chatId,
        text,
        parse_mode: options.parse_mode || 'HTML',
        disable_web_page_preview: options.disable_web_page_preview ?? true,
        reply_markup: options.reply_markup,
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.error('❌ Telegram API error:', errJson);
        this.errorCount++;
        return false;
      }

      this.messageCount++;
      this.lastMessageTimestamp = Date.now();
      return true;
    } catch (err: any) {
      console.error('❌ Telegram network error:', err?.message);
      this.errorCount++;
      return false;
    }
  }

  /**
   * Registers official bot commands with Telegram.
   */
  public async registerCommands(): Promise<boolean> {
    this.initToken();
    if (!this.isConfigured || !this.botToken) return false;

    const commands = [
      { command: 'start', description: 'Overview & quick access dashboard' },
      { command: 'status', description: 'System health & market feeds status' },
      { command: 'btc', description: 'Bitcoin macro regime & volatility' },
      { command: 'spikes', description: 'Active high-volume spike anomalies' },
      { command: 'top', description: 'Top momentum gainers & turnover' },
      { command: 'long', description: 'High-probability Long candidates' },
      { command: 'short', description: 'High-probability Short candidates' },
      { command: 'watchlist', description: 'Your tracked symbols' },
      { command: 'signals', description: 'Signal Journal recent alerts' },
      { command: 'history', description: 'Historical spike outcomes & analytics' },
      { command: 'health', description: 'Diagnostics, latencies & data freshness' },
      { command: 'settings', description: 'Configure alert thresholds & cooldowns' },
    ];

    try {
      const res = await fetch(`https://api.telegram.org/bot${this.botToken}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Configures official bot description.
   */
  public async setBotDescription(): Promise<boolean> {
    this.initToken();
    if (!this.isConfigured || !this.botToken) return false;

    try {
      await fetch(`https://api.telegram.org/bot${this.botToken}/setMyDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description:
            'Eagle Flash is a real-time crypto spike intelligence bot. Track unusual volume, momentum, order flow, open interest, liquidations, breakouts and market conditions from the Eagle Flash scanner.',
        }),
      });

      await fetch(`https://api.telegram.org/bot${this.botToken}/setMyShortDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          short_description: 'Real-time crypto spike intelligence ⚡',
        }),
      });

      return true;
    } catch {
      return false;
    }
  }
}

export const telegramService = new TelegramService();
