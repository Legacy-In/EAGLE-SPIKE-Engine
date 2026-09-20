# EAGLE FLASH — System Architecture Documentation

## 1. Overview
EAGLE FLASH is a high-performance, production-grade real-time cryptocurrency spike intelligence terminal and quantitative scanning engine. It ingests perpetual futures market data across **Bybit Linear (880+)**, **MEXC Contract (1,060+)**, and **WEEX Contract (990+)**, analyzing **2,930+ live trading instruments** in real time.

```
+-------------------------------------------------------------------------+
|                         EXCHANGE MARKET DATA                            |
|    Bybit Public WS & REST  |  MEXC Contract REST  |  WEEX Contract REST |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                  DATA NORMALIZATION & QUALITY LAYER                     |
|           • Unified Ticker Normalization                                |
|           • Freshness & Latency Tracking (<5s Fresh, >30s Stale)       |
|           • Data Confidence Scoring (0 - 100%)                          |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                     MULTI-TIMEFRAME FEATURE ENGINE                      |
|           • Timeframe-Correct Relative Volume (RVOL 1m, 5m, 15m)        |
|           • Volume Z-Score & Statistical Anomaly (Vol Z)                |
|           • Trade-Count Acceleration                                    |
|           • Taker Buy/Sell Order Flow Imbalance (CVD Delta)             |
|           • Open Interest (OI) 5m/15m/1h Delta & Structure             |
|           • Order Book 0.1%/0.5%/1.0% Depth Imbalance & Spread          |
|           • Market-Wide Breadth & Volume Breadth                        |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                     BITCOIN MACRO REGIME ENGINE                         |
|    Evaluates BTC Velocity & Volatility (BULLISH, BEARISH, NEUTRAL,      |
|    HIGH_VOLATILITY, RISK_OFF, RISK_ON, MIXED)                           |
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
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
+-----------------------+                       +-----------------------+
|  HISTORICAL STORAGE   |                       |  TELEGRAM BOT ENGINE  |
|  • Event Store        |                       |  • @eaglespike_bot    |
|  • Checkpoint Tracking|                       |  • State-Change Alerts|
|    (+1m, +5m, +15m,   |                       |  • Deduplication &    |
|     +30m, +1h, +4h)   |                       |    Cooldown (20m)     |
|  • Continuous MFE/MAE |                       |  • Rate Limiting &    |
|  • Outcome Resolution |                       |    Batching           |
|  • Walk-Forward Lab   |                       |  • Secure Webhook API |
+-----------------------+                       +-----------------------+
            |                                               |
            +-----------------------+-----------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                    EAGLE FLASH TRADING TERMINAL                         |
|    • Dark Quant Terminal Visual Identity                                |
|    • Primary Columns: #, SYMBOL, PRICE, 5M, 15M, 1H, RVOL, VOL Z,      |
|      OI Δ, TAKER, SCORE, PHASE, TYPE, QUALITY, AGE                     |
|    • Inline Real-Time SVG Sparklines                                    |
|    • Explainable Eagle Score Decomposition Popover                      |
|    • Comprehensive Asset Intelligence Drawer (Section 30 Compliant)     |
|    • Live Spike Stream & Multi-Exchange Filters (ALL, BYBIT, MEXC, WEEX)|
+-------------------------------------------------------------------------+
```

## 2. Server vs. Client Isolation
- **Client Side**: High-speed vanilla HTML5/ES6 terminal with direct DOM updates, requestAnimationFrame throttling, SVG rendering, IndexedDB persistence, zero token leakage.
- **Server Side**: Next.js 15 App Router running on Node.js / V8. Exposes `/api/spikes`, `/api/telegram/webhook`, `/api/telegram/status`, `/api/weex/tickers`, `/api/mexc/tickers`.
- **Security Boundary**: All Telegram bot tokens (`TELEGRAM_BOT_TOKEN`), webhook secrets (`TELEGRAM_WEBHOOK_SECRET`), and exchange API private keys are strictly confined to server-side Node.js environment variables.
