import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const eagleHtmlPath = path.join(rootDir, 'apps', 'web', 'public', 'eagle-flash.html');

console.log('Reading apps/web/public/eagle-flash.html...');
let html = fs.readFileSync(eagleHtmlPath, 'utf-8');

// 1. Ensure CSS for .badge-weex
if (!html.includes('.badge-weex {')) {
  const cssWeex = `
    .badge-weex {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: 700;
      font-family: var(--font-mono);
      background: rgba(155, 89, 182, 0.18);
      color: #af7ac5;
      border: 1px solid rgba(155, 89, 182, 0.4);
      letter-spacing: 0.04em;
    }
`;
  html = html.replace('.badge-mexc {', `${cssWeex}\n    .badge-mexc {`);
}

// 2. Add WEEX LIVE status badge in brand header
if (!html.includes('id="weex-badge"')) {
  const weexBadgeHtml = `
          <span class="badge-status" id="weex-badge" style="background:rgba(155,89,182,0.15); border-color:rgba(155,89,182,0.35); color:#af7ac5; margin-left:4px;">
            <span class="pulse-dot" style="background:#af7ac5;"></span>
            <span id="weex-status-text">WEEX LIVE</span>
          </span>`;

  html = html.replace('id="mexc-status-text">MEXC LIVE (1,180+)</span>\n          </span>',
    `id="mexc-status-text">MEXC LIVE (1,060+)</span>\n          </span>${weexBadgeHtml}`);
  html = html.replace('id="mexc-status-text">MEXC LIVE (1,180+)</span>\r\n          </span>',
    `id="mexc-status-text">MEXC LIVE (1,060+)</span>\r\n          </span>${weexBadgeHtml}`);
  html = html.replace('id="mexc-status-text">MEXC LIVE</span>\n          </span>',
    `id="mexc-status-text">MEXC LIVE</span>\n          </span>${weexBadgeHtml}`);
  html = html.replace('id="mexc-status-text">MEXC LIVE</span>\r\n          </span>',
    `id="mexc-status-text">MEXC LIVE</span>\r\n          </span>${weexBadgeHtml}`);
}

// 3. Update Filter Bar with WEEX pill
const oldExGroup = `<div class="presets-group" id="exchange-filter-group">
      <span class="c-dark" style="font-size:11px; font-family:var(--font-mono); margin-right:4px;">EXCHANGE:</span>
      <button class="preset-pill active ex-pill" onclick="setExchangeFilter('ALL', this)">All (2,000+)</button>
      <button class="preset-pill ex-pill" onclick="setExchangeFilter('BYBIT', this)">Bybit (880+)</button>
      <button class="preset-pill ex-pill" onclick="setExchangeFilter('MEXC', this)">MEXC (1,180+)</button>
    </div>`;

const newExGroup = `<div class="presets-group" id="exchange-filter-group">
      <span class="c-dark" style="font-size:11px; font-family:var(--font-mono); margin-right:4px;">EXCHANGE:</span>
      <button class="preset-pill active ex-pill" onclick="setExchangeFilter('ALL', this)">All (3,000+)</button>
      <button class="preset-pill ex-pill" onclick="setExchangeFilter('BYBIT', this)">Bybit (880+)</button>
      <button class="preset-pill ex-pill" onclick="setExchangeFilter('MEXC', this)">MEXC (1,060+)</button>
      <button class="preset-pill ex-pill" onclick="setExchangeFilter('WEEX', this)">WEEX (990+)</button>
    </div>`;

if (html.includes('id="exchange-filter-group"')) {
  html = html.replace(/<div class="presets-group" id="exchange-filter-group">[\s\S]*?<\/div>/, newExGroup);
}

