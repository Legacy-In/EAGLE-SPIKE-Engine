# 🦅 EAGLE FLASH / SIGMA TERMINAL — ARCHITECTURAL AUDIT & PRODUCTION HARDENING

**Document Version:** 1.0.0  
**Audit Date:** September 28, 2026  
**Auditor:** Senior Principal Quantitative Trading Systems Architect  
**Classification:** Internal Engineering Audit & Migration Blueprint  

---

## 1. Executive Summary

This audit provides a comprehensive structural, security, and algorithmic analysis of the **EAGLE FLASH / SIGMA TERMINAL** codebase. The objective is to unify all quantitative market-data ingestion, strategy evaluation, signal creation, outbox notifications (Telegram & Discord), and Web3 on-chain verification into an authoritative, single-source-of-truth architecture.

---

## 2. Current Architecture Overview

```
                               ┌─────────────────────────────────────────────────────────┐
                               │           EXTERNAL MARKET DATA & BLOCKCHAIN            │
                               │  - Bybit, Binance, MEXC, WEEX (REST & WebSockets)       │
                               │  - Ethereum / Base RPCs (Viem / Alchemy / Etherscan)    │
                               └────────────────────────────┬────────────────────────────┘
                                                            │
                                                            ▼
                               ┌─────────────────────────────────────────────────────────┐
                               │                 BACKGROUND DAEMON WORKERS               │
                               │  1. server_scanner.mjs (Multi-Exchange Cloud Scanner)  │
                               │  2. bigcap_worker.mjs (BTC, ETH, SOL Intelligence Desk) │
                               │  3. checkpoint_evaluator.mjs (TP/SL & Trailing Engine)  │
                               │  4. whale_detector_worker.mjs (Order Book & Flow Radar) │
                               │  5. etherscan_whale_worker.mjs (On-Chain Transfers)    │
                               │  6. telegram_poll.mjs (Commands & Polling)              │
                               │  7. telegram_worker.mjs (Outbox Dispatcher)             │
                               └────────────────────────────┬────────────────────────────┘
                                                            │
                                                            ▼
                               ┌─────────────────────────────────────────────────────────┐
                               │       CANONICAL SERVICE LAYER (SINGLE INGESTION)       │
                               │  backend/services/signal-creation.mjs                   │
                               │  - Quantitative Strategy Detection (12 Strategies)      │
                               │  - Deterministic Strategy Priority Resolution           │
                               │  - Dynamic ATR14 TP/SL & Risk Unit (1R) Calculation    │
                               │  - Entry Quality & Chase Risk Scoring                   │
                               │  - Deterministic Identity (EGL-YYYYMMDD-EX-SYM-XXXX)   │
                               │  - Idempotency Key Hashing (15m epoch windows)          │
                               │  - Blockchain SHA-256 Proof Generation                  │
                               └─────────────┬─────────────────────────────┬─────────────┘
                                             │                             │
                   PostgreSQL Atomic Transaction                           │
                                             ▼                             ▼
                      ┌─────────────────────────────┐        ┌─────────────────────────────┐
                      │    SUPABASE / POSTGRESQL    │        │      NOTIFICATION OUTBOX    │
                      │  - public.signals           │        │  - Telegram Signal Outbox   │
                      │  - public.signal_snapshots  │───────►│  - Discord Signal Outbox    │
                      │  - public.signal_extremes   │        │    (Pending implementation) │
                      │  - public.big_cap_signals   │        └──────────────┬──────────────┘
                      │  - public.whale_trades      │                       │
                      └──────────────┬──────────────┘                       │
                                     │                                      │
                                     ▼                                      ▼
                      ┌─────────────────────────────┐        ┌─────────────────────────────┐
                      │      FRONTEND TERMINAL      │        │      DELIVERY CHANNELS      │
                      │  - Next.js Web Application  │        │  - Telegram Channels        │
                      │  - Full Viewport EagleFlash │        │  - Discord Server & Channels│
                      │  - Web3 Wagmi/Viem Wallet   │        │  - Web3 Verification Proof  │
                      └─────────────────────────────┘        └─────────────────────────────┘
```

---

## 3. Data Flow & Signal Creation Paths

