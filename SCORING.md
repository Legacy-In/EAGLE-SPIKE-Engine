# EAGLE FLASH — Quantitative Scoring Methodology

## Model Version: `score_v2.1.0` | Centralized Model Config: `v1.2.0`
## Feature Engine Version: `features_v3.1.0`

---

## 1. Overview: The 8-Factor Explainable Eagle Score

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

### Factor 6: Liquidity & Order Book Spread (0 - 5 pts)
Rewards instruments with sufficient turnover to minimize market impact:
- $Turnover_{24H} \ge \$3\text{M} \text{ and Spread} \le 0.04\% \implies 5 \text{ pts}$
- $Turnover_{24H} \ge \$800\text{k} \text{ and Spread} \le 0.08\% \implies 4 \text{ pts}$
- $Turnover_{24H} \ge \$250\text{k} \implies 3 \text{ pts}$
- Thin Book Trap ($Turnover < \$250\text{k} \text{ or Spread} > 0.15\%$) $\implies 1 \text{ pt}$

### Factor 7: Bitcoin Macro Regime Alignment (0 - 5 pts)
Incorporates macro market backdrop:
- Aligned Trend (Bullish BTC + Long Candidate OR Bearish BTC + Short Candidate) $\implies 5 \text{ pts}$
- Neutral BTC Regime $\implies 3 \text{ pts}$
- Counter-Trend $\implies 1 \text{ pt}$

### Factor 8: Data Freshness & Quality (0 - 5 pts)
Evaluates latency of the underlying feeds:
- Age $\le 5000\text{ms} \implies 5 \text{ pts}$
- Age $\le 30000\text{ms} \implies 3 \text{ pts}$
- Age $> 30000\text{ms} \implies 1 \text{ pt}$

---

## 2. Three Distinct Evaluation Scores

EAGLE FLASH strictly isolates three distinct evaluation concepts:

| Dimension | Measure | Range | Meaning |
| :--- | :--- | :--- | :--- |
| **A) Eagle Score** | Model Satisfaction | $0 - 100$ | How strongly the market event satisfies the configured multi-factor signal model. |
| **B) Signal Quality** | Structural Reliability | `HIGH`, `MEDIUM`, `LOW`, `EXHAUSTION_RISK` | Structural classification based on order flow alignment, spread liquidity, and absence of delta divergence. |
| **C) Data Confidence** | Data Provenance | `HIGH` ($\ge 85\%$), `MEDIUM` ($70-84\%$), `LOW` ($< 70\%$) | Reliability, completeness, and freshness of the underlying WebSocket/REST exchange data. |

> **Critical Distinction**: A candidate can exhibit an **Eagle Score of 86**, a **Signal Quality of HIGH**, but a **Data Confidence of LOW**. This alerts the trader that while the pattern looks structurally bullish, the feed latency is degraded and should be treated with caution.

---

## 3. Anomaly Score vs. Eagle Score

EAGLE FLASH maintains an absolute distinction between **Market Anomalies** and **Trading Signals**:

- **Anomaly Score ($0-100$)**:
  Measures *how statistically unusual* the current market behavior is relative to cross-market distributions ($\sigma$ z-scores for price, volume, RVOL, trade activity, and open interest).
- **Eagle Score ($0-100$)**:
  Measures *how strongly* the market behavior satisfies the quantitative trading signal model.

**Example**:
- $\text{Anomaly Score} = 94$
- $\text{Eagle Score} = 58$

**Interpretation**:
> *"Very unusual market activity (extreme volume or thin-liquidity price wick), but insufficient order flow confirmation or liquidity to constitute a high-quality Eagle signal."*