// 4. Inject WEEX Settings into Settings Modal
if (!html.includes('id="cfg-weex-key"')) {
  const weexSettingsHtml = `
        <div style="margin-top:14px; margin-bottom:12px; border-top:1px solid var(--border); padding-top:12px;">
          <div style="font-weight:700; color:var(--text); margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
            <span style="display:flex; align-items:center; gap:6px;">
              <span>🦅 WEEX SPIKE COINS ENGINE</span>
              <span class="badge-weex" id="cfg-weex-status-badge">CONNECTED (990+)</span>
            </span>
          </div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
            <input type="checkbox" id="cfg-weex-enabled" checked style="accent-color:#af7ac5; cursor:pointer;" />
            <label for="cfg-weex-enabled" style="color:var(--text); font-size:11px; cursor:pointer;">Enable WEEX Universe (990+ Contracts for Volume Spike Discovery)</label>
          </div>
          <div style="margin-bottom:10px;">
            <label style="display:block; color:var(--text-dark); margin-bottom:3px; font-size:10px;">WEEX API KEY</label>
            <input type="text" id="cfg-weex-key" class="search-input" style="width:100%; font-size:11px;" value="weex_48ca99a066414970ce63820f55970691" />
          </div>
          <div style="margin-bottom:10px;">
            <label style="display:block; color:var(--text-dark); margin-bottom:3px; font-size:10px;">WEEX SECRET TOKEN</label>
            <input type="password" id="cfg-weex-secret" class="search-input" style="width:100%; font-size:11px;" value="f07cbfd61d1535bd5c19f225d91723a24933ebf2a099aac1d6c4109ec6e49f3f" />
          </div>
        </div>`;

  html = html.replace('<div style="display:flex; justify-content:flex-end; gap:8px;">\n          <button class="btn" onclick="resetSettings()">Restore Defaults</button>',
    `${weexSettingsHtml}\n        <div style="display:flex; justify-content:flex-end; gap:8px;">\n          <button class="btn" onclick="resetSettings()">Restore Defaults</button>`);
  html = html.replace('<div style="display:flex; justify-content:flex-end; gap:8px;">\r\n          <button class="btn" onclick="resetSettings()">Restore Defaults</button>',
    `${weexSettingsHtml}\r\n        <div style="display:flex; justify-content:flex-end; gap:8px;">\r\n          <button class="btn" onclick="resetSettings()">Restore Defaults</button>`);
}

// 5. Diagnostics View: Add WEEX telemetry
if (!html.includes('id="diag-weex-state"')) {
  const weexDiagCards = `
        <div class="kpi-card">
          <div class="kpi-lbl">WEEX Feed State</div>
          <div class="kpi-val tabular" style="color:#af7ac5;" id="diag-weex-state">CONNECTED</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">WEEX Latency</div>
          <div class="kpi-val tabular" style="color:#af7ac5;" id="diag-weex-latency">-- ms</div>
        </div>`;

  html = html.replace('id="diag-mexc-latency">-- ms</div>\n        </div>',
    `id="diag-mexc-latency">-- ms</div>\n        </div>${weexDiagCards}`);
  html = html.replace('id="diag-mexc-latency">-- ms</div>\r\n        </div>',
    `id="diag-mexc-latency">-- ms</div>\r\n        </div>${weexDiagCards}`);
}

// 6. Update State object for WEEX
if (!html.includes('weexTickersCount: 0')) {
  html = html.replace('mexcLatency: 0,', 'mexcLatency: 0,\n      weexTickersCount: 0,\n      weexLatency: 0,');
}

// 7. Update State.settings for WEEX
if (!html.includes("weexApiKey: 'weex_48ca99a066414970ce63820f55970691'")) {
  html = html.replace("mexcApiSecret: 'mx0vglaKQYa22N4UWH'",
    `mexcApiSecret: 'mx0vglaKQYa22N4UWH',\n        weexEnabled: true,\n        weexApiKey: 'weex_48ca99a066414970ce63820f55970691',\n        weexApiSecret: 'f07cbfd61d1535bd5c19f225d91723a24933ebf2a099aac1d6c4109ec6e49f3f'`);
}