### A. Current Signal Creation Paths Identified
1. **Primary Global Cloud Scanner (`scripts/server_scanner.mjs`)**:
   - Ingests perpetual contract data across Bybit, Binance, MEXC, and WEEX.
   - Evaluates volume spikes, RVOL $> 2.0x$, volume Z-scores, and order book imbalances.
   - Calls canonical `createSignal(...)` in `backend/services/signal-creation.mjs`.
2. **Big Cap Intelligence Desk (`scripts/bigcap_worker.mjs`)**:
   - Ingests multi-timeframe candle and derivatives data for BTCUSDT, ETHUSDT, and SOLUSDT.
   - Evaluates momentum ignition, squeeze conditions, and liquidity positioning.
   - Calls canonical `createSignal(candidate, { isBigCap: true })`.
3. **Ingestion & Spikes API (`apps/web/app/api/spikes/route.ts`)**:
   - Receives POST requests with spike events.
   - Currently invokes `createSignal(...)`.
   - **Audit Finding**: In `apps/web/public/eagle-flash.html` (lines 3126, 3162, 3208), the client-side browser was forwarding locally detected scanner candidates to `/api/spikes`. This violated the rule that *the frontend must NOT create signals*.
4. **Direct Database Repository (`backend/db/signals.repo.ts`)**:
   - Contains an older `insertSignal(...)` method.
   - **Audit Finding**: Used exclusively in seed scripts and unit tests (`tests/supabase-lifecycle.test.ts`), not in active worker pipelines. Must be consolidated with `signal-creation.mjs`.

### B. Notification Paths
- **Telegram Pipeline**:
  - `queueTelegramSignalAlert(...)` in `backend/services/telegram-outbox.mjs` writes to PostgreSQL `public.telegram_signal_outbox` (or falls back to durable JSON file if offline).
  - Background worker `scripts/telegram_worker.mjs` polls outbox with row locking (`FOR UPDATE SKIP LOCKED`), applies exponential backoff, respects rate limits, and sends HTML formatted alerts.
- **Discord Pipeline**:
  - **Currently Missing**: No Discord client, embed builder, or outbox dispatcher currently exists in the repository.

---

## 4. Database Source of Truth vs. In-Memory Stores

### Authoritative PostgreSQL Tables
- `public.signals`: Canonical signal entity (identity, prices, stops, targets, score, status).
- `public.signal_snapshots`: Deep-frozen market state at exact moment of detection.
- `public.signal_extremes`: MFE (Maximum Favorable Excursion) and MAE (Maximum Adverse Excursion) records.
- `public.signal_checkpoints`: 15M, 1H, 4H, 8H, 1D milestone resolution tracking.
- `public.big_cap_signals`: Specialized table for Big Cap Desk UI synchronization.
- `public.telegram_signal_outbox`: Durable outbox for Telegram notifications.

### In-Memory & Local Storage State
- `SignalTelemetry.activeCooldowns`: 15-minute in-memory deduplication window per exchange/symbol.
- `eagle-flash.html` (`localStorage`): Local cache for fast tab rendering. Must remain strictly read-only and never be treated as an authoritative database.

---

## 5. Security & Secret Exposure Audit

1. **Discord Credentials**:
   - An exposed Discord token was identified in user history.
   - **Action**: Never commit or print Discord bot tokens. Ingest strictly via `process.env.DISCORD_BOT_TOKEN`.
   - Create `.env.example` documenting all required Discord variables.
2. **Hard-coded Fallbacks Found**:
   - In `apps/web/app/api/bigcap/route.ts`, `apps/web/app/api/diagnostics/signals/route.ts`, `apps/web/app/api/journal/route.ts`, `apps/web/app/api/signals/[signal_id]/route.ts`, and `BigCapSpikeSection.tsx`, a fallback Supabase anon JWT string was hard-coded in the code.
   - **Remediation**: Remove all fallback JWT strings from source code; rely strictly on `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` and `process.env.SUPABASE_SERVICE_ROLE_KEY`.
3. **Frontend Leakage Prevention**:
   - `scripts/security_audit.mjs` verifies that `.env` is git-ignored and no secrets leak into public client builds.

---

## 6. Duplicate Logic & Inconsistencies

