import { NextResponse } from 'next/server';
import { telegramService } from '@sigma/services/telegram/telegram-service';
import { alertDispatcher } from '@sigma/services/telegram/alert-dispatcher';
import { spikeEventStore } from '@sigma/services/spike-intelligence/event-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = telegramService.getStatus();
  const targets = alertDispatcher.getRecipientChatIds();
  const events = spikeEventStore.queryEvents({ limit: 100 });

  return NextResponse.json({
    success: true,
    bot: '@eaglespike_bot',
    connected: status.configured,
    channelConfigured: targets.length > 0,
    configuredTargets: targets.map((t) => (t.startsWith('@') ? t : `${t.slice(0, 4)}...${t.slice(-3)}`)),
    eventsInStore: events.length,
    highConfidenceSignals: events.filter((e) => e.eagleScore >= 70).length,
    totalMessagesSent: status.messageCount,
    errorCount: status.errorCount,
    lastActivity: status.lastMessageTime ? new Date(status.lastMessageTime).toISOString() : null,
    webhookEndpoint: '/api/telegram/webhook',
  });
}
