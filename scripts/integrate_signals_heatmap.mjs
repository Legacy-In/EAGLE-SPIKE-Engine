import fs from 'fs';
import path from 'path';

const eaglePath = path.resolve('apps/web/public/eagle-flash.html');
let content = fs.readFileSync(eaglePath, 'utf8');

console.log('Original length:', content.length);

// 1. ADD CSS STYLES FOR SIGNALS & HEATMAP
const cssToAdd = `
    /* =========================================================================
       SIGNALS & HEATMAP QUANTITATIVE INTELLIGENCE ARCHITECTURE
       ========================================================================= */
    .market-context-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px 12px;
      background: var(--bg-surface2);
      border: 1px solid var(--border);
      border-radius: 6px;
      margin-bottom: 12px;
      font-family: var(--font-mono);
      font-size: 11px;
    }
    .mc-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .mc-label {
      color: var(--text-muted);
      text-transform: uppercase;
      font-size: 10px;
    }
    .mc-val {
      font-weight: 700;
      color: var(--text);
    }
    .mc-pill {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
    }
    .signal-summary-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(105px, 1fr));
      gap: 8px;
      margin-bottom: 14px;
    }
    .sig-sum-cell {
      background: var(--bg-surface2);
      border: 1px solid var(--border);
      border-radius: 5px;
      padding: 6px 8px;
      text-align: center;
      font-family: var(--font-mono);
    }
    .sig-sum-lbl {
      font-size: 9px;
      color: var(--text-dark);
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .sig-sum-val {
      font-size: 14px;
      font-weight: 800;
      color: var(--text);
    }
    .signal-filters-row {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 14px;
      padding: 8px 12px;
      background: var(--bg-surface2);
      border: 1px solid var(--border);
      border-radius: 6px;
    }
    .sig-select {
      background: var(--bg-surface3);
      border: 1px solid var(--border);
      color: var(--text);
      font-family: var(--font-mono);
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 4px;
      outline: none;
      cursor: pointer;
    }
    .sig-select:focus {
      border-color: var(--emerald);
    }
    .signals-grid-intel {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 14px;
    }
    .sig-card-intel {
      background: var(--bg-surface2);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: all 0.2s;
    }
    .sig-card-intel:hover {
      border-color: var(--border-focus);
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }
    .sig-card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .scores-strip-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      background: var(--bg-surface3);
      padding: 6px;
      border-radius: 5px;
      border: 1px solid var(--border);
      text-align: center;
      font-family: var(--font-mono);
      font-size: 10px;
    }
    .score-cell-lbl {
      color: var(--text-dark);
      font-size: 9px;
      margin-bottom: 2px;
    }
    .metrics-hex-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      font-family: var(--font-mono);
      font-size: 11px;
    }
    .m-cell {
      background: var(--bg-surface1);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 4px 6px;
    }
    .m-cell-lbl {
      color: var(--text-dark);
      font-size: 9px;
    }
    .m-cell-val {
      font-weight: 700;
      margin-top: 1px;
    }
    .confirm-matrix-box {
      background: var(--bg-surface1);
      border: 1px solid var(--border);
      border-radius: 5px;
      padding: 8px 10px;
      font-family: var(--font-mono);
      font-size: 10px;
    }
    .matrix-title {
      font-size: 9px;
      font-weight: 700;
      color: var(--text-dark);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .matrix-items {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px 10px;
    }
    .matrix-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .why-invalidation-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-family: var(--font-mono);
      font-size: 10px;
      line-height: 1.5;
    }
    .why-box {
      background: rgba(0, 229, 153, 0.04);
      border: 1px solid rgba(0, 229, 153, 0.2);
      border-radius: 5px;
      padding: 8px;
    }
    .inval-box {
      background: rgba(255, 71, 87, 0.04);
      border: 1px solid rgba(255, 71, 87, 0.2);
      border-radius: 5px;
      padding: 8px;
    }
    .box-title {
      font-weight: 700;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .mtf-strip {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--bg-surface3);
      padding: 4px 8px;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 10px;
      justify-content: space-between;
    }
    .mtf-item {
      display: flex;
      align-items: center;
      gap: 3px;
    }

    /* Heatmap Controls & Table */
    .heatmap-controls-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px 12px;
      background: var(--bg-surface2);
      border: 1px solid var(--border);
      border-radius: 6px;
      margin-bottom: 10px;
    }
    .heatmap-breadth-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px 12px;
      background: var(--bg-surface1);
      border: 1px solid var(--border);
      border-radius: 6px;
      margin-bottom: 12px;
      font-family: var(--font-mono);
      font-size: 11px;
    }
    .spike-clusters-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .cluster-pill {
      background: rgba(0, 180, 216, 0.12);
      border: 1px solid rgba(0, 180, 216, 0.35);
      border-radius: 4px;
      padding: 4px 8px;
      font-family: var(--font-mono);
      font-size: 11px;
      color: #00b4d8;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .heatmap-table-wrap {
      overflow-x: auto;
      background: var(--bg-surface2);
      border: 1px solid var(--border);
      border-radius: 6px;
    }
    .sector-badge {
      font-size: 9px;
      font-family: var(--font-mono);
      padding: 1px 5px;
      border-radius: 3px;
      background: var(--bg-surface3);
      color: var(--text-muted);
      border: 1px solid var(--border);
    }
    .cross-ex-badge {
      font-size: 9px;
      font-family: var(--font-mono);
      padding: 1px 5px;
      border-radius: 3px;
      font-weight: 700;
    }
    .cross-3 {
      background: rgba(0, 229, 153, 0.15);
      color: var(--emerald);
      border: 1px solid rgba(0, 229, 153, 0.35);
    }
    .cross-2 {
      background: rgba(255, 170, 0, 0.15);
      color: var(--amber);
      border: 1px solid rgba(255, 170, 0, 0.35);
    }
    .cross-1 {
      background: var(--bg-surface3);
      color: var(--text-muted);
      border: 1px solid var(--border);
    }
    .liq-high { color: var(--emerald); }
    .liq-med { color: var(--amber); }
    .liq-low { color: var(--red); }
`;

