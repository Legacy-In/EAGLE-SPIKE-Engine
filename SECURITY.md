# EAGLE FLASH — Security Policy & Operational Security Architecture

## 1. Zero-Secret Exposure Commitment

EAGLE FLASH adheres to a strict Zero-Secret Exposure Policy across all tiers:
1. **Client-Side Exclusion**: Neither private exchange API credentials (Bybit, MEXC, WEEX) nor Telegram Bot API tokens (`TELEGRAM_BOT_TOKEN`, `@eaglespike_bot`) are ever compiled into client-side bundles, injected into browser JavaScript, placed into HTML DOM attributes, or written to browser `localStorage` or `sessionStorage`.
2. **Git Version Control Safeguards**: `.env`, `.env.local`, `.env.production`, and credential store files are explicitly ignored in `.gitignore`.
3. **Automated Audit Enforcement**: Every build and test cycle (`npm test`) executes `scripts/security_audit.mjs`, validating that no API keys or bot tokens exist in tracked repository files or client HTML surfaces.

---

## 2. Environment Variable Segregation

Credentials and operational parameters are separated into environment tiers:

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | Server / Worker | Secret authentication token issued by @BotFather for `@eaglespike_bot` |
| `TELEGRAM_CHAT_ID` | Server / Worker | Default broadcast channel / admin chat ID |
| `TELEGRAM_WEBHOOK_SECRET` | Server API | Verification token for incoming Telegram webhooks (`X-Telegram-Bot-Api-Secret-Token`) |
| `BYBIT_API_KEY` / `BYBIT_API_SECRET` | Server / Local | Exchange API credentials for authenticated Bybit requests (if enabled) |
| `MEXC_API_KEY` / `MEXC_API_SECRET` | Server / Local | Exchange API credentials for authenticated MEXC requests |
| `WEEX_API_KEY` / `WEEX_API_SECRET` | Server / Local | Exchange API credentials for authenticated WEEX requests |
| `PORT` | Runtime | Next.js server port (default `3000`) |

A template file [`.env.example`](file:///.env.example) is committed to the repository with placeholder values to guide deployment without leaking live credentials.

---

## 3. Automated Security Verification Pipeline

Run the automated security audit at any time with:
```bash
node scripts/security_audit.mjs
```

The auditor executes the following validation checks:
- **Filesystem Scan**: Scans all `.js`, `.ts`, `.html`, `.json`, `.md`, and configuration files for exposed secrets matching regex patterns for Telegram bot tokens, MEXC keys, WEEX secrets, and Bybit credentials.
- **Client HTML Audit**: Specifically inspects `index.html`, `apps/web/public/eagle-flash.html`, and `dist-eagle-flash/index.html` to guarantee no raw credentials or environment variable interpolations leaked into client-delivered markups.
- **Git Stage Verification**: Prevents staging or committing any file containing actual secret values.

---

## 4. Telegram Bot Server-Side Architecture

The Telegram Bot component operates strictly in server-side isolation:
1. **Webhook Endpoint**: `POST /api/telegram/webhook` handles incoming updates from Telegram. The request header `X-Telegram-Bot-Api-Secret-Token` is verified against `process.env.TELEGRAM_WEBHOOK_SECRET` before parsing payloads.
2. **Polling Mode Daemon**: For local environments or non-public IP setups, `scripts/telegram_poll.mjs` runs as a standalone daemon using long polling (`getUpdates`). It communicates over HTTPS directly with the official Telegram API (`https://api.telegram.org/bot<TOKEN>/`).
3. **Public Status Masking**: The public status route `GET /api/telegram/status` exposes ONLY operational state:
   - Bot configuration status (`configured: boolean`)
   - Bot username (`@eaglespike_bot`)
   - Dispatcher status & pending alert queue count
   - **Zero tokens or credentials are returned in the JSON payload.**

---

## 5. API Endpoint Protection & Sanitization

- **Rate Limiting & Throttling**: Telegram alert dispatcher enforces:
  - Per-coin cooldown: minimum 15 minutes between alerts for the same symbol.
  - Global dispatch rate limit: maximum 20 messages per minute.
  - State deduplication: duplicate state transitions are suppressed.
- **Input Sanitization**: All incoming Telegram commands and REST query parameters are strongly typed and sanitized against SQL/command injection and malformed query inputs.
- **Error Obfuscation**: Upstream exchange connectivity errors (e.g. Bybit 429, MEXC rate limits) are logged internally and sanitized before returning responses to clients, preventing internal network topologies or header leaks.

---

## 6. Reporting Security Vulnerabilities

If you discover any security vulnerability, secret leakage, or potential exploit in EAGLE FLASH:
- **Do NOT open a public GitHub issue.**
- Submit a private security advisory via GitHub Security Advisories or contact the repository maintainers directly.
- All reports will be acknowledged within 24 hours with an assessment and remediation patch.
