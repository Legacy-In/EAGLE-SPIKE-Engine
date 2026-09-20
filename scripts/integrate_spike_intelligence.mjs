import fs from 'fs';
import path from 'path';
import vm from 'vm';

console.log('🦅 Upgrading EAGLE FLASH Terminal with Production Spike Intelligence...');

const filePath = path.join(process.cwd(), 'apps', 'web', 'public', 'eagle-flash.html');
let html = fs.readFileSync(filePath, 'utf-8');

// ═════════════════════════════════════════════════════════════════════════
// 1. Inject New CSS Styles (Phase, Type, Quality Badges, Sparklines, Popovers)
// ═════════════════════════════════════════════════════════════════════════
const newStyles = `
    /* Phase, Type & Quality Badges */
    .phase-badge {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
      display: inline-block;
      white-space: nowrap;
      letter-spacing: 0.02em;
    }
    .phase-normal { background: var(--bg-surface3); color: var(--text-dark); border: 1px solid var(--border); }
    .phase-pre { background: rgba(139, 92, 246, 0.15); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.35); }
    .phase-early { background: rgba(0, 210, 255, 0.15); color: #38bdf8; border: 1px solid rgba(0, 210, 255, 0.35); }
    .phase-accel { background: rgba(255, 170, 0, 0.15); color: #fbbf24; border: 1px solid rgba(255, 170, 0, 0.4); box-shadow: 0 0 6px rgba(255, 170, 0, 0.2); }
    .phase-extreme { background: rgba(255, 71, 87, 0.2); color: #ff6b81; border: 1px solid rgba(255, 71, 87, 0.5); font-weight: 800; animation: pulseGlow 1.5s infinite; }
    .phase-exhaust { background: rgba(245, 158, 11, 0.18); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4); }
    .phase-cooling { background: rgba(148, 163, 184, 0.12); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3); }
    .phase-reversal { background: rgba(239, 68, 68, 0.18); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); }
    .phase-cont { background: rgba(0, 229, 153, 0.18); color: var(--emerald); border: 1px solid rgba(0, 229, 153, 0.4); }

    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 4px rgba(255, 71, 87, 0.3); }
      50% { box-shadow: 0 0 10px rgba(255, 71, 87, 0.6); }
    }

    .type-badge {
      font-family: var(--font-mono);
      font-size: 9px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 3px;
      background: var(--bg-surface2);
      color: var(--text-muted);
      border: 1px solid var(--border);
    }
    .type-sqz { background: rgba(236, 72, 153, 0.15); color: #f472b6; border-color: rgba(236, 72, 153, 0.35); }
    .type-vol { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border-color: rgba(56, 189, 248, 0.35); }
    .type-mom { background: rgba(52, 211, 153, 0.15); color: #34d399; border-color: rgba(52, 211, 153, 0.35); }
    .type-brk { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border-color: rgba(245, 158, 11, 0.35); }
    .type-acc { background: rgba(168, 85, 247, 0.15); color: #c084fc; border-color: rgba(168, 85, 247, 0.35); }

    .quality-badge {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .quality-high { background: rgba(0, 229, 153, 0.18); color: var(--emerald); border: 1px solid rgba(0, 229, 153, 0.4); }
    .quality-med { background: rgba(255, 170, 0, 0.15); color: var(--amber); border: 1px solid rgba(255, 170, 0, 0.3); }
    .quality-low { background: var(--bg-surface3); color: var(--text-dark); border: 1px solid var(--border); }
    .quality-risk { background: rgba(255, 71, 87, 0.18); color: var(--red); border: 1px solid rgba(255, 71, 87, 0.4); }

    .score-clickable {
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .score-clickable:hover {
      transform: scale(1.06);
      box-shadow: 0 0 8px rgba(0, 229, 153, 0.4);
    }

    .badge-tg {
      background: rgba(0, 136, 204, 0.18);
      color: #0088cc;
      border: 1px solid rgba(0, 136, 204, 0.4);
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: background 0.15s, color 0.15s;
    }
    .badge-tg:hover { background: rgba(0, 136, 204, 0.3); color: #38bdf8; }

    .sparkline-svg {
      vertical-align: middle;
      display: inline-block;
      margin-left: 4px;
    }
`;

if (!html.includes('.phase-badge')) {
  html = html.replace('</style>', `${newStyles}\n  </style>`);
  console.log('✅ Injected Phase, Type, Quality and Sparkline styles.');
}

// ═════════════════════════════════════════════════════════════════════════
// 2. Inject Telegram Bot Link in Brand Header
// ═════════════════════════════════════════════════════════════════════════
if (!html.includes('@eaglespike_bot')) {
  const tgBadgeHtml = `
          <a href="https://t.me/eaglespike_bot" target="_blank" class="badge-tg" title="Connect Telegram Bot (@eaglespike_bot)" style="margin-left:6px;">
            <span>✈️</span> @eaglespike_bot
          </a>`;
  html = html.replace('<span id="weex-status-text">WEEX LIVE</span>\n          </span>', '<span id="weex-status-text">WEEX LIVE</span>\n          </span>' + tgBadgeHtml);
  console.log('✅ Added Telegram Bot badge in header.');
}

