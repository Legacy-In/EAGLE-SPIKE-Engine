import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const targetFile = path.join(rootDir, 'apps', 'web', 'public', 'eagle-flash.html');

console.log('Reading apps/web/public/eagle-flash.html...');
let html = fs.readFileSync(targetFile, 'utf-8');

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
    table.hide-lifecycle-cols .lifecycle-col,
    .hide-lifecycle-cols th.lifecycle-col,
    .hide-lifecycle-cols td.lifecycle-col {
      display: none !important;
    }
`;

// Inject CSS before </style>
html = html.replace('</style>', () => `${lifecycleStyles}\n  </style>`);

// 2. Add Navigation tab "Signal Journal" to desktop nav
html = html.replace(
  `<button class="nav-btn" onclick="switchTab('WATCHLIST')">Watchlist (<span id="watch-count">0</span>)</button>`,
  () => `<button class="nav-btn" onclick="switchTab('WATCHLIST')">Watchlist (<span id="watch-count">0</span>)</button>
      <button class="nav-btn" onclick="switchTab('JOURNAL')">Signal Journal <span class="badge-count" id="journal-count">0</span></button>`
);

// 3. Add Navigation item to mobile bottom nav
html = html.replace(
  `<button class="m-nav-item" data-tab="WATCHLIST" onclick="switchTab('WATCHLIST')">`,
  () => `<button class="m-nav-item" data-tab="JOURNAL" onclick="switchTab('JOURNAL')">
      <span class="m-icon">🦅</span>
      <span>Journal (<span id="m-journal-count">0</span>)</span>
    </button>
    <button class="m-nav-item" data-tab="WATCHLIST" onclick="switchTab('WATCHLIST')">`
);

// 4. Add Toggle Lifecycle Columns button in Scanner toolbar
html = html.replace(
  `<button id="btn-view-table" class="btn btn-sm" onclick="setScannerLayout('table')">📋 Table (Scroll)</button>`,
  () => `<button id="btn-view-table" class="btn btn-sm" onclick="setScannerLayout('table')">📋 Table (Scroll)</button>
        <button id="btn-lifecycle-cols" class="btn btn-sm btn-emerald" onclick="toggleLifecycleColumns()" title="Toggle Lifecycle Columns (Age, 4H, 8H, 1D, Status)">
          ⏱️ Lifecycle Cols: <span id="lbl-lifecycle-toggle">ON</span>
        </button>`
);

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
          <button class="btn btn-sm" onclick="openModal('lifecycle-settings-modal')">⚙ Settings</button>
          <button class="btn btn-sm btn-emerald" onclick="LifecycleEngine.exportJournalCSV()">⬇ Export CSV</button>
          <button class="btn btn-sm" onclick="LifecycleEngine.exportSignalsJSON()">⬇ Export JSON</button>
        </div>
      </div>

      <!-- Lifecycle KPI Summary Strip -->
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
          <div class="kpi-lbl">Confirmed</div>
          <div class="kpi-val tabular c-cyan" id="jkpi-confirmed">0</div>
          <div class="kpi-sub">Breakout verified</div>
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

      <!-- Journal Table -->
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th onclick="sortJournal('index')">#</th>
              <th onclick="sortJournal('signalId')">Signal ID</th>
              <th onclick="sortJournal('symbol')">Symbol</th>
              <th onclick="sortJournal('signalType')">Signal</th>
              <th onclick="sortJournal('detectedAt')">Detected (Local)</th>
              <th onclick="sortJournal('detectedAt')">Age</th>
              <th onclick="sortJournal('signalPrice')">Signal Price</th>
              <th onclick="sortJournal('currentPrice')">Current Price</th>
              <th onclick="sortJournal('checkpoints.4H')">4H %</th>
              <th onclick="sortJournal('checkpoints.8H')">8H %</th>
              <th onclick="sortJournal('checkpoints.1D')">1D %</th>
              <th onclick="sortJournal('mfePct')">MFE %</th>
              <th onclick="sortJournal('maePct')">MAE %</th>
              <th onclick="sortJournal('status')">Status</th>
              <th>Warning / Invalidation</th>
              <th onclick="sortJournal('initialSnapshot.signalScore')">Score</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="journal-tbody">
            <tr><td colspan="17" class="c-dark" style="text-align:center; padding:30px;">Loading Signal Lifecycle Journal...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
`;