1. **Frontend Spike Forwarding**:
   - Browser client in `eagle-flash.html` contained functions `forwardCandidateSignalToBackend`, `syncStoredSignalsToBackend`, and `forwardCurrentSignalsToTelegram` that sent signals to `/api/spikes`.
   - **Resolution**: Disable client-side signal pushing. Browser is an observer of canonical signals.
2. **Notification Outbox Generalization**:
   - Currently, `telegram_signal_outbox` only supports Telegram.
   - **Resolution**: Upgrade to a generalized `notification_outbox` table (or polymorphic schema) that supports both `TELEGRAM` and `DISCORD` with channel-specific routing and deduplication keys (`OUTBOX-${signal_id}-${event_type}-${channel_type}`).
3. **ROI Formula Uniformity**:
   - Invariant check:
     $$\text{LONG ROI} = \frac{\text{CURRENT} - \text{ENTRY}}{\text{ENTRY}} \times 100$$
     $$\text{SHORT ROI} = \frac{\text{ENTRY} - \text{CURRENT}}{\text{ENTRY}} \times 100$$
   - Ensure no notification or frontend component independently recalculates ROI with inverted or directionless formulas.

---

## 7. Known Bugs & Edge Cases Addressed

1. **PEPE & Low-Priced Coin Precision**:
   - Small token prices (e.g. $0.00001234) must retain at least 8 decimal places and tick-size alignment rather than rounding to `$0.0000`.
2. **Concurrent TP & SL in Same 15M Candle**:
   - When exact intra-candle tick sequence is unavailable, the checkpoint engine must apply the conservative **STOP-FIRST** rule.
3. **Cross-Exchange Separation**:
   - `BYBIT:SOLUSDT` and `BINANCE:SOLUSDT` must maintain distinct market identities and separate live price feeds.
4. **Outbox Failure Isolation**:
   - If Discord or Telegram API encounters network timeouts or HTTP 429 rate limits, signal creation in PostgreSQL must proceed without interruption.

---

## 8. Recommended Phased Migration Blueprint

| Phase | Description | Deliverables |
|:---:|:---|:---|
| **Phase 1** | Repository Audit | Architectural audit report (`/docs/ARCHITECTURE_AUDIT.md`) |
| **Phase 2** | Security & Secret Cleanup | Remove hard-coded JWT fallbacks; configure `.env.example` |
| **Phase 3** | Canonical Signal Service Hardening | Single authoritative entrypoint; tick size, precision, and risk calculation |
| **Phase 4** | Atomic DB Transaction & Idempotency | PostgreSQL RPC and deterministic identity keys |
| **Phase 5** | Real-Time Market Data & Freshness | Exchange-aware symbols and price freshness state (LIVE, FRESH, DEGRADED, STALE) |
| **Phase 6** | ROI & Price Integrity | Canonical directional ROI formulas and automated invariant tests |
| **Phase 7** | Dynamic TP/SL Engine | ATR14-based stop loss (clamped 2.0%–3.5%) and strategy-specific R multiples |
| **Phase 8** | Signal Lifecycle & Checkpoint Worker | Non-conflicting lifecycle states and STOP-FIRST intra-candle evaluation |
| **Phase 9** | Generalized Notification Outbox | Database schema for multi-channel notifications (Telegram + Discord) |
| **Phase 10** | Telegram Parity Verification | Ensure Telegram payloads consume exact canonical database state |
| **Phase 11** | Discord Integration | Backend Discord client, embed message builder, event router, and worker |
| **Phase 12** | Signal Journal Parity | Ensure Journal displays canonical signals directly from PostgreSQL |
| **Phase 13** | Diagnostics & Observability | `/api/diagnostics/` endpoints for signals, telegram, discord, blockchain, and market-data |
| **Phase 14** | Web3 Non-Custodial Wallet | Wagmi / Viem / RainbowKit integration |
| **Phase 15** | On-Chain Whale Engine | Real-time RPC and Etherscan event ingestion with verified wallet registry |
| **Phase 16** | Blockchain Signal Proof | Deterministic SHA-256 event hashing and smart contract verification |
| **Phase 17** | Failure & Restart Recovery | Rehydration of active signals and queue recovery upon daemon restarts |
| **Phase 18** | Comprehensive Automated Testing | Unit, parity, invariant, and failure isolation test suites |
| **Phase 19** | Production Verification & Daemons | Build validation (`npm run build`, `npm test`) and 24/7 worker activation |
