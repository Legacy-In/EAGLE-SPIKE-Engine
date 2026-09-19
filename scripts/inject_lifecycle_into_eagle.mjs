import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const targetFile = path.join(rootDir, 'apps', 'web', 'public', 'eagle-flash.html');

console.log('Reading apps/web/public/eagle-flash.html...');
let html = fs.readFileSync(targetFile, 'utf-8');

// If already injected, restore to clean base or re-apply idempotently
// 1. Extra CSS for Signal Lifecycle Intelligence
const lifecycleStyles = `
    /* ═══════════════════════════════════════════════════════
       EAGLE FLASH — SIGNAL LIFECYCLE INTELLIGENCE STYLES
       ═══════════════════════════════════════════════════════ */
    .badge-count {
      display: inline-block;
      padding: 1px 6px;
      font-size: 10px;
      border-radius: 10px;
      background: rgba(0, 229, 153, 0.2);
      color: var(--emerald);
      margin-left: 4px;
      font-family: var(--font-mono);
      font-weight: 700;
    }
    .status-badge-active {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(0, 229, 153, 0.15);
      border: 1px solid rgba(0, 229, 153, 0.3);
      color: var(--emerald);
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
    }
    .status-badge-confirmed {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(0, 210, 255, 0.15);
      border: 1px solid rgba(0, 210, 255, 0.3);
      color: var(--cyan);
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
    }
    .status-badge-warning {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(255, 170, 0, 0.15);
      border: 1px solid rgba(255, 170, 0, 0.3);
      color: var(--amber);
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
    }
    .status-badge-rejected {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(255, 71, 87, 0.15);
      border: 1px solid rgba(255, 71, 87, 0.3);
      color: var(--red);
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
    }
    .status-badge-expired {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(100, 116, 139, 0.15);
      border: 1px solid rgba(100, 116, 139, 0.3);
      color: var(--text-dark);
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
    }
    .cp-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(85px, 1fr));
      gap: 8px;
      margin: 12px 0;
    }
    .cp-card {
      background: var(--bg-surface2);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 6px;
      text-align: center;
    }
    .cp-card.cp-pending {
      opacity: 0.65;
      border-style: dashed;
    }
    .cp-label {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-dark);
      font-weight: 700;
    }
    .cp-value {
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 700;
      margin-top: 4px;
    }
    .timeline-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      position: relative;
      padding-bottom: 14px;
    }
    .timeline-item:not(:last-child)::after {
      content: '';
      position: absolute;
      left: 6px;
      top: 14px;
      bottom: 0;
      width: 2px;
      background: var(--border);
    }
    .timeline-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--bg-surface3);
      border: 2px solid var(--border);
      flex-shrink: 0;
      z-index: 2;
    }
    .timeline-dot.dot-green { border-color: var(--emerald); background: var(--emerald-muted); }
    .timeline-dot.dot-blue { border-color: var(--cyan); background: var(--cyan-muted); }
    .timeline-dot.dot-red { border-color: var(--red); background: var(--red-muted); }
    .timeline-dot.dot-amber { border-color: var(--amber); background: var(--amber-muted); }
    .timeline-content {
      flex: 1;
      font-family: var(--font-mono);
      font-size: 11px;
    }
    .replay-control-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      background: var(--bg-surface3);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 12px;
      margin: 12px 0;
      flex-wrap: wrap;
    }
    .replay-slider {
      width: 100%;
      accent-color: var(--cyan);
      margin: 6px 0;
      cursor: pointer;
    }
    table.hide-lifecycle-cols .lifecycle-col,
    .hide-lifecycle-cols th.lifecycle-col,
    .hide-lifecycle-cols td.lifecycle-col {
      display: none !important;
    }
`;

// Inject CSS before </style> if not already present
if (!html.includes('EAGLE FLASH — SIGNAL LIFECYCLE INTELLIGENCE STYLES')) {
  html = html.replace('</style>', () => `${lifecycleStyles}\n  </style>`);
}

// 2. Add Navigation tab "Signal Journal" to desktop nav
if (!html.includes('switchTab(\'JOURNAL\')')) {
  html = html.replace(
    `<button class="nav-btn" onclick="switchTab('WATCHLIST')">Watchlist (<span id="watch-count">0</span>)</button>`,
    () => `<button class="nav-btn" onclick="switchTab('WATCHLIST')">Watchlist (<span id="watch-count">0</span>)</button>
      <button class="nav-btn" onclick="switchTab('JOURNAL')">Signal Journal <span class="badge-count" id="journal-count">0</span></button>`
  );

  // Mobile Bottom Tabs
  html = html.replace(
    `<button class="m-tab" onclick="switchTab('WATCHLIST')">`,
    () => `<button class="m-tab" onclick="switchTab('JOURNAL')">
        <span class="m-tab-icon">📓</span>
        <span>Journal</span>
        <span class="badge-count" id="m-journal-count" style="position:absolute; top:2px; right:8px;">0</span>
      </button>
      <button class="m-tab" onclick="switchTab('WATCHLIST')">`
  );
}

// 3. Add table layout toggle button in Scanner view
if (!html.includes('btn-lifecycle-cols')) {
  html = html.replace(
    `<button id="btn-view-table" class="btn btn-sm" onclick="setScannerLayout('table')">📋 Table (Scroll)</button>`,
    () => `<button id="btn-view-table" class="btn btn-sm" onclick="setScannerLayout('table')">📋 Table (Scroll)</button>
        <button id="btn-lifecycle-cols" class="btn btn-sm btn-emerald" onclick="toggleLifecycleColumns()" title="Toggle Lifecycle Columns (Age, 4H, 8H, 1D, Status)">
          ⏱️ Lifecycle Cols: <span id="lbl-lifecycle-toggle">ON</span>
        </button>`
  );
}