html = html.replace('<!-- 5. HISTORY VIEW -->', () => `${journalViewHtml}\n\n    <!-- 5. HISTORY VIEW -->`);


// 6. Add Detailed Signal Lifecycle Modal
const lifecycleModalsHtml = `
  <!-- DETAILED SIGNAL LIFECYCLE MODAL -->
  <div class="modal-backdrop" id="lifecycle-detail-modal">
    <div class="modal-card" style="max-width:850px; max-height:92vh; overflow-y:auto;">
      <div class="modal-header" style="position:sticky; top:0; background:var(--bg-surface1); z-index:10; padding-bottom:10px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="tabular font-bold" id="ld-symbol" style="font-size:18px; color:var(--text);">--</span>
            <span id="ld-signal-badge" class="signal-badge sig-long">--</span>
            <span id="ld-status-badge">--</span>
          </div>
          <div style="font-family:var(--font-mono); font-size:10px; color:var(--cyan); margin-top:3px;" id="ld-signal-id">--</div>
        </div>
        <button class="modal-close" onclick="closeModal('lifecycle-detail-modal')">&times;</button>
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

        <!-- Section 1: Standardized Time Checkpoints -->
        <div style="margin-bottom:16px;">
          <div class="c-dark" style="font-family:var(--font-mono); font-size:11px; font-weight:700; margin-bottom:6px;">
            ⏱️ TIME-BASED DIRECTIONAL PERFORMANCE (15M TO 7D CHECKPOINTS)
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

        <!-- Section 3: What Happened So Far -->
        <div style="background:var(--bg-surface2); border:1px solid var(--border); border-radius:6px; padding:12px; margin-bottom:16px;">
          <div style="font-family:var(--font-mono); font-size:11px; font-weight:700; color:var(--cyan); margin-bottom:8px;">
            💡 WHAT HAPPENED SO FAR (AUTOMATED NARRATIVE)
          </div>
          <div id="ld-summary-bullets"></div>
        </div>

        <!-- Section 4: Normalized Price Progression Chart -->
        <div style="background:var(--bg-surface2); border:1px solid var(--border); border-radius:6px; padding:12px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-family:var(--font-mono); font-size:11px; font-weight:700; color:var(--text-muted);">
              📈 NORMALIZED PRICE PATH (SIGNAL = 0.0%)
            </span>
            <span class="c-dark" style="font-size:9px; font-family:var(--font-mono);">ELIMINATES LOOK-AHEAD BIAS</span>
          </div>
          <div id="ld-chart-container" style="width:100%; min-height:140px;"></div>
        </div>

        <!-- Section 5: Signal Replay Engine -->
        <div style="background:var(--bg-surface2); border:1px solid var(--border); border-radius:6px; padding:12px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-family:var(--font-mono); font-size:11px; font-weight:700; color:var(--emerald);">
              ▶ SIGNAL REPLAY (HISTORICAL TIMESTEP SCRUBBER)
            </span>
            <span class="tabular c-dark" id="replay-step-progress" style="font-size:10px;">Step 1 of 1</span>
          </div>
          <div class="replay-control-bar tabular">
            <div style="display:flex; gap:6px;">
              <button class="btn btn-sm" onclick="LifecycleEngine.setReplayStep(0)">⏮ T=0</button>
              <button class="btn btn-sm" onclick="LifecycleEngine.setReplayStep(LifecycleEngine.replayIndex - 1)">◀ Prev</button>
              <button class="btn btn-sm" onclick="LifecycleEngine.setReplayStep(LifecycleEngine.replayIndex + 1)">▶ Next</button>
              <button class="btn btn-sm" onclick="LifecycleEngine.setReplayStep(Infinity)">⏭ Now</button>
            </div>
            <div>
              <span id="replay-step-label" style="font-weight:700; color:var(--text);">T=0 (Detection)</span>:
              <span id="replay-step-price" style="font-weight:700;">$--</span>
              (<span id="replay-step-return">0.0%</span>)
            </div>
          </div>
          <div class="c-muted" id="replay-step-desc" style="font-family:var(--font-mono); font-size:11px;">Initial signal trigger.</div>
        </div>

        <!-- Section 6: Event Timeline -->
        <div style="margin-bottom:16px;">
          <div class="c-dark" style="font-family:var(--font-mono); font-size:11px; font-weight:700; margin-bottom:8px;">
            📜 CHRONOLOGICAL EVENT TIMELINE
          </div>
          <div id="ld-timeline-container" style="max-height:220px; overflow-y:auto; padding:4px 0;"></div>
        </div>

        <!-- Section 7: Post-Mortem Card (if resolved / rejected / expired) -->
        <div id="ld-postmortem-card" style="display:none; background:rgba(255, 71, 87, 0.08); border:1px solid rgba(255, 71, 87, 0.3); border-radius:6px; padding:12px; margin-bottom:16px;">
          <div style="font-family:var(--font-mono); font-size:12px; font-weight:700; color:var(--red); margin-bottom:6px;">
            🦅 SIGNAL POST-MORTEM SUMMARY
          </div>
          <div style="font-family:var(--font-mono); font-size:11px; line-height:1.7;">
            <div>• <strong>Final Lifecycle Status:</strong> <span id="ld-pm-status">--</span></div>
            <div>• <strong>Reason for Invalidation / Close:</strong> <span id="ld-pm-reason">--</span></div>
            <div>• <strong>Timestamp:</strong> <span id="ld-pm-time">--</span> (Duration: <span id="ld-pm-duration">--</span>)</div>
            <div>• <strong>Final Price Change:</strong> <span id="ld-pm-return">--</span></div>
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
    <div class="modal-card" style="max-width:720px;">
      <div class="modal-header">
        <div>
          <h2 style="font-size:16px; font-weight:800; font-family:var(--font-mono);">📊 SIGNAL COHORT PERFORMANCE ANALYTICS</h2>
          <p class="c-dark" style="font-size:11px;">HISTORICAL DESCRIPTIVE OBSERVATIONS ACROSS SCORE & VOLUME BUCKETS</p>
        </div>
        <button class="modal-close" onclick="closeModal('lifecycle-analytics-modal')">&times;</button>
      </div>
      <div style="padding:14px 0; font-family:var(--font-mono); font-size:11px;" id="analytics-modal-body">
        <div class="table-wrap" style="margin-bottom:14px;">
          <table>
            <thead>
              <tr>
                <th>Cohort Bucket</th>
                <th>Count</th>
                <th>Avg 4H %</th>
                <th>Avg 8H %</th>
                <th>Avg 1D %</th>
                <th>Avg MFE %</th>
                <th>Avg MAE %</th>
              </tr>
            </thead>
            <tbody id="cohort-tbody">
              <tr><td colspan="7" class="c-dark" style="text-align:center; padding:20px;">Computing cohort metrics...</td></tr>
            </tbody>
          </table>
        </div>
        <div class="c-dark" style="font-size:10px; line-height:1.6;">
          ⚠️ Note: Descriptive historical metrics. Does not constitute guaranteed future trading performance.
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
            <option value="30" selected>30 Days</option>
            <option value="90">90 Days</option>
            <option value="365">1 Year</option>
          </select>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:12px;">
          <button class="btn btn-sm btn-red" onclick="LifecycleEngine.clearAllSignals()">🗑️ Clear History</button>
          <button class="btn btn-sm btn-emerald" onclick="saveLifecycleSettings()">Save Settings</button>
        </div>
      </div>
    </div>
  </div>
`;

