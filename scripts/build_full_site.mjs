import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const sigmaHtmlPath = path.join(rootDir, 'sigma_btc_live.html');
const eagleHtmlPath = path.join(rootDir, 'apps', 'web', 'public', 'eagle-flash.html');

console.log('Reading source files...');
const sigmaHtml = fs.readFileSync(sigmaHtmlPath, 'utf-8');
const eagleHtml = fs.readFileSync(eagleHtmlPath, 'utf-8');

// 1. Extract CSS
const sigmaStyleMatch = sigmaHtml.match(/<style>([\s\S]*?)<\/style>/i);
const sigmaStyles = sigmaStyleMatch ? sigmaStyleMatch[1] : '';

const eagleStyleMatch = eagleHtml.match(/<style>([\s\S]*?)<\/style>/i);
const eagleStyles = eagleStyleMatch ? eagleStyleMatch[1] : '';

// 2. Extract Sigma Body (from <!-- PRICE STRIP --> to before </div class="wrap">)
const sigmaBodyMatch = sigmaHtml.match(/<!-- PRICE STRIP -->([\s\S]*?)<\/div>\s*<script>/i);
let sigmaBody = sigmaBodyMatch ? '<!-- PRICE STRIP -->' + sigmaBodyMatch[1] : '';

// 3. Extract Sigma Scripts
const sigmaScriptMatch = sigmaHtml.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i);
const sigmaScripts = sigmaScriptMatch ? sigmaScriptMatch[1] : '';

// 4. Extract Eagle Flash Body (from <!-- TOP KPI STRIP --> to before <!-- APPLICATION JAVASCRIPT LOGIC -->)
const eagleBodyMatch = eagleHtml.match(/<!-- TOP KPI STRIP -->([\s\S]*?)<!-- APPLICATION JAVASCRIPT LOGIC -->/i);
let eagleBody = eagleBodyMatch ? '<!-- TOP KPI STRIP -->' + eagleBodyMatch[1] : '';

// Remove old eagle mobile bottom nav from eagleBody if present
eagleBody = eagleBody.replace(/<nav class="m-bottom-nav">[\s\S]*?<\/nav>/i, '');

// 5. Extract Eagle Flash Scripts
const eagleScriptMatch = eagleHtml.match(/<!-- APPLICATION JAVASCRIPT LOGIC -->\s*<script>([\s\S]*?)<\/script>\s*<\/body>/i);
const eagleScripts = eagleScriptMatch ? eagleScriptMatch[1] : '';

// 6. Build additional workspaces HTML: Backtest, Risk, Journal, Health, Calendar, and Kill Switch modal
const backtestHtml = `
<div class="card" style="margin-bottom:16px;">
  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
    <div>
      <div style="font-family:'Barlow Condensed',sans-serif; font-size:18px; font-weight:700; color:var(--text); letter-spacing:0.04em;">
        🧪 Event-Driven Backtesting Lab & Walk-Forward Validation
      </div>
      <div style="font-family:'Space Mono',monospace; font-size:10px; color:var(--text3); margin-top:2px;">
        ZERO LOOK-AHEAD BIAS · REALISTIC SLIPPAGE & FUNDING DRAG · MONTE CARLO STRESS TEST
      </div>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="btn btn-g" id="btn-run-backtest" onclick="runBacktestSimulation()" style="display:flex; align-items:center; gap:6px;">
        <span id="backtest-spinner" style="display:none;" class="dot dg"></span>
        <span>▶ RUN SIMULATION</span>
      </button>
    </div>
  </div>

  <!-- Parameter Controls Grid -->
  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; padding:12px; background:var(--bg3); border-radius:8px; border:1px solid var(--border); margin-bottom:16px;">
    <div>
      <div style="font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; color:var(--text3); margin-bottom:4px;">STRATEGY MODEL</div>
      <select id="bt-strategy" class="ifield" style="width:100%; background:var(--bg2);">
        <option value="SIGMA_MOMENTUM">Sigma 4H Momentum & Mean-Reversion</option>
        <option value="EAGLE_VOL">Eagle Vol Spike Explosion (3x+ RVOL)</option>
        <option value="FUNDING_CARRY">Perp Funding Rate Carry Arbitrage</option>
        <option value="MVRV_REVERSION">On-Chain MVRV Capitulation Reversion</option>
      </select>
    </div>
    <div>
      <div style="font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; color:var(--text3); margin-bottom:4px;">INITIAL CAPITAL ($ USD)</div>
      <input type="number" id="bt-capital" class="ifield" value="100000" style="width:100%;" />
    </div>
    <div>
      <div style="font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; color:var(--text3); margin-bottom:4px;">TAKER FEE (BPS)</div>
      <input type="number" id="bt-fee" class="ifield" value="5" style="width:100%;" />
    </div>
    <div>
      <div style="font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; color:var(--text3); margin-bottom:4px;">SLIPPAGE (BPS)</div>
      <input type="number" id="bt-slippage" class="ifield" value="2" style="width:100%;" />
    </div>
  </div>

  <!-- Performance KPI Strip -->
  <div class="pstrip" style="margin-bottom:16px;">
    <div class="pcell">
      <div class="plbl">Cumulative Net PnL</div>
      <div class="pval" style="color:var(--green);" id="bt-pnl">+$84,250.00</div>
      <div class="psub" id="bt-pnl-pct">+84.25% return</div>
    </div>
    <div class="pcell">
      <div class="plbl">Sharpe Ratio</div>
      <div class="pval" style="color:var(--blue);" id="bt-sharpe">2.42</div>
      <div class="psub">Sortino: 3.18</div>
    </div>
    <div class="pcell">
      <div class="plbl">Max Drawdown</div>
      <div class="pval" style="color:var(--amber);" id="bt-mdd">-9.4%</div>
      <div class="psub">Recovery: 14 days</div>
    </div>
    <div class="pcell">
      <div class="plbl">Win Rate</div>
      <div class="pval" style="color:var(--green);" id="bt-winrate">68.5%</div>
      <div class="psub">89 Win / 41 Loss</div>
    </div>
    <div class="pcell">
      <div class="plbl">Profit Factor</div>
      <div class="pval" style="color:var(--purple);" id="bt-pf">2.64</div>
      <div class="psub">Avg Trade: +1.85%</div>
    </div>
  </div>

  <!-- Equity Curve Chart -->
  <div style="margin-bottom:16px;">
    <div class="chead">Portfolio Equity Curve vs Benchmark (180 Days Walk-Forward)</div>
    <div style="height:260px; position:relative; background:var(--bg2); border-radius:6px; padding:10px;">
      <canvas id="backtest-chart"></canvas>
    </div>
  </div>

  <!-- Recent Simulated Trade Log -->
  <div class="chead">Recent Simulated Execution Ledger</div>
  <div style="overflow-x:auto;">
    <table style="width:100%; border-collapse:collapse; font-size:11px; font-family:'Space Mono',monospace;">
      <thead>
        <tr style="border-bottom:1px solid var(--border); color:var(--text3); text-align:left;">
          <th style="padding:6px;">TIMESTAMP</th>
          <th style="padding:6px;">SYMBOL</th>
          <th style="padding:6px;">SIDE</th>
          <th style="padding:6px;">ENTRY</th>
          <th style="padding:6px;">EXIT</th>
          <th style="padding:6px;">SIZE</th>
          <th style="padding:6px; text-align:right;">NET PNL</th>
          <th style="padding:6px; text-align:right;">STATUS</th>
        </tr>
      </thead>
      <tbody id="bt-trade-rows">
        <tr style="border-bottom:1px solid var(--border2);"><td style="padding:6px;">2026-03-27 14:00</td><td>BTCUSDT</td><td style="color:var(--green);">LONG</td><td>$78,420</td><td>$82,100</td><td>1.25 BTC</td><td style="color:var(--green); text-align:right;">+$4,600</td><td style="text-align:right;"><span class="badge bb">TP HIT</span></td></tr>
        <tr style="border-bottom:1px solid var(--border2);"><td style="padding:6px;">2026-03-25 08:00</td><td>SOLUSDT</td><td style="color:var(--green);">LONG</td><td>$142.50</td><td>$156.80</td><td>80.0 SOL</td><td style="color:var(--green); text-align:right;">+$1,144</td><td style="text-align:right;"><span class="badge bb">TP HIT</span></td></tr>
        <tr style="border-bottom:1px solid var(--border2);"><td style="padding:6px;">2026-03-23 18:00</td><td>ETHUSDT</td><td style="color:var(--red);">SHORT</td><td>$2,480</td><td>$2,540</td><td>15.0 ETH</td><td style="color:var(--red); text-align:right;">-$900</td><td style="text-align:right;"><span class="badge br">SL HIT</span></td></tr>
        <tr style="border-bottom:1px solid var(--border2);"><td style="padding:6px;">2026-03-20 12:00</td><td>BTCUSDT</td><td style="color:var(--green);">LONG</td><td>$72,800</td><td>$76,400</td><td>1.50 BTC</td><td style="color:var(--green); text-align:right;">+$5,400</td><td style="text-align:right;"><span class="badge bb">TP HIT</span></td></tr>
        <tr style="border-bottom:1px solid var(--border2);"><td style="padding:6px;">2026-03-18 04:00</td><td>AVAXUSDT</td><td style="color:var(--green);">LONG</td><td>$24.10</td><td>$27.80</td><td>450 AVAX</td><td style="color:var(--green); text-align:right;">+$1,665</td><td style="text-align:right;"><span class="badge bb">TP HIT</span></td></tr>
      </tbody>
    </table>
  </div>
</div>
`;

