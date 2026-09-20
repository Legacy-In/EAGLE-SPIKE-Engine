import { NextRequest, NextResponse } from 'next/server';
import { telegramCommandHandler } from '@sigma/services/telegram/command-handler';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Webhook Secret Token Validation
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret && expectedSecret !== 'your_random_webhook_secret_here') {
      const incomingSecret = req.headers.get('x-telegram-bot-api-secret-token');
      if (incomingSecret !== expectedSecret) {
        console.warn('⛔ Unauthorized Telegram Webhook invocation: secret token mismatch.');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // 2. Parse Incoming Telegram Update
    const update = await req.json();

    if (update?.message) {
      const msg = update.message;
      const chatId = msg.chat?.id;
      const text = msg.text || '';

      if (chatId && text) {
        // Asynchronously handle message to respond to Telegram immediately (<200ms)
        telegramCommandHandler.handleMessage(chatId, text).catch((err) => {
          console.error('Error in telegram command handler:', err);
        });
      }
    } else if (update?.callback_query) {
      const query = update.callback_query;
      const chatId = query.message?.chat?.id;
      const data = query.data || '';

      if (chatId && data) {
        telegramCommandHandler.handleMessage(chatId, data).catch((err) => {
          console.error('Error in telegram callback handler:', err);
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Telegram Webhook error:', err?.message);
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ACTIVE',
    service: 'Eagle Flash Telegram Webhook',
    method: 'POST',
  });
}
