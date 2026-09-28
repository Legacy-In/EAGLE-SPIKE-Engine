import { NextRequest, NextResponse } from 'next/server';
import { DiscordNotificationService } from '@sigma/backend/services/discord/discord-notification-service.mjs';
import { NotificationTelemetry } from '@sigma/backend/services/notification-outbox.mjs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const client = DiscordNotificationService.getClient();
  const isConfigured = client.isConfigured();

  let botUser = null;
  let connectionStatus = 'DISCONNECTED';

  if (isConfigured) {
    try {
      const userRes = await client.getBotUser();
      if (userRes && userRes.connected) {
        connectionStatus = 'CONNECTED';
        botUser = {
          id: userRes.id,
          username: userRes.username,
          discriminator: userRes.discriminator,
        };
      } else {
        connectionStatus = userRes.error ? `ERROR: ${userRes.error}` : 'DISCONNECTED';
      }
    } catch (err: any) {
      connectionStatus = `ERROR: ${err?.message}`;
    }
  }

  return NextResponse.json({
    success: true,
    service: 'EAGLE_FLASH_DISCORD_NOTIFICATIONS',
    timestamp: new Date().toISOString(),
    status: isConfigured ? 'CONFIGURED' : 'NOT_CONFIGURED',
    connection: connectionStatus,
    bot: botUser,
    channels: {
      signals: Boolean(process.env.DISCORD_CHANNEL_SIGNALS),
      quick_pump: Boolean(process.env.DISCORD_CHANNEL_QUICK_PUMP),
      breakouts: Boolean(process.env.DISCORD_CHANNEL_BREAKOUTS),
      whales: Boolean(process.env.DISCORD_CHANNEL_WHALES),
      squeezes: Boolean(process.env.DISCORD_CHANNEL_SQUEEZES),
      big_cap: Boolean(process.env.DISCORD_CHANNEL_BIG_CAP),
      tp_hits: Boolean(process.env.DISCORD_CHANNEL_TP_HITS),
      stop_loss: Boolean(process.env.DISCORD_CHANNEL_STOP_LOSS),
      market_alerts: Boolean(process.env.DISCORD_CHANNEL_MARKET_ALERTS),
      blockchain_proof: Boolean(process.env.DISCORD_CHANNEL_BLOCKCHAIN_PROOF),
      bot_status: Boolean(process.env.DISCORD_CHANNEL_BOT_STATUS),
    },
    queue: {
      queued_total: NotificationTelemetry.discordQueuedTotal,
      sent_total: NotificationTelemetry.discordSentTotal,
      retries_total: NotificationTelemetry.retriesTotal,
      failures_total: NotificationTelemetry.failuresTotal,
    },
    last_sent_at: NotificationTelemetry.lastSentAt || client.lastSentAt,
    last_error: client.lastError ? String(client.lastError) : null,
  });
}