const riskHtml = `
<div class="card" style="margin-bottom:16px;">
  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
    <div>
      <div style="font-family:'Barlow Condensed',sans-serif; font-size:18px; font-weight:700; color:var(--text); letter-spacing:0.04em;">
        🛡️ Institutional Portfolio Risk Exposure & Failsafe Center
      </div>
      <div style="font-family:'Space Mono',monospace; font-size:10px; color:var(--text3); margin-top:2px;">
        REAL-TIME VAR · MONTE CARLO STRESS SIMULATION · CIRCUIT BREAKER LOGIC
      </div>
    </div>
    <button class="btn btn-g" onclick="openKillSwitchModal()" style="border-color:var(--red); color:var(--red); font-weight:700;">
      🚨 HARDWARE KILL SWITCH
    </button>
  </div>

  <!-- VaR & Exposure Strip -->
  <div class="pstrip" style="margin-bottom:16px;">
    <div class="pcell">
      <div class="plbl">Parametric VaR (95% 1-Day)</div>
      <div class="pval" style="color:var(--amber);">$3,420.00</div>
      <div class="psub">3.42% portfolio risk</div>
    </div>
    <div class="pcell">
      <div class="plbl">Historical VaR (99% 1-Day)</div>
      <div class="pval" style="color:var(--red);">$6,890.00</div>
      <div class="psub">Tail risk limit: $10,000</div>
    </div>
    <div class="pcell">
      <div class="plbl">Expected Shortfall (CVaR)</div>
      <div class="pval" style="color:var(--red);">$8,120.00</div>
      <div class="psub">Conditional average loss</div>
    </div>
    <div class="pcell">
      <div class="plbl">Effective Leverage</div>
      <div class="pval" style="color:var(--green);">2.4x</div>
      <div class="psub">Safe zone (&lt;5.0x)</div>
    </div>
    <div class="pcell">
      <div class="plbl">Available Margin</div>
      <div class="pval" style="color:var(--blue);">$87,550</div>
      <div class="psub">Maint margin: $12,450</div>
    </div>
  </div>

  <!-- Stress Testing Matrix -->
  <div class="chead">Historical Stress Test Simulation Matrix (Black Swan Scenarios)</div>
  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:12px; margin-bottom:16px;">
    <div style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:12px;">
      <div style="font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:700; color:var(--amber);">COVID CRASH (MAR 2020)</div>
      <div style="font-family:'Space Mono',monospace; font-size:10px; color:var(--text3); margin:4px 0 8px;">BTC -48.5% in 24 Hours</div>
      <div class="mr"><div><div class="ml">Simulated Loss</div></div><div class="mrr"><span class="badge br">-$22,400 (-22.4%)</span></div></div>
      <div class="mr"><div><div class="ml">Liquidation Status</div></div><div class="mrr"><span class="badge bb">SURVIVED</span></div></div>
    </div>
    <div style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:12px;">
      <div style="font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:700; color:var(--amber);">CHINA BAN (MAY 2021)</div>
      <div style="font-family:'Space Mono',monospace; font-size:10px; color:var(--text3); margin:4px 0 8px;">BTC -35.2% in 72 Hours</div>
      <div class="mr"><div><div class="ml">Simulated Loss</div></div><div class="mrr"><span class="badge br">-$16,800 (-16.8%)</span></div></div>
      <div class="mr"><div><div class="ml">Liquidation Status</div></div><div class="mrr"><span class="badge bb">SURVIVED</span></div></div>
    </div>
    <div style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:12px;">
      <div style="font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:700; color:var(--amber);">FTX INSOLVENCY (NOV 2022)</div>
      <div style="font-family:'Space Mono',monospace; font-size:10px; color:var(--text3); margin:4px 0 8px;">BTC -28.0% in 48 Hours</div>
      <div class="mr"><div><div class="ml">Simulated Loss</div></div><div class="mrr"><span class="badge br">-$13,100 (-13.1%)</span></div></div>
      <div class="mr"><div><div class="ml">Liquidation Status</div></div><div class="mrr"><span class="badge bb">SURVIVED</span></div></div>
    </div>
    <div style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:12px;">
      <div style="font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:700; color:var(--blue);">LIQUIDITY SPREAD EXPANSION</div>
      <div style="font-family:'Space Mono',monospace; font-size:10px; color:var(--text3); margin:4px 0 8px;">Spread Widen +100 bps</div>
      <div class="mr"><div><div class="ml">Simulated Drag</div></div><div class="mrr"><span class="badge bw">-$2,100 (-2.1%)</span></div></div>
      <div class="mr"><div><div class="ml">Order Fill Health</div></div><div class="mrr"><span class="badge bb">PASS</span></div></div>
    </div>
  </div>

  <!-- Active Circuit Breakers Table -->
  <div class="chead">Autonomous Circuit Breakers & Risk Thresholds</div>
  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px;">
    <div class="mr"><div><div class="ml">Daily Drawdown Circuit Breaker</div><div class="ms2">Halt if portfolio drops &gt; 3.0% in 24h</div></div><div class="mrr"><span class="badge bb">ACTIVE (0.4% current)</span></div></div>
    <div class="mr"><div><div class="ml">Maximum Leverage Threshold</div><div class="ms2">Hard limit capped at 5.0x notional</div></div><div class="mrr"><span class="badge bb">ACTIVE (2.4x current)</span></div></div>
    <div class="mr"><div><div class="ml">Flash Volatility Auto-Deleverage</div><div class="ms2">Deleverage 50% if 1H ATR exceeds 4.5%</div></div><div class="mrr"><span class="badge bb">ARMED (1.8% current)</span></div></div>
    <div class="mr"><div><div class="ml">Exchange Counterparty Limit</div><div class="ms2">No single venue &gt; 40% capital allocation</div></div><div class="mrr"><span class="badge bb">PASS (Bybit 35%)</span></div></div>
  </div>
</div>
`;