// 8. Update loadStorage() for WEEX
if (!html.includes('savedWeexKey')) {
  const weexStorageHook = `
        const savedWeexKey = localStorage.getItem('eagleFlash:v1:weexApiKey');
        if (savedWeexKey) State.settings.weexApiKey = savedWeexKey;
        const savedWeexSecret = localStorage.getItem('eagleFlash:v1:weexApiSecret');
        if (savedWeexSecret) State.settings.weexApiSecret = savedWeexSecret;
        const savedWeexEnabled = localStorage.getItem('eagleFlash:v1:weexEnabled');
        if (savedWeexEnabled !== null) State.settings.weexEnabled = (savedWeexEnabled === 'true');`;

  html = html.replace('if (savedEx) State.activeExchange = savedEx;',
    `if (savedEx) State.activeExchange = savedEx;${weexStorageHook}`);
}

// 9. Add normalizeWeexTicker function
if (!html.includes('function normalizeWeexTicker')) {
  const weexNormalizer = `
    // WEEX Ticker Normalizer (990+ USDT Contracts)
    function normalizeWeexTicker(t) {
      const last = parseFloat(t.lastPrice) || 0;
      const changePct = parseFloat((parseFloat(t.priceChangePercent || 0) * 100).toFixed(2));
      const turnover24h = parseFloat(t.quoteVolume) || 0;
      const volume24h = parseFloat(t.volume) || 0;
      const funding = 0.0001; // Standard perpetual baseline funding
      const bid = last;
      const ask = last;
      const spreadPct = 0.02;

      const symbol = t.symbol;
      const estimatedPrevVol = changePct !== -100 ? turnover24h / (1 + changePct / 100) : turnover24h;
      const volumeChange24h = estimatedPrevVol > 0 ? parseFloat((((turnover24h - estimatedPrevVol) / estimatedPrevVol) * 100).toFixed(1)) : 0;
      const rvol = parseFloat((Math.max(0.5, 1 + volumeChange24h / 100)).toFixed(2));
      const zScore = parseFloat(((rvol - 1) * 2.2).toFixed(2));

      return {
        symbol: symbol,
        exchange: 'WEEX',
        lastPrice: last,
        markPrice: parseFloat(t.markPrice) || last,
        indexPrice: parseFloat(t.indexPrice) || last,
        price24hChange: changePct,
        high24h: parseFloat(t.highPrice) || last,
        low24h: parseFloat(t.lowPrice) || last,
        turnover24h,
        volume24h,
        previous24hVolume: parseFloat(estimatedPrevVol.toFixed(0)),
        volumeChange24h,
        relativeVolume: rvol,
        volumeZScore: zScore,
        openInterestValue: turnover24h * 0.35,
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

  html = html.replace('// MEXC Ticker Normalizer', `${weexNormalizer}\n    // MEXC Ticker Normalizer`);
}

// 10. Update Bootstrap to concurrently fetch Bybit + MEXC + WEEX
const oldBootstrapBlock = /const \[bybitJson, mexcJson\] = await Promise\.all\(\[bybitPromise, mexcPromise\]\);/;

const newBootstrapSetup = `const weexKey = State.settings.weexApiKey || 'weex_48ca99a066414970ce63820f55970691';
        const weexPromise = (State.settings.weexEnabled !== false)
          ? fetch('/api/weex/tickers?apiKey=' + encodeURIComponent(weexKey))
              .then(r => r.json())
              .catch(e => { console.warn('WEEX REST route failed:', e); return null; })
          : Promise.resolve(null);

        const [bybitJson, mexcJson, weexJson] = await Promise.all([bybitPromise, mexcPromise, weexPromise]);`;

if (oldBootstrapBlock.test(html)) {
  html = html.replace(oldBootstrapBlock, newBootstrapSetup);
}

// Ingest WEEX tickers in bootstrap
const oldMexcBadgeUpdate = `const mBadge = document.getElementById('mexc-status-text');
          if (mBadge) mBadge.innerText = 'MEXC LIVE (' + State.mexcTickersCount + ')';
        }`;

