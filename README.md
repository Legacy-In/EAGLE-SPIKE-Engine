# 🦅 EAGLE FLASH — Production-Grade Crypto Spike Intelligence System

[![GitHub Pages](https://img.shields.io/badge/Live%20Terminal-GitHub%20Pages-brightgreen?style=for-the-badge&logo=github)](https://fahad0013.github.io/EAGLE-FLASH/)
[![Next.js 15](https://img.shields.io/badge/Workstation-Next.js%2015-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Telegram Bot](https://img.shields.io/badge/Telegram%20Bot-@eaglespike__bot-2CA5E0?style=for-the-badge&logo=telegram)](https://t.me/eaglespike_bot)
[![Tests](https://img.shields.io/badge/Tests-36%2F36%20Passing-success?style=for-the-badge)](tests/)
[![Security Audit](https://img.shields.io/badge/Security-Zero%20Secret%20Exposure-blue?style=for-the-badge)](SECURITY.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **Institutional-grade cryptocurrency spike intelligence terminal and quantitative scanning engine.**
> Monitors **2,930+ USDT perpetual contracts** in real time across **Bybit Linear (880+)**, **MEXC Contract (1,060+)**, and **WEEX Contract (990+)**. Computes multi-timeframe volume anomalies, taker order flow imbalances, open interest expansion, and macroeconomic Bitcoin regimes with an explainable 8-factor mathematical scoring model and automated Telegram bot dispatching.

---

## 📑 Technical Documentation Suite

| Document | Description |
| :--- | :--- |
| [**`ARCHITECTURE.md`**](ARCHITECTURE.md) | High-level system architecture, data normalization, multi-timeframe feature pipelines, and event store schema |
| [**`SCORING.md`**](SCORING.md) | Explainable Eagle Score (`score_v2.1.0`) 8-factor mathematical decomposition, weights, and confidence grading |
| [**`SPIKE_ENGINE.md`**](SPIKE_ENGINE.md) | 9-state spike lifecycle state machine, hysteresis rules, anti-flicker transitions, and feature definitions |
| [**`TELEGRAM.md`**](TELEGRAM.md) | Telegram bot (`@eaglespike_bot`) command specification, dispatcher architecture, rate-limiting, and alert formatting |
| [**`SECURITY.md`**](SECURITY.md) | Operational security policy, zero-secret exposure architecture, sanitization, and automated audit pipeline |
| [**`BACKTESTING.md`**](BACKTESTING.md) | Spike backtest engine, forward return calculation (+1m to +1d), MFE/MAE tracking, and cohort stratification |
| [**`DEPLOYMENT.md`**](DEPLOYMENT.md) | Production deployment guide, PM2 process management, Nginx reverse proxy, SSL, and webhook configuration |
| [**`ENVIRONMENT.md`**](ENVIRONMENT.md) | Environment variables reference, types, defaults, and development vs. production setup modes |

---

## 🌐 Live Access & Deployment

- **GitHub Pages Static Terminal**: **[https://fahad0013.github.io/EAGLE-FLASH/](https://fahad0013.github.io/EAGLE-FLASH/)**
- **Next.js Workstation Local Server**: `http://localhost:3000`
- **Telegram Bot**: **[@eaglespike_bot](https://t.me/eaglespike_bot)**

---

## 🦅 Core System Architecture & Features

```
+-------------------------------------------------------------------------+
|                         EXCHANGE MARKET DATA                            |
|    Bybit Public WS & REST  |  MEXC Contract REST  |  WEEX Contract REST |
|         (880+ pairs)       |     (1,060+ pairs)   |     (990+ pairs)    |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                     MULTI-TIMEFRAME FEATURE ENGINE                      |
|           • Timeframe-Correct Relative Volume (RVOL 1m, 5m, 15m)        |
|           • Volume Z-Score & Statistical Anomaly (Vol Z)                |
|           • Trade-Count Acceleration & Velocity                         |
|           • Taker Buy/Sell Order Flow Imbalance (CVD Delta)             |
|           • Open Interest (OI) 5m/15m/1h Delta & Structure             |
|           • Order Book 0.1%/0.5%/1.0% Depth Imbalance & Spread          |
|           • Market-Wide Breadth & Volume Breadth                        |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                     SPIKE CLASSIFICATION & QUALITY                      |
|    • Spike Lifecycle State Machine (9 States with Hysteresis):          |
|      NORMAL -> PRE_SPIKE -> EARLY_SPIKE -> ACCELERATION -> EXTREME      |
|      -> EXHAUSTION -> COOLING -> REVERSAL -> CONTINUATION               |
|    • Spike Type Classifier (MOMENTUM, BREAKOUT, VOLUME_EXPLOSION,       |
|      SHORT_SQUEEZE, LONG_SQUEEZE, ACCUMULATION, LOW_LIQUIDITY)          |
|    • Spike Quality Evaluator (HIGH, MEDIUM, LOW, EXHAUSTION_RISK)       |
|    • Versioned Eagle Score (score_v2.1.0): 8-Factor Decomposition       |
+-------------------------------------------------------------------------+
                                    |
                    +---------------+---------------+
                    |                               |
                    v                               v
+---------------------------------------+  +------------------------------+
|     HIGH-DENSITY DARK TERMINAL UI     |  |   TELEGRAM BOT SERVICE       |
|  • 15 Core Metrics + Responsive Grid  |  |   • @eaglespike_bot          |
|  • SVG Trend Sparklines               |  |   • 13 Interactive Commands  |
|  • Clickable 8-Factor Score Modal     |  |   • Rate-Limited Dispatcher  |
|  • Section 30 Coin Detail Drawer      |  |   • Deduplication & Cooldown |
|  • Real-Time WebSocket Updates        |  |   • Rich Markdown Alerts     |
+---------------------------------------+  +------------------------------+
```

### 1. Multi-Timeframe Feature Engine
- **Timeframe-Correct RVOL**: Computes current volume vs. rolling 20-period baseline on matched timeframe buckets (1m, 5m, 15m, 1h).
- **Volume Z-Score (`volZ`)**: Statistical standard deviation multiplier measuring abnormal volume intensity.
- **Taker Order Flow Imbalance (`takerRatio`)**: Ratio of taker buy volume to total taker volume ($> 0.65$ aggressive buying, $< 0.35$ aggressive selling).
- **Open Interest Velocity (`oiDelta`)**: Tracks concurrent capital flow to distinguish genuine breakouts from short squeezes or liquidation flushes.
- **Order Book Imbalance (`depthImbalance`)**: Measures bid vs. ask depth across 0.1%, 0.5%, and 1.0% bands.

### 2. 9-State Spike Lifecycle State Machine
Prevents false alarms and indicator flickering using hysteresis and minimum confirmation periods:
$$\text{NORMAL} \longrightarrow \text{PRE\_SPIKE} \longrightarrow \text{EARLY\_SPIKE} \longrightarrow \text{ACCELERATION} \longrightarrow \text{EXTREME} \longrightarrow \text{EXHAUSTION} \longrightarrow \text{COOLING} \longrightarrow \text{REVERSAL / CONTINUATION}$$

### 3. Explainable Eagle Score (`score_v2.1.0`)
A deterministic, 100-point multi-factor model with zero "black box" heuristics:
- **Price Acceleration**: 20 points
- **Volume Confirmation**: 20 points
- **Relative Volume (RVOL)**: 20 points
- **Order Flow (Taker Ratio)**: 15 points
- **Open Interest Delta**: 10 points
- **Order Book Liquidity**: 5 points
- **Bitcoin Macro Regime**: 5 points
- **Data Quality & Confidence**: 5 points

Clicking any score badge in the terminal opens the **Score Decomposition Modal** displaying the exact point breakdown, contributing factors, and confidence grading.

### 4. Telegram Bot Integration (`@eaglespike_bot`)
Full-featured server-side Telegram bot supporting:
- **Interactive Commands**: `/start`, `/status`, `/btc`, `/spikes`, `/top`, `/long`, `/short`, `/watchlist`, `/signals`, `/history`, `/health`, `/settings`, `/coin <SYMBOL>`.
- **Intelligent Dispatcher**: Automatic state-change alerts with per-coin cooldowns (15 min), global throttling (20 msgs/min), deduplication, and markdown formatting.
- **Dual Mode**: Operates via serverless HTTPS Webhook (`/api/telegram/webhook`) or standalone background polling daemon (`scripts/telegram_poll.mjs`).

---

## 🛠️ Quick Start & Local Development

### 1. Zero-Install Standalone Terminal
Simply open `index.html` or `dist-eagle-flash/index.html` in any browser, or serve statically:
```bash
npx serve .
# or
python -m http.server 8000
```
Open `http://localhost:8000`.

### 2. Full Next.js Workstation & API Server
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Run all unit tests, security audits, and HTML verification
npm test

# 4. Start Next.js development server
npm run dev
```
Open `http://localhost:3000`.

### 3. Telegram Bot Background Polling Daemon
If running locally without a public webhook endpoint:
```bash
node scripts/telegram_poll.mjs
```

---

## 🧪 Verification & Test Suite

The project includes an automated test and verification suite:

```bash
npm test
```

Executes:
1. `tests/spike-intelligence.test.ts` (15 unit tests: scoring, features, types, backtesting, BTC regime)
2. `tests/lifecycle.test.mjs` (14 unit tests: state transitions, hysteresis, cooldowns)
3. `tests/engine.test.mjs` (7 unit tests: order book imbalance, volume Z-score)
4. `scripts/security_audit.mjs` (Zero-secret audit across files and client HTML)
5. `scripts/verify_clean.mjs` (DOM and script integrity across all 3 HTML surfaces)

**Result**: 36/36 tests passing, 0 errors, 0 secrets leaked.

---

## 📄 License
MIT © [fahad0013](https://github.com/fahad0013)