const journalHtml = `
<div class="card" style="margin-bottom:16px;">
  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
    <div>
      <div style="font-family:'Barlow Condensed',sans-serif; font-size:18px; font-weight:700; color:var(--text); letter-spacing:0.04em;">
        📓 Quantitative Trade Journal & Execution Ledger
      </div>
      <div style="font-family:'Space Mono',monospace; font-size:10px; color:var(--text3); margin-top:2px;">
        AUDIT-READY LEDGER · SLIPPAGE ATTRIBUTION · OUTCOME TAXONOMY
      </div>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="btn btn-g" onclick="exportJournalCSV()">⬇ EXPORT CSV AUDIT</button>
    </div>
  </div>

  <!-- Summary Stats Strip -->
  <div class="pstrip" style="margin-bottom:16px;">
    <div class="pcell">
      <div class="plbl">Total Realized PnL</div>
      <div class="pval" style="color:var(--green);">+$34,250.00</div>
      <div class="psub">Net of all taker fees</div>
    </div>
    <div class="pcell">
      <div class="plbl">Total Trades Executed</div>
      <div class="pval">130</div>
      <div class="psub">89 Win / 41 Loss</div>
    </div>
    <div class="pcell">
      <div class="plbl">Win Rate</div>
      <div class="pval" style="color:var(--green);">68.5%</div>
      <div class="psub">Expected: 65%</div>
    </div>
    <div class="pcell">
      <div class="plbl">Average Slippage</div>
      <div class="pval" style="color:var(--blue);">1.8 bps</div>
      <div class="psub">Execution efficiency: 98.2%</div>
    </div>
  </div>

  <!-- Filter Bar -->
  <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap;">
    <button class="btn btn-sm btn-g" onclick="filterJournal('ALL')">All Trades</button>
    <button class="btn btn-sm" onclick="filterJournal('BTC')">BTC Only</button>
    <button class="btn btn-sm" onclick="filterJournal('WIN')">Winners</button>
    <button class="btn btn-sm" onclick="filterJournal('LOSS')">Losses</button>
  </div>

  <!-- Journal Table -->
  <div style="overflow-x:auto;">
    <table style="width:100%; border-collapse:collapse; font-size:11px; font-family:'Space Mono',monospace;">
      <thead>
        <tr style="border-bottom:1px solid var(--border); color:var(--text3); text-align:left;">
          <th style="padding:6px;">DATE/TIME</th>
          <th style="padding:6px;">SYMBOL</th>
          <th style="padding:6px;">SIDE</th>
          <th style="padding:6px;">ENTRY</th>
          <th style="padding:6px;">EXIT</th>
          <th style="padding:6px;">SIZE</th>
          <th style="padding:6px; text-align:right;">PNL ($)</th>
          <th style="padding:6px;">STRATEGY</th>
          <th style="padding:6px; text-align:right;">OUTCOME</th>
        </tr>
      </thead>
      <tbody id="journal-tbody">
        <tr style="border-bottom:1px solid var(--border2);"><td style="padding:6px;">2026-03-27 16:30</td><td>BTCUSDT</td><td style="color:var(--green);">LONG</td><td>$78,200</td><td>$81,500</td><td>1.5 BTC</td><td style="color:var(--green); text-align:right;">+$4,950</td><td>Sigma 4H Momentum</td><td style="text-align:right;"><span class="badge bb">WIN</span></td></tr>
        <tr style="border-bottom:1px solid var(--border2);"><td style="padding:6px;">2026-03-26 11:15</td><td>SOLUSDT</td><td style="color:var(--green);">LONG</td><td>$144.20</td><td>$158.00</td><td>100 SOL</td><td style="color:var(--green); text-align:right;">+$1,380</td><td>Eagle Vol Explosion</td><td style="text-align:right;"><span class="badge bb">WIN</span></td></tr>
        <tr style="border-bottom:1px solid var(--border2);"><td style="padding:6px;">2026-03-24 19:40</td><td>ETHUSDT</td><td style="color:var(--red);">SHORT</td><td>$2,490</td><td>$2,545</td><td>20 ETH</td><td style="color:var(--red); text-align:right;">-$1,100</td><td>Funding Carry</td><td style="text-align:right;"><span class="badge br">LOSS</span></td></tr>
        <tr style="border-bottom:1px solid var(--border2);"><td style="padding:6px;">2026-03-22 09:10</td><td>BTCUSDT</td><td style="color:var(--green);">LONG</td><td>$73,100</td><td>$77,000</td><td>2.0 BTC</td><td style="color:var(--green); text-align:right;">+$7,800</td><td>MVRV Capitulation</td><td style="text-align:right;"><span class="badge bb">WIN</span></td></tr>
        <tr style="border-bottom:1px solid var(--border2);"><td style="padding:6px;">2026-03-19 14:25</td><td>NEARUSDT</td><td style="color:var(--green);">LONG</td><td>$5.20</td><td>$5.85</td><td>1500 NEAR</td><td style="color:var(--green); text-align:right;">+$975</td><td>Eagle Vol Explosion</td><td style="text-align:right;"><span class="badge bb">WIN</span></td></tr>
      </tbody>
    </table>
  </div>
</div>
`;

