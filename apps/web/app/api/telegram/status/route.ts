import { NextResponse } from 'next/server';
import { telegramService } from '@sigma/services/telegram/telegram-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = telegramService.getStatus();

  return NextResponse.json({
    success: true,
    bot: '@eaglespike_bot',
    connected: status.configured,
    totalMessagesSent: status.messageCount,
    errorCount: status.errorCount,
    lastActivity: status.lastMessageTime ? new Date(status.lastMessageTime).toISOString() : null,
    webhookEndpoint: '/api/telegram/webhook',
  });
}
