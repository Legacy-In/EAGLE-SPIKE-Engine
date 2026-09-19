# 🦅 EAGLE FLASH — Vol Spike Candidate & SIGMA Workstation

[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen?style=for-the-badge&logo=github)](https://fahad0013.github.io/EAGLE-FLASH/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **Institutional-grade crypto derivatives scanner & quantitative intelligence workstation.**
> Monitor Bybit USDT Perpetual markets in real time, detect abnormal volume expansion, uncover momentum/accumulation/distribution candidates, and generate explainable **LONG / SHORT / WATCH** signals.

---

## 🌐 Live Deployment & GitHub Pages

- **Live GitHub Pages URL**: **[https://fahad0013.github.io/EAGLE-FLASH/](https://fahad0013.github.io/EAGLE-FLASH/)**
- **Alternative Standalone Terminal**: Open `index.html` directly in any web browser (zero dependencies, 100% client-side live WebSocket feed).

---

## 🚀 Key Modules & Capabilities

### 🦅 EAGLE FLASH Scanner (`index.html`)
- **Real-Time Market Microstructure**: Live Bybit WebSocket L1 ticker + Kline + Orderbook streams.
- **Microstructure Intelligence Engine**:
  - **Volume Spike Multipliers** ($2\times$ to $5\times$+ against rolling baseline).
  - **Open Interest Velocity** ($\Delta \text{OI}$ concurrent with price expansion).
  - **Funding Rate Anomalies** & Predicted Settlement Crowding.
  - **Order Book Imbalance** (Bid/Ask depth ratio & spread liquidity score).
  - **Regime Classification**: Aggressive Breakout, Squeeze Risk, Volume Trapping, Distribution Drift.
- **Explainable Decision Engine**: Deterministic quantitative scoring giving confidence ratings ($0-100\%$) and actionable triggers.
- **Mobile-First Institutional UI**:
  - Sticky bottom navigation bar for high-speed switching on mobile devices.
  - High-density mobile data grid with zero text clipping.
  - Dark terminal theme with high-contrast status badges.

### ⚡ SIGMA Workstation (`apps/web`)
- Full Next.js 15 TypeScript trading workstation.
- Multi-exchange institutional order book (Bybit, Binance, Coinbase, Kraken).
- Macro correlation matrix & on-chain metrics (DefiLlama TVL, MVRV, Fear & Greed).
- Backtesting engine & risk management matrix (VaR, Kelly criterion, drawdown limits).

---

## 🛠️ Local Development & Quick Start

### 1. Zero-Install / Standalone Mode
Simply double-click `index.html` or serve it with any local static web server:
```bash
npx serve .
# or
python -m http.server 8000
```
Open `http://localhost:8000` in your browser.

### 2. Next.js Workstation
```bash
cd apps/web
npm install
npm run dev
```
Open `http://localhost:3000`.

---

## ⚙️ How to Enable GitHub Pages (Repository Settings)

1. Go to your repository on GitHub: `https://github.com/fahad0013/EAGLE-FLASH`
2. Click **Settings** $\to$ **Pages** (in the left sidebar).
3. Under **Build and deployment** $\to$ **Source**:
   - Select **Deploy from a branch**.
   - Branch: `main`
   - Folder: `/ (root)`
4. Click **Save**.
5. Within 1–2 minutes, your website will be live at:
   👉 **`https://fahad0013.github.io/EAGLE-FLASH/`**

---

## 📄 License
MIT © [fahad0013](https://github.com/fahad0013)