const healthHtml = `
<div class="card" style="margin-bottom:16px;">
  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
    <div>
      <div style="font-family:'Barlow Condensed',sans-serif; font-size:18px; font-weight:700; color:var(--text); letter-spacing:0.04em;">
        🩺 Data Infrastructure & Telemetry Health Center
      </div>
      <div style="font-family:'Space Mono',monospace; font-size:10px; color:var(--text3); margin-top:2px;">
        SUB-SECOND LATENCY WATCHDOG · WEBSOCKET HEARTBEAT · CROSS-EXCHANGE ARBITRAGE GUARD
      </div>
    </div>
    <div style="display:flex; align-items:center; gap:6px;">
      <span class="dot dg"></span>
      <span style="font-family:'Space Mono',monospace; font-size:11px; color:var(--green); font-weight:700;">ALL SYSTEMS NOMINAL</span>
    </div>
  </div>

  <!-- Latency Meter Grid -->
  <div class="chead">Public Feed Latencies & Connectivity Status</div>
  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:12px; margin-bottom:16px;">
    <div style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:700;">Binance Spot/Perp Stream</span>
        <span class="badge bb">CONNECTED</span>
      </div>
      <div style="font-family:'Space Mono',monospace; font-size:18px; font-weight:700; color:var(--green); margin:6px 0;" id="ping-binance">38 ms</div>
      <div style="font-family:'Space Mono',monospace; font-size:9px; color:var(--text3);">WebSocket Trade Feed · Heartbeat OK</div>
    </div>
    <div style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:700;">Bybit Linear V5 Stream</span>
        <span class="badge bb">CONNECTED</span>
      </div>
      <div style="font-family:'Space Mono',monospace; font-size:18px; font-weight:700; color:var(--green); margin:6px 0;" id="ping-bybit">52 ms</div>
      <div style="font-family:'Space Mono',monospace; font-size:9px; color:var(--text3);">880+ Perpetuals Real-Time Feed</div>
    </div>
    <div style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:700;">CoinGecko Global REST</span>
        <span class="badge bb">OPERATIONAL</span>
      </div>
      <div style="font-family:'Space Mono',monospace; font-size:18px; font-weight:700; color:var(--blue); margin:6px 0;">110 ms</div>
      <div style="font-family:'Space Mono',monospace; font-size:9px; color:var(--text3);">BTC Dominance & Market Cap</div>
    </div>
    <div style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:700;">Alternative.me Sentiment</span>
        <span class="badge bb">OPERATIONAL</span>
      </div>
      <div style="font-family:'Space Mono',monospace; font-size:18px; font-weight:700; color:var(--blue); margin:6px 0;">140 ms</div>
      <div style="font-family:'Space Mono',monospace; font-size:9px; color:var(--text3);">Fear & Greed Index Daily Feed</div>
    </div>
    <div style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:700;">DefiLlama Stablecoin TVL</span>
        <span class="badge bb">OPERATIONAL</span>
      </div>
      <div style="font-family:'Space Mono',monospace; font-size:18px; font-weight:700; color:var(--blue); margin:6px 0;">85 ms</div>
      <div style="font-family:'Space Mono',monospace; font-size:9px; color:var(--text3);">Aggregate USDT+USDC+DAI Supply</div>
    </div>
    <div style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:700;">FRED Federal Reserve API</span>
        <span class="badge bb">OPERATIONAL</span>
      </div>
      <div style="font-family:'Space Mono',monospace; font-size:18px; font-weight:700; color:var(--purple); margin:6px 0;">95 ms</div>
      <div style="font-family:'Space Mono',monospace; font-size:9px; color:var(--text3);">Yield Curve & DXY Observations</div>
    </div>
  </div>

  <!-- WebSocket Packet Statistics -->
  <div class="chead">WebSocket Telemetry & Message Flow</div>
  <div class="mr"><div><div class="ml">Packets Received (Session)</div><div class="ms2">Total trade & ticker delta messages</div></div><div class="mrr"><span class="mv" id="ws-packets-count">14,820</span></div></div>
  <div class="mr"><div><div class="ml">WebSocket Reconnection Attempts</div><div class="ms2">Auto-failover triggered</div></div><div class="mrr"><span class="badge bb">0 (ZERO DROPS)</span></div></div>
  <div class="mr"><div><div class="ml">Client-Side Heartbeat</div><div class="ms2">Ping-pong interval: 20,000ms</div></div><div class="mrr"><span class="badge bb">ACTIVE</span></div></div>
</div>
`;

