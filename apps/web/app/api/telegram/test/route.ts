import { NextRequest, NextResponse } from 'next/server';
import { alertDispatcher } from '@sigma/services/telegram/alert-dispatcher';
import { telegramService } from '@sigma/services/telegram/telegram-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken || botToken.includes('your_telegram_bot_token')) {
      return NextResponse.json(
        {
          success: false,
          error: 'TELEGRAM_BOT_TOKEN is not configured in .env or apps/web/.env.local',
          solution: 'Set TELEGRAM_BOT_TOKEN in .env with your token from @BotFather',
        },
        { status: 400 }
      );
    }

    const explicitTarget = body.targetChatId;
    const targets = alertDispatcher.getRecipientChatIds(explicitTarget);

    if (targets.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No target Telegram channel or chat configured',
          solution:
            'Set TELEGRAM_CHAT_ID or TELEGRAM_CHANNEL_ID in .env (e.g. @your_channel or -100xxxxxxxxxx) and add @eaglespike_bot as an Admin with Post Messages permission.',
        },
        { status: 400 }
      );
    }

    const results: any[] = [];
    const testMessage =
      `🦅 <b>EAGLE FLASH — TEST CHANNEL BROADCAST</b>\n\n` +
      `🟢 <b>Bot Link:</b> @eaglespike_bot (Verified)\n` +
      `⚡ <b>Engine:</b> score_v2.1.0 (Active)\n` +
      `📡 <b>Channel Link:</b> ACTIVE & VERIFIED\n\n` +
      `<i>High-confidence volume spikes and lifecycle signals will automatically be forwarded to this channel in real time.</i>`;

    for (const target of targets) {
      try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: target,
            text: testMessage,
            parse_mode: 'HTML',
          }),
        });

        const json = await res.json();
        if (json.ok) {
          results.push({
            target,
            success: true,
            messageId: json.result?.message_id,
            chatTitle: json.result?.chat?.title || json.result?.chat?.username || target,
          });
        } else {
          let advice = 'Check channel permissions.';
          const desc = json.description || '';
          if (desc.includes('chat not found')) {
            advice =
              'Telegram could not find this chat or channel. If the channel is private, use the numeric ID (-100...). If public, use @channel_username.';
          } else if (desc.includes('not a member') || desc.includes('bot was kicked')) {
            advice = 'The bot has not been added to the channel. Add @eaglespike_bot to your channel as an Administrator.';
          } else if (desc.includes('administrator rights') || desc.includes('need administrator rights')) {
            advice =
              'The bot is in the channel but lacks admin rights. Open Channel Settings > Administrators > Add Admin > Enable "Post Messages".';
          }

          results.push({
            target,
            success: false,
            error: json.description,
            solution: advice,
          });
        }
      } catch (err: any) {
        results.push({
          target,
          success: false,
          error: err?.message,
        });
      }
    }

    const allSucceeded = results.every((r) => r.success);
    return NextResponse.json({
      success: allSucceeded,
      targets: results,
      allSucceeded,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function GET() {
  const targets = alertDispatcher.getRecipientChatIds();
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const configured = !!(token && !token.includes('your_telegram_bot_token'));

  return NextResponse.json({
    botConfigured: configured,
    configuredTargetsCount: targets.length,
    targets: targets.map((t) => (t.startsWith('@') ? t : `${t.slice(0, 4)}...${t.slice(-3)}`)),
  });
}