// Insert modals before the script tag
html = html.replace('<!-- APPLICATION JAVASCRIPT LOGIC -->', () => `${lifecycleModalsHtml}\n\n  <!-- APPLICATION JAVASCRIPT LOGIC -->`);

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
      LifecycleEngine.settings.retentionDays = parseInt(document.getElementById('lset-retention').value) || 30;
      LifecycleEngine.saveSettings();
      closeModal('lifecycle-settings-modal');
      alert('Lifecycle settings saved.');
    }

    function renderCohortAnalytics() {
      const tbody = document.getElementById('cohort-tbody');
      if (!tbody) return;

      const cohorts = [
        { label: 'Eagle Score 80–100 (High Conviction)', filter: s => s.initialSnapshot.signalScore >= 80 },
        { label: 'Eagle Score 72–79 (Candidate)', filter: s => s.initialSnapshot.signalScore >= 72 && s.initialSnapshot.signalScore < 80 },
        { label: 'RVOL ≥ 2.5x (Volume Explosion)', filter: s => s.initialSnapshot.relativeVolume >= 2.5 },
        { label: 'LONG Candidates', filter: s => s.signalType.includes('LONG') },
        { label: 'SHORT Candidates', filter: s => s.signalType.includes('SHORT') }
      ];

      let html = '';
      cohorts.forEach(c => {
        const matches = LifecycleEngine.signals.filter(c.filter);
        const count = matches.length;
        if (count === 0) {
          html += '<tr><td>' + c.label + '</td><td class="tabular">0</td><td class="c-dark">—</td><td class="c-dark">—</td><td class="c-dark">—</td><td class="c-dark">—</td><td class="c-dark">—</td></tr>';
          return;
        }

        const getAvg = extractor => {
          const vals = matches.map(extractor).filter(v => v !== null && !isNaN(v));
          return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : null;
        };

        const a4h = getAvg(s => s.checkpoints['4H']);
        const a8h = getAvg(s => s.checkpoints['8H']);
        const a1d = getAvg(s => s.checkpoints['1D']);
        const aMFE = getAvg(s => s.mfePct);
        const aMAE = getAvg(s => s.maePct);

        html += '<tr>' +
          '<td><strong>' + c.label + '</strong></td>' +
          '<td class="tabular font-bold">' + count + '</td>' +
          '<td class="tabular">' + (a4h !== null ? (a4h >= 0 ? '+' : '') + a4h + '%' : 'PENDING') + '</td>' +
          '<td class="tabular">' + (a8h !== null ? (a8h >= 0 ? '+' : '') + a8h + '%' : 'PENDING') + '</td>' +
          '<td class="tabular">' + (a1d !== null ? (a1d >= 0 ? '+' : '') + a1d + '%' : 'PENDING') + '</td>' +
          '<td class="tabular c-emerald">' + (aMFE !== null ? '+' + aMFE + '%' : 'PENDING') + '</td>' +
          '<td class="tabular c-red">' + (aMAE !== null ? aMAE + '%' : 'PENDING') + '</td>' +
          '</tr>';
      });

      tbody.innerHTML = html;
    }