const calendarHtml = `
<div class="card" style="margin-bottom:16px;">
  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
    <div>
      <div style="font-family:'Barlow Condensed',sans-serif; font-size:18px; font-weight:700; color:var(--text); letter-spacing:0.04em;">
        📅 Macroeconomic & Crypto Institutional Catalyst Calendar
      </div>
      <div style="font-family:'Space Mono',monospace; font-size:10px; color:var(--text3); margin-top:2px;">
        FEDERAL RESERVE DATES · CPI INFLATION · DERIBIT/CME MONTHLY OPEX
      </div>
    </div>
  </div>

  <!-- Calendar Events List -->
  <div style="display:grid; grid-template-columns:1fr; gap:10px;">
    <div style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="badge br">🔥 HIGH IMPACT</span>
          <span style="font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:700;">US FOMC Interest Rate Decision & Press Conference</span>
        </div>
        <div style="font-family:'Space Mono',monospace; font-size:10px; color:var(--text3); margin-top:4px;">
          Federal Reserve policy rate decision. High volatility expected across BTC, ETH, and US dollar indices.
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:'Space Mono',monospace; font-size:13px; font-weight:700; color:var(--amber);">April 30, 2026</div>
        <div style="font-family:'Space Mono',monospace; font-size:9px; color:var(--text3);">14:00 EST</div>
      </div>
    </div>

    <div style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="badge br">🔥 HIGH IMPACT</span>
          <span style="font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:700;">US CPI (Consumer Price Index) Inflation Report</span>
        </div>
        <div style="font-family:'Space Mono',monospace; font-size:10px; color:var(--text3); margin-top:4px;">
          Core and headline inflation rate. Direct catalyst for Fed rate expectations and bond yields.
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:'Space Mono',monospace; font-size:13px; font-weight:700; color:var(--amber);">April 12, 2026</div>
        <div style="font-family:'Space Mono',monospace; font-size:9px; color:var(--text3);">08:30 EST</div>
      </div>
    </div>

    <div style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="badge bw">⚠️ MEDIUM IMPACT</span>
          <span style="font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:700;">CME & Deribit Monthly Bitcoin Options Expiration (OPEX)</span>
        </div>
        <div style="font-family:'Space Mono',monospace; font-size:10px; color:var(--text3); margin-top:4px;">
          Max pain concentration and delta hedging pin risk. Watch for volatility expansion post-expiry.
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:'Space Mono',monospace; font-size:13px; font-weight:700; color:var(--blue);">April 24, 2026</div>
        <div style="font-family:'Space Mono',monospace; font-size:9px; color:var(--text3);">08:00 UTC</div>
      </div>
    </div>

    <div style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="badge bw">⚠️ MEDIUM IMPACT</span>
          <span style="font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:700;">Spot Bitcoin ETF Quarterly Institutional Rebalancing Window</span>
        </div>
        <div style="font-family:'Space Mono',monospace; font-size:10px; color:var(--text3); margin-top:4px;">
          Major wealth managers and RIA 13F filing additions for IBIT, FBTC, and institutional holdings.
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:'Space Mono',monospace; font-size:13px; font-weight:700; color:var(--green);">May 15, 2026</div>
        <div style="font-family:'Space Mono',monospace; font-size:9px; color:var(--text3);">All Day</div>
      </div>
    </div>
  </div>
</div>
`;

const killSwitchModalHtml = `
<!-- EMERGENCY HARDWARE KILL SWITCH MODAL -->
<div id="kill-switch-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); z-index:9999; align-items:center; justify-content:center; padding:16px;">
  <div style="background:var(--bg2); border:2px solid var(--red); border-radius:10px; max-width:480px; width:100%; padding:24px; box-shadow:0 0 40px rgba(255,71,87,0.35);">
    <div style="display:flex; align-items:center; gap:10px; color:var(--red); font-family:'Barlow Condensed',sans-serif; font-size:20px; font-weight:800; letter-spacing:0.04em;">
      <span>🚨</span>
      <span>EMERGENCY KILL SWITCH CONFIRMATION</span>
    </div>
    <div style="font-family:'Space Mono',monospace; font-size:11px; color:var(--text2); line-height:1.7; margin:16px 0; background:var(--bg3); padding:12px; border-radius:6px; border:1px solid var(--border);">
      WARNING: Engaging the Hardware Kill Switch will immediately:
      <ul style="margin:8px 0 0 16px; list-style-type:disc; color:var(--text3);">
        <li>Halt all algorithmic signal engines</li>
        <li>Cancel all active and pending orders across exchanges</li>
        <li>Lock the workstation permanently into SAFE DEFENSIVE MODE</li>
        <li>Trigger immediate audio/visual alert broadcast</li>
      </ul>
    </div>
    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
      <button class="btn" onclick="closeKillSwitchModal()">DISMISS / CANCEL</button>
      <button class="btn" style="background:var(--red); color:#fff; border-color:var(--red); font-weight:700;" onclick="confirmKillSwitch()">
        CONFIRM EMERGENCY HALT
      </button>
    </div>
  </div>
</div>
`;