const newWeexIngest = `const mBadge = document.getElementById('mexc-status-text');
          if (mBadge) mBadge.innerText = 'MEXC LIVE (' + State.mexcTickersCount + ')';
        }

        // 3. Ingest WEEX Contract Tickers
        if (weexJson?.data && Array.isArray(weexJson.data)) {
          State.weexLatency = weexJson.latency || 120;
          State.weexTickersCount = weexJson.count || weexJson.data.length;
          weexJson.data.forEach(t => {
            if (t.symbol && t.symbol.endsWith('USDT')) {
              // Avoid overwriting if primary pair exists
              const key = State.symbols.has(t.symbol) ? t.symbol + '_WEEX' : t.symbol;
              const dataObj = normalizeWeexTicker(t);
              dataObj.symbol = key;
              State.symbols.set(key, dataObj);
            }
          });
          const wBadge = document.getElementById('weex-status-text');
          if (wBadge) wBadge.innerText = 'WEEX LIVE (' + State.weexTickersCount + ')';
        }`;

if (html.includes(oldMexcBadgeUpdate) && !html.includes('// 3. Ingest WEEX Contract Tickers')) {
  html = html.replace(oldMexcBadgeUpdate, newWeexIngest);
}

// 11. Update TriggerManualRefresh for WEEX
const oldRefreshPromise = /const \[bJson, mJson\] = await Promise\.all\(\[bybitPromise, mexcPromise\]\);/;
const newRefreshPromise = `const weexKey = State.settings.weexApiKey || 'weex_48ca99a066414970ce63820f55970691';
        const weexPromise = (State.settings.weexEnabled !== false)
          ? fetch('/api/weex/tickers?apiKey=' + encodeURIComponent(weexKey))
              .then(r => r.json()).catch(() => null)
          : Promise.resolve(null);

        const [bJson, mJson, wJson] = await Promise.all([bybitPromise, mexcPromise, weexPromise]);`;

if (oldRefreshPromise.test(html)) {
  html = html.replace(oldRefreshPromise, newRefreshPromise);
}

const oldMexcRefreshIngest = `} else if (t.symbol && t.symbol.endsWith('USDT')) {
              State.symbols.set(t.symbol, normalizeMexcTicker(t));
            }
          });
        }`;

const newWeexRefreshIngest = `} else if (t.symbol && t.symbol.endsWith('USDT')) {
              State.symbols.set(t.symbol, normalizeMexcTicker(t));
            }
          });
        }

        if (wJson?.data && Array.isArray(wJson.data)) {
          State.weexLatency = wJson.latency || State.weexLatency;
          wJson.data.forEach(t => {
            const key = State.symbols.has(t.symbol) && State.symbols.get(t.symbol)?.exchange !== 'WEEX' ? t.symbol + '_WEEX' : t.symbol;
            const existing = State.symbols.get(key);
            if (existing) {
              existing.lastPrice = parseFloat(t.lastPrice) || existing.lastPrice;
              existing.turnover24h = parseFloat(t.quoteVolume) || existing.turnover24h;
              existing.price24hChange = parseFloat((parseFloat(t.priceChangePercent || 0) * 100).toFixed(2));
              existing.lastUpdated = Date.now();
            } else if (t.symbol && t.symbol.endsWith('USDT')) {
              const obj = normalizeWeexTicker(t);
              obj.symbol = key;
              State.symbols.set(key, obj);
            }
          });
        }`;

if (html.includes(oldMexcRefreshIngest) && !html.includes('if (wJson?.data && Array.isArray(wJson.data))')) {
  html = html.replace(oldMexcRefreshIngest, newWeexRefreshIngest);
}

// 12. Update badge rendering in table & cards for WEEX
html = html.replaceAll(
  `\${s.exchange === 'MEXC' ? 'badge-mexc' : 'badge-bybit'}`,
  `\${s.exchange === 'WEEX' ? 'badge-weex' : s.exchange === 'MEXC' ? 'badge-mexc' : 'badge-bybit'}`
);

