# EAGLE FLASH — Production Deployment & Operations Guide

## 1. Overview & Architecture Targets

EAGLE FLASH supports two deployment topologies:

1. **Static Edge / GitHub Pages Mode**:
   - Zero-dependency client-side terminal (`index.html` or `dist-eagle-flash/index.html`).
   - Connects directly to exchange WebSockets (Bybit Linear, etc.) from the client's browser.
   - Hosted on GitHub Pages, Cloudflare Pages, Vercel Static, or AWS S3/CloudFront.

2. **Full Next.js 15 Server-Side Intelligence Terminal**:
   - Runs full quantitative feature engine, multi-exchange data normalizer, spike event store, REST API (`/api/spikes`), and server-side Telegram bot dispatcher (`@eaglespike_bot`).
   - Hosted on Ubuntu VPS, AWS EC2, DigitalOcean, or Railway/Render/Fly.io.

---

## 2. Server Deployment Prerequisites

- **Node.js**: `v18.17.0` or higher (`v20.x` or `v22.x` recommended)
- **NPM**: `v9.x` or higher
- **Process Supervisor**: `pm2` or `systemd` (recommended for 24/7 background operation)
- **Domain & SSL**: Valid HTTPS certificate (required for Telegram Webhook integration)

---

## 3. Step-by-Step Production Installation

### Step 1: Clone and Configure
```bash
git clone https://github.com/fahad0013/EAGLE-FLASH.git
cd EAGLE-FLASH

# Copy environment template and fill in credentials
cp .env.example .env
nano .env
```

### Step 2: Install Dependencies & Run Verification
```bash
# Install workspace dependencies
npm install

# Run automated unit tests, security audit, and HTML cleanliness verification
npm test
```
All tests must pass (`0 errors`, `0 secrets leaked`).

### Step 3: Build Next.js Production Bundle
```bash
npm run build
```

---

## 4. 24/7 Process Management & Multi-Worker Ecosystem

EAGLE FLASH provides two execution modes to launch all 10 system services simultaneously:

### Mode A: Zero-Dependency Native Orchestrator (Cross-Platform Dev & Staging)
Launch the entire system from a single terminal with zero external binary dependencies (no PM2 needed):
```bash
# Start all 10 processes (Next.js workstation + 9 quantitative workers):
npm run start:all

# Start only the 9 backend workers (headless / without Web UI):
npm run start:workers
```
- **Staggered Startup**: Staggers child process launches by 300ms to eliminate socket bursts, port contention, and database rate-limiting.
- **Color-Coded Streaming**: Real-time console logs are tagged with distinct service badges (`[SCANNER]`, `[TP/SL]`, `[DISCORD]`, `[TG-OUT]`, `[TG-BOT]`, `[BIGCAP]`, `[CHKPNT]`, `[WHALE]`, `[ETH-WHALE]`, `[WEB]`).
- **Clean Signal Handling**: Intercepts `Ctrl+C` (`SIGINT`) and `SIGTERM` to gracefully kill all child processes without leaving background orphans.

---

### Mode B: Production PM2 Cluster (`ecosystem.config.cjs`)
For 24/7 autonomous production servers requiring auto-restart on memory leaks/crashes and system reboot persistence:

```bash
# Launch PM2 daemon across all 10 services
npm run pm2:start

# Inspect cluster health and resource consumption
npm run pm2:status

# Stream real-time logs across all workers
npm run pm2:logs

# Save process list for auto-boot upon server reboot
pm2 save
pm2 startup

# Stop PM2 cluster
npm run pm2:stop
```

#### Monitored Services in `ecosystem.config.cjs`:
1. `eagle-flash-web` (Port 3000 Next.js Workstation)
2. `eagle-flash-cloud-scanner` (`scripts/server_scanner.mjs`)
3. `eagle-flash-tpsl-monitor` (`scripts/tpsl_monitor_worker.mjs`)
4. `eagle-flash-discord-worker` (`scripts/discord_worker.mjs`)
5. `eagle-flash-telegram-outbox-worker` (`scripts/telegram_worker.mjs`)
6. `eagle-flash-telegram-bot` (`scripts/telegram_poll.mjs`)
7. `eagle-flash-bigcap-worker` (`scripts/bigcap_worker.mjs`)
8. `eagle-flash-checkpoint-worker` (`scripts/checkpoint_evaluator.mjs --loop`)
9. `eagle-flash-whale-detector` (`scripts/whale_detector_worker.mjs`)
10. `eagle-flash-etherscan-scanner` (`scripts/etherscan_whale_worker.mjs`)

---

## 5. Nginx Reverse Proxy & SSL Configuration

Configure Nginx to forward incoming HTTPS traffic to port 3000, ensuring WebSocket upgrade headers and Telegram webhook headers are preserved:

```nginx
server {
    server_name eagleflash.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Telegram webhook pass-through
    location /api/telegram/webhook {
        proxy_pass http://127.0.0.1:3000/api/telegram/webhook;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Telegram-Bot-Api-Secret-Token $http_x_telegram_bot_api_secret_token;
    }

    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/eagleflash.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/eagleflash.yourdomain.com/privkey.pem;
}
```

---

## 6. Telegram Webhook Registration

Register your webhook with Telegram:
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://eagleflash.yourdomain.com/api/telegram/webhook",
    "secret_token": "<YOUR_TELEGRAM_WEBHOOK_SECRET>",
    "allowed_updates": ["message", "callback_query"]
  }'
```

Verify webhook status:
```bash
curl "https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

---

## 7. Health Checks & Verification

Perform health inspections to verify operational integrity:
- **Telegram Bot Status**: `GET https://eagleflash.yourdomain.com/api/telegram/status`
- **Spike Intelligence API**: `GET https://eagleflash.yourdomain.com/api/spikes`
- **Exchange Ticker Relay**: `GET https://eagleflash.yourdomain.com/api/weex/tickers`

---

## 8. GitHub Pages Deployment (Static Terminal)

To deploy the static zero-dependency terminal to GitHub Pages:
1. Push all changes to GitHub: `git push origin main`.
2. In GitHub repository **Settings** $\to$ **Pages**:
   - Source: **Deploy from a branch**
   - Branch: `main`
   - Folder: `/ (root)`
3. Save. GitHub Pages builds automatically in under 60 seconds at:
   `https://fahad0013.github.io/EAGLE-FLASH/`
