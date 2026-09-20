# EAGLE FLASH — Telegram Bot Service Documentation (@eaglespike_bot)

## 1. Overview & Security Architecture
Telegram serves as the real-time notification, alert, and remote command interface for **EAGLE FLASH**.
- **Bot Handle**: `@eaglespike_bot`
- **Security Rule**: The bot token and webhook secret reside strictly server-side in `process.env.TELEGRAM_BOT_TOKEN` and `process.env.TELEGRAM_WEBHOOK_SECRET`.
- **Zero Token Leakage**: Tokens are **never** accessible to browser JavaScript, HTML markup, localStorage, or Git commits.

```
                  TELEGRAM CLOUD
                        │
       (HTTPS POST Webhook with Secret Token)
                        │
                        ▼
         Next.js Webhook Route (/api/telegram/webhook)
                        │
         [X-Telegram-Bot-Api-Secret-Token Validation]
                        │
                        ▼
             TelegramCommandHandler
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
  Backend Query Models        SpikeEventStore
          │                           │
          └─────────────┬─────────────┘
                        │
                        ▼
             TelegramService (Send Response)
```

---

## 2. Command Suite
Registered via Telegram `setMyCommands` API:

| Command | Purpose | Mobile Response |
| :--- | :--- | :--- |
| `/start` | Overview & quick inline keyboard | Inline menu with buttons |
| `/status` | Connectivity, active symbols & latencies | Health status summary |
| `/btc` | Bitcoin macro regime & volatility | BTC price, 24h vol, systemic posture |
| `/spikes` | Active volume spikes & anomalies | Top spike candidates (Score $\ge 65$) |
| `/top` | Top 24h momentum movers | Top gainers and dollar turnover |
| `/long` | High-probability Long candidates | Directional setups with volume confirmation |
| `/short` | High-probability Short candidates | Breakdown candidates |
| `/signals` | Recent Signal Journal alerts | Recent alerts and MFE progress |
| `/history` | Historical spike outcomes & analytics | Sample size, median +15m/+1h returns, MFE |
| `/health` | Diagnostics & feed freshess | REST/WS latencies, heap memory, freshness |
| `/settings` | Configured thresholds | RVOL, Score, Cooldown settings |
| `/coin <sym>` | Single-asset intelligence report | Direct metrics & terminal trade links |

---

## 3. State-Change Alert System
Alerts are triggered on **meaningful state transitions** rather than tick-by-tick noise:
- `SPIKE_STARTED`
- `SPIKE_ACCELERATING`
- `SPIKE_EXTREME`
- `SPIKE_EXHAUSTION`
- `SPIKE_COOLING`
- `SPIKE_REVERSAL`
- `SPIKE_CONTINUATION`
- `SHORT_SQUEEZE`
- `LONG_SQUEEZE`
- `VOLUME_EXPLOSION`

### Deduplication & Cooldown
- **Deduplication Key**: `${symbol}_${state}`
- **Cooldown Window**: Configurable, default 20 minutes per symbol.
- **Global Rate Limiter**: Maximum 20 alerts per minute across all channels.
- **Automatic Batching**: When $> 5$ symbols trigger within 15 seconds, alerts are coalesced into a structured batch message.

### Mobile Alert Format
```
⚡ EAGLE FLASH SPIKE

AVAXUSDT

Price: $9.708
5M: +3.2%
15M: +6.7%
1H: +11.4%
RVOL: 3.13x
Volume Z: 5.32
OI: $76.5M (+8.7%)
Taker Flow: +45%
RSI: 73
Eagle Score: 85/100
Phase: ACCELERATION
Type: MOMENTUM
Quality: HIGH
Data Confidence: 97%
BTC Regime: NEUTRAL

Why:
• Volume expansion
• Strong taker imbalance
• Elevated RVOL
• OI expansion

⚠️ Spike detection is market intelligence, not a guaranteed trade signal.
```

---

## 4. Local Development Runner (Long Polling)
When running locally without an HTTPS public domain:
```bash
node scripts/telegram_poll.mjs
```
The script resets existing webhooks and uses `getUpdates` with long-polling timeout to forward updates to `http://localhost:3000/api/telegram/webhook`.