// 4. Clean Table Header in Scanner view
if (!html.includes('class="lifecycle-col" onclick="sortTable(\'detectedAt\')"')) {
  html = html.replace(
    `<th onclick="sortTable('distHigh')">From High</th>`,
    () => `<th onclick="sortTable('distHigh')">From High</th>
              <th class="lifecycle-col" onclick="sortTable('detectedAt')">Age</th>
              <th class="lifecycle-col">4H</th>
              <th class="lifecycle-col">8H</th>
              <th class="lifecycle-col">1D</th>
              <th class="lifecycle-col">Status</th>`
  );
}

// 5. Add Signal Journal HTML view container
const journalViewHtml = `
    <!-- 4b. SIGNAL JOURNAL VIEW (SIGNAL LIFECYCLE INTELLIGENCE) -->
    <div id="view-JOURNAL" class="view-container">
      <div style="margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <h2 style="font-size:16px; font-weight:800; font-family:var(--font-mono); display:flex; align-items:center; gap:8px;">
            <span>🦅 SIGNAL LIFECYCLE INTELLIGENCE JOURNAL</span>
            <span class="badge-status status-live">IMMUTABLE OBSERVATIONS</span>
          </h2>
          <p class="c-dark" style="font-size:11px;">EVIDENCE-BASED POST-SIGNAL PERFORMANCE · STANDARDIZED CHECKPOINTS · MFE/MAE EXCURSIONS</p>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn btn-sm" onclick="openModal('lifecycle-analytics-modal')">📊 Cohort Analytics</button>
          <button class="btn btn-sm" onclick="openModal('lifecycle-import-modal')">📥 Import JSON</button>
          <button class="btn btn-sm" onclick="openModal('lifecycle-settings-modal')">⚙ Settings</button>
          <button class="btn btn-sm btn-emerald" onclick="LifecycleEngine.exportJournalCSV()">⬇ Export CSV</button>
          <button class="btn btn-sm" onclick="LifecycleEngine.exportTimelineCSV()">⬇ Export Timeline</button>
          <button class="btn btn-sm" onclick="LifecycleEngine.exportSignalsJSON()">⬇ Export JSON</button>
        </div>
      </div>

      <!-- Lifecycle KPI Summary Strip (Section 18) -->
      <div class="kpi-strip" style="padding:0; margin-bottom:14px;">
        <div class="kpi-card">
          <div class="kpi-lbl">Total Signals</div>
          <div class="kpi-val tabular" id="jkpi-total">0</div>
          <div class="kpi-sub">Recorded</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">Active Signals</div>
          <div class="kpi-val tabular c-emerald" id="jkpi-active">0</div>
          <div class="kpi-sub">Tracking live</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">Confirmed %</div>
          <div class="kpi-val tabular c-cyan" id="jkpi-confirmed">0 (0.0%)</div>
          <div class="kpi-sub">Breakout verified</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">Rejected %</div>
          <div class="kpi-val tabular c-red" id="jkpi-rejected">0 (0.0%)</div>
          <div class="kpi-sub">Invalidated</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">Avg 4H Return</div>
          <div class="kpi-val tabular" id="jkpi-avg4h">PENDING</div>
          <div class="kpi-sub">Directional</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">Avg 8H Return</div>
          <div class="kpi-val tabular" id="jkpi-avg8h">PENDING</div>
          <div class="kpi-sub">Directional</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">Avg 1D Return</div>
          <div class="kpi-val tabular" id="jkpi-avg1d">PENDING</div>
          <div class="kpi-sub">Directional</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">Avg MFE (Peak)</div>
          <div class="kpi-val tabular c-emerald" id="jkpi-avgmfe">PENDING</div>
          <div class="kpi-sub">Max Favorable</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">Avg MAE (Adverse)</div>
          <div class="kpi-val tabular c-red" id="jkpi-avgmae">PENDING</div>
          <div class="kpi-sub">Max Adverse</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">Avg Time To Rejection</div>
          <div class="kpi-val tabular" id="jkpi-avgttr">—</div>
          <div class="kpi-sub">Survival duration</div>
        </div>
      </div>

      <!-- Journal Filter Bar -->
      <div class="filter-bar" style="margin-bottom:12px;">
        <div class="presets-group">
          <span class="c-dark" style="font-size:11px; font-family:var(--font-mono); margin-right:4px;">STATUS:</span>
          <button class="preset-pill active" onclick="setJournalFilter('ALL', this)">All</button>
          <button class="preset-pill" onclick="setJournalFilter('ACTIVE', this)">Active</button>
          <button class="preset-pill" onclick="setJournalFilter('CONFIRMED', this)">Confirmed</button>
          <button class="preset-pill" onclick="setJournalFilter('WARNING', this)">Warning</button>
          <button class="preset-pill" onclick="setJournalFilter('REJECTED', this)">Rejected</button>
          <button class="preset-pill" onclick="setJournalFilter('EXPIRED', this)">Expired</button>
        </div>
        <div class="presets-group" style="margin-left:8px;">
          <span class="c-dark" style="font-size:11px; font-family:var(--font-mono); margin-right:4px;">SIDE:</span>
          <button class="preset-pill active" onclick="setJournalSide('ALL', this)">All</button>
          <button class="preset-pill" onclick="setJournalSide('LONG', this)">Long</button>
          <button class="preset-pill" onclick="setJournalSide('SHORT', this)">Short</button>
        </div>
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="journal-search" class="search-input" placeholder="Search signal ID or symbol..." oninput="handleJournalSearch(this.value)" />
        </div>
      </div>

      <!-- Journal Table (Section 19: 20 Standardized Columns) -->
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th onclick="sortJournal('index')">#</th>
              <th onclick="sortJournal('signalId')">Signal ID</th>
              <th onclick="sortJournal('symbol')">Symbol</th>
              <th onclick="sortJournal('direction')">Side</th>
              <th onclick="sortJournal('signalType')">Signal</th>
              <th onclick="sortJournal('score')">Score</th>
              <th onclick="sortJournal('detectedAt')">Detected (Local)</th>
              <th onclick="sortJournal('detectedAt')">Age</th>
              <th onclick="sortJournal('price')">Entry</th>
              <th onclick="sortJournal('currentPrice')">Current</th>
              <th onclick="sortJournal('currentPct')">Current %</th>
              <th onclick="sortJournal('checkpoints.4H')">4H %</th>
              <th onclick="sortJournal('checkpoints.8H')">8H %</th>
              <th onclick="sortJournal('checkpoints.1D')">1D %</th>
              <th onclick="sortJournal('mfePct')">MFE %</th>
              <th onclick="sortJournal('maePct')">MAE %</th>
              <th onclick="sortJournal('status')">Status</th>
              <th>Rejection / Warning</th>
              <th>Time To Rejection</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="journal-tbody">
            <tr><td colspan="20" class="c-dark" style="text-align:center; padding:30px;">Loading Signal Lifecycle Journal...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
`;