`;

// Insert LifecycleEngine into <script>
html = html.replace('// State Store', () => `${lifecycleJs}\n\n${glueJs}\n\n    // State Store`);

// Hook bootstrap: init LifecycleEngine
html = html.replace(
  'loadStorage();',
  () => 'loadStorage();\n      await LifecycleEngine.init();'
);

// Hook recalculateAllScores: automatic signal recording
html = html.replace(
  `        // Signal Generation
        if (s.signalScore >= 72 && s.price24hChange > 1.5 && s.relativeVolume >= State.settings.rvolThreshold) {
          s.signal = 'LONG CANDIDATE';
          s.signalConfidence = s.signalScore >= 82 ? 'HIGH' : 'MEDIUM';
        } else if (s.signalScore >= 72 && s.price24hChange < -1.5 && s.relativeVolume >= State.settings.rvolThreshold) {
          s.signal = 'SHORT CANDIDATE';
          s.signalConfidence = s.signalScore >= 82 ? 'HIGH' : 'MEDIUM';
        } else if (s.relativeVolume >= 1.4 || s.signalScore >= 64) {
          s.signal = 'WATCH';
          s.signalConfidence = 'LOW';
        } else {
          s.signal = 'NO_SIGNAL';
          s.signalConfidence = 'LOW';
        }`,
  () => `        // Signal Generation
        if (s.signalScore >= 72 && s.price24hChange > 1.5 && s.relativeVolume >= State.settings.rvolThreshold) {
          s.signal = 'LONG CANDIDATE';
          s.signalConfidence = s.signalScore >= 82 ? 'HIGH' : 'MEDIUM';
          LifecycleEngine.recordSignal(s, { rvolThreshold: State.settings.rvolThreshold });
        } else if (s.signalScore >= 72 && s.price24hChange < -1.5 && s.relativeVolume >= State.settings.rvolThreshold) {
          s.signal = 'SHORT CANDIDATE';
          s.signalConfidence = s.signalScore >= 82 ? 'HIGH' : 'MEDIUM';
          LifecycleEngine.recordSignal(s, { rvolThreshold: State.settings.rvolThreshold });
        } else if (s.relativeVolume >= 1.4 || s.signalScore >= 64) {
          s.signal = 'WATCH';
          s.signalConfidence = 'LOW';
        } else {
          s.signal = 'NO_SIGNAL';
          s.signalConfidence = 'LOW';
        }`
);

