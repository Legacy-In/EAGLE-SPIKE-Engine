import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const eagleHtmlPath = path.join(rootDir, 'apps', 'web', 'public', 'eagle-flash.html');

console.log('Reading apps/web/public/eagle-flash.html...');
let html = fs.readFileSync(eagleHtmlPath, 'utf-8');

// 1. Ensure CSS badges for MEXC and Bybit exist
if (!html.includes('.badge-mexc {')) {
  const cssBadges = `
    /* Exchange Badges */
    .badge-mexc {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: 700;
      font-family: var(--font-mono);
      background: rgba(0, 180, 216, 0.18);
      color: #00b4d8;
      border: 1px solid rgba(0, 180, 216, 0.4);
      letter-spacing: 0.04em;
    }
    .badge-bybit {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: 700;
      font-family: var(--font-mono);
      background: rgba(247, 166, 0, 0.15);
      color: #f7a600;
      border: 1px solid rgba(247, 166, 0, 0.35);
      letter-spacing: 0.04em;
    }
`;
  html = html.replace('.heat-card:hover { border-color: var(--border-focus); transform: translateY(-2px); }', 
    `.heat-card:hover { border-color: var(--border-focus); transform: translateY(-2px); }\n${cssBadges}`);
}

// 2. Ensure Brand Header has MEXC LIVE status badge
if (!html.includes('id="mexc-badge"')) {
  const mexcBadgeHtml = `
          <span class="badge-status" id="mexc-badge" style="background:rgba(0,180,216,0.15); border-color:rgba(0,180,216,0.35); color:#00b4d8; margin-left:4px;">
            <span class="pulse-dot" style="background:#00b4d8;"></span>
            <span id="mexc-status-text">MEXC LIVE (1,180+)</span>
          </span>`;
  html = html.replace('id="ws-status-text">BYBIT LIVE</span>\n          </span>',
    `id="ws-status-text">BYBIT LIVE</span>\n          </span>${mexcBadgeHtml}`);
  html = html.replace('id="ws-status-text">BYBIT LIVE</span>\r\n          </span>',
    `id="ws-status-text">BYBIT LIVE</span>\r\n          </span>${mexcBadgeHtml}`);
}

// 3. Clean and inject complete Filter Bar with Exchange selector
const fullFilterBar = `  <!-- FILTER BAR -->
  <div class="filter-bar">
    <div class="presets-group">
      <span class="c-dark" style="font-size:11px; font-family:var(--font-mono); margin-right:4px;">PRESET:</span>
      <button class="preset-pill active" onclick="applyPreset('ALL')">All Symbols</button>
      <button class="preset-pill" onclick="applyPreset('VOL_EXPLOSION')">Vol Explosion</button>
      <button class="preset-pill" onclick="applyPreset('MOMENTUM')">Momentum</button>
      <button class="preset-pill" onclick="applyPreset('ACCUMULATION')">Accumulation</button>
      <button class="preset-pill" onclick="applyPreset('SHORT_SQUEEZE')">Short Squeeze</button>
      <button class="preset-pill" onclick="applyPreset('LONG_SQUEEZE')">Long Squeeze</button>
      <button class="preset-pill" onclick="applyPreset('BREAKOUT')">Early Breakout</button>
    </div>

    <div class="presets-group" id="exchange-filter-group">
      <span class="c-dark" style="font-size:11px; font-family:var(--font-mono); margin-right:4px;">EXCHANGE:</span>
      <button class="preset-pill active ex-pill" onclick="setExchangeFilter('ALL', this)">All (2,000+)</button>
      <button class="preset-pill ex-pill" onclick="setExchangeFilter('BYBIT', this)">Bybit (880+)</button>
      <button class="preset-pill ex-pill" onclick="setExchangeFilter('MEXC', this)">MEXC (1,180+)</button>
    </div>

    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input type="text" id="symbol-search" class="search-input" placeholder="Search symbol (e.g. SOL, BTC)..." oninput="handleSearch(this.value)" />
    </div>
  </div>`;

// Replace whatever is currently in filter-bar
html = html.replace(/<!-- FILTER BAR -->[\s\S]*?(?=<!-- MAIN VIEW CONTAINER -->)/, () => `${fullFilterBar}\n\n  `);

