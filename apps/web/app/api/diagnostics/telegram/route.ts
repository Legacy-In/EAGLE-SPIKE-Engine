import { NextRequest, NextResponse } from 'next/server';
import { OutboxTelemetry } from '@sigma/backend/services/telegram-outbox.mjs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const isConfigured = Boolean(
    process.env.TELEGRAM_BOT_TOKEN &&
    !process.env.TELEGRAM_BOT_TOKEN.includes('your_telegram_bot_token')
  );

  return NextResponse.json({
    success: true,
    service: 'EAGLE_FLASH_TELEGRAM_NOTIFICATIONS',
    timestamp: new Date().toISOString(),
    status: isConfigured ? 'CONFIGURED' : 'NOT_CONFIGURED',
    chat_id_configured: Boolean(process.env.TELEGRAM_CHAT_ID),
    queue: {
      queued_total: OutboxTelemetry.queuedTotal,
      sent_total: OutboxTelemetry.sentTotal,
      retries_total: OutboxTelemetry.retriesTotal,
      failed_total: OutboxTelemetry.failedTotal,
    },
    last_sent_at: OutboxTelemetry.lastSentAt,
    last_error: OutboxTelemetry.lastError,
  });
}