if (!content.includes('SIGNALS & HEATMAP QUANTITATIVE INTELLIGENCE ARCHITECTURE')) {
  content = content.replace('/* Mobile Responsive Cards & Layout */', cssToAdd + '\n    /* Mobile Responsive Cards & Layout */');
  console.log('Added CSS styles.');
}

// 2. REPLACE SIGNALS AND HEATMAP VIEW MARKUP
const oldViewsRegex = /<!-- 2\. SIGNALS VIEW -->[\s\S]*?<!-- 4\. WATCHLIST VIEW -->/;
const newViewsHtml = `<!-- 2. SIGNALS VIEW -->
    <div id="view-SIGNALS" class="view-container">
      <!-- SIGNALS HEADER -->
      <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div>
          <h2 style="font-size:16px; font-weight:800; font-family:var(--font-mono); letter-spacing:0.04em;">EAGLE SIGNALS</h2>
          <p class="c-dark" style="font-size:11px;">MULTI-FACTOR MARKET CONFIRMATION</p>
        </div>
        <div style="display:flex; align-items:center; gap:8px; font-family:var(--font-mono); font-size:11px;" id="signals-header-kpis">
          <span class="badge-status status-live" id="sig-kpi-active">-- ACTIVE</span>
          <span class="badge-status" style="border-color:var(--cyan); color:var(--cyan);" id="sig-kpi-confirmed">-- CONFIRMED</span>
          <span class="badge-status" style="border-color:var(--text-dark); color:var(--text-muted);" id="sig-kpi-watch">-- WATCH</span>
          <span class="badge-status" style="border-color:var(--amber); color:var(--amber);" id="sig-kpi-btc">BTC: --</span>
          <span class="badge-status status-live" id="sig-kpi-data">DATA: HEALTHY</span>
          <span class="c-dark" style="font-size:10px;" id="sig-kpi-updated">UPDATED: JUST NOW</span>
        </div>
      </div>

      <!-- LEVEL 1: MARKET CONTEXT STRIP -->
      <div class="market-context-bar" id="signals-market-context">
        <div class="mc-item">
          <span class="mc-label">BTC REGIME:</span>
          <span class="mc-pill" id="mc-btc-regime" style="background:rgba(0,229,153,0.15); color:var(--emerald);">NEUTRAL</span>
        </div>
        <div class="mc-item">
          <span class="mc-label">MARKET BREADTH:</span>
          <span class="mc-val tabular" id="mc-breadth">--% ADV / --% DEC</span>
        </div>
        <div class="mc-item">
          <span class="mc-label">VOLUME REGIME:</span>
          <span class="mc-val" id="mc-vol-regime">NORMAL</span>
        </div>
        <div class="mc-item">
          <span class="mc-label">VOLATILITY:</span>
          <span class="mc-val" id="mc-volatility">NORMAL</span>
        </div>
        <div class="mc-item">
          <span class="mc-label">SIGNAL ENVIRONMENT:</span>
          <span class="mc-pill" id="mc-sig-env" style="background:rgba(0,180,216,0.15); color:var(--cyan);">SELECTIVE</span>
        </div>
      </div>

      <!-- LEVEL 2: SIGNAL SUMMARY STRIP -->
      <div class="signal-summary-bar" id="signals-summary-strip">
        <div class="sig-sum-cell"><div class="sig-sum-lbl">Active Signals</div><div class="sig-sum-val c-emerald" id="sum-active">0</div></div>
        <div class="sig-sum-cell"><div class="sig-sum-lbl">Confirmed</div><div class="sig-sum-val c-cyan" id="sum-confirmed">0</div></div>
        <div class="sig-sum-cell"><div class="sig-sum-lbl">Early</div><div class="sig-sum-val c-amber" id="sum-early">0</div></div>
        <div class="sig-sum-cell"><div class="sig-sum-lbl">Acceleration</div><div class="sig-sum-val c-emerald" id="sum-accel">0</div></div>
        <div class="sig-sum-cell"><div class="sig-sum-lbl">Exhaustion</div><div class="sig-sum-val c-red" id="sum-exhaust">0</div></div>
        <div class="sig-sum-cell"><div class="sig-sum-lbl">Cooling</div><div class="sig-sum-val c-muted" id="sum-cooling">0</div></div>
        <div class="sig-sum-cell"><div class="sig-sum-lbl">Long</div><div class="sig-sum-val c-emerald" id="sum-long">0</div></div>
        <div class="sig-sum-cell"><div class="sig-sum-lbl">Short</div><div class="sig-sum-val c-red" id="sum-short">0</div></div>
      </div>

      <!-- FILTER & SORT CONTROLS -->
      <div class="signal-filters-row">
        <span class="c-dark" style="font-size:10px; font-family:var(--font-mono); font-weight:700;">FILTERS:</span>
        <select id="sig-filter-type" class="sig-select" onchange="renderSignalsTab()">
          <option value="ALL">All Signal Types</option>
          <option value="MOMENTUM">Momentum</option>
          <option value="BREAKOUT">Breakout</option>
          <option value="VOLUME_EXPLOSION">Volume Explosion</option>
          <option value="SHORT_SQUEEZE">Short Squeeze</option>
          <option value="LONG_SQUEEZE">Long Squeeze</option>
          <option value="ACCUMULATION">Accumulation</option>
          <option value="EXHAUSTION">Exhaustion</option>
        </select>
        <select id="sig-filter-lifecycle" class="sig-select" onchange="renderSignalsTab()">
          <option value="ALL">All Lifecycle States</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="EARLY_SPIKE">Early</option>
          <option value="ACCELERATION">Acceleration</option>
          <option value="EXTREME">Extreme</option>
          <option value="EXHAUSTION">Exhaustion</option>
          <option value="COOLING">Cooling</option>
          <option value="WATCH">Watch</option>
        </select>
        <select id="sig-filter-side" class="sig-select" onchange="renderSignalsTab()">
          <option value="ALL">Direction: All</option>
          <option value="LONG">Long Candidates</option>
          <option value="SHORT">Short Candidates</option>
        </select>
        <select id="sig-filter-exchange" class="sig-select" onchange="renderSignalsTab()">
          <option value="ALL">Exchange: All</option>
          <option value="BYBIT">Bybit (880+)</option>
          <option value="MEXC">MEXC (1,060+)</option>
          <option value="WEEX">WEEX (990+)</option>
        </select>
        <select id="sig-filter-quality" class="sig-select" onchange="renderSignalsTab()">
          <option value="ALL">Quality: All</option>
          <option value="HIGH">High Quality</option>
          <option value="MEDIUM">Medium Quality</option>
          <option value="LOW">Low Quality</option>
        </select>
        <select id="sig-filter-confidence" class="sig-select" onchange="renderSignalsTab()">
          <option value="ALL">Confidence: All</option>
          <option value="HIGH">High Confidence (&ge;85%)</option>
          <option value="MEDIUM">Medium Confidence</option>
        </select>
        <div style="margin-left:auto; display:flex; align-items:center; gap:6px;">
          <span class="c-dark" style="font-size:10px; font-family:var(--font-mono);">SORT:</span>
          <select id="sig-sort-by" class="sig-select" onchange="renderSignalsTab()">
            <option value="EAGLE_SCORE">Eagle Score (Desc)</option>
            <option value="SIGNAL_QUALITY">Signal Quality</option>
            <option value="DATA_CONFIDENCE">Data Confidence</option>
            <option value="PRICE_MOMENTUM">Price Momentum</option>
            <option value="RVOL">RVOL (Volume Multiplier)</option>
            <option value="VOL_Z">Volume Z-Score</option>
            <option value="OI_DELTA">OI Change</option>
            <option value="TAKER_FLOW">Taker Flow</option>
            <option value="TURNOVER">24h Turnover</option>
          </select>
        </div>
      </div>

      <!-- LEVEL 3 & 4: ACTIVE SIGNAL CARDS CONTAINER / NEAREST CANDIDATES -->
      <div class="signals-grid-intel" id="signals-grid"></div>
    </div>

    <!-- 3. HEATMAP VIEW -->
    <div id="view-HEATMAP" class="view-container">
      <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div>
          <h2 style="font-size:16px; font-weight:800; font-family:var(--font-mono); letter-spacing:0.04em;">MARKET ANOMALY HEATMAP</h2>
          <p class="c-dark" style="font-size:11px;">MARKET-WIDE ANOMALY DISTRIBUTION & CROSS-VENUE VALIDATION</p>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <button id="hm-view-grid" class="btn btn-sm btn-emerald" onclick="setHeatmapViewMode('grid')">🎴 Grid View</button>
          <button id="hm-view-table" class="btn btn-sm" onclick="setHeatmapViewMode('table')">📋 Table View</button>
        </div>
      </div>

      <!-- HEATMAP COMPACT CONTROLS BAR -->
      <div class="heatmap-controls-bar">
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <span class="c-dark" style="font-size:10px; font-family:var(--font-mono); font-weight:700;">TIMEFRAME:</span>
          <div class="presets-group" style="margin-bottom:0;">
            <button class="preset-pill active hm-tf-pill" onclick="setHeatmapTimeframe('1m', this)">1m</button>
            <button class="preset-pill hm-tf-pill" onclick="setHeatmapTimeframe('5m', this)">5m</button>
            <button class="preset-pill hm-tf-pill" onclick="setHeatmapTimeframe('15m', this)">15m</button>
            <button class="preset-pill hm-tf-pill" onclick="setHeatmapTimeframe('30m', this)">30m</button>
            <button class="preset-pill hm-tf-pill" onclick="setHeatmapTimeframe('1h', this)">1h</button>
            <button class="preset-pill hm-tf-pill" onclick="setHeatmapTimeframe('4h', this)">4h</button>
            <button class="preset-pill hm-tf-pill" onclick="setHeatmapTimeframe('24h', this)">24h</button>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span class="c-dark" style="font-size:10px; font-family:var(--font-mono); font-weight:700;">METRIC:</span>
          <select id="hm-metric-select" class="sig-select" onchange="renderHeatmapTab()">
            <option value="ANOMALY_SCORE">Anomaly Score (Default)</option>
            <option value="PRICE">Price Change</option>
            <option value="VOLUME">Volume Anomaly (Z-Score)</option>
            <option value="RVOL">Relative Volume (RVOL)</option>
            <option value="TRADE_ACT">Trade Activity</option>
            <option value="OI">Open Interest Change</option>
            <option value="TAKER_FLOW">Taker Order Flow</option>
            <option value="VOLATILITY">Volatility (Sigma)</option>
            <option value="EAGLE_SCORE">Eagle Score</option>
          </select>

          <span class="c-dark" style="font-size:10px; font-family:var(--font-mono); font-weight:700;">EXCHANGE:</span>
          <select id="hm-exchange-select" class="sig-select" onchange="renderHeatmapTab()">
            <option value="ALL">All Exchanges</option>
            <option value="BYBIT">Bybit (880+)</option>
            <option value="MEXC">MEXC (1,060+)</option>
            <option value="WEEX">WEEX (990+)</option>
          </select>

          <span class="c-dark" style="font-size:10px; font-family:var(--font-mono); font-weight:700;">SECTOR:</span>
          <select id="hm-sector-select" class="sig-select" onchange="renderHeatmapTab()">
            <option value="ALL">All Sectors</option>
            <option value="LAYER 1">Layer 1</option>
            <option value="LAYER 2">Layer 2</option>
            <option value="DEFI">DeFi</option>
            <option value="AI">AI</option>
            <option value="MEME">Meme</option>
            <option value="GAMING">Gaming</option>
            <option value="INFRASTRUCTURE">Infrastructure</option>
            <option value="RWA">RWA</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      <!-- MARKET BREADTH STRIP -->
      <div class="heatmap-breadth-strip" id="heatmap-breadth-strip">
        <div>PRICE BREADTH: <strong class="c-emerald" id="hm-adv-pct">--% ADV</strong> · <strong class="c-red" id="hm-dec-pct">--% DEC</strong></div>
        <div>VOLUME BREADTH: <strong class="c-cyan" id="hm-vol-above">--% ABOVE BASELINE</strong></div>
        <div>OI BREADTH: <strong class="c-emerald" id="hm-oi-exp">--% EXPANDING</strong></div>
        <div>REGIME: <strong id="hm-regime-status">NORMAL</strong></div>
      </div>

      <!-- SPIKE CLUSTERS DISPLAY -->
      <div class="spike-clusters-wrap" id="heatmap-clusters-wrap"></div>

      <!-- HEATMAP GRID VIEW -->
      <div class="heatmap-grid" id="heatmap-grid"></div>

      <!-- HEATMAP TABLE VIEW (Hidden by default) -->
      <div class="heatmap-table-wrap" id="heatmap-table-container" style="display:none; padding:10px;">
        <table style="width:100%; border-collapse:collapse; font-size:11px; font-family:var(--font-mono);">
          <thead>
            <tr style="border-bottom:1px solid var(--border); color:var(--text-dark); text-align:left;">
              <th style="padding:6px;">#</th>
              <th style="padding:6px;">Symbol</th>
              <th style="padding:6px;">Sector</th>
              <th style="padding:6px;">Price Δ</th>
              <th style="padding:6px;">Volume Δ</th>
              <th style="padding:6px;">RVOL</th>
              <th style="padding:6px;">Trades Δ</th>
              <th style="padding:6px;">OI Δ</th>
              <th style="padding:6px;">Taker Flow</th>
              <th style="padding:6px;">Anomaly Score</th>
              <th style="padding:6px;">Eagle Score</th>
              <th style="padding:6px;">Liquidity</th>
              <th style="padding:6px;">Cross-Exchange</th>
              <th style="padding:6px;">Phase</th>
            </tr>
          </thead>
          <tbody id="heatmap-table-tbody"></tbody>
        </table>
      </div>
    </div>

    <!-- 4. WATCHLIST VIEW -->`;

content = content.replace(oldViewsRegex, () => newViewsHtml);
console.log('Replaced views markup.');

fs.writeFileSync(eaglePath, content, 'utf8');
console.log('Updated HTML markup successfully.');