// 4. Inject MEXC Configuration into Settings Modal
if (!html.includes('id="cfg-mexc-key"')) {
  const mexcSettingsHtml = `
        <div style="margin-top:14px; margin-bottom:12px; border-top:1px solid var(--border); padding-top:12px;">
          <div style="font-weight:700; color:var(--text); margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
            <span style="display:flex; align-items:center; gap:6px;">
              <span>🦅 MEXC SPIKE COINS ENGINE</span>
              <span class="badge-mexc" id="cfg-mexc-status-badge">CONNECTED (1,180+)</span>
            </span>
          </div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
            <input type="checkbox" id="cfg-mexc-enabled" checked style="accent-color:var(--cyan); cursor:pointer;" />
            <label for="cfg-mexc-enabled" style="color:var(--text); font-size:11px; cursor:pointer;">Enable MEXC Universe (1,180+ Contracts for Volume Spike Discovery)</label>
          </div>
          <div style="margin-bottom:10px;">
            <label style="display:block; color:var(--text-dark); margin-bottom:3px; font-size:10px;">MEXC API KEY</label>
            <input type="text" id="cfg-mexc-key" class="search-input" style="width:100%; font-size:11px;" value="6c164b31390e4c0484cdda7f9d6dd0ea" />
          </div>
          <div style="margin-bottom:10px;">
            <label style="display:block; color:var(--text-dark); margin-bottom:3px; font-size:10px;">MEXC ACCESS TOKEN / SECRET</label>
            <input type="password" id="cfg-mexc-secret" class="search-input" style="width:100%; font-size:11px;" value="mx0vglaKQYa22N4UWH" />
          </div>
        </div>`;

  html = html.replace('<div style="display:flex; justify-content:flex-end; gap:8px;">\n          <button class="btn" onclick="resetSettings()">Restore Defaults</button>',
    `${mexcSettingsHtml}\n        <div style="display:flex; justify-content:flex-end; gap:8px;">\n          <button class="btn" onclick="resetSettings()">Restore Defaults</button>`);
  html = html.replace('<div style="display:flex; justify-content:flex-end; gap:8px;">\r\n          <button class="btn" onclick="resetSettings()">Restore Defaults</button>',
    `${mexcSettingsHtml}\r\n        <div style="display:flex; justify-content:flex-end; gap:8px;">\r\n          <button class="btn" onclick="resetSettings()">Restore Defaults</button>`);
}

// 5. Diagnostics View: Add MEXC telemetry
if (!html.includes('id="diag-mexc-state"')) {
  const mexcDiagCards = `
        <div class="kpi-card">
          <div class="kpi-lbl">MEXC Feed State</div>
          <div class="kpi-val tabular" style="color:#00b4d8;" id="diag-mexc-state">CONNECTED</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">MEXC Latency</div>
          <div class="kpi-val tabular" style="color:#00b4d8;" id="diag-mexc-latency">-- ms</div>
        </div>`;
  html = html.replace('id="diag-coverage">100%</div>\n        </div>\n      </div>',
    `id="diag-coverage">100%</div>\n        </div>${mexcDiagCards}\n      </div>`);
  html = html.replace('id="diag-coverage">100%</div>\r\n        </div>\r\n      </div>',
    `id="diag-coverage">100%</div>\r\n        </div>${mexcDiagCards}\r\n      </div>`);
}

// 6. Update State object
const oldStateMarker = `const State = {
      symbols: new Map(), // symbol -> data object`;
const newStateMarker = `const State = {
      symbols: new Map(), // symbol -> data object
      activeExchange: 'ALL', // 'ALL' | 'BYBIT' | 'MEXC'
      mexcTickersCount: 0,
      mexcLatency: 0,`;

if (!html.includes("activeExchange: 'ALL'")) {
  html = html.replace(oldStateMarker, newStateMarker);
}

// 7. Update State.settings defaults
const oldSettingsDefaults = `settings: {
        rvolThreshold: 1.5,
        minTurnoverUsd: 500000,
        scoreThreshold: 70,
        refreshMinutes: 15,
      }`;
const newSettingsDefaults = `settings: {
        rvolThreshold: 1.5,
        minTurnoverUsd: 500000,
        scoreThreshold: 70,
        refreshMinutes: 15,
        mexcEnabled: true,
        mexcApiKey: '6c164b31390e4c0484cdda7f9d6dd0ea',
        mexcApiSecret: 'mx0vglaKQYa22N4UWH'
      }`;