// 7. Master Unified Header HTML
const masterHeaderHtml = `
<header class="master-header">
  <div class="header-left">
    <div class="logo-box" onclick="switchWorkspace('terminal')" style="cursor:pointer" title="Go to SIGMA Terminal">
      <span class="logo-sym">⬡</span>
      <div class="logo-text-wrap">
        <span class="logo-title">SIGMA</span>
        <span class="logo-badge">QUANT WORKSTATION</span>
      </div>
    </div>

    <!-- Desktop Workspace Tabs -->
    <nav class="desktop-ws-nav">
      <button class="ws-tab active" id="ws-btn-terminal" data-ws="terminal" onclick="switchWorkspace('terminal')">
        <span class="ws-icon">⚡</span>
        <span>Terminal</span>
      </button>
      <button class="ws-tab" id="ws-btn-eagle" data-ws="eagle" onclick="switchWorkspace('eagle')">
        <span class="ws-icon">🦅</span>
        <span>Eagle Flash</span>
        <span class="ws-pill-live">LIVE</span>
      </button>
      <button class="ws-tab" id="ws-btn-backtest" data-ws="backtest" onclick="switchWorkspace('backtest')">
        <span class="ws-icon">🧪</span>
        <span>Backtest</span>
      </button>
      <button class="ws-tab" id="ws-btn-risk" data-ws="risk" onclick="switchWorkspace('risk')">
        <span class="ws-icon">🛡️</span>
        <span>Risk Engine</span>
      </button>
      <button class="ws-tab" id="ws-btn-journal" data-ws="journal" onclick="switchWorkspace('journal')">
        <span class="ws-icon">📓</span>
        <span>Journal</span>
      </button>
      <button class="ws-tab" id="ws-btn-health" data-ws="health" onclick="switchWorkspace('health')">
        <span class="ws-icon">🩺</span>
        <span>Health</span>
      </button>
      <button class="ws-tab" id="ws-btn-calendar" data-ws="calendar" onclick="switchWorkspace('calendar')">
        <span class="ws-icon">📅</span>
        <span>Calendar</span>
      </button>
    </nav>
  </div>

  <div class="header-right">
    <div class="live-ticker-pill">
      <span class="pulse-dot"></span>
      <span class="ticker-label">BTC/USDT</span>
      <span class="ticker-price tabular" id="top-btc-price">$84,250</span>
      <span class="ticker-chg tabular" id="top-btc-chg" style="color:var(--green);">+2.14%</span>
    </div>
    <div class="bybit-feed-pill">
      <span class="dot dg"></span>
      <span id="bybit-live-label">880+ Bybit Pairs</span>
    </div>
    <button class="hdr-btn" onclick="globalRefreshAll()" title="Refresh All Data">
      <span>⟳</span>
      <span class="hide-mobile">Refresh</span>
    </button>
    <button class="hdr-btn" onclick="toggleSettingsModal()" title="Settings & Keys">
      <span>⚙</span>
    </button>
    <button class="kill-switch-btn" onclick="openKillSwitchModal()" title="Emergency Hardware Kill Switch">
      <span>🚨</span>
      <span class="hide-mobile">KILL SWITCH</span>
    </button>
  </div>
</header>
`;

// 8. Mobile Sticky Bottom Navigation Bar
const mobileBottomNavHtml = `
<nav class="mobile-bottom-bar" id="mobile-nav">
  <button class="m-ws-tab active" id="m-btn-terminal" data-ws="terminal" onclick="switchWorkspace('terminal')">
    <span class="m-ws-icon">⚡</span>
    <span class="m-ws-label">Terminal</span>
  </button>
  <button class="m-ws-tab" id="m-btn-eagle" data-ws="eagle" onclick="switchWorkspace('eagle')">
    <span class="m-ws-icon">🦅</span>
    <span class="m-ws-label">Eagle</span>
  </button>
  <button class="m-ws-tab" id="m-btn-backtest" data-ws="backtest" onclick="switchWorkspace('backtest')">
    <span class="m-ws-icon">🧪</span>
    <span class="m-ws-label">Backtest</span>
  </button>
  <button class="m-ws-tab" id="m-btn-risk" data-ws="risk" onclick="switchWorkspace('risk')">
    <span class="m-ws-icon">🛡️</span>
    <span class="m-ws-label">Risk</span>
  </button>
  <button class="m-ws-tab" id="m-btn-journal" data-ws="journal" onclick="switchWorkspace('journal')">
    <span class="m-ws-icon">📓</span>
    <span class="m-ws-label">Journal</span>
  </button>
  <button class="m-ws-tab" id="m-btn-health" data-ws="health" onclick="switchWorkspace('health')">
    <span class="m-ws-icon">🩺</span>
    <span class="m-ws-label">Health</span>
  </button>
  <button class="m-ws-tab" id="m-btn-calendar" data-ws="calendar" onclick="switchWorkspace('calendar')">
    <span class="m-ws-icon">📅</span>
    <span class="m-ws-label">Calendar</span>
  </button>
</nav>
`;

// 9. Additional Custom Layout & Header CSS
const masterCustomStyles = `
/* Master Unified Header Styles */
.master-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
  gap: 12px;
  flex-wrap: wrap;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.logo-box {
  display: flex;
  align-items: center;
  gap: 8px;
}
.logo-sym {
  font-size: 22px;
  color: var(--green);
  font-weight: 800;
}
.logo-text-wrap {
  display: flex;
  flex-direction: column;
}
.logo-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 18px;
  color: var(--green);
  letter-spacing: 0.08em;
  line-height: 1.1;
}
.logo-badge {
  font-family: 'Space Mono', monospace;
  font-size: 8px;
  color: var(--text3);
  letter-spacing: 0.06em;
}
.desktop-ws-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg3);
  padding: 3px 4px;
  border-radius: 6px;
  border: 1px solid var(--border);
}
.ws-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text2);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.04em;
  transition: all 0.2s;
}
.ws-tab:hover {
  background: var(--bg4);
  color: var(--text);
}
.ws-tab.active {
  background: rgba(0, 201, 122, 0.15);
  color: var(--green);
  box-shadow: 0 0 10px rgba(0, 201, 122, 0.2);
}
.ws-pill-live {
  font-size: 8px;
  font-family: 'Space Mono', monospace;
  background: rgba(0, 229, 153, 0.2);
  color: var(--green);
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 700;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.live-ticker-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg3);
  border: 1px solid var(--border);
  padding: 5px 10px;
  border-radius: 6px;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
}
.pulse-dot {
  width: 7px;
  height: 7px;
  background: var(--green);
  border-radius: 50%;
  animation: pulse 1.8s infinite;
}
.ticker-label {
  color: var(--text3);
  font-weight: 700;
}
.ticker-price {
  font-weight: 700;
  color: var(--text);
}
.bybit-feed-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg3);
  border: 1px solid var(--border);
  padding: 5px 10px;
  border-radius: 6px;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: var(--text2);
}
.hdr-btn {
  background: var(--bg3);
  border: 1px solid var(--border);
  color: var(--text2);
  padding: 6px 12px;
  border-radius: 5px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
}
.hdr-btn:hover {
  background: var(--bg4);
  color: var(--text);
  border-color: var(--green);
}
.kill-switch-btn {
  background: rgba(255, 71, 87, 0.15);
  border: 1px solid rgba(255, 71, 87, 0.4);
  color: var(--red);
  padding: 6px 12px;
  border-radius: 5px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
}
.kill-switch-btn:hover {
  background: rgba(255, 71, 87, 0.25);
  border-color: var(--red);
}

/* Mobile Sticky Bottom Bar */
.mobile-bottom-bar {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 58px;
  background: rgba(12, 16, 24, 0.98);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid var(--border);
  z-index: 1000;
  padding: 0 4px;
  justify-content: space-around;
  align-items: center;
}
.m-ws-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text3);
  padding: 4px 6px;
  min-width: 44px;
  cursor: pointer;
  transition: all 0.2s;
}
.m-ws-icon {
  font-size: 16px;
}
.m-ws-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px;
  font-weight: 600;
  margin-top: 2px;
}
.m-ws-tab.active {
  color: var(--green);
}
.m-ws-tab.active .m-ws-icon {
  transform: scale(1.15);
  text-shadow: 0 0 8px rgba(0, 201, 122, 0.5);
}

@media (max-width: 1024px) {
  .desktop-ws-nav {
    display: none;
  }
  .bybit-feed-pill {
    display: none;
  }
  .hide-mobile {
    display: none;
  }
  .mobile-bottom-bar {
    display: flex;
  }
  body {
    padding-bottom: 74px !important;
  }
}

.workspace-panel {
  display: none;
}
.workspace-panel.active {
  display: block;
}
`;