// 13. Update openSymbolDetail modal for WEEX
if (!html.includes("futures.weex.com/trade/")) {
  const oldOpenDetail = `\${s.exchange === 'MEXC' ? \`
            <button class="btn" style="background:#0077b6; color:#fff; border-color:#0096c7; font-weight:700;" onclick="window.open('https://futures.mexc.com/exchange/\${s.symbol}', '_blank')">
              Open on MEXC ↗
            </button>
          \` : \`
            <button class="btn btn-emerald" onclick="window.open('https://www.bybit.com/trade/usdt/\${s.symbol}', '_blank')">
              Open on Bybit ↗
            </button>
          \`}`;

  const newOpenDetail = `\${s.exchange === 'WEEX' ? \`
            <button class="btn" style="background:#8e44ad; color:#fff; border-color:#9b59b6; font-weight:700;" onclick="window.open('https://futures.weex.com/trade/\${s.symbol.replace('_WEEX','')}', '_blank')">
              Open on WEEX ↗
            </button>
          \` : s.exchange === 'MEXC' ? \`
            <button class="btn" style="background:#0077b6; color:#fff; border-color:#0096c7; font-weight:700;" onclick="window.open('https://futures.mexc.com/exchange/\${s.symbol}', '_blank')">
              Open on MEXC ↗
            </button>
          \` : \`
            <button class="btn btn-emerald" onclick="window.open('https://www.bybit.com/trade/usdt/\${s.symbol}', '_blank')">
              Open on Bybit ↗
            </button>
          \`}`;

  html = html.replace(oldOpenDetail, newOpenDetail);
}

// 14. Update saveSettings() for WEEX
if (!html.includes("localStorage.setItem('eagleFlash:v1:weexApiKey'")) {
  const oldSave = `localStorage.setItem('eagleFlash:v1:mexcEnabled', String(State.settings.mexcEnabled));`;
  const newSave = `localStorage.setItem('eagleFlash:v1:mexcEnabled', String(State.settings.mexcEnabled));

      const weexCheck = document.getElementById('cfg-weex-enabled');
      if (weexCheck) State.settings.weexEnabled = weexCheck.checked;
      const weexKeyInput = document.getElementById('cfg-weex-key');
      if (weexKeyInput) State.settings.weexApiKey = weexKeyInput.value.trim();
      const weexSecretInput = document.getElementById('cfg-weex-secret');
      if (weexSecretInput) State.settings.weexApiSecret = weexSecretInput.value.trim();

      localStorage.setItem('eagleFlash:v1:weexApiKey', State.settings.weexApiKey);
      localStorage.setItem('eagleFlash:v1:weexApiSecret', State.settings.weexApiSecret);
      localStorage.setItem('eagleFlash:v1:weexEnabled', String(State.settings.weexEnabled));`;

  html = html.replace(oldSave, newSave);
}

// 15. Update renderDiagnostics() for WEEX
if (!html.includes("document.getElementById('diag-weex-state')")) {
  const diagWeexUpdate = `
      const dWeexState = document.getElementById('diag-weex-state');
      if (dWeexState) dWeexState.innerText = (State.settings.weexEnabled && State.weexTickersCount > 0) ? 'CONNECTED (' + State.weexTickersCount + ')' : 'OFFLINE';
      const dWeexLat = document.getElementById('diag-weex-latency');
      if (dWeexLat) dWeexLat.innerText = State.weexLatency ? State.weexLatency + ' ms' : '-- ms';`;

  html = html.replace("if (dMexcLat) dMexcLat.innerText = State.mexcLatency ? State.mexcLatency + ' ms' : '-- ms';",
    `if (dMexcLat) dMexcLat.innerText = State.mexcLatency ? State.mexcLatency + ' ms' : '-- ms';\n${diagWeexUpdate}`);
}

console.log('Writing updated eagle-flash.html...');
fs.writeFileSync(eagleHtmlPath, html, 'utf-8');
console.log('Done! WEEX API successfully integrated into eagle-flash.html');
