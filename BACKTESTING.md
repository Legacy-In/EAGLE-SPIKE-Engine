# EAGLE FLASH — Spike Intelligence Backtesting Engine Documentation

## 1. Overview & Purpose

The **EAGLE FLASH Backtesting Engine** (`services/spike-intelligence/backtest-engine.ts`) provides quantitative evaluation of spike events detected across Bybit, MEXC, and WEEX. It measures forward return performance, drawdown characteristics, and classification efficacy without lookahead bias.

The primary quantitative objective is answering:
> *"When EAGLE FLASH identifies a spike candidate with a given score, type, and quality tier, what is its mathematical expectancy across +1m, +5m, +15m, +30m, +1h, +4h, and +1d horizons?"*

---

## 2. Core Metrics & Evaluation Methodology

For every backtested event cohort, the engine calculates:

| Metric | Definition | Ideal Range |
| :--- | :--- | :--- |
| **Win Rate** | Percentage of events yielding positive forward return at target horizon | $> 55\%$ |
| **Profit Factor** | Ratio of gross absolute gains to gross absolute losses | $> 1.50$ |
| **Average Return** | Mean percentage price change from detection price | Positive |
| **MFE (Max Favorable Excursion)** | Peak unrealized percentage gain prior to trade resolution | High |
| **MAE (Max Adverse Excursion)** | Maximum drawdown experienced during the holding period | Minimal |
| **Sharpe Ratio** | Annualized risk-adjusted excess return over standard deviation | $> 1.8$ |
| **Max Drawdown** | Deepest peak-to-trough capital decline during backtest period | $< 15\%$ |

---

## 3. Forward Return Horizons

Forward returns are measured strictly forward in time from the precise timestamp of the detected signal $t_0$:

$$R_H = \frac{P_{t_0 + H} - P_{t_0}}{P_{t_0}} \times 100\%$$

Supported horizons $H$:
- **$+1\text{m}$**: Microstructure impulse persistence
- **$+5\text{m}$**: Initial breakout momentum confirmation
- **$+15\text{m}$**: Short-term continuation vs. immediate mean-reversion
- **$+30\text{m}$**: Post-spike equilibrium pricing
- **$+1\text{h}$**: Intermediate directional follow-through
- **$+4\text{h}$**: Macro session trend continuation
- **$+1\text{d}$**: Multi-session swing efficacy

---

## 4. Stratified Cohort Analysis

The engine segments performance into 3 distinct quantitative cohorts:

### A. Spike Type Stratification
Evaluates the unique risk-reward profile of each structural archetype:
- `MOMENTUM`: Trend acceleration with steady order flow.
- `BREAKOUT`: High volume bar clearing multi-period highs/lows.
- `VOLUME_EXPLOSION`: Extreme RVOL ($> 5\times$) with statistical volume Z-score $> 3.5$.
- `SHORT_SQUEEZE`: Aggressive upward price action accompanied by sharp OI liquidation/contraction.
- `LONG_SQUEEZE`: Sharp downward liquidation flushing levered long open interest.
- `ACCUMULATION`: Elevated taker buy ratio and rising OI with compressed price volatility.
- `LOW_LIQUIDITY`: Thin order book depth, high slippage warning flag.

### B. Quality Grade Stratification
- `HIGH`: Fully confirmed by volume, taker flow, OI expansion, and favorable BTC regime.
- `MEDIUM`: Moderate confirmation with 1 non-fatal divergence.
- `LOW`: Incomplete data or conflicting indicator directions.
- `EXHAUSTION_RISK`: Parabolic extension into major order book resistance or severe taker divergence.

### C. Eagle Score Decile Stratification
Validates that higher Eagle Scores ($80-100$) produce monotonically higher win rates and profit factors compared to lower scores ($0-40$), proving statistical alpha.

---

## 5. Programmatic API Usage

The backtesting engine is exportable as a modular TypeScript class:

```typescript
import { BacktestEngine } from './services/spike-intelligence/backtest-engine';
import { SpikeEvent } from './services/spike-intelligence/types';

// 1. Initialize engine
const engine = new BacktestEngine();

// 2. Load historical spike events
const historicalEvents: SpikeEvent[] = await loadEventsFromStore();

// 3. Load historical OHLCV candle bars for instruments
const priceData = await loadCandleHistory();

// 4. Execute backtest simulation
const results = engine.runBacktest({
  events: historicalEvents,
  candles: priceData,
  defaultHorizon: '1h',
  takeProfitPct: 3.5,
  stopLossPct: 1.5,
  feeBps: 5.5 // 0.055% taker fee
});

console.log(`Events Tested: ${results.totalEvents}`);
console.log(`Win Rate: ${(results.winRate * 100).toFixed(1)}%`);
console.log(`Profit Factor: ${results.profitFactor.toFixed(2)}`);
console.log(`Avg Return: ${results.avgReturnPct.toFixed(2)}%`);
console.log(`Sharpe Ratio: ${results.sharpeRatio.toFixed(2)}`);
```

---

## 6. Automated Unit Testing & Continuous Validation

The backtesting engine logic is validated in the project test suite:
```bash
npx.cmd --yes tsx --test tests/spike-intelligence.test.ts
```
Tests verify zero divide-by-zero errors, correct handling of missing candles, edge-case price series, fee deduction, and accurate MFE/MAE calculation.
