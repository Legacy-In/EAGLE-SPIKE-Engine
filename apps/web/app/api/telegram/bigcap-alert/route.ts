import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function formatBigCapTelegramAlert(sig: any): string {
  const bullets = Array.isArray(sig.rationale_json) ? sig.rationale_json : [];
  const b0 = bullets[0] || 'Institutional volume compression breakout verified';
  const b1 = bullets[1] || 'Open Interest positioning and delta confluence confirmed';
  const b2 = bullets[2] || 'Macro trading session volatility threshold satisfied';
  const b3 = bullets[3] || 'Optimal execution timeframe isolated';

  return (
    `🦅 BIG-CAP SPIKE DETECTED\n\n` +
    `🪙 Symbol: ${sig.symbol}\n` +
    `📈 Direction: ${sig.direction}\n` +
    `⚡ Best TF: ${sig.best_timeframe}\n` +
    `🎯 Entry: $${sig.entry_price}\n` +
    `🛑 Stop-Loss: $${sig.stop_loss_price}\n` +
    `🚀 TP1 / TP2: $${sig.target_price_1} / $${sig.target_price_2}\n` +
    `📊 Eagle Score: ${sig.eagle_score} | RVOL: ${sig.rvol}x\n\n` +
    `Deterministic Rationale:\n` +
    `• ${b0}\n` +
    `• ${b1}\n` +
    `• ${b2}\n` +
    `• ${b3}`
  );
}

export async function POST(req: NextRequest) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId || token.includes('your_telegram_bot_token')) {
      return NextResponse.json(
        { success: false, error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured on server' },
        { status: 503 }
      );
    }

    // Parse body: handles Supabase Database Webhooks ({ type, table, record }) or direct payload
    const body = await req.json();
    const sig = body.record || body;

    if (!sig || !sig.symbol) {
      return NextResponse.json({ success: false, error: 'Invalid payload: missing signal data' }, { status: 400 });
    }

    // Only dispatch on ACTIVE signals
    if (sig.status !== 'ACTIVE') {
      return NextResponse.json({ success: false, message: 'Ignored: signal is not ACTIVE' }, { status: 200 });
    }

    const messageText = formatBigCapTelegramAlert(sig);

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.ok) {
      return NextResponse.json({
        success: true,
        symbol: sig.symbol,
        messageId: data.result?.message_id,
      });
    } else {
      return NextResponse.json(
        { success: false, error: data?.description || res.statusText },
        { status: 502 }
      );
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  const configured = Boolean(
    process.env.TELEGRAM_BOT_TOKEN &&
    process.env.TELEGRAM_CHAT_ID &&
    !process.env.TELEGRAM_BOT_TOKEN.includes('your_telegram_bot_token')
  );

  return NextResponse.json({
    status: 'ACTIVE',
    service: 'Big-Cap Telegram Alert Dispatcher Micro-Endpoint',
    configured,
  });
}