if (!html.includes('id="view-JOURNAL"')) {
  html = html.replace('<!-- 5. HISTORY VIEW -->', () => `${journalViewHtml}\n\n    <!-- 5. HISTORY VIEW -->`);
} else {
  html = html.replace(/<!-- 4b\. SIGNAL JOURNAL VIEW[\s\S]*?<\/div>\s*<\/div>/, () => journalViewHtml.trim());
}

// 6. Modals (Detail Drawer, Cohort Analytics, Settings, Import)
const lifecycleModalsHtml = `
  <!-- DETAILED SIGNAL LIFECYCLE MODAL -->
  <div class="modal-backdrop" id="lifecycle-detail-modal">
    <div class="modal-card" style="max-width:880px; max-height:92vh; overflow-y:auto;">
      <div class="modal-header" style="position:sticky; top:0; background:var(--bg-surface1); z-index:10; padding-bottom:10px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="tabular font-bold" id="ld-symbol" style="font-size:18px; color:var(--text);">--</span>
            <span id="ld-signal-badge" class="signal-badge sig-long">--</span>
            <span id="ld-status-badge">--</span>
          </div>
          <div style="font-family:var(--font-mono); font-size:10px; color:var(--cyan); margin-top:3px;" id="ld-signal-id">--</div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button class="btn btn-sm" onclick="LifecycleEngine.exportSelectedSignalJSON()">⬇ Export JSON</button>
          <button class="modal-close" onclick="closeModal('lifecycle-detail-modal')">&times;</button>
        </div>
      </div>

      <div style="padding:14px 0;">
        <!-- Header Key Strip -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px; margin-bottom:14px;" class="tabular">
          <div class="kpi-card">
            <div class="kpi-lbl">Signal Entry Price</div>
            <div class="kpi-val" id="ld-entry-price">$--</div>
            <div class="kpi-sub" id="ld-detected">--</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-lbl">Current Price</div>
            <div class="kpi-val" id="ld-current-price">$--</div>
            <div class="kpi-sub" id="ld-return">--</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-lbl">Signal Age</div>
            <div class="kpi-val tabular font-bold" id="ld-age">--</div>
            <div class="kpi-sub">Since detection</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-lbl">Initial Score</div>
            <div class="kpi-val c-emerald" id="ld-snap-score">--</div>
            <div class="kpi-sub" id="ld-snap-rvol">RVOL: --</div>
          </div>
        </div>

        <!-- Section 1: Standardized Time Checkpoints (11 Milestones) -->
        <div style="margin-bottom:16px;">
          <div class="c-dark" style="font-family:var(--font-mono); font-size:11px; font-weight:700; margin-bottom:6px;">
            ⏱️ TIME-BASED DIRECTIONAL PERFORMANCE (15M TO 7D STANDARDIZED CHECKPOINTS)
          </div>
          <div class="cp-grid" id="ld-checkpoints-grid"></div>
        </div>

        <!-- Section 2: Extremes (MFE & MAE) -->
        <div style="margin-bottom:16px;">
          <div class="c-dark" style="font-family:var(--font-mono); font-size:11px; font-weight:700; margin-bottom:6px;">
            🎯 EXTREMES (MAXIMUM FAVORABLE & ADVERSE EXCURSIONS)
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px;" class="tabular">
            <div class="kpi-card" style="border-left:3px solid var(--emerald);">
              <div class="kpi-lbl">MFE (Maximum Favorable Excursion)</div>
              <div class="kpi-val c-emerald" id="ld-mfe-pct">--%</div>
              <div class="kpi-sub" id="ld-mfe-price">Peak: $--</div>
              <div class="c-dark" style="font-size:9px; margin-top:2px;" id="ld-mfe-time">Time: --</div>
            </div>
            <div class="kpi-card" style="border-left:3px solid var(--red);">
              <div class="kpi-lbl">MAE (Maximum Adverse Excursion)</div>
              <div class="kpi-val c-red" id="ld-mae-pct">--%</div>
              <div class="kpi-sub" id="ld-mae-price">Trough: $--</div>
              <div class="c-dark" style="font-size:9px; margin-top:2px;" id="ld-mae-time">Time: --</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-lbl">Post-Signal High / Low</div>
              <div style="font-size:12px; font-weight:700; margin-top:4px;">
                High: <span class="c-emerald" id="ld-post-high">$--</span>
              </div>
              <div style="font-size:12px; font-weight:700;">
                Low: <span class="c-red" id="ld-post-low">$--</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 3: What Happened So Far (Dynamic Narrative) -->
        <div style="background:var(--bg-surface2); border:1px solid var(--border); border-radius:6px; padding:12px; margin-bottom:16px;">
          <div style="font-family:var(--font-mono); font-size:11px; font-weight:700; color:var(--cyan); margin-bottom:8px;">
            💡 WHAT HAPPENED SO FAR (OBSERVED EVENT NARRATIVE)
          </div>
          <div id="ld-summary-bullets"></div>
        </div>

        <!-- Section 4: Normalized Price Progression Chart -->
        <div style="background:var(--bg-surface2); border:1px solid var(--border); border-radius:6px; padding:12px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-family:var(--font-mono); font-size:11px; font-weight:700; color:var(--text-muted);">
              📈 NORMALIZED PRICE PATH (ENTRY = 0.0%)
            </span>
            <span class="c-dark" style="font-size:9px; font-family:var(--font-mono);">ZERO LOOK-AHEAD BIAS</span>
          </div>
          <div id="ld-chart-container" style="width:100%; min-height:150px;"></div>
        </div>

        <!-- Section 5: Strict No Look-Ahead Signal Replay -->
        <div style="background:var(--bg-surface2); border:1px solid var(--border); border-radius:6px; padding:12px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-family:var(--font-mono); font-size:11px; font-weight:700; color:var(--emerald);">
              ▶ STRICT NO LOOK-AHEAD REPLAY (STEP-BY-STEP SCRUBBER)
            </span>
            <span class="tabular c-dark" id="replay-step-progress" style="font-size:10px;">Step 1 of 1</span>
          </div>
          <input type="range" id="replay-scrubber" class="replay-slider" min="0" max="0" value="0" oninput="LifecycleEngine.setReplayStep(parseInt(this.value))" />
          <div class="replay-control-bar tabular">
            <div style="display:flex; gap:6px;">
              <button class="btn btn-sm" onclick="LifecycleEngine.setReplayStep(0)">⏮ T=0</button>
              <button class="btn btn-sm" onclick="LifecycleEngine.setReplayStep(LifecycleEngine.replayStepIndex - 1)">◀ Prev</button>
              <button class="btn btn-sm btn-emerald" id="btn-replay-play" onclick="LifecycleEngine.toggleReplayPlay()">▶ Play</button>
              <button class="btn btn-sm" onclick="LifecycleEngine.setReplayStep(LifecycleEngine.replayStepIndex + 1)">▶ Next</button>
              <button class="btn btn-sm" onclick="LifecycleEngine.setReplayStep(Infinity)">⏭ Now</button>
            </div>
            <div>
              <span id="replay-step-label" style="font-weight:700; color:var(--text);">T+0 (Detection)</span>:
              <span id="replay-step-price" style="font-weight:700;">$--</span>
              (<span id="replay-step-return">0.0%</span>)
            </div>
          </div>
          <div class="c-muted" id="replay-step-desc" style="font-family:var(--font-mono); font-size:11px;">Initial signal trigger.</div>
        </div>

        <!-- Section 6: Chronological Event Timeline -->
        <div style="margin-bottom:16px;">
          <div class="c-dark" style="font-family:var(--font-mono); font-size:11px; font-weight:700; margin-bottom:8px;">
            📜 CHRONOLOGICAL AUDIT TIMELINE
          </div>
          <div id="ld-timeline-container" style="max-height:220px; overflow-y:auto; padding:4px 0;"></div>
        </div>

        <!-- Section 7: Post-Mortem Card (if resolved / rejected / expired) -->
        <div id="ld-postmortem-card" style="display:none; background:rgba(255, 71, 87, 0.08); border:1px solid rgba(255, 71, 87, 0.3); border-radius:6px; padding:12px; margin-bottom:16px;">
          <div style="font-family:var(--font-mono); font-size:12px; font-weight:700; color:var(--red); margin-bottom:6px;">
            🦅 SIGNAL POST-MORTEM AUDIT
          </div>
          <div style="font-family:var(--font-mono); font-size:11px; line-height:1.7;">
            <div>• <strong>Final Status:</strong> <span id="ld-pm-status">--</span></div>
            <div>• <strong>Termination Reason:</strong> <span id="ld-pm-reason">--</span></div>
            <div>• <strong>Timestamp:</strong> <span id="ld-pm-time">--</span> (Duration: <span id="ld-pm-duration">--</span>)</div>
            <div>• <strong>Realized Directional Return:</strong> <span id="ld-pm-return">--</span></div>
            <ul id="ld-pm-bullets" style="margin-top:6px; padding-left:14px; color:var(--text-muted); list-style:none;"></ul>
          </div>
        </div>

        <!-- Detection Context Card -->
        <div style="background:var(--bg-surface2); border:1px solid var(--border); border-radius:6px; padding:12px; font-family:var(--font-mono); font-size:11px;">
          <div class="c-dark" style="font-weight:700; margin-bottom:6px;">IMMUTABLE DETECTION SNAPSHOT (T=0)</div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:6px; color:var(--text-muted);">
            <div>Open Interest: <strong id="ld-snap-oi">--</strong></div>
            <div>Funding Rate: <strong id="ld-snap-funding">--</strong></div>
            <div>Trend: <strong id="ld-snap-trend">--</strong></div>
            <div>Taker Imbalance: <strong id="ld-snap-taker">--</strong></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- COHORT ANALYTICS MODAL -->
  <div class="modal-backdrop" id="lifecycle-analytics-modal">
    <div class="modal-card" style="max-width:880px;">
      <div class="modal-header">
        <div>
          <h2 style="font-size:16px; font-weight:800; font-family:var(--font-mono);">📊 SIGNAL COHORT PERFORMANCE ANALYTICS</h2>
          <p class="c-dark" style="font-size:11px;">DESCRIPTIVE OBSERVATIONS ACROSS SCORE, RVOL, AND DIRECTIONAL COHORTS</p>
        </div>
        <button class="modal-close" onclick="closeModal('lifecycle-analytics-modal')">&times;</button>
      </div>
      <div style="padding:14px 0; font-family:var(--font-mono); font-size:11px;" id="analytics-modal-body">
        <div class="table-wrap" style="margin-bottom:14px;">
          <table>
            <thead>
              <tr>
                <th>Cohort Group</th>
                <th>Sample Size</th>
                <th>4H Return (Mean / Med)</th>
                <th>8H Return (Mean / Med)</th>
                <th>1D Return (Mean / Med)</th>
                <th>MFE (Mean / Med)</th>
                <th>MAE (Mean / Med)</th>
                <th>Avg Time To Rejection</th>
              </tr>
            </thead>
            <tbody id="cohort-tbody">
              <tr><td colspan="8" class="c-dark" style="text-align:center; padding:20px;">Computing cohort metrics...</td></tr>
            </tbody>
          </table>
        </div>
        <div class="c-dark" style="font-size:10px; line-height:1.6; border-left:3px solid var(--amber); padding-left:8px;">
          ⚠️ RESEARCH INTEGRITY DISCLAIMER: Descriptive historical statistics only. Derived strictly from local Bybit observations. Does not constitute predictive guarantees or financial advice.
        </div>
      </div>
    </div>
  </div>

  <!-- LIFECYCLE SETTINGS MODAL -->
  <div class="modal-backdrop" id="lifecycle-settings-modal">
    <div class="modal-card" style="max-width:540px;">
      <div class="modal-header">
        <div>
          <h2 style="font-size:16px; font-weight:800; font-family:var(--font-mono);">⚙️ SIGNAL LIFECYCLE SETTINGS</h2>
          <p class="c-dark" style="font-size:11px;">RETENTION · SNAPSHOTS · REJECTION THRESHOLDS</p>
        </div>
        <button class="modal-close" onclick="closeModal('lifecycle-settings-modal')">&times;</button>
      </div>
      <div style="padding:14px 0; font-family:var(--font-mono); font-size:12px;">
        <div style="margin-bottom:12px;">
          <label style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox" id="lset-enabled" checked />
            <span>Enable Signal Lifecycle Intelligence Tracking</span>
          </label>
        </div>
        <div style="margin-bottom:12px;">
          <label class="c-dark" style="display:block; font-size:11px; margin-bottom:4px;">SNAPSHOT INTERVAL</label>
          <select id="lset-interval" class="search-input" style="width:100%;">
            <option value="5">5 Minutes</option>
            <option value="15" selected>15 Minutes (Default)</option>
            <option value="30">30 Minutes</option>
            <option value="60">1 Hour</option>
          </select>
        </div>
        <div style="margin-bottom:12px;">
          <label class="c-dark" style="display:block; font-size:11px; margin-bottom:4px;">SIGNAL TIME-TO-LIVE (TTL)</label>
          <select id="lset-ttl" class="search-input" style="width:100%;">
            <option value="12">12 Hours</option>
            <option value="24">24 Hours</option>
            <option value="48">48 Hours</option>
            <option value="72" selected>72 Hours (Default)</option>
            <option value="168">7 Days</option>
          </select>
        </div>
        <div style="margin-bottom:12px;">
          <label class="c-dark" style="display:block; font-size:11px; margin-bottom:4px;">INVALIDATION THRESHOLD (% ADVERSE MOVE)</label>
          <input type="number" step="0.5" id="lset-invalidation" class="search-input" value="3.0" style="width:100%;" />
        </div>
        <div style="margin-bottom:12px;">
          <label class="c-dark" style="display:block; font-size:11px; margin-bottom:4px;">DEDUPLICATION COOLDOWN (MINUTES)</label>
          <select id="lset-cooldown" class="search-input" style="width:100%;">
            <option value="15">15 Minutes</option>
            <option value="30" selected>30 Minutes (Default)</option>
            <option value="60">1 Hour</option>
          </select>
        </div>
        <div style="margin-bottom:16px;">
          <label class="c-dark" style="display:block; font-size:11px; margin-bottom:4px;">DATA RETENTION PERIOD</label>
          <select id="lset-retention" class="search-input" style="width:100%;">
            <option value="7">7 Days</option>
            <option value="30">30 Days</option>
            <option value="90" selected>90 Days (Default)</option>
            <option value="365">1 Year</option>
            <option value="0">Unlimited</option>
          </select>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:12px;">
          <button class="btn btn-sm btn-red" onclick="LifecycleEngine.clearAllSignals()">🗑️ Clear History</button>
          <button class="btn btn-sm btn-emerald" onclick="saveLifecycleSettings()">Save Settings</button>
        </div>
      </div>
    </div>
  </div>

  <!-- LIFECYCLE IMPORT MODAL -->
  <div class="modal-backdrop" id="lifecycle-import-modal">
    <div class="modal-card" style="max-width:540px;">
      <div class="modal-header">
        <div>
          <h2 style="font-size:16px; font-weight:800; font-family:var(--font-mono);">📥 IMPORT LIFECYCLE DATASET</h2>
          <p class="c-dark" style="font-size:11px;">LOAD PREVIOUSLY EXPORTED SIGNAL DATASETS (.JSON)</p>
        </div>
        <button class="modal-close" onclick="closeModal('lifecycle-import-modal')">&times;</button>
      </div>
      <div style="padding:14px 0; font-family:var(--font-mono); font-size:12px;">
        <div style="margin-bottom:12px;">
          <label class="c-dark" style="display:block; font-size:11px; margin-bottom:4px;">SELECT JSON FILE</label>
          <input type="file" id="import-json-file" accept=".json" class="search-input" style="width:100%;" onchange="handleImportFileSelect(this)" />
        </div>
        <div style="margin-bottom:12px;">
          <label class="c-dark" style="display:block; font-size:11px; margin-bottom:4px;">OR PASTE RAW JSON PAYLOAD</label>
          <textarea id="import-json-text" class="search-input" rows="6" style="width:100%; font-size:11px;" placeholder="Paste JSON here..."></textarea>
        </div>
        <div style="margin-bottom:16px;">
          <label class="c-dark" style="display:block; font-size:11px; margin-bottom:6px;">CONFLICT RESOLUTION MODE</label>
          <div style="display:flex; gap:14px;">
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="radio" name="import-mode" value="MERGE" checked />
              <span>Merge & Update</span>
            </label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="radio" name="import-mode" value="SKIP_DUPLICATES" />
              <span>Skip Existing</span>
            </label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="radio" name="import-mode" value="REPLACE" />
              <span>Replace All</span>
            </label>
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px; border-top:1px solid var(--border); padding-top:12px;">
          <button class="btn btn-sm" onclick="closeModal('lifecycle-import-modal')">Cancel</button>
          <button class="btn btn-sm btn-emerald" onclick="executeImportSignals()">📥 Execute Import</button>
        </div>
      </div>
    </div>
  </div>
`;