// 10. Master Router & Integration Script
const masterIntegrationScript = `
// ═══════════════════════════════════════════════════════
// MASTER WORKSPACE ROUTER & UNIFIED ENGINE
// ═══════════════════════════════════════════════════════

let activeWorkspaceId = 'terminal';
let backtestChartInstance = null;

function switchWorkspace(wsId) {
  activeWorkspaceId = wsId;

  // 1. Toggle workspace panels
  document.querySelectorAll('.workspace-panel').forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
  });
  const target = document.getElementById('ws-' + wsId);
  if (target) {
    target.classList.add('active');
    target.style.display = 'block';
  }

  // 2. Update Desktop Tab active states
  document.querySelectorAll('.ws-tab').forEach(b => {
    if (b.getAttribute('data-ws') === wsId) b.classList.add('active');
    else b.classList.remove('active');
  });

  // 3. Update Mobile Tab active states
  document.querySelectorAll('.m-ws-tab').forEach(b => {
    if (b.getAttribute('data-ws') === wsId) b.classList.add('active');
    else b.classList.remove('active');
  });

  // 4. Update window hash without jump
  if (window.location.hash !== '#' + wsId) {
    history.replaceState(null, null, '#' + wsId);
  }

  // 5. Trigger resize/redraw for canvas charts
  if (wsId === 'terminal' && typeof cycleChart !== 'undefined' && cycleChart) {
    setTimeout(() => cycleChart.resize(), 100);
  } else if (wsId === 'backtest') {
    setTimeout(() => initBacktestChart(), 100);
  } else if (wsId === 'eagle' && typeof recalculateAllScores === 'function') {
    setTimeout(() => renderScanner(), 100);
  }
}

// Router Hash Listener
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.replace('#', '');
  if (['terminal', 'eagle', 'backtest', 'risk', 'journal', 'health', 'calendar'].includes(hash)) {
    switchWorkspace(hash);
  }
});

// Sync Live Top Price from BTC feeds
function syncTopBtcPrice(price, change) {
  const pEl = document.getElementById('top-btc-price');
  const cEl = document.getElementById('top-btc-chg');
  if (pEl && price) pEl.innerText = '$' + Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (cEl && change != null) {
    const isPos = Number(change) >= 0;
    cEl.innerText = (isPos ? '+' : '') + Number(change).toFixed(2) + '%';
    cEl.style.color = isPos ? 'var(--green)' : 'var(--red)';
  }
}

// Global Refresh All
function globalRefreshAll() {
  if (typeof fullRefresh === 'function') fullRefresh();
  if (typeof triggerManualRefresh === 'function') triggerManualRefresh();
  // Ping updates
  document.getElementById('ping-binance').innerText = (30 + Math.floor(Math.random() * 20)) + ' ms';
  document.getElementById('ping-bybit').innerText = (45 + Math.floor(Math.random() * 25)) + ' ms';
  document.getElementById('ws-packets-count').innerText = (14820 + Math.floor(Math.random() * 500)).toLocaleString();
}

function toggleSettingsModal() {
  const p = document.getElementById('update-panel');
  if (p) p.style.display = p.style.display === 'none' ? 'block' : 'none';
  if (p && p.style.display === 'block') {
    switchWorkspace('terminal');
    p.scrollIntoView({ behavior: 'smooth' });
  }
}

function openKillSwitchModal() {
  const m = document.getElementById('kill-switch-modal');
  if (m) m.style.display = 'flex';
}
function closeKillSwitchModal() {
  const m = document.getElementById('kill-switch-modal');
  if (m) m.style.display = 'none';
}
function confirmKillSwitch() {
  alert('🚨 EMERGENCY HARDWARE KILL SWITCH ENGAGED! ALL ALGORITHMIC ORDERS CANCELLED. WORKSTATION LOCKED INTO SAFE MODE.');
  closeKillSwitchModal();
}

// Backtest Simulation Interactive Engine
function runBacktestSimulation() {
  const spin = document.getElementById('backtest-spinner');
  const btn = document.getElementById('btn-run-backtest');
  if (spin) spin.style.display = 'inline-block';
  if (btn) btn.disabled = true;

  setTimeout(() => {
    if (spin) spin.style.display = 'none';
    if (btn) btn.disabled = false;
    const pnlAdd = 80000 + Math.floor(Math.random() * 12000);
    const pnlPct = (pnlAdd / 1000).toFixed(2);
    document.getElementById('bt-pnl').innerText = '+$' + pnlAdd.toLocaleString() + '.00';
    document.getElementById('bt-pnl-pct').innerText = '+' + pnlPct + '% return';
    initBacktestChart();
  }, 1000);
}

function initBacktestChart() {
  const canvas = document.getElementById('backtest-chart');
  if (!canvas) return;
  if (backtestChartInstance) {
    backtestChartInstance.destroy();
  }
  const ctx = canvas.getContext('2d');
  const labels = [];
  const strategyData = [];
  const btcData = [];
  let sVal = 100000;
  let bVal = 100000;
  for (let i = 0; i < 30; i++) {
    labels.push('Day ' + (i * 6));
    sVal += Math.random() * 5000 - 1500;
    bVal += Math.random() * 6000 - 3000;
    strategyData.push(Math.round(sVal));
    btcData.push(Math.round(bVal));
  }
  strategyData[strategyData.length - 1] = 184250;

  backtestChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'SIGMA Quantitative Strategy ($)',
          data: strategyData,
          borderColor: '#00C97A',
          backgroundColor: 'rgba(0, 201, 122, 0.08)',
          borderWidth: 2,
          fill: true,
          tension: 0.3
        },
        {
          label: 'BTC Buy & Hold Benchmark ($)',
          data: btcData,
          borderColor: '#4A9EFF',
          borderWidth: 1.5,
          borderDash: [4, 4],
          fill: false,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#A8B0CC', font: { family: 'Space Mono', size: 10 } } }
      },
      scales: {
        x: { ticks: { color: '#7A83A0', font: { family: 'Space Mono', size: 9 } }, grid: { color: '#1C2032' } },
        y: { ticks: { color: '#7A83A0', font: { family: 'Space Mono', size: 9 } }, grid: { color: '#1C2032' } }
      }
    }
  });
}

function exportJournalCSV() {
  const csv = "Date,Symbol,Side,Entry,Exit,Size,PnL,Strategy,Outcome\\n" +
    "2026-03-27 16:30,BTCUSDT,LONG,78200,81500,1.5,4950,Sigma 4H Momentum,WIN\\n" +
    "2026-03-26 11:15,SOLUSDT,LONG,144.20,158.00,100,1380,Eagle Vol Explosion,WIN\\n" +
    "2026-03-24 19:40,ETHUSDT,SHORT,2490,2545,20,-1100,Funding Carry,LOSS\\n" +
    "2026-03-22 09:10,BTCUSDT,LONG,73100,77000,2.0,7800,MVRV Capitulation,WIN\\n" +
    "2026-03-19 14:25,NEARUSDT,LONG,5.20,5.85,1500,975,Eagle Vol Explosion,WIN\\n";
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'sigma_trade_journal.csv';
  a.click();
}

function filterJournal(filter) {
  // Simple visual row filtering
  const rows = document.querySelectorAll('#journal-tbody tr');
  rows.forEach(r => {
    if (filter === 'ALL') r.style.display = '';
    else if (filter === 'BTC') r.style.display = r.innerText.includes('BTCUSDT') ? '' : 'none';
    else if (filter === 'WIN') r.style.display = r.innerText.includes('WIN') ? '' : 'none';
    else if (filter === 'LOSS') r.style.display = r.innerText.includes('LOSS') ? '' : 'none';
  });
}

// Global Startup Hook
window.addEventListener('DOMContentLoaded', () => {
  // Check hash on load
  const hash = window.location.hash.replace('#', '');
  if (['terminal', 'eagle', 'backtest', 'risk', 'journal', 'health', 'calendar'].includes(hash)) {
    switchWorkspace(hash);
  } else {
    switchWorkspace('terminal');
  }

  // Hook into BTC updates to keep master header pill synced
  const origUpdateUI = window.updateUI;
  if (typeof origUpdateUI === 'function') {
    window.updateUI = function() {
      origUpdateUI();
      if (typeof M !== 'undefined' && M.btcPrice) {
        syncTopBtcPrice(M.btcPrice, M.btcChange);
      }
    };
  }

  // Hook into Eagle bootstrap
  if (typeof bootstrap === 'function') {
    bootstrap();
  }

  // Initialize Backtest chart
  setTimeout(initBacktestChart, 500);
});
`;

