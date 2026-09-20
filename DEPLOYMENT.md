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

## 4. 24/7 Process Management (PM2)

Using PM2 ensures automatic restarts on crashes, reboot persistence, and 24/7 autonomous operation for the Web App, Telegram Bot, and Cloud Market Scanner:

### The 3-in-1 Production Ecosystem (`ecosystem.config.cjs`)
```javascript
module.exports = {
  apps: [
    {
      name: 'eagle-flash-web',
      script: 'npm',
      args: 'run start',
      cwd: './apps/web',
      env: { NODE_ENV: 'production', PORT: 3000 },
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G'
    },
    {
      name: 'eagle-flash-telegram-bot',
      script: 'scripts/telegram_poll.mjs',
      cwd: './',
      env: { NODE_ENV: 'production' },
      autorestart: true,
      restart_delay: 5000
    },
    {
      name: 'eagle-flash-cloud-scanner',
      script: 'scripts/server_scanner.mjs',
      cwd: './',
      env: { NODE_ENV: 'production', SCAN_INTERVAL_MS: 30000 },
      autorestart: true,
      restart_delay: 5000
    }
  ]
};
```

### Launch Everything with 1 Command:
```bash
# Start all 3 services (Web App + Telegram Bot + 24/7 Cloud Scanner)
npm run start:all

# Save for auto-start on server reboot
pm2 save
pm2 startup

# Monitor live logs
pm2 logs
```

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
