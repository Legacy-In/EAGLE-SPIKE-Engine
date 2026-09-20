# EAGLE FLASH — System Architecture Documentation

## 1. Overview
EAGLE FLASH is a high-performance, production-grade real-time cryptocurrency spike intelligence terminal and quantitative scanning engine. It ingests perpetual futures market data across **Bybit Linear (880+)**, **MEXC Contract (1,060+)**, and **WEEX Contract (990+)**, analyzing **2,930+ live trading instruments** in real time.

```
+-------------------------------------------------------------------------+
|                         EXCHANGE MARKET DATA                            |
|    Bybit Public WS & REST  |  MEXC Contract REST  |  WEEX Contract REST |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                  DATA NORMALIZATION & QUALITY LAYER                     |
|           • Unified Ticker Normalization                                |
|           • Freshness & Latency Tracking (<5s Fresh, >30s Stale)        |
|           • Data Confidence Scoring (0 - 100%)                          |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
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
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                     BITCOIN MACRO REGIME ENGINE                         |
|    Evaluates BTC Velocity & Volatility (BULLISH, BEARISH, NEUTRAL,      |
|    HIGH_VOLATILITY, RISK_OFF, RISK_ON, MIXED)                           |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
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
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
+───────────────────+   +───────────────────────+   +───────────────────────+
| SIGNALS LAYER     |   | HEATMAP LAYER         |   | TELEGRAM BOT ENGINE   |
| • 5-Level         |   | • Multi-Dim Anomalies |   | • @eaglespike_bot     |
|   Hierarchy       |   |   (Price/Vol/OI/Flow) |   | • State-Change Alerts |
| • 3 Distinct      |   | • Cross-Exchange      |   | • Deduplication &     |
|   Scores          |   |   Validation (3/3)    |   |   Cooldown (15m)      |
| • 11-Factor       |   | • Spike Clusters      |   | • Rate Limiting &     |
|   Confirmation    |   | • Market Breadth Bar  |   |   Batching            |
| • Nearest         |   | • Grid & Table Modes  |   | • Webhook + Polling   |
|   Candidates      |   | • Timeframe Switching |   |                       |
+───────────────────+   +───────────────────────+   +───────────────────────+
```

---

## 2. Core Modules

### 2.1 Signals Intelligence Architecture (`SIGNALS`)
The Signals module operates as the **Decision & Confirmation Layer**, answering: *"Which market situations currently deserve my attention, and WHY?"*

It implements a 5-level quantitative hierarchy:
1. **Level 1 — Market Context**: Deterministic state tracking BTC Regime, advancing/declining breadth, volume regime, market volatility, and signal environment.
2. **Level 2 — Signal Summary**: Real-time counter of Active, Confirmed, Early, Accelerating, Exhaustion, Cooling, Long, and Short candidates (strictly reporting zero if none exist).
3. **Level 3 — Active Signal Cards**: Displays primary and secondary types (e.g. `BREAKOUT + VOLUME EXPLOSION`), lifecycle phase, and 3 distinct scores:
   - **Eagle Score** ($0-100$, model satisfaction)
   - **Signal Quality** (`HIGH`, `MEDIUM`, `LOW`, `EXHAUSTION_RISK`)
   - **Data Confidence** (`HIGH`, `MEDIUM`, `LOW`)
4. **Level 4 — Confirmation Matrix & Explainability**:
   - 11-factor confirmation matrix with individual factor status (`✓`, `~`, `⚠`, `✕`, `—`)
   - "Why This Signal?" deterministic condition list
   - "Signal Invalidation" explicit threshold triggers
   - Multi-timeframe confirmation strip (1m, 5m, 15m, 30m, 1h, 4h)
5. **Level 5 — Nearest Candidates**: When 0 signals meet strict criteria, dynamically displays top near-qualifying candidates with an explicit list of missing confirmations (preventing empty states).

### 2.2 Heatmap Anomaly Discovery Architecture (`HEATMAP`)
The Heatmap module operates as the **Market Discovery & Anomaly Layer**, answering: *"Where is unusual market activity happening across the entire market?"*

Key capabilities:
- **Timeframe Recalculation**: Dynamically computes anomaly distributions across `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, and `24h`.
- **Multi-Dimensional Anomaly Scoring**: Combines price $\sigma$, volume $\sigma$, RVOL, and taker flow into a normalized **Anomaly Score** ($0-100$) and empirical percentile, kept strictly separate from the Eagle Score.
- **Cross-Exchange Confirmation**: Compares Bybit, MEXC, and WEEX listings to compute confirmation ratios (`3/3 CONFIRMED`, `2/3`, `1/3`, `N/A`).
- **Liquidity Warning & Classification**: Classifies liquidity as `HIGH`, `MEDIUM`, or `LOW` based on turnover and spread, down-weighting low-liquidity anomalies.
- **Sector Grouping & Spike Clusters**: Groups symbols into verified sectors (L1, L2, DeFi, AI, Meme, Gaming, Infrastructure, RWA, Other) and alerts on multi-coin sector spikes ($\ge 3$ correlated movers).
- **Dual View Modes**: Interactive Grid View (cards) and 13-Column Terminal Table View.

---

## 3. Data Flow & Normalization
Market data flows through a pipeline:
1. Public WebSockets and authenticated REST feeds ingest ticker and order book updates.
2. The Normalization Layer unifies exchange-specific schemas into `NormalizedMarketData`.
3. The Freshness Engine computes latency, staleness, and Data Confidence scores.
4. The Feature Engine computes multi-timeframe RVOL, Z-scores, and order flow metrics.
5. The Scoring Engine generates the explainable 8-factor Eagle Score and classifies spike archetypes.
6. The State Machine manages lifecycle transitions with anti-flicker hysteresis.
7. The Event Store records detection snapshots and continuously tracks forward returns (+1m to +1d, MFE, MAE).
8. The Telegram Dispatcher sends batched, rate-limited alerts without leaking API secrets.