// ═════════════════════════════════════════════════════════════════════════
// 3. Update Table Header with Primary Columns
// ═════════════════════════════════════════════════════════════════════════
const oldTheadRegex = /<thead>[\s\S]*?<\/thead>/i;
const newThead = `<thead>
            <tr>
              <th onclick="sortTable('rank')">#</th>
              <th onclick="sortTable('symbol')">Symbol</th>
              <th onclick="sortTable('lastPrice')">Price</th>
              <th onclick="sortTable('returns5m')">5M</th>
              <th onclick="sortTable('returns15m')">15M</th>
              <th onclick="sortTable('returns1h')">1H</th>
              <th onclick="sortTable('relativeVolume')">RVOL</th>
              <th onclick="sortTable('volumeZScore')">Vol Z</th>
              <th onclick="sortTable('oiChangePct')">OI Δ</th>
              <th onclick="sortTable('takerImbalance')">Taker</th>
              <th onclick="sortTable('signalScore')">Eagle Score</th>
              <th onclick="sortTable('spikePhase')">Phase</th>
              <th onclick="sortTable('spikeType')">Type</th>
              <th onclick="sortTable('spikeQuality')">Quality</th>
              <th class="lifecycle-col" onclick="sortTable('detectedAt')">Age</th>
              <th onclick="sortTable('price24hChange')">24h</th>
              <th onclick="sortTable('turnover24h')">24h Vol</th>
              <th onclick="sortTable('openInterestValue')">Open Interest</th>
              <th onclick="sortTable('fundingRate')">Funding</th>
              <th onclick="sortTable('rsi')">RSI</th>
              <th onclick="sortTable('spreadPct')">Spread</th>
              <th class="lifecycle-col">4H</th>
              <th class="lifecycle-col">8H</th>
              <th class="lifecycle-col">1D</th>
              <th class="lifecycle-col">Status</th>
              <th>Action</th>
            </tr>
          </thead>`;

html = html.replace(oldTheadRegex, newThead);
console.log('✅ Reordered table header with primary visible columns.');

// ═════════════════════════════════════════════════════════════════════════
// 4. Inject Score Breakdown Modal in Body
// ═════════════════════════════════════════════════════════════════════════
const scoreModalHtml = `
  <!-- EAGLE SCORE BREAKDOWN MODAL -->
  <div class="modal-backdrop" id="score-modal">
    <div class="modal-box" style="max-width:540px;">
      <div class="modal-header">
        <div class="modal-title flex items-center gap-2">
          <span>🦅 EAGLE SCORE DECOMPOSITION: </span>
          <span id="score-modal-symbol" class="tabular font-bold c-cyan">BTCUSDT</span>
          <span id="score-modal-total" class="score-badge score-high" style="margin-left:6px;">85/100</span>
        </div>
        <button class="modal-close" onclick="closeModal('score-modal')">&times;</button>
      </div>
      <div class="modal-body" id="score-modal-body">
        <!-- Dynamic Breakdown Content -->
      </div>
    </div>
  </div>
`;

if (!html.includes('id="score-modal"')) {
  html = html.replace('<div class="modal-backdrop" id="symbol-modal">', scoreModalHtml + '\n  <div class="modal-backdrop" id="symbol-modal">');
  console.log('✅ Injected Eagle Score Breakdown Modal.');
}

// ═════════════════════════════════════════════════════════════════════════
// 5. Clean Duplicated Bootstrap Signal Recording Block
// ═════════════════════════════════════════════════════════════════════════
const dupBlock = `        // Immediately record any high-probability signals identified during bootstrap
        if (typeof LifecycleEngine !== 'undefined' && LifecycleEngine.recordSignal) {
          State.symbols.forEach(s => {
            if (s.signal === 'LONG CANDIDATE' || s.signal === 'SHORT CANDIDATE') {
              LifecycleEngine.recordSignal(s, { source: 'BOOTSTRAP' });
            }
          });
        }
        // Immediately record any high-probability signals identified during bootstrap
        if (typeof LifecycleEngine !== 'undefined' && LifecycleEngine.recordSignal) {
          State.symbols.forEach(s => {
            if (s.signal === 'LONG CANDIDATE' || s.signal === 'SHORT CANDIDATE') {
              LifecycleEngine.recordSignal(s, { source: 'BOOTSTRAP' });
            }
          });
        }`;

const cleanBlock = `        // Immediately record any high-probability signals identified during bootstrap
        if (typeof LifecycleEngine !== 'undefined' && LifecycleEngine.recordSignal) {
          State.symbols.forEach(s => {
            if (s.signal === 'LONG CANDIDATE' || s.signal === 'SHORT CANDIDATE') {
              LifecycleEngine.recordSignal(s, { source: 'BOOTSTRAP' });
            }
          });
        }`;

if (html.includes(dupBlock)) {
  html = html.replace(dupBlock, cleanBlock);
  console.log('✅ Cleaned duplicate bootstrap signal recording block.');
}

fs.writeFileSync(filePath, html, 'utf-8');
console.log('💾 Successfully saved apps/web/public/eagle-flash.html.');
