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
- **HIGH**: Verified across multi-timeframe volume ($\text{RVOL} \ge 2.0x, Z \ge 2.0$), aligned taker flow, open interest expansion, and tight spread ($< 0.04\%$).
- **MEDIUM**: Solid volume expansion but moderate spread or weaker taker confirmation.
- **LOW**: Subdued volume or lack of multi-horizon confirmation.
- **EXHAUSTION_RISK**: Severe delta divergence, extreme RSI, or extended rejection wicks detected.
- **INSUFFICIENT_DATA**: Critical order book or feed latency exceeds stale threshold ($> 30\text{s}$).