if (!html.includes('id="lifecycle-detail-modal"')) {
  html = html.replace('<!-- APPLICATION JAVASCRIPT LOGIC -->', () => `${lifecycleModalsHtml}\n\n  <!-- APPLICATION JAVASCRIPT LOGIC -->`);
} else {
  html = html.replace(/<!-- DETAILED SIGNAL LIFECYCLE MODAL[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, () => lifecycleModalsHtml.trim());
}

// 7. Inject LifecycleEngine JavaScript module into script
const lifecycleJs = fs.readFileSync(path.join(rootDir, 'scripts', 'lifecycle_module.js'), 'utf-8');

// Additional glue functions
const glueJs = `
    // ═══════════════════════════════════════════════════════
    // GLUE & HOOKS FOR SIGNAL LIFECYCLE INTELLIGENCE
    // ═══════════════════════════════════════════════════════

    function toggleLifecycleColumns() {
      LifecycleEngine.settings.showLifecycleColumns = !LifecycleEngine.settings.showLifecycleColumns;
      LifecycleEngine.saveSettings();
      syncLifecycleColumnVisibility();
    }

    function syncLifecycleColumnVisibility() {
      const show = LifecycleEngine?.settings?.showLifecycleColumns !== false;
      const tbl = document.getElementById('scanner-table');
      if (tbl) {
        if (show) {
          tbl.classList.remove('hide-lifecycle-cols');
        } else {
          tbl.classList.add('hide-lifecycle-cols');
        }
      }
      const lbl = document.getElementById('lbl-lifecycle-toggle');
      if (lbl) lbl.innerText = show ? 'ON' : 'OFF';
      const btn = document.getElementById('btn-lifecycle-cols');
      if (btn) {
        if (show) {
          btn.classList.add('btn-emerald');
        } else {
          btn.classList.remove('btn-emerald');
        }
      }
    }

    function setJournalFilter(filter, btn) {
      LifecycleEngine.activeFilter = filter;
      document.querySelectorAll('#view-JOURNAL .filter-bar .presets-group:first-child .preset-pill').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      LifecycleEngine.renderJournalTable();
    }

    function setJournalSide(side, btn) {
      LifecycleEngine.activeSide = side;
      document.querySelectorAll('#view-JOURNAL .filter-bar .presets-group:nth-child(2) .preset-pill').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      LifecycleEngine.renderJournalTable();
    }

    function handleJournalSearch(q) {
      LifecycleEngine.searchQuery = q.trim();
      LifecycleEngine.renderJournalTable();
    }

    function sortJournal(col) {
      if (LifecycleEngine.sortColumn === col) {
        LifecycleEngine.sortDirection = LifecycleEngine.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        LifecycleEngine.sortColumn = col;
        LifecycleEngine.sortDirection = 'desc';
      }
      LifecycleEngine.renderJournalTable();
    }

    function saveLifecycleSettings() {
      LifecycleEngine.settings.enabled = document.getElementById('lset-enabled').checked;
      LifecycleEngine.settings.snapshotIntervalMinutes = parseInt(document.getElementById('lset-interval').value) || 15;
      LifecycleEngine.settings.signalTTLHours = parseInt(document.getElementById('lset-ttl').value) || 72;
      LifecycleEngine.settings.invalidationPct = parseFloat(document.getElementById('lset-invalidation').value) || 3.0;
      LifecycleEngine.settings.cooldownMinutes = parseInt(document.getElementById('lset-cooldown').value) || 30;
      LifecycleEngine.settings.retentionDays = parseInt(document.getElementById('lset-retention').value) || 90;
      LifecycleEngine.saveSettings();
      closeModal('lifecycle-settings-modal');
      alert('Lifecycle settings saved.');
    }

    function renderCohortAnalytics() {
      LifecycleEngine.renderCohortAnalytics();
    }

    function handleImportFileSelect(input) {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        document.getElementById('import-json-text').value = e.target.result;
      };
      reader.readAsText(file);
    }

    function executeImportSignals() {
      const text = document.getElementById('import-json-text').value.trim();
      if (!text) {
        alert('Please select a JSON file or paste JSON content.');
        return;
      }
      const mode = document.querySelector('input[name="import-mode"]:checked')?.value || 'MERGE';
      const result = LifecycleEngine.importSignalsJSON(text, mode);
      if (result.success) {
        alert('Successfully imported ' + result.count + ' signal record(s).');
        closeModal('lifecycle-import-modal');
      } else {
        alert('Import Error: ' + result.error);
      }
    }
`;

if (!html.includes('GLUE & HOOKS FOR SIGNAL LIFECYCLE INTELLIGENCE')) {
  html = html.replace(
    '// ═════════════════════════════════════════════════════════════════════════\n    // STATE & CONFIG',
    () => `${lifecycleJs}\n\n${glueJs}\n\n    // ═════════════════════════════════════════════════════════════════════════\n    // STATE & CONFIG`
  );
} else {
  // Replace existing lifecycle engine block with fresh updated code
  const startMarker = '// ═════════════════════════════════════════════════════════════════════════\r\n// 🦅 EAGLE FLASH — SIGNAL LIFECYCLE INTELLIGENCE ENGINE';
  const altStartMarker = '// ═════════════════════════════════════════════════════════════════════════\n// 🦅 EAGLE FLASH — SIGNAL LIFECYCLE INTELLIGENCE ENGINE';
  const endMarker = '// ═════════════════════════════════════════════════════════════════════════\r\n    // STATE & CONFIG';
  const altEndMarker = '// ═════════════════════════════════════════════════════════════════════════\n    // STATE & CONFIG';

  let sIdx = html.indexOf(startMarker);
  if (sIdx === -1) sIdx = html.indexOf(altStartMarker);
  let eIdx = html.indexOf(endMarker);
  if (eIdx === -1) eIdx = html.indexOf(altEndMarker);

  if (sIdx !== -1 && eIdx !== -1) {
    html = html.slice(0, sIdx) + `${lifecycleJs}\n\n${glueJs}\n\n    ` + html.slice(eIdx);
  }
}

// 8. Hook Diagnostics View
const diagAddHtml = `
      <!-- Lifecycle Diagnostics -->
      <div style="margin-top:14px; margin-bottom:6px;">
        <h3 style="font-size:13px; font-weight:800; font-family:var(--font-mono); color:var(--emerald);">🦅 SIGNAL LIFECYCLE INTELLIGENCE SUBSYSTEM</h3>
      </div>
      <div class="kpi-strip" style="padding:0; margin-bottom:14px;">
        <div class="kpi-card">
          <div class="kpi-lbl">Lifecycle Engine</div>
          <div class="kpi-val tabular c-emerald" id="diag-life-state">ONLINE</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">IndexedDB Health</div>
          <div class="kpi-val tabular c-emerald" id="diag-life-db">EagleFlash_DB (OK)</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">Signals Tracked</div>
          <div class="kpi-val tabular" id="diag-life-signals">0</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">Snapshots Stored</div>
          <div class="kpi-val tabular" id="diag-life-snapshots">0</div>
        </div>
      </div>
`;

if (!html.includes('id="diag-life-state"')) {
  html = html.replace(
    '<div class="table-wrap" style="padding:14px; font-family:var(--font-mono); font-size:11px; line-height:1.8;">',
    () => `${diagAddHtml}\n      <div class="table-wrap" style="padding:14px; font-family:var(--font-mono); font-size:11px; line-height:1.8;">`
  );
}

// Hook renderDiagnostics function to populate lifecycle metrics
if (!html.includes("document.getElementById('diag-life-signals')")) {
  html = html.replace(
    `function renderDiagnostics() {`,
    `function renderDiagnostics() {
      const dLifeSignals = document.getElementById('diag-life-signals');
      if (dLifeSignals) dLifeSignals.innerText = LifecycleEngine.signals.length;
      const dLifeSnapshots = document.getElementById('diag-life-snapshots');
      if (dLifeSnapshots) {
        const totalSnaps = LifecycleEngine.signals.reduce((a, s) => a + (s.snapshots ? s.snapshots.length : 0), 0);
        dLifeSnapshots.innerText = totalSnaps;
      }
      const dLifeDb = document.getElementById('diag-life-db');
      if (dLifeDb) dLifeDb.innerText = LifecycleEngine.db ? 'EagleFlash_DB (OK)' : 'localStorage (FALLBACK)';`
  );
}

// 9. Hook Signal Generation in recalculateAllScores
const recalcRegex = /if\s*\(s\.signalScore\s*>=\s*72\s*&&\s*s\.price24hChange\s*>\s*1\.5\s*&&\s*s\.relativeVolume\s*>=\s*State\.settings\.rvolThreshold\)\s*\{[\s\S]*?s\.signalConfidence\s*=\s*s\.signalScore\s*>=\s*82\s*\?\s*'HIGH'\s*:\s*'MEDIUM';\s*\}/;

const newRecalcSignals = `if (s.signalScore >= 72 && s.price24hChange > 1.5 && s.relativeVolume >= State.settings.rvolThreshold) {
          s.signal = 'LONG CANDIDATE';
          s.signalConfidence = s.signalScore >= 82 ? 'HIGH' : 'MEDIUM';
          if (typeof LifecycleEngine !== 'undefined' && LifecycleEngine.recordSignal) {
            LifecycleEngine.recordSignal(s, { rvolThreshold: State.settings.rvolThreshold });
          }
        } else if (s.signalScore >= 72 && s.price24hChange < -1.5 && s.relativeVolume >= State.settings.rvolThreshold) {
          s.signal = 'SHORT CANDIDATE';
          s.signalConfidence = s.signalScore >= 82 ? 'HIGH' : 'MEDIUM';
          if (typeof LifecycleEngine !== 'undefined' && LifecycleEngine.recordSignal) {
            LifecycleEngine.recordSignal(s, { rvolThreshold: State.settings.rvolThreshold });
          }
        }`;

if (recalcRegex.test(html)) {
  console.log('Hooking recalculateAllScores signal generation...');
  html = html.replace(recalcRegex, () => newRecalcSignals);
}

// 10. Hook renderSignalsTab to ensure any candidate shown in HIGH-PROBABILITY EAGLE SIGNALS is recorded
const renderSignalsRegex = /function\s+renderSignalsTab\(\)\s*\{[\s\S]*?b\.signalScore\s*-\s*a\.signalScore\);/;

const newRenderSignalsTab = `function renderSignalsTab() {
      const container = document.getElementById('signals-grid');
      const candidates = [...State.symbols.values()]
        .filter(s => s.signal === 'LONG CANDIDATE' || s.signal === 'SHORT CANDIDATE')
        .sort((a, b) => b.signalScore - a.signalScore);

      // Ensure every qualifying high-probability candidate is recorded in the Signal Journal
      if (typeof LifecycleEngine !== 'undefined' && LifecycleEngine.recordSignal) {
        candidates.forEach(s => LifecycleEngine.recordSignal(s, { source: 'SIGNALS_TAB' }));
      }`;

if (renderSignalsRegex.test(html)) {
  console.log('Hooking renderSignalsTab candidate recording...');
  html = html.replace(renderSignalsRegex, () => newRenderSignalsTab);
}

// 11. Hook bootstrap to immediately harvest candidates on initial load
const bootstrapRegex = /updateSplash\(5,\s*'Computing Eagle Scores & signals\.\.\.'\);[\s\r\n]*recalculateAllScores\(\);/;

const newBootstrapEnd = `updateSplash(5, 'Computing Eagle Scores & signals...');
        recalculateAllScores();
        // Immediately record any high-probability signals identified during bootstrap
        if (typeof LifecycleEngine !== 'undefined' && LifecycleEngine.recordSignal) {
          State.symbols.forEach(s => {
            if (s.signal === 'LONG CANDIDATE' || s.signal === 'SHORT CANDIDATE') {
              LifecycleEngine.recordSignal(s, { source: 'BOOTSTRAP' });
            }
          });
        }`;

if (bootstrapRegex.test(html)) {
  console.log('Hooking bootstrap candidate capture...');
  html = html.replace(bootstrapRegex, () => newBootstrapEnd);
}

// 12. Hook switchTab for tab transitions
const switchTabRegex = /function\s+switchTab\(tabId\)\s*\{[\s\S]*?window\.scrollTo\(\{\s*top:\s*0,\s*behavior:\s*'smooth'\s*\}\);\s*\}/;

const newSwitchTab = `function switchTab(tabId) {
      State.activeTab = tabId;
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.toUpperCase().includes(tabId));
      });
      document.querySelectorAll('.m-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
      });
      document.querySelectorAll('.view-container').forEach(v => {
        v.classList.toggle('active', v.id === 'view-' + tabId);
      });
      if (tabId === 'SIGNALS') renderSignalsTab();
      if (tabId === 'HEATMAP') renderHeatmapTab();
      if (tabId === 'WATCHLIST') renderWatchlist();
      if (tabId === 'JOURNAL' && typeof LifecycleEngine !== 'undefined') LifecycleEngine.renderJournalTab();
      if (tabId === 'HISTORY') renderHistory();
      if (tabId === 'DIAGNOSTICS') renderDiagnostics();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }`;

if (switchTabRegex.test(html)) {
  console.log('Hooking switchTab navigation...');
  html = html.replace(switchTabRegex, () => newSwitchTab);
}

// 13. Hook openModal for analytics
const openModalRegex = /function\s+openModal\(id\)\s*\{[\s\S]*?document\.getElementById\(id\)\.classList\.add\('open'\);\s*\}/;
const newOpenModal = `function openModal(id) {
      if (id === 'lifecycle-analytics-modal' && typeof LifecycleEngine !== 'undefined') {
        LifecycleEngine.renderCohortAnalytics();
      }
      document.getElementById(id).classList.add('open');
    }`;

if (openModalRegex.test(html)) {
  console.log('Hooking openModal...');
  html = html.replace(openModalRegex, () => newOpenModal);
}

console.log('Writing updated eagle-flash.html...');
fs.writeFileSync(targetFile, html, 'utf-8');
console.log('Done! Successfully injected Signal Lifecycle Intelligence.');