// Hook WebSocket onmessage tick into LifecycleEngine
html = html.replace(
  'updateLiveTickerRow(s);',
  () => 'updateLiveTickerRow(s);\n                LifecycleEngine.onMarketTick(s.symbol, s.lastPrice, s);'
);

// Hook switchTab for JOURNAL tab
html = html.replace(
  `      if (tabId === 'WATCHLIST') renderWatchlist();
      if (tabId === 'HISTORY') renderHistory();
      if (tabId === 'DIAGNOSTICS') renderDiagnostics();`,
  () => `      if (tabId === 'WATCHLIST') renderWatchlist();
      if (tabId === 'JOURNAL') LifecycleEngine.renderJournalTab();
      if (tabId === 'HISTORY') renderHistory();
      if (tabId === 'DIAGNOSTICS') renderDiagnostics();`
);

// Hook openModal for analytics
html = html.replace(
  `function openModal(modalId) {
      document.getElementById(modalId).classList.add('open');
    }`,
  () => `function openModal(modalId) {
      if (modalId === 'lifecycle-analytics-modal') renderCohortAnalytics();
      document.getElementById(modalId).classList.add('open');
    }`
);

// Add optional lifecycle columns to renderScannerTable
html = html.replace(
  `<td class="tabular c-dark">\${((s.high24h - s.lastPrice) / (s.high24h || 1) * 100).toFixed(1)}%</td>`,
  () => `<td class="tabular c-dark">\${((s.high24h - s.lastPrice) / (s.high24h || 1) * 100).toFixed(1)}%</td>
            \${(() => {
              const sig = LifecycleEngine.signals.find(x => x.symbol === s.symbol && ['ACTIVE', 'CONFIRMED', 'WARNING'].includes(x.status));
              if (!sig) return '<td class="c-dark lifecycle-col">—</td><td class="c-dark lifecycle-col">—</td><td class="c-dark lifecycle-col">—</td><td class="c-dark lifecycle-col">—</td><td class="c-dark lifecycle-col">—</td>';
              const age = LifecycleEngine.formatAge(Date.now() - sig.detectedAt);
              return '<td class="tabular font-bold lifecycle-col">' + age + '</td>' +
                     '<td class="lifecycle-col">' + LifecycleEngine.formatPct(sig.checkpoints['4H']) + '</td>' +
                     '<td class="lifecycle-col">' + LifecycleEngine.formatPct(sig.checkpoints['8H']) + '</td>' +
                     '<td class="lifecycle-col">' + LifecycleEngine.formatPct(sig.checkpoints['1D']) + '</td>' +
                     '<td class="lifecycle-col">' + LifecycleEngine.getStatusBadge(sig.status) + '</td>';
            })()}`
);

// Add headers for lifecycle columns in table head
html = html.replace(
  `<th onclick="sortTable('distHigh')">From High</th>`,
  () => `<th onclick="sortTable('distHigh')">From High</th>
              <th class="lifecycle-col" onclick="sortTable('detectedAt')">Age</th>
              <th class="lifecycle-col">4H</th>
              <th class="lifecycle-col">8H</th>
              <th class="lifecycle-col">1D</th>
              <th class="lifecycle-col">Status</th>`
);

// Hook syncLifecycleColumnVisibility into bootstrap
html = html.replace(
  'await LifecycleEngine.init();',
  () => 'await LifecycleEngine.init();\n      syncLifecycleColumnVisibility();'
);

console.log('Writing updated eagle-flash.html...');
fs.writeFileSync(targetFile, html, 'utf-8');
console.log('Done! Successfully injected Signal Lifecycle Intelligence.');
