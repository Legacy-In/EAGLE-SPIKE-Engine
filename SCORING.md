# EAGLE FLASH — Quantitative Scoring Methodology

## Model Version: `score_v2.1.0`
## Feature Engine Version: `features_v3.0.1`

The **Eagle Score** is a 0 to 100 quantitative metric measuring multi-factor volume and volatility expansion in crypto perpetual futures. It is strictly explainable and decomposed into 8 orthogonal market features:

```
Total Eagle Score (0 - 100) =
  Price Acceleration      (max 20 pts) +
  Volume Confirmation     (max 20 pts) +
  Relative Volume (RVOL)  (max 20 pts) +
  Order Flow Imbalance    (max 15 pts) +
  Open Interest Delta     (max 10 pts) +
  Liquidity & Spread      (max  5 pts) +
  BTC Macro Regime        (max  5 pts) +
  Data Freshness          (max  5 pts)
```

---

### Factor 1: Price Acceleration (0 - 20 pts)
Measures the velocity and second derivative of price displacement across the 5-minute window:
- $|Return_{5M}| \ge 3.5\% \implies 20 \text{ pts}$
- $|Return_{5M}| \ge 2.0\% \implies 16 \text{ pts}$
- $|Return_{5M}| \ge 1.0\% \implies 12 \text{ pts}$
- $|Return_{5M}| \ge 0.5\% \implies 8 \text{ pts}$
- $|Return_{5M}| < 0.5\% \implies 4 \text{ pts}$

### Factor 2: Volume Anomaly Z-Score (0 - 20 pts)
Calculates standard deviations above the rolling volume mean:
$$Z = \frac{\text{Volume}_{5M} - \mu_{5M}}{\sigma_{5M}}$$
- $Z \ge 3.5 \implies 20 \text{ pts}$
- $Z \ge 2.5 \implies 16 \text{ pts}$
- $Z \ge 1.5 \implies 12 \text{ pts}$
- $Z \ge 0.8 \implies 8 \text{ pts}$
- $Z < 0.8 \implies 4 \text{ pts}$

### Factor 3: Timeframe-Correct Relative Volume (RVOL) (0 - 20 pts)
Compares current volume directly to expected historical baseline for the *same* timeframe window:
$$\text{RVOL}_{5M} = \frac{\text{Volume}_{5M}}{\text{Expected Baseline}_{5M}}$$
- $\text{RVOL} \ge 3.5x \implies 20 \text{ pts}$
- $\text{RVOL} \ge 2.5x \implies 16 \text{ pts}$
- $\text{RVOL} \ge 1.8x \implies 13 \text{ pts}$
- $\text{RVOL} \ge 1.3x \implies 9 \text{ pts}$
- $\text{RVOL} < 1.3x \implies 5 \text{ pts}$

### Factor 4: Order Flow & Taker Imbalance (0 - 15 pts)
Evaluates buyer vs seller aggression:
$$\text{Imbalance} = \frac{\text{Taker Buy} - \text{Taker Sell}}{\text{Total Taker Volume}} \times 100\%$$
- Directionally Aligned and $|\text{Imbalance}| \ge 40\% \implies 15 \text{ pts}$
- Directionally Aligned and $|\text{Imbalance}| \ge 25\% \implies 12 \text{ pts}$
- Directionally Aligned and $|\text{Imbalance}| \ge 10\% \implies 9 \text{ pts}$
- Delta Divergence (Price rising on net selling or vice versa) $\implies 3 \text{ pts}$ (Penalty)

### Factor 5: Open Interest (OI) Expansion (0 - 10 pts)
Distinguishes organic capital accumulation from transient scalping:
- $\Delta\text{OI}_{15M} \ge 6.0\% \implies 10 \text{ pts}$
- $\Delta\text{OI}_{15M} \ge 3.0\% \implies 8 \text{ pts}$
- $\Delta\text{OI}_{15M} \ge 0.5\% \implies 6 \text{ pts}$
- $\Delta\text{OI}_{15M} < 0.5\% \implies 3 \text{ pts}$

### Factor 6: Liquidity & Spread Quality (0 - 5 pts)
Ensures executable price discovery without severe market impact:
- $24\text{H Turnover} \ge \$3\text{M}$ and $\text{Spread} \le 0.04\% \implies 5 \text{ pts}$
- $24\text{H Turnover} \ge \$800\text{K}$ and $\text{Spread} \le 0.08\% \implies 4 \text{ pts}$
- $24\text{H Turnover} \ge \$250\text{K} \implies 3 \text{ pts}$
- Low Liquidity / Illiquid $\implies 1 \text{ pt}$

### Factor 7: Bitcoin Macro Regime Alignment (0 - 5 pts)
Adjusts score according to market-wide tailwinds:
- Long aligned with `BULLISH` BTC or Short aligned with `BEARISH` BTC $\implies 5 \text{ pts}$
- `NEUTRAL` or `HIGH_VOLATILITY` $\implies 3 \text{ pts}$
- Trading against systemic `RISK_OFF` trend $\implies 1 \text{ pt}$

### Factor 8: Data Freshness & Completeness (0 - 5 pts)
- Feed age $< 5\text{s} \implies 5 \text{ pts}$
- Feed age $< 10\text{s} \implies 4 \text{ pts}$
- Feed age $< 30\text{s} \implies 3 \text{ pts}$
- Stale Feed $> 30\text{s} \implies 1 \text{ pt}$

---

## Data Confidence Metric (0 - 100%)
Maintained separately from Eagle Score:
- **WebSocket Health**: 25%
- **Ticker Freshness**: 30%
- **Order Book Presence**: 15%
- **Derivatives/OI Freshness**: 15%
- **API Latency (<250ms)**: 15%