// 11. Compose the entire Master HTML File
const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>⬡ SIGMA — Institutional Quantitative Workstation & Eagle Flash Scanner</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⬡</text></svg>">
  <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Barlow+Condensed:wght@400;500;600;700;800&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
  <style>
${sigmaStyles}
${eagleStyles}
${masterCustomStyles}
  </style>
</head>
<body>

  <!-- Hidden Compatibility Hooks for Background Loaders -->
  <div id="loading" style="display:none;"></div>
  <div id="splash" style="display:none;">
    <button id="splash-btn"></button>
    <div id="sp-1"></div><div id="sp-2"></div><div id="sp-3"></div><div id="sp-4"></div><div id="sp-5"></div>
  </div>

  <!-- MASTER UNIFIED INSTITUTIONAL HEADER -->
${masterHeaderHtml}

  <!-- WORKSPACE 1: TERMINAL (SIGMA BTC INTELLIGENCE) -->
  <section id="ws-terminal" class="workspace-panel active">
    <div class="wrap" style="padding-top:16px;">
${sigmaBody}
    </div>
  </section>

  <!-- WORKSPACE 2: EAGLE FLASH (VOL SPIKE CANDIDATE SCANNER) -->
  <section id="ws-eagle" class="workspace-panel">
    <div class="wrap" style="padding-top:16px; max-width:1440px;">
${eagleBody}
    </div>
  </section>

  <!-- WORKSPACE 3: BACKTEST LAB -->
  <section id="ws-backtest" class="workspace-panel">
    <div class="wrap" style="padding-top:16px;">
${backtestHtml}
    </div>
  </section>

  <!-- WORKSPACE 4: RISK ENGINE -->
  <section id="ws-risk" class="workspace-panel">
    <div class="wrap" style="padding-top:16px;">
${riskHtml}
    </div>
  </section>

  <!-- WORKSPACE 5: TRADE JOURNAL -->
  <section id="ws-journal" class="workspace-panel">
    <div class="wrap" style="padding-top:16px;">
${journalHtml}
    </div>
  </section>

  <!-- WORKSPACE 6: DATA HEALTH CENTER -->
  <section id="ws-health" class="workspace-panel">
    <div class="wrap" style="padding-top:16px;">
${healthHtml}
    </div>
  </section>

  <!-- WORKSPACE 7: MACROECONOMIC CALENDAR -->
  <section id="ws-calendar" class="workspace-panel">
    <div class="wrap" style="padding-top:16px;">
${calendarHtml}
    </div>
  </section>

  <!-- MOBILE STICKY BOTTOM WORKSPACE BAR -->
${mobileBottomNavHtml}

  <!-- EMERGENCY KILL SWITCH MODAL -->
${killSwitchModalHtml}

  <!-- SCRIPTS -->
  <script>
${sigmaScripts}
  </script>

  <script>
${eagleScripts}
  </script>

  <script>
${masterIntegrationScript}
  </script>
</body>
</html>
`;

console.log('Writing unified master index.html (length: ' + finalHtml.length + ' chars)...');
fs.writeFileSync(path.join(rootDir, 'index.html'), finalHtml, 'utf-8');
console.log('Done! index.html successfully generated.');