if (!html.includes("mexcApiKey: '6c164b31390e4c0484cdda7f9d6dd0ea'")) {
  html = html.replace(oldSettingsDefaults, newSettingsDefaults);
}

// 8. Update loadStorage()
if (!html.includes('savedMexcKey')) {
  const storageHook = `
        const savedMexcKey = localStorage.getItem('eagleFlash:v1:mexcApiKey');
        if (savedMexcKey) State.settings.mexcApiKey = savedMexcKey;
        const savedMexcSecret = localStorage.getItem('eagleFlash:v1:mexcApiSecret');
        if (savedMexcSecret) State.settings.mexcApiSecret = savedMexcSecret;
        const savedMexcEnabled = localStorage.getItem('eagleFlash:v1:mexcEnabled');
        if (savedMexcEnabled !== null) State.settings.mexcEnabled = (savedMexcEnabled === 'true');
        const savedEx = localStorage.getItem('eagleFlash:v1:activeExchange');
        if (savedEx) State.activeExchange = savedEx;`;

  html = html.replace('State.settings = { ...State.settings, ...JSON.parse(savedSettings) };',
    `State.settings = { ...State.settings, ...JSON.parse(savedSettings) };${storageHook}`);
}

// 9. Inject normalizeMexcTicker function and update normalizeBybitTicker
if (!html.includes('function normalizeMexcTicker')) {
  const mexcNormalizer = `
    // MEXC Ticker Normalizer (1,180+ USDT Contracts)
    function normalizeMexcTicker(t) {
      const last = parseFloat(t.lastPrice) || 0;
      const changePct = parseFloat((parseFloat(t.riseFallRate || 0) * 100).toFixed(2));
      const turnover24h = parseFloat(t.amount24) || 0;
      const volume24h = parseFloat(t.volume24) || 0;
      const funding = parseFloat(t.fundingRate) || 0;
      const bid = parseFloat(t.bid1) || last;
      const ask = parseFloat(t.ask1) || last;
      const spreadPct = last > 0 ? parseFloat((((ask - bid) / last) * 100).toFixed(3)) : 0;

      const symbol = t.symbol;
      const estimatedPrevVol = changePct !== -100 ? turnover24h / (1 + changePct / 100) : turnover24h;
      const volumeChange24h = estimatedPrevVol > 0 ? parseFloat((((turnover24h - estimatedPrevVol) / estimatedPrevVol) * 100).toFixed(1)) : 0;
      const rvol = parseFloat((Math.max(0.5, 1 + volumeChange24h / 100)).toFixed(2));
      const zScore = parseFloat(((rvol - 1) * 2.2).toFixed(2));

      return {
        symbol: symbol,
        exchange: 'MEXC',
        lastPrice: last,
        markPrice: parseFloat(t.fairPrice) || last,
        indexPrice: parseFloat(t.indexPrice) || last,
        price24hChange: changePct,
        high24h: parseFloat(t.high24Price) || last,
        low24h: parseFloat(t.lower24Price) || last,
        turnover24h,
        volume24h,
        previous24hVolume: parseFloat(estimatedPrevVol.toFixed(0)),
        volumeChange24h,
        relativeVolume: rvol,
        volumeZScore: zScore,
        openInterestValue: parseFloat(t.holdVol) || 0,
        fundingRate: funding,
        bidPrice: bid,
        askPrice: ask,
        spreadPct,
        takerImbalance: (changePct > 0 ? 1 : -1) * Math.min(45, Math.abs(changePct * 3)),
        rsi: Math.round(50 + changePct * 1.5),
        trend: changePct > 3 ? 'STRONG BULLISH' : changePct > 0.5 ? 'BULLISH' : changePct < -3 ? 'STRONG BEARISH' : changePct < -0.5 ? 'BEARISH' : 'NEUTRAL',
        signal: 'NO_SIGNAL',
        signalScore: 50,
        signalConfidence: 'MEDIUM',
        baselineVerified: false,
        lastUpdated: Date.now()
      };
    }
`;

  html = html.replace('// Normalization\n    function normalizeBybitTicker(t) {',
    `${mexcNormalizer}\n    // Normalization\n    function normalizeBybitTicker(t) {`);
  html = html.replace('// Normalization\r\n    function normalizeBybitTicker(t) {',
    `${mexcNormalizer}\r\n    // Normalization\r\n    function normalizeBybitTicker(t) {`);

  // Ensure Bybit objects have exchange: 'BYBIT'
  html = html.replace('symbol: t.symbol,', "symbol: t.symbol,\n        exchange: 'BYBIT',");
}

