# EAGLE FLASH — Environment Variables & Configuration Reference

## 1. Overview

EAGLE FLASH uses environment variables to configure exchange API connectivity, Telegram Bot integration, server runtime ports, and quantitative scoring thresholds.

A starter template file [`.env.example`](file:///.env.example) is provided in the repository root. Copy it to `.env` or `.env.local` to configure your instance:

```bash
cp .env.example .env
```

> **IMPORTANT**: Never commit `.env`, `.env.local`, or `.env.production` to git. Ensure all sensitive keys remain strictly server-side.

---

## 2. Configuration Parameters

### Server & Runtime
| Variable | Type | Default | Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | `number` | `3000` | No | HTTP port for Next.js web application and API routes |
| `NODE_ENV` | `string` | `development` | No | Node environment (`development` or `production`) |

### Telegram Bot Integration (`@eaglespike_bot`)
| Variable | Type | Default | Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | `string` | *(None)* | For Bot | Bot API token issued by [@BotFather](https://t.me/botfather) |
| `TELEGRAM_CHAT_ID` | `string` | *(None)* | Optional | Default destination Telegram chat or channel ID for auto-broadcasts |
| `TELEGRAM_WEBHOOK_SECRET` | `string` | *(None)* | For Webhook | Custom secret token to validate incoming webhook requests from Telegram (`X-Telegram-Bot-Api-Secret-Token`) |

### Exchange API Credentials
Exchange market data can be streamed via public REST/WebSocket endpoints without authentication. If you require higher rate limits or private endpoint access, provide your exchange API credentials:

| Variable | Type | Default | Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `BYBIT_API_KEY` | `string` | *(None)* | Optional | Bybit API Key (Linear USDT Futures) |
| `BYBIT_API_SECRET` | `string` | *(None)* | Optional | Bybit API Secret |
| `MEXC_API_KEY` | `string` | *(None)* | Optional | MEXC Futures API Key (Contract v1) |
| `MEXC_API_SECRET` | `string` | *(None)* | Optional | MEXC Futures API Secret / Access Token |
| `WEEX_API_KEY` | `string` | *(None)* | Optional | WEEX Futures API Key |
| `WEEX_API_SECRET` | `string` | *(None)* | Optional | WEEX Futures Secret Token |

### Spike Engine Thresholds & Tuning (Optional Overrides)
| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `RVOL_TRIGGER_THRESHOLD` | `number` | `2.5` | Minimum 5m Relative Volume multiplier to trigger `EARLY_SPIKE` |
| `VOL_Z_TRIGGER_THRESHOLD` | `number` | `2.0` | Minimum volume Z-score to confirm statistical anomaly |
| `MIN_CONFIDENCE_PERCENT` | `number` | `60` | Minimum data confidence score ($0-100\%$) required to broadcast alert |
| `ALERT_COOLDOWN_MINUTES` | `number` | `15` | Minimum cooldown between consecutive Telegram alerts on the same coin |
| `MAX_ALERTS_PER_MINUTE` | `number` | `20` | Global throttle limit for outgoing Telegram messages |

---

## 3. Environment Specific Setups

### Local Development
In local development, create a `.env.local` file in the root or `apps/web/`:
```bash
# .env.local
TELEGRAM_BOT_TOKEN=your_test_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```
Start the Next.js development server:
```bash
npm run dev
```
In a separate terminal, launch the Telegram polling daemon to receive and reply to commands locally without needing a public HTTPS webhook:
```bash
node scripts/telegram_poll.mjs
```

### Production Deployment (PM2 / Systemd / Docker)
Export environment variables in your deployment supervisor or container definition:
```bash
export NODE_ENV=production
export PORT=3000
export TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
export TELEGRAM_CHAT_ID="-1001234567890"
export TELEGRAM_WEBHOOK_SECRET="your-strong-random-token"
```
Build and start the application:
```bash
npm run build
npm run start
```
Configure your Telegram webhook URL:
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/api/telegram/webhook", "secret_token": "your-strong-random-token"}'
```
