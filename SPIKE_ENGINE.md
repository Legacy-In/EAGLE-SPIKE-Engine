# EAGLE FLASH — Spike Lifecycle State Machine & Classification

## 1. 9-State Lifecycle Machine

To eliminate rapid flapping and false breakouts, EAGLE FLASH implements a 9-state deterministic finite state machine with confirmation windows, anti-flicker hysteresis, and minimum state durations (default: 30–45s).

```
[NORMAL]
   │
   ├─► (RVOL ≥ 1.8x, Z ≥ 1.8, |Ret| < 1.5%) ──► [PRE_SPIKE]
   │                                                 │
   └─► (RVOL ≥ 2.2x, |Ret| ≥ 1.5%) ──────────────────┴─► [EARLY_SPIKE]
                                                             │
                                                             ├─► (RVOL ≥ 2.8x, |Ret| ≥ 2.5%, Flow ≥ 20%) ──► [ACCELERATION]
                                                             │                                                    │
                                                             │                                                    ├─► (RVOL ≥ 4.5x, Z ≥ 4.0, RSI ≥ 80/≤ 20) ──► [EXTREME]
                                                             │                                                    │                                                 │
                                                             │                                                    │    (Delta divergence / Wick) ◄──────────────────┘
                                                             │                                                    ▼
                                                             ├────────────────────────────────────────► [EXHAUSTION]
                                                             │                                             │
                                                             │  (Adverse move > 3.5%)                      │ (Volume fades)
                                                             │                                             ▼
                                                             ├──────────────────────────────────────► [COOLING]
                                                             │                                           │       │
                                                             │                                           │       ├─► (Secondary Breakout) ──► [CONTINUATION]
                                                             │                                           │       │
                                                             │                                           │       └─► (Prolonged calm) ─────► [NORMAL]
                                                             │                                           │
                                                             └───────────────────────────────────────────┴─► [REVERSAL]
```

### State Definitions
1. **NORMAL**: Baseline market activity within statistical standard deviation ($\text{RVOL} < 1.8x, Z < 1.8$).
2. **PRE_SPIKE**: Unusual volume compression without price displacement. Accumulation phase.
3. **EARLY_SPIKE**: Initial directional impulse. Price moves $\ge 1.5\%$ alongside $\text{RVOL} \ge 2.2x$.
4. **ACCELERATION**: Velocity and order flow confirm direction. Positive taker flow with expanding open interest.
5. **EXTREME**: Statistical outlier climax ($\text{RVOL} \ge 4.5x, Z \ge 4.0\sigma, \text{RSI} \ge 82$ or $\le 18$).
6. **EXHAUSTION**: Volume peak with stalled progress. Presence of delta divergence or extended rejection wicks.
7. **COOLING**: Volatility contracting back toward rolling baseline, price consolidating.
8. **REVERSAL**: Adverse displacement exceeding dynamic threshold ($> 3.5\%$ from peak) or sharp counter-flow.
9. **CONTINUATION**: Consolidation resolving into secondary breakout in the original spike direction.

---

## 2. Spike Type Classifications
- **MOMENTUM**: Steady, progressive velocity supported by positive taker order flow.
- **BREAKOUT**: Price decisively crossing 24h high/low with expanding volume.
- **VOLUME_EXPLOSION**: Statistical anomaly ($\text{RVOL} \ge 3.5x, Z \ge 3.5$) with tight spread.
- **SHORT_SQUEEZE**: Rapid price surge accompanied by collapsing open interest ($\Delta\text{OI} \le -2.5\%$) and negative funding rate ($< -0.01\%$).
- **LONG_SQUEEZE**: Rapid price breakdown accompanied by collapsing open interest and positive funding rate ($> +0.03\%$).
- **ACCUMULATION**: Sustained volume and open interest expansion within tight price consolidation.
- **LOW_LIQUIDITY**: Price jump driven by thin order book / low dollar turnover ($< \$250\text{K}$).
- **EXHAUSTION**: Volume climax with stalling return and delta divergence.
- **REVERSAL**: Sharp rejection counter to prevailing trend.
- **UNKNOWN**: Insufficient evidence to classify.

---

## 3. Spike Quality Grades
- **HIGH**: Volume confirmation, positive aligned taker flow, open interest expansion, tight spread ($< 0.05\%$), and favorable BTC regime.
- **MEDIUM**: Solid volume expansion with minor divergence or moderate liquidity ($Turnover < \$800\text{K}$).
- **LOW**: Conflicting indicators or weak follow-through.
- **EXHAUSTION_RISK**: Significant delta divergence (price advancing while aggressive sellers dominate, or price declining while aggressive buyers dominate).
- **INSUFFICIENT_DATA**: Data feed latency exceeds acceptable thresholds ($> 30\text{s}$).

---

## 4. Multi-Factor Confirmation Matrix (11 Factors)

Every serious candidate exposed in the Signals module is verified across an 11-factor matrix:

| Factor | Description | Confirmation Condition (`✓`) |
| :--- | :--- | :--- |
| **PRICE MOMENTUM** | Short-term velocity | $|Return_{5M}| \ge 1.2\%$ |
| **VOLUME** | Statistical volume anomaly | $Z \ge 1.8\sigma$ |
| **RVOL** | Volume multiplier vs baseline | $\text{RVOL}_{5M} \ge 2.0x$ |
| **TRADE ACTIVITY** | Tick / trade frequency acceleration | Acceleration $\ge +25\%$ |
| **TAKER FLOW** | CVD / aggressive market order delta | Directionally aligned and $|\text{Flow}| \ge 15\%$ |
| **OPEN INTEREST** | Capital commitment delta | $\Delta\text{OI}_{15M} \ge +2.0\%$ |
| **FUNDING** | Perpetuals carry positioning | Favorable or uncrowded rate ($|\text{Funding}| \le 0.03\%$) |
| **ORDER BOOK** | Bid/Ask depth & spread | Spread $\le 0.05\%$ and depth imbalance aligned |
| **LIQUIDITY** | 24h dollar volume turnover | $Turnover_{24H} \ge \$800\text{k}$ |
| **BTC CONTEXT** | Macro Bitcoin alignment | Aligned or neutral BTC regime |
| **MTF CONFIRMATION** | Multi-timeframe trend alignment | 1m, 5m, 15m, 1h aligned directionally |

---

## 5. Sector Taxonomy & Spike Clusters

Symbols are classified into curated market sectors:
- **Layer 1** (BTC, ETH, SOL, AVAX, SUI, APT, NEAR, ADA, etc.)
- **Layer 2** (ARB, OP, MATIC, POL, STRK, MNT, etc.)
- **DeFi** (UNI, AAVE, CRV, MKR, SNX, PENDLE, JUP, etc.)
- **AI** (FET, RENDER, TAO, AGIX, WLD, GRT, etc.)
- **Meme** (DOGE, SHIB, PEPE, WIF, BONK, FLOKI, BOME, etc.)
- **Gaming** (AXS, SAND, MANA, GALA, ILV, BEAM, etc.)
- **Infrastructure** (LINK, PYTH, TIA, FIL, AR, etc.)
- **RWA** (ONDO, OM, CFG, TRU, POLYX, etc.)
- **Exchange** (BNB, OKB, KCS, MX, BGB, etc.)
- **Other** (unmapped or newly listed assets)

**Spike Cluster Detection**:
When $\ge 3$ instruments within the same sector experience simultaneous volume anomalies ($Z \ge 1.8$) and price velocity, EAGLE FLASH tags the event as a **Correlated Spike Cluster** (e.g. `MEME SECTOR ACTIVITY CLUSTER`), providing macro sector context to the trader.