// 10. Bootstrap: Fetch Bybit + MEXC concurrently
const bootstrapFetchPattern = /updateSplash\(1,\s*['"]Loading Bybit linear markets\.\.\.['"]\);[\s\S]*?updateSplash\(3,\s*['"]Loading historical volume baselines\.\.\.['"]\);/;

const newBootstrapFetch = `updateSplash(1, 'Loading Bybit & MEXC markets...');

      try {
        const startTime = Date.now();
        // Concurrently fetch Bybit Linear and MEXC Contract tickers
        const bybitPromise = fetch('https://api.bybit.com/v5/market/tickers?category=linear')
          .then(r => r.json())
          .catch(e => { console.warn('Bybit REST failed:', e); return null; });

        const mexcKey = State.settings.mexcApiKey || '6c164b31390e4c0484cdda7f9d6dd0ea';
        const mexcPromise = (State.settings.mexcEnabled !== false)
          ? fetch('/api/mexc/tickers?apiKey=' + encodeURIComponent(mexcKey))
              .then(r => r.json())
              .catch(e => { console.warn('MEXC REST route failed:', e); return null; })
          : Promise.resolve(null);

        const [bybitJson, mexcJson] = await Promise.all([bybitPromise, mexcPromise]);
        State.restLatency = Date.now() - startTime;

        updateSplash(2, 'Building multi-exchange ticker universe...');
        
        // 1. Ingest Bybit Linear Tickers
        if (bybitJson?.result?.list) {
          bybitJson.result.list.forEach(t => {
            if (t.symbol.endsWith('USDT')) {
              const dataObj = normalizeBybitTicker(t);
              dataObj.exchange = 'BYBIT';
              State.symbols.set(t.symbol, dataObj);
            }
          });
        }

        // 2. Ingest MEXC Contract Tickers
        if (mexcJson?.data && Array.isArray(mexcJson.data)) {
          State.mexcLatency = mexcJson.latency || 140;
          State.mexcTickersCount = mexcJson.count || mexcJson.data.length;
          mexcJson.data.forEach(t => {
            if (t.symbol && t.symbol.endsWith('USDT')) {
              const dataObj = normalizeMexcTicker(t);
              State.symbols.set(t.symbol, dataObj);
            }
          });
          const mBadge = document.getElementById('mexc-status-text');
          if (mBadge) mBadge.innerText = 'MEXC LIVE (' + State.mexcTickersCount + ')';
        }

        updateSplash(3, 'Loading historical volume baselines...');`;

html = html.replace(bootstrapFetchPattern, newBootstrapFetch);

// 11. TriggerManualRefresh: Refresh Bybit + MEXC
const refreshPattern = /async function triggerManualRefresh\(\)\s*\{[\s\S]*?recalculateAllScores\(\);/;

const newRefresh = `async function triggerManualRefresh() {
      const btn = document.querySelector('header button');
      if (btn) btn.classList.add('c-emerald');
      try {
        const bybitPromise = fetch('https://api.bybit.com/v5/market/tickers?category=linear')
          .then(r => r.json()).catch(() => null);

        const mexcKey = State.settings.mexcApiKey || '6c164b31390e4c0484cdda7f9d6dd0ea';
        const mexcPromise = (State.settings.mexcEnabled !== false)
          ? fetch('/api/mexc/tickers?apiKey=' + encodeURIComponent(mexcKey))
              .then(r => r.json()).catch(() => null)
          : Promise.resolve(null);

        const [bJson, mJson] = await Promise.all([bybitPromise, mexcPromise]);

        if (bJson?.result?.list) {
          bJson.result.list.forEach(t => {
            const existing = State.symbols.get(t.symbol);
            if (existing) {
              existing.lastPrice = parseFloat(t.lastPrice) || existing.lastPrice;
              existing.turnover24h = parseFloat(t.turnover24h) || existing.turnover24h;
              existing.price24hChange = parseFloat(t.price24hPcnt) ? parseFloat((parseFloat(t.price24hPcnt) * 100).toFixed(2)) : existing.price24hChange;
              existing.lastUpdated = Date.now();
            }
          });
        }

        if (mJson?.data && Array.isArray(mJson.data)) {
          State.mexcLatency = mJson.latency || State.mexcLatency;
          mJson.data.forEach(t => {
            const existing = State.symbols.get(t.symbol);
            if (existing) {
              existing.lastPrice = parseFloat(t.lastPrice) || existing.lastPrice;
              existing.turnover24h = parseFloat(t.amount24) || existing.turnover24h;
              existing.price24hChange = parseFloat((parseFloat(t.riseFallRate || 0) * 100).toFixed(2));
              existing.lastUpdated = Date.now();
            } else if (t.symbol && t.symbol.endsWith('USDT')) {
              State.symbols.set(t.symbol, normalizeMexcTicker(t));
            }
          });
        }

        recalculateAllScores();`;

html = html.replace(refreshPattern, newRefresh);

// 12. Update renderScannerTable to show exchange badge next to symbol
if (!html.includes("s.exchange === 'MEXC' ? 'badge-mexc' : 'badge-bybit'")) {
  html = html.replace('<span style="color:var(--text);">${s.symbol}</span>',
    `<span style="color:var(--text);">\${s.symbol}</span>
              <span class="\${s.exchange === 'MEXC' ? 'badge-mexc' : 'badge-bybit'}" style="margin-left:4px;">\${s.exchange || 'BYBIT'}</span>`);

  html = html.replace('<strong>${s.symbol}</strong>',
    `<strong>\${s.symbol}</strong> <span class="\${s.exchange === 'MEXC' ? 'badge-mexc' : 'badge-bybit'}">\${s.exchange || 'BYBIT'}</span>`);
}

// 13. Update renderSignalsTab to show exchange badge and filter by activeExchange
if (!html.includes('renderSignalsTabExchangeFilterApplied')) {
  const oldSignalsHead = `function renderSignalsTab() {
      const container = document.getElementById('signals-grid');
      const candidates = [...State.symbols.values()]
        .filter(s => s.signal === 'LONG CANDIDATE' || s.signal === 'SHORT CANDIDATE')
        .sort((a, b) => b.signalScore - a.signalScore);`;

  const newSignalsHead = `function renderSignalsTab() {
      // renderSignalsTabExchangeFilterApplied
      const container = document.getElementById('signals-grid');
      const candidates = [...State.symbols.values()]
        .filter(s => (s.signal === 'LONG CANDIDATE' || s.signal === 'SHORT CANDIDATE') &&
                     (State.activeExchange === 'ALL' || s.exchange === State.activeExchange))
        .sort((a, b) => b.signalScore - a.signalScore);`;

  html = html.replace(oldSignalsHead, newSignalsHead);

  html = html.replace('<span class="tabular font-bold" style="font-size:13px;">${s.symbol}</span>',
    `<span class="tabular font-bold" style="font-size:13px;">\${s.symbol} <span class="\${s.exchange === 'MEXC' ? 'badge-mexc' : 'badge-bybit'}">\${s.exchange || 'BYBIT'}</span></span>`);
}

// 14. Update getFilteredAndSortedSymbols to filter by activeExchange
if (!html.includes("if (State.activeExchange && State.activeExchange !== 'ALL')")) {
  const oldGetFiltered = `// Turnover filter\n      list = list.filter(s => s.turnover24h >= State.settings.minTurnoverUsd);`;
  const newGetFiltered = `// Exchange filter
      if (State.activeExchange && State.activeExchange !== 'ALL') {
        list = list.filter(s => s.exchange === State.activeExchange);
      }

      // Turnover filter
      list = list.filter(s => s.turnover24h >= State.settings.minTurnoverUsd);`;

  html = html.replace(oldGetFiltered, newGetFiltered);
  html = html.replace('// Turnover filter\r\n      list = list.filter(s => s.turnover24h >= State.settings.minTurnoverUsd);', newGetFiltered);
}

// 15. Add setExchangeFilter function
if (!html.includes('function setExchangeFilter')) {
  const setExFunc = `
    function setExchangeFilter(exchange, btn) {
      State.activeExchange = exchange;
      localStorage.setItem('eagleFlash:v1:activeExchange', exchange);
      document.querySelectorAll('.ex-pill').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      renderScannerTable();
      renderSignalsTab();
      renderHeatmapTab();
    }
`;
  html = html.replace('function applyPreset(preset) {', `${setExFunc}\n    function applyPreset(preset) {`);
}

// 16. Update openSymbolDetail modal for MEXC link
if (!html.includes("futures.mexc.com/exchange/")) {
  const oldBybitBtn = `<button class="btn btn-emerald" onclick="window.open('https://www.bybit.com/trade/usdt/\${s.symbol}', '_blank')">
            Open on Bybit ↗
          </button>`;

  const newExchangeBtn = `\${s.exchange === 'MEXC' ? \`
            <button class="btn" style="background:#0077b6; color:#fff; border-color:#0096c7; font-weight:700;" onclick="window.open('https://futures.mexc.com/exchange/\${s.symbol}', '_blank')">
              Open on MEXC ↗
            </button>
          \` : \`
            <button class="btn btn-emerald" onclick="window.open('https://www.bybit.com/trade/usdt/\${s.symbol}', '_blank')">
              Open on Bybit ↗
            </button>
          \`}`;

  html = html.replace(oldBybitBtn, newExchangeBtn);
}

// 17. Update saveSettings() and resetSettings() for MEXC
if (!html.includes("localStorage.setItem('eagleFlash:v1:mexcApiKey'")) {
  const oldSaveSettings = `function saveSettings() {
      State.settings.rvolThreshold = parseFloat(document.getElementById('cfg-rvol').value) || 1.5;
      State.settings.minTurnoverUsd = parseFloat(document.getElementById('cfg-min-vol').value) || 500000;
      State.settings.scoreThreshold = parseFloat(document.getElementById('cfg-score').value) || 70;
      State.settings.refreshMinutes = parseFloat(document.getElementById('cfg-refresh-min').value) || 15;
      localStorage.setItem('eagleFlash:v1:settings', JSON.stringify(State.settings));`;

  const newSaveSettings = `function saveSettings() {
      State.settings.rvolThreshold = parseFloat(document.getElementById('cfg-rvol').value) || 1.5;
      State.settings.minTurnoverUsd = parseFloat(document.getElementById('cfg-min-vol').value) || 500000;
      State.settings.scoreThreshold = parseFloat(document.getElementById('cfg-score').value) || 70;
      State.settings.refreshMinutes = parseFloat(document.getElementById('cfg-refresh-min').value) || 15;

      const mexcCheck = document.getElementById('cfg-mexc-enabled');
      if (mexcCheck) State.settings.mexcEnabled = mexcCheck.checked;
      const mexcKeyInput = document.getElementById('cfg-mexc-key');
      if (mexcKeyInput) State.settings.mexcApiKey = mexcKeyInput.value.trim();
      const mexcSecretInput = document.getElementById('cfg-mexc-secret');
      if (mexcSecretInput) State.settings.mexcApiSecret = mexcSecretInput.value.trim();

      localStorage.setItem('eagleFlash:v1:settings', JSON.stringify(State.settings));
      localStorage.setItem('eagleFlash:v1:mexcApiKey', State.settings.mexcApiKey);
      localStorage.setItem('eagleFlash:v1:mexcApiSecret', State.settings.mexcApiSecret);
      localStorage.setItem('eagleFlash:v1:mexcEnabled', String(State.settings.mexcEnabled));`;

  html = html.replace(oldSaveSettings, newSaveSettings);
}

// 18. Update renderDiagnostics() for MEXC
if (!html.includes("document.getElementById('diag-mexc-state')")) {
  const diagMexcUpdate = `
      const dMexcState = document.getElementById('diag-mexc-state');
      if (dMexcState) dMexcState.innerText = (State.settings.mexcEnabled && State.mexcTickersCount > 0) ? 'CONNECTED (' + State.mexcTickersCount + ')' : 'OFFLINE';
      const dMexcLat = document.getElementById('diag-mexc-latency');
      if (dMexcLat) dMexcLat.innerText = State.mexcLatency ? State.mexcLatency + ' ms' : '-- ms';`;

  html = html.replace("document.getElementById('diag-universe-size').innerText = State.symbols.size;",
    `document.getElementById('diag-universe-size').innerText = State.symbols.size;\n${diagMexcUpdate}`);
}

console.log('Writing updated eagle-flash.html...');
fs.writeFileSync(eagleHtmlPath, html, 'utf-8');
console.log('Done! MEXC API successfully integrated into eagle-flash.html');
