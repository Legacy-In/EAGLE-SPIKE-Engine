// ═════════════════════════════════════════════════════════════════════════
// 🦅 EAGLE FLASH — SIGNAL LIFECYCLE INTELLIGENCE ENGINE
// Production-grade real-time signal tracking, checkpoints, MFE/MAE,
// event timeline, rejection engine, replay, and descriptive analytics.
// ═════════════════════════════════════════════════════════════════════════

const LifecycleConfig = {
  DB_NAME: 'EagleFlash_LifecycleDB',
  DB_VERSION: 1,
  STORE_SIGNALS: 'signals',
  STORE_SETTINGS: 'settings',
  LS_SIGNALS_KEY: 'eagleFlash:v2:lifecycle:signals',
  LS_SETTINGS_KEY: 'eagleFlash:v2:lifecycle:settings'
};

// Checkpoint definition in seconds
const CHECKPOINTS = [
  { id: '15M', seconds: 15 * 60 },
  { id: '30M', seconds: 30 * 60 },
  { id: '1H',  seconds: 60 * 60 },
  { id: '2H',  seconds: 2 * 60 * 60 },
  { id: '4H',  seconds: 4 * 60 * 60 },
  { id: '8H',  seconds: 8 * 60 * 60 },
  { id: '12H', seconds: 12 * 60 * 60 },
  { id: '1D',  seconds: 24 * 60 * 60 },
  { id: '2D',  seconds: 48 * 60 * 60 },
  { id: '3D',  seconds: 72 * 60 * 60 },
  { id: '7D',  seconds: 7 * 24 * 60 * 60 }
];

const LifecycleEngine = {
  signals: [],
  settings: {
    enabled: true,
    snapshotIntervalMinutes: 15,
    signalTTLHours: 72,
    cooldownMinutes: 30,
    invalidationPct: 3.0,
    retentionDays: 30,
    maxStoredSignals: 500,
    showLifecycleColumns: true
  },
  activeFilter: 'ALL',
  activeSide: 'ALL',
  searchQuery: '',
  sortColumn: 'detectedAt',
  sortDirection: 'desc',
  selectedSignalId: null,
  replayStepIndex: 0,
  db: null,

  // 1. Initializer & Persistence Layer
  async init() {
    await this.initStorage();
    await this.loadSettings();
    await this.loadSignals();
    this.cleanExpiredRetention();
    this.updateActiveCountBadge();
  },

  async initStorage() {
    return new Promise((resolve) => {
      try {
        if (!window.indexedDB) {
          console.warn('IndexedDB not supported, falling back to localStorage');
          resolve();
          return;
        }
        const req = indexedDB.open(LifecycleConfig.DB_NAME, LifecycleConfig.DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(LifecycleConfig.STORE_SIGNALS)) {
            const store = db.createObjectStore(LifecycleConfig.STORE_SIGNALS, { keyPath: 'signalId' });
            store.createIndex('symbol', 'symbol', { unique: false });
            store.createIndex('detectedAt', 'detectedAt', { unique: false });
            store.createIndex('status', 'status', { unique: false });
          }
          if (!db.objectStoreNames.contains(LifecycleConfig.STORE_SETTINGS)) {
            db.createObjectStore(LifecycleConfig.STORE_SETTINGS, { keyPath: 'key' });
          }
        };
        req.onsuccess = (e) => {
          this.db = e.target.result;
          resolve();
        };
        req.onerror = () => {
          console.warn('IndexedDB error, using localStorage fallback');
          resolve();
        };
      } catch (err) {
        console.warn('Storage init fallback:', err);
        resolve();
      }
    });
  },

  async loadSettings() {
    try {
      const saved = localStorage.getItem(LifecycleConfig.LS_SETTINGS_KEY);
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (e) {}
  },

  async saveSettings() {
    try {
      localStorage.setItem(LifecycleConfig.LS_SETTINGS_KEY, JSON.stringify(this.settings));
      if (this.db) {
        const tx = this.db.transaction(LifecycleConfig.STORE_SETTINGS, 'readwrite');
        tx.objectStore(LifecycleConfig.STORE_SETTINGS).put({ key: 'config', ...this.settings });
      }
    } catch (e) {}
  },

  async loadSignals() {
    if (this.db) {
      try {
        const tx = this.db.transaction(LifecycleConfig.STORE_SIGNALS, 'readonly');
        const store = tx.objectStore(LifecycleConfig.STORE_SIGNALS);
        const req = store.getAll();
        req.onsuccess = () => {
          const loaded = req.result || [];
          if (loaded.length > 0) {
            this.signals = loaded;
          } else {
            this.loadSignalsFromLocalStorage();
          }
        };
        req.onerror = () => this.loadSignalsFromLocalStorage();
        return;
      } catch (e) {
        this.loadSignalsFromLocalStorage();
        return;
      }
    }
    this.loadSignalsFromLocalStorage();
  },

  loadSignalsFromLocalStorage() {
    try {
      const saved = localStorage.getItem(LifecycleConfig.LS_SIGNALS_KEY);
      if (saved) {
        this.signals = JSON.parse(saved);
      }
    } catch (e) {}
  },

  async persistSignal(signal) {
    try {
      // LocalStorage backup
      const serialized = JSON.stringify(this.signals.slice(0, this.settings.maxStoredSignals));
      localStorage.setItem(LifecycleConfig.LS_SIGNALS_KEY, serialized);

      if (this.db) {
        const tx = this.db.transaction(LifecycleConfig.STORE_SIGNALS, 'readwrite');
        tx.objectStore(LifecycleConfig.STORE_SIGNALS).put(signal);
      }
    } catch (e) {}
  },

  cleanExpiredRetention() {
    const cutoff = Date.now() - (this.settings.retentionDays * 24 * 60 * 60 * 1000);
    this.signals = this.signals.filter(s => s.detectedAt >= cutoff);
  },

  // 2. Signal ID Generation (EGL-YYYYMMDD-SYMBOL-###)
  generateId(symbol, date = new Date()) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const cleanSym = symbol.replace(/USDT$/, '');
    const todayPrefix = `EGL-${y}${m}${d}-${cleanSym}-`;
    const todayCount = this.signals.filter(s => s.signalId && s.signalId.startsWith(todayPrefix)).length + 1;
    const seq = String(todayCount).padStart(3, '0');
    return `${todayPrefix}${seq}`;
  },

  // 3. Deduplication Protection
  isDuplicate(symbol, signalType, now = Date.now()) {
    const cooldownMs = this.settings.cooldownMinutes * 60 * 1000;
    return this.signals.some(s => 
      s.symbol === symbol &&
      s.signalType === signalType &&
      ['ACTIVE', 'CONFIRMED', 'WARNING'].includes(s.status) &&
      (now - s.detectedAt) < cooldownMs
    );
  },

  // 4. Record Signal with Immutable Initial Snapshot
  recordSignal(symData, activeFilters = {}) {
    if (!this.settings.enabled) return null;
    const isLong = symData.signal === 'LONG CANDIDATE';
    const isShort = symData.signal === 'SHORT CANDIDATE';
    if (!isLong && !isShort) return null;

    const now = Date.now();
    if (this.isDuplicate(symData.symbol, symData.signal, now)) {
      return null;
    }

    const nowDate = new Date(now);
    const signalId = this.generateId(symData.symbol, nowDate);
    const signalPrice = symData.lastPrice;

    // IMMUTABLE INITIAL SNAPSHOT — Deep freeze
    const initialSnapshot = Object.freeze({
      price: signalPrice,
      price24hChange: symData.price24hChange,
      high24h: symData.high24h || signalPrice,
      low24h: symData.low24h || signalPrice,
      turnover24h: symData.turnover24h,
      previous24hVolume: symData.previous24hVolume,
      volumeChange24h: symData.volumeChange24h,
      relativeVolume: symData.relativeVolume,
      volumeZScore: symData.volumeZScore,
      openInterestValue: symData.openInterestValue,
      fundingRate: symData.fundingRate,
      takerImbalance: symData.takerImbalance,
      rsi: symData.rsi,
      spreadPct: symData.spreadPct,
      trend: symData.trend,
      signalScore: symData.signalScore,
      signalConfidence: symData.signalConfidence,
      activeFilters: { ...activeFilters }
    });

    const checkpoints = {};
    CHECKPOINTS.forEach(cp => { checkpoints[cp.id] = null; });

    const record = {
      signalId,
      symbol: symData.symbol,
      signalType: symData.signal,
      detectedAt: now,
      detectedAtUTC: nowDate.toISOString(),
      detectedAtLocal: nowDate.toLocaleString(),
      signalPrice,
      signalMarkPrice: signalPrice,
      signalIndexPrice: signalPrice,
      initialSnapshot,
      status: 'ACTIVE',
      currentPrice: signalPrice,
      postSignalHigh: signalPrice,
      postSignalHighTimestamp: now,
      postSignalLow: signalPrice,
      postSignalLowTimestamp: now,
      mfePrice: signalPrice,
      mfePct: 0.0,
      mfeTimestamp: now,
      timeToMFE: 0,
      maePrice: signalPrice,
      maePct: 0.0,
      maeTimestamp: now,
      timeToMAE: 0,
      checkpoints,
      warnings: [],
      rejection: null,
      timeline: [
        {
          timestamp: now,
          eventType: 'SIGNAL_DETECTED',
          description: `🦅 Signal Detected: ${symData.signal} at $${signalPrice} (Score ${symData.signalScore}, RVOL ${symData.relativeVolume}x)`,
          price: signalPrice,
          metrics: { score: symData.signalScore, rvol: symData.relativeVolume, oi: symData.openInterestValue }
        }
      ],
      snapshots: [
        {
          timestamp: now,
          price: signalPrice,
          relativeVolume: symData.relativeVolume,
          openInterestValue: symData.openInterestValue,
          signalScore: symData.signalScore,
          takerImbalance: symData.takerImbalance,
          returnPct: 0.0
        }
      ],
      lastSnapshotTime: now
    };

    this.signals.unshift(record);
    if (this.signals.length > this.settings.maxStoredSignals) {
      this.signals = this.signals.slice(0, this.settings.maxStoredSignals);
    }

    this.persistSignal(record);
    this.updateActiveCountBadge();
    return record;
  },

  // 5. Directional Return Calculation
  calculateReturn(signalType, signalPrice, currentPrice) {
    if (!signalPrice || !currentPrice) return 0;
    if (signalType.includes('LONG')) {
      return parseFloat((((currentPrice - signalPrice) / signalPrice) * 100).toFixed(2));
    } else {
      // Directional return for short
      return parseFloat((((signalPrice - currentPrice) / signalPrice) * 100).toFixed(2));
    }
  },

  // 6. Real-Time Market Tick Hook
  onMarketTick(symbol, currentPrice, tickData = {}) {
    if (!this.settings.enabled) return;
    const now = Date.now();
    let hasUpdates = false;

    this.signals.forEach(s => {
      if (s.symbol !== symbol) return;
      if (!['ACTIVE', 'CONFIRMED', 'WARNING'].includes(s.status)) return;

      s.currentPrice = currentPrice;
      const isLong = s.signalType.includes('LONG');
      const dirReturn = this.calculateReturn(s.signalType, s.signalPrice, currentPrice);

      // Post-signal High / Low
      if (!s.postSignalHigh || currentPrice > s.postSignalHigh) {
        s.postSignalHigh = currentPrice;
        s.postSignalHighTimestamp = now;
      }
      if (!s.postSignalLow || currentPrice < s.postSignalLow) {
        s.postSignalLow = currentPrice;
        s.postSignalLowTimestamp = now;
      }

      // MFE (Maximum Favorable Excursion)
      if (s.mfePct === null || dirReturn > s.mfePct) {
        s.mfePct = dirReturn;
        s.mfePrice = currentPrice;
        s.mfeTimestamp = now;
        s.timeToMFE = now - s.detectedAt;
        if (dirReturn >= 3.0 && s.status === 'ACTIVE') {
          s.status = 'CONFIRMED';
          s.timeline.push({
            timestamp: now,
            eventType: 'BREAKOUT_CONFIRMED',
            description: `🔥 Move extended to +${dirReturn}% (MFE New Peak: $${currentPrice})`,
            price: currentPrice,
            metrics: { mfePct: dirReturn }
          });
        }
      }

      // MAE (Maximum Adverse Excursion)
      if (s.maePct === null || dirReturn < s.maePct) {
        s.maePct = dirReturn;
        s.maePrice = currentPrice;
        s.maeTimestamp = now;
        s.timeToMAE = now - s.detectedAt;
      }

      // Checkpoints
      const elapsedSec = (now - s.detectedAt) / 1000;
      CHECKPOINTS.forEach(cp => {
        if (elapsedSec >= cp.seconds && s.checkpoints[cp.id] === null) {
          s.checkpoints[cp.id] = dirReturn;
          s.timeline.push({
            timestamp: now,
            eventType: 'CHECKPOINT_REACHED',
            description: `⏱️ Checkpoint ${cp.id}: ${dirReturn >= 0 ? '+' : ''}${dirReturn}% (Price $${currentPrice})`,
            price: currentPrice,
            metrics: { checkpoint: cp.id, returnPct: dirReturn }
          });
        }
      });

      // Warnings
      this.evaluateWarnings(s, currentPrice, tickData, now);

      // Invalidation & Rejection
      this.evaluateRejection(s, currentPrice, dirReturn, now);

      // Periodic Snapshots
      const snapshotMs = this.settings.snapshotIntervalMinutes * 60 * 1000;
      if (now - (s.lastSnapshotTime || s.detectedAt) >= snapshotMs) {
        s.snapshots.push({
          timestamp: now,
          price: currentPrice,
          relativeVolume: tickData.relativeVolume || s.initialSnapshot.relativeVolume,
          openInterestValue: tickData.openInterestValue || s.initialSnapshot.openInterestValue,
          signalScore: tickData.signalScore || s.initialSnapshot.signalScore,
          takerImbalance: tickData.takerImbalance || 0,
          returnPct: dirReturn
        });
        s.lastSnapshotTime = now;
      }

      this.persistSignal(s);
      hasUpdates = true;
    });

    if (hasUpdates && document.getElementById('view-JOURNAL')?.classList.contains('active')) {
      this.renderJournalTable();
    }
  },

  // 7. Warning Detection Logic
  evaluateWarnings(signal, currentPrice, tickData, now) {
    const isLong = signal.signalType.includes('LONG');
    const warnings = [];

    // Taker flow weakening
    if (tickData.takerImbalance != null) {
      if (isLong && tickData.takerImbalance < -18) {
        warnings.push({ reason: 'Aggressive taker selling pressure detected', trigger: 'TAKER_SELL' });
      } else if (!isLong && tickData.takerImbalance > 18) {
        warnings.push({ reason: 'Aggressive taker buying pressure against position', trigger: 'TAKER_BUY' });
      }
    }

    // Volume fade
    if (tickData.relativeVolume != null && tickData.relativeVolume < 0.95 && signal.initialSnapshot.relativeVolume >= 2.0) {
      warnings.push({ reason: 'Volume expansion lost momentum (< 1.0x baseline)', trigger: 'VOL_FADE' });
    }

    // Adverse move warning (halfway to invalidation)
    const currentReturn = this.calculateReturn(signal.signalType, signal.signalPrice, currentPrice);
    if (currentReturn <= -(this.settings.invalidationPct * 0.5) && signal.status !== 'WARNING') {
      warnings.push({ reason: `Adverse price movement (${currentReturn}%) nearing stop threshold`, trigger: 'ADVERSE_PRICE' });
    }

    if (warnings.length > 0) {
      const lastWarn = signal.warnings[signal.warnings.length - 1];
      const timeSinceLast = lastWarn ? now - lastWarn.timestamp : Infinity;
      if (timeSinceLast > 15 * 60 * 1000) { // Cooldown between warning events
        const w = warnings[0];
        signal.warnings.push({
          timestamp: now,
          reason: w.reason,
          price: currentPrice,
          metrics: { trigger: w.trigger, price: currentPrice }
        });
        signal.status = 'WARNING';
        signal.timeline.push({
          timestamp: now,
          eventType: 'WARNING_TRIGGERED',
          description: `⚠️ WARNING: ${w.reason}`,
          price: currentPrice,
          metrics: { trigger: w.trigger }
        });
      }
    }
  },

  // 8. Rejection & Post-Mortem Engine
  evaluateRejection(signal, currentPrice, dirReturn, now) {
    const elapsedHours = (now - signal.detectedAt) / (3600 * 1000);

    // Invalidation / Rejection check
    if (dirReturn <= -this.settings.invalidationPct) {
      signal.status = 'REJECTED';
      signal.rejection = {
        rejectionTimestamp: now,
        rejectionPrice: currentPrice,
        rejectionReason: `Adverse move (${dirReturn}%) breached invalidation limit (-${this.settings.invalidationPct}%)`,
        rejectionTrigger: 'PRICE_INVALIDATION',
        timeToRejection: now - signal.detectedAt,
        priceChangeAtRejection: dirReturn,
        scoreAtRejection: signal.initialSnapshot.signalScore
      };
      signal.timeline.push({
        timestamp: now,
        eventType: 'SIGNAL_REJECTED',
        description: `🔴 REJECTED: Invalidation breached at $${currentPrice} (${dirReturn}%)`,
        price: currentPrice,
        metrics: { dirReturn }
      });
      this.updateActiveCountBadge();
      return;
    }

    // TTL Expiration check
    if (elapsedHours >= this.settings.signalTTLHours) {
      signal.status = 'EXPIRED';
      signal.rejection = {
        rejectionTimestamp: now,
        rejectionPrice: currentPrice,
        rejectionReason: `Signal TTL (${this.settings.signalTTLHours}h) expired`,
        rejectionTrigger: 'TTL_EXPIRED',
        timeToRejection: now - signal.detectedAt,
        priceChangeAtRejection: dirReturn,
        scoreAtRejection: signal.initialSnapshot.signalScore
      };
      signal.timeline.push({
        timestamp: now,
        eventType: 'SIGNAL_EXPIRED',
        description: `⚪ EXPIRED: Lifespan reached ${this.settings.signalTTLHours}h (Final Return: ${dirReturn >= 0 ? '+' : ''}${dirReturn}%)`,
        price: currentPrice,
        metrics: { dirReturn }
      });
      this.updateActiveCountBadge();
    }
  },

  // 9. Formatters & Helpers
  formatAge(ms) {
    const totalSec = Math.floor(ms / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  },

  formatPct(val) {
    if (val === null || val === undefined) return '<span class="c-dark">PENDING</span>';
    const isPos = val >= 0;
    return `<span class="${isPos ? 'c-emerald' : 'c-red'} font-bold tabular">${isPos ? '+' : ''}${val.toFixed(2)}%</span>`;
  },

  getStatusBadge(status) {
    switch (status) {
      case 'ACTIVE': return '<span class="status-badge-active">🟢 ACTIVE</span>';
      case 'CONFIRMED': return '<span class="status-badge-confirmed">🔥 CONFIRMED</span>';
      case 'WARNING': return '<span class="status-badge-warning">⚠️ WARNING</span>';
      case 'REJECTED': return '<span class="status-badge-rejected">🔴 REJECTED</span>';
      case 'EXPIRED': return '<span class="status-badge-expired">⚪ EXPIRED</span>';
      default: return `<span class="c-dark">${status}</span>`;
    }
  },

  updateActiveCountBadge() {
    const activeCount = this.signals.filter(s => ['ACTIVE', 'CONFIRMED', 'WARNING'].includes(s.status)).length;
    const badge1 = document.getElementById('journal-count');
    const badge2 = document.getElementById('m-journal-count');
    if (badge1) badge1.innerText = activeCount;
    if (badge2) badge2.innerText = activeCount;
  },

  // 10. "What Happened So Far" Summary Generator
  generateWhatHappenedSoFar(s) {
    const isLong = s.signalType.includes('LONG');
    const dirReturn = this.calculateReturn(s.signalType, s.signalPrice, s.currentPrice);
    const bullets = [];

    // 1. Price trajectory
    if (dirReturn >= 2.0) {
      bullets.push({ icon: '✓', color: 'var(--emerald)', text: `Price expanded favorably by +${dirReturn}% from initial detection.` });
    } else if (dirReturn <= -1.5) {
      bullets.push({ icon: '⚠', color: 'var(--amber)', text: `Price contracted by ${dirReturn}% against original signal entry.` });
    } else {
      bullets.push({ icon: '•', color: 'var(--text-muted)', text: `Price hovering near detection level (${dirReturn >= 0 ? '+' : ''}${dirReturn}%).` });
    }

    // 2. Extremes
    bullets.push({ icon: '🚀', color: 'var(--cyan)', text: `MFE reached peak excursion of +${s.mfePct}% at $${s.mfePrice} (${this.formatAge(s.timeToMFE)} post-signal).` });
    if (s.maePct <= -1.0) {
      bullets.push({ icon: '📉', color: 'var(--amber)', text: `MAE saw adverse drawdown of ${s.maePct}% at $${s.maePrice}.` });
    }

    // 3. Warnings
    if (s.warnings.length > 0) {
      const latestWarn = s.warnings[s.warnings.length - 1];
      bullets.push({ icon: '⚠️', color: 'var(--red)', text: `Warning triggered: ${latestWarn.reason}.` });
    }

    // 4. Status summary
    if (s.status === 'REJECTED') {
      bullets.push({ icon: '✕', color: 'var(--red)', text: `Signal was invalidated: ${s.rejection?.rejectionReason}.` });
    } else if (s.status === 'CONFIRMED') {
      bullets.push({ icon: '🔥', color: 'var(--emerald)', text: `Breakout confirmed with sustained multi-checkpoint positive returns.` });
    }

    return bullets;
  },

  // 11. Render Signal Journal Tab
  renderJournalTab() {
    this.renderKPIs();
    this.renderJournalTable();
  },

  renderKPIs() {
    const total = this.signals.length;
    const active = this.signals.filter(s => ['ACTIVE', 'CONFIRMED', 'WARNING'].includes(s.status)).length;
    const confirmed = this.signals.filter(s => s.status === 'CONFIRMED').length;
    const rejected = this.signals.filter(s => s.status === 'REJECTED').length;

    // Averages across signals with data
    const getAvg = (extractor) => {
      const vals = this.signals.map(extractor).filter(v => v !== null && !isNaN(v));
      if (vals.length === 0) return null;
      return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
    };

    const avg4h = getAvg(s => s.checkpoints['4H']);
    const avg8h = getAvg(s => s.checkpoints['8H']);
    const avg1d = getAvg(s => s.checkpoints['1D']);
    const avgMFE = getAvg(s => s.mfePct);
    const avgMAE = getAvg(s => s.maePct);

    document.getElementById('jkpi-total').innerText = total;
    document.getElementById('jkpi-active').innerText = active;
    document.getElementById('jkpi-confirmed').innerText = confirmed;
    document.getElementById('jkpi-rejected').innerText = rejected;
    document.getElementById('jkpi-avg4h').innerHTML = avg4h !== null ? this.formatPct(Number(avg4h)) : 'PENDING';
    document.getElementById('jkpi-avg8h').innerHTML = avg8h !== null ? this.formatPct(Number(avg8h)) : 'PENDING';
    document.getElementById('jkpi-avg1d').innerHTML = avg1d !== null ? this.formatPct(Number(avg1d)) : 'PENDING';
    document.getElementById('jkpi-avgmfe').innerHTML = avgMFE !== null ? `<span class="c-emerald font-bold">+${avgMFE}%</span>` : 'PENDING';
    document.getElementById('jkpi-avgmae').innerHTML = avgMAE !== null ? `<span class="c-red font-bold">${avgMAE}%</span>` : 'PENDING';
  },

  renderJournalTable() {
    const tbody = document.getElementById('journal-tbody');
    if (!tbody) return;

    let list = [...this.signals];

    // Filters
    if (this.activeFilter !== 'ALL') {
      list = list.filter(s => s.status === this.activeFilter);
    }
    if (this.activeSide !== 'ALL') {
      list = list.filter(s => s.signalType.includes(this.activeSide));
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(s => s.symbol.toLowerCase().includes(q) || s.signalId.toLowerCase().includes(q));
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="16" class="c-dark" style="text-align:center; padding:40px; font-family:var(--font-mono);">
        No signals in journal matching filter criteria.<br>Qualifying anomaly candidates (Score ≥ 72, RVOL ≥ 1.5x) are automatically captured here.
      </td></tr>`;
      return;
    }

    // Sort
    list.sort((a, b) => {
      let valA = a[this.sortColumn];
      let valB = b[this.sortColumn];
      if (valA === undefined) valA = 0;
      if (valB === undefined) valB = 0;
      if (typeof valA === 'string') {
        return this.sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return this.sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    let html = '';
    const now = Date.now();

    list.forEach((s, idx) => {
      const age = this.formatAge(now - s.detectedAt);
      const isLong = s.signalType.includes('LONG');
      const sigBadge = `<span class="signal-badge ${isLong ? 'sig-long' : 'sig-short'}">${s.signalType}</span>`;
      const statusBadge = this.getStatusBadge(s.status);
      const mfeFormatted = s.mfePct !== null ? `<span class="c-emerald font-bold tabular">+${s.mfePct.toFixed(2)}%</span>` : '<span class="c-dark">—</span>';
      const maeFormatted = s.maePct !== null ? `<span class="c-red font-bold tabular">${s.maePct.toFixed(2)}%</span>` : '<span class="c-dark">—</span>';

      html += `
        <tr onclick="LifecycleEngine.openDetailModal('${s.signalId}')" style="cursor:pointer;">
          <td class="tabular c-dark">${idx + 1}</td>
          <td class="tabular font-bold" style="color:var(--cyan); font-size:11px;">${s.signalId}</td>
          <td class="tabular font-bold" style="color:var(--text);">${s.symbol}</td>
          <td>${sigBadge}</td>
          <td class="tabular c-muted" style="font-size:11px;">${s.detectedAtLocal.slice(11)}</td>
          <td class="tabular font-bold">${age}</td>
          <td class="tabular font-bold">$${s.signalPrice >= 1 ? s.signalPrice.toFixed(2) : s.signalPrice.toFixed(4)}</td>
          <td class="tabular">$${s.currentPrice >= 1 ? s.currentPrice.toFixed(2) : s.currentPrice.toFixed(4)}</td>
          <td>${this.formatPct(s.checkpoints['4H'])}</td>
          <td>${this.formatPct(s.checkpoints['8H'])}</td>
          <td>${this.formatPct(s.checkpoints['1D'])}</td>
          <td>${mfeFormatted}</td>
          <td>${maeFormatted}</td>
          <td>${statusBadge}</td>
          <td class="c-muted" style="font-size:10px; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            ${s.rejection ? s.rejection.rejectionReason : s.warnings.length > 0 ? s.warnings[s.warnings.length - 1].reason : '—'}
          </td>
          <td class="tabular font-bold" style="color:var(--emerald);">${s.initialSnapshot.signalScore}</td>
          <td>
            <button class="btn btn-sm" onclick="event.stopPropagation(); LifecycleEngine.openDetailModal('${s.signalId}')">Inspect ↗</button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  },

  // 12. Open Detailed Lifecycle Modal
  openDetailModal(signalId) {
    const s = this.signals.find(x => x.signalId === signalId);
    if (!s) return;
    this.selectedSignalId = signalId;
    this.replayStepIndex = 0;

    const isLong = s.signalType.includes('LONG');
    const dirReturn = this.calculateReturn(s.signalType, s.signalPrice, s.currentPrice);
    const returnColor = dirReturn >= 0 ? 'var(--emerald)' : 'var(--red)';

    document.getElementById('ld-symbol').innerText = s.symbol;
    document.getElementById('ld-signal-id').innerText = s.signalId;
    document.getElementById('ld-signal-badge').className = `signal-badge ${isLong ? 'sig-long' : 'sig-short'}`;
    document.getElementById('ld-signal-badge').innerText = s.signalType;
    document.getElementById('ld-status-badge').innerHTML = this.getStatusBadge(s.status);
    document.getElementById('ld-detected').innerText = `${s.detectedAtLocal} (${s.detectedAtUTC.slice(11, 19)} UTC)`;
    document.getElementById('ld-age').innerText = this.formatAge(Date.now() - s.detectedAt);
    document.getElementById('ld-entry-price').innerText = '$' + s.signalPrice;
    document.getElementById('ld-current-price').innerText = '$' + s.currentPrice;
    document.getElementById('ld-return').innerHTML = `<span style="color:${returnColor}; font-weight:700;">${dirReturn >= 0 ? '+' : ''}${dirReturn}%</span>`;

    // 1. Time Checkpoints Grid
    const cpContainer = document.getElementById('ld-checkpoints-grid');
    let cpHtml = '';
    CHECKPOINTS.forEach(cp => {
      const val = s.checkpoints[cp.id];
      const isPending = val === null;
      cpHtml += `
        <div class="cp-card ${isPending ? 'cp-pending' : ''}">
          <div class="cp-label">${cp.id}</div>
          <div class="cp-value tabular">${isPending ? '<span class="c-dark">PENDING</span>' : (val >= 0 ? '+' : '') + val.toFixed(2) + '%'}</div>
        </div>
      `;
    });
    cpContainer.innerHTML = cpHtml;

    // 2. Extremes (MFE / MAE)
    document.getElementById('ld-mfe-pct').innerText = (s.mfePct >= 0 ? '+' : '') + s.mfePct.toFixed(2) + '%';
    document.getElementById('ld-mfe-price').innerText = '$' + s.mfePrice;
    document.getElementById('ld-mfe-time').innerText = `Time to peak: ${this.formatAge(s.timeToMFE)}`;

    document.getElementById('ld-mae-pct').innerText = (s.maePct || 0).toFixed(2) + '%';
    document.getElementById('ld-mae-price').innerText = '$' + (s.maePrice || s.signalPrice);
    document.getElementById('ld-mae-time').innerText = `Time to adverse: ${this.formatAge(s.timeToMAE || 0)}`;

    document.getElementById('ld-post-high').innerText = '$' + (s.postSignalHigh || s.signalPrice);
    document.getElementById('ld-post-low').innerText = '$' + (s.postSignalLow || s.signalPrice);

    // 3. What Happened So Far Summary
    const summaryContainer = document.getElementById('ld-summary-bullets');
    const bullets = this.generateWhatHappenedSoFar(s);
    summaryContainer.innerHTML = bullets.map(b => `
      <div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:6px; font-size:12px;">
        <span style="color:${b.color}; font-weight:700;">${b.icon}</span>
        <span style="color:var(--text);">${b.text}</span>
      </div>
    `).join('');

    // 4. Event Timeline
    const timelineContainer = document.getElementById('ld-timeline-container');
    timelineContainer.innerHTML = s.timeline.map((ev, i) => `
      <div class="timeline-item">
        <div class="timeline-dot ${ev.eventType.includes('REJECT') ? 'dot-red' : ev.eventType.includes('BREAKOUT') || ev.eventType.includes('DETECT') ? 'dot-green' : 'dot-blue'}"></div>
        <div class="timeline-content">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:12px; color:var(--text);">${ev.eventType.replace(/_/g, ' ')}</strong>
            <span class="tabular c-dark" style="font-size:10px;">${new Date(ev.timestamp).toLocaleTimeString()}</span>
          </div>
          <div class="c-muted" style="font-size:11px; margin-top:2px;">${ev.description}</div>
        </div>
      </div>
    `).join('');

    // 5. Initial Snapshot & Current State
    document.getElementById('ld-snap-score').innerText = s.initialSnapshot.signalScore + ' / 100';
    document.getElementById('ld-snap-rvol').innerText = s.initialSnapshot.relativeVolume + 'x';
    document.getElementById('ld-snap-oi').innerText = '$' + (s.initialSnapshot.openInterestValue / 1e6).toFixed(1) + 'M';
    document.getElementById('ld-snap-funding').innerText = (s.initialSnapshot.fundingRate * 100).toFixed(4) + '%';
    document.getElementById('ld-snap-trend').innerText = s.initialSnapshot.trend;
    document.getElementById('ld-snap-taker').innerText = (s.initialSnapshot.takerImbalance >= 0 ? '+' : '') + s.initialSnapshot.takerImbalance.toFixed(1) + '%';

    // 6. Post-Mortem Card (if terminated)
    const pmCard = document.getElementById('ld-postmortem-card');
    if (['REJECTED', 'EXPIRED', 'RESOLVED', 'FAILED'].includes(s.status) && s.rejection) {
      pmCard.style.display = 'block';
      document.getElementById('ld-pm-status').innerText = s.status;
      document.getElementById('ld-pm-reason').innerText = s.rejection.rejectionReason;
      document.getElementById('ld-pm-time').innerText = new Date(s.rejection.rejectionTimestamp).toLocaleString();
      document.getElementById('ld-pm-duration').innerText = this.formatAge(s.rejection.timeToRejection);
      document.getElementById('ld-pm-return').innerText = (s.rejection.priceChangeAtRejection >= 0 ? '+' : '') + s.rejection.priceChangeAtRejection.toFixed(2) + '%';
    } else {
      pmCard.style.display = 'none';
    }

    // 7. Render Normalized Price Chart & Setup Replay
    this.renderNormalizedChart(s);
    this.setupReplay(s);

    // Open Modal
    document.getElementById('lifecycle-detail-modal').classList.add('open');
  },

  // 13. Normalized Price Chart (0% at signal entry)
  renderNormalizedChart(signal) {
    const container = document.getElementById('ld-chart-container');
    if (!container) return;

    // Use checkpoints + snapshots
    const points = [{ label: 'T=0', returnPct: 0.0 }];
    CHECKPOINTS.forEach(cp => {
      if (signal.checkpoints[cp.id] !== null) {
        points.push({ label: cp.id, returnPct: signal.checkpoints[cp.id] });
      }
    });

    // Simple high-performance SVG line chart
    const width = container.clientWidth || 500;
    const height = 140;
    const pad = 25;

    const minPct = Math.min(-2, ...points.map(p => p.returnPct), signal.maePct || 0);
    const maxPct = Math.max(3, ...points.map(p => p.returnPct), signal.mfePct || 0);
    const range = (maxPct - minPct) || 1;

    const getX = (i) => pad + (i / Math.max(1, points.length - 1)) * (width - 2 * pad);
    const getY = (pct) => height - pad - ((pct - minPct) / range) * (height - 2 * pad);
    const zeroY = getY(0);

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.returnPct)}`).join(' ');

    container.innerHTML = `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}">
        <!-- Zero baseline -->
        <line x1="${pad}" y1="${zeroY}" x2="${width - pad}" y2="${zeroY}" stroke="#2A3A56" stroke-dasharray="4" />
        <text x="${width - pad + 2}" y="${zeroY + 3}" fill="#64748B" font-size="9" font-family="monospace">0%</text>

        <!-- Price curve -->
        <path d="${pathD}" fill="none" stroke="${signal.signalType.includes('LONG') ? '#00E599' : '#FF4757'}" stroke-width="2.5" />

        <!-- Data points -->
        ${points.map((p, i) => `
          <circle cx="${getX(i)}" cy="${getY(p.returnPct)}" r="4" fill="${p.returnPct >= 0 ? '#00E599' : '#FF4757'}" />
          <text x="${getX(i)}" y="${getY(p.returnPct) - 7}" fill="#F4F7FC" font-size="9" font-family="monospace" text-anchor="middle">
            ${p.returnPct >= 0 ? '+' : ''}${p.returnPct}%
          </text>
          <text x="${getX(i)}" y="${height - 5}" fill="#94A3B8" font-size="9" font-family="monospace" text-anchor="middle">
            ${p.label}
          </text>
        `).join('')}
      </svg>
    `;
  },

  // 14. Interactive Signal Replay (Eliminating Hindsight Bias)
  setupReplay(signal) {
    const replayTimeline = [{
      timeLabel: 'T=0 (Detection)',
      price: signal.signalPrice,
      returnPct: 0.0,
      description: 'Initial signal trigger. No future data available.'
    }];

    CHECKPOINTS.forEach(cp => {
      if (signal.checkpoints[cp.id] !== null) {
        replayTimeline.push({
          timeLabel: cp.id,
          price: (signal.signalPrice * (1 + signal.checkpoints[cp.id] / 100)).toFixed(4),
          returnPct: signal.checkpoints[cp.id],
          description: `Progressive checkpoint ${cp.id} reached.`
        });
      }
    });

    this.replayTimeline = replayTimeline;
    this.replayIndex = 0;
    this.renderReplayStep();
  },

  setReplayStep(idx) {
    if (!this.replayTimeline) return;
    this.replayIndex = Math.max(0, Math.min(idx, this.replayTimeline.length - 1));
    this.renderReplayStep();
  },

  renderReplayStep() {
    const step = this.replayTimeline[this.replayIndex];
    if (!step) return;

    document.getElementById('replay-step-label').innerText = step.timeLabel;
    document.getElementById('replay-step-price').innerText = '$' + step.price;
    document.getElementById('replay-step-return').innerHTML = `<span style="color:${step.returnPct >= 0 ? 'var(--emerald)' : 'var(--red)'}; font-weight:700;">${step.returnPct >= 0 ? '+' : ''}${step.returnPct}%</span>`;
    document.getElementById('replay-step-desc').innerText = step.description;
    document.getElementById('replay-step-progress').innerText = `Step ${this.replayIndex + 1} of ${this.replayTimeline.length}`;
  },

  // 15. Export Capabilities
  exportJournalCSV() {
    if (this.signals.length === 0) {
      alert('No signals to export.');
      return;
    }
    const headers = [
      'Signal ID', 'Symbol', 'Signal Type', 'Detected (UTC)', 'Signal Price',
      'Current Price', '15M %', '30M %', '1H %', '2H %', '4H %', '8H %', '12H %', '1D %',
      'MFE %', 'MFE Price', 'MAE %', 'MAE Price', 'Status', 'Rejection Reason', 'Eagle Score'
    ];

    const rows = this.signals.map(s => [
      s.signalId, s.symbol, s.signalType, s.detectedAtUTC, s.signalPrice,
      s.currentPrice,
      s.checkpoints['15M'] ?? 'PENDING',
      s.checkpoints['30M'] ?? 'PENDING',
      s.checkpoints['1H'] ?? 'PENDING',
      s.checkpoints['2H'] ?? 'PENDING',
      s.checkpoints['4H'] ?? 'PENDING',
      s.checkpoints['8H'] ?? 'PENDING',
      s.checkpoints['12H'] ?? 'PENDING',
      s.checkpoints['1D'] ?? 'PENDING',
      s.mfePct ?? '—', s.mfePrice ?? '—',
      s.maePct ?? '—', s.maePrice ?? '—',
      s.status, s.rejection ? s.rejection.rejectionReason : '—',
      s.initialSnapshot.signalScore
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `eagle_flash_signal_journal_${Date.now()}.csv`;
    a.click();
  },

  exportSignalsJSON() {
    const jsonStr = JSON.stringify(this.signals, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `eagle_flash_signals_${Date.now()}.json`;
    a.click();
  },

  clearAllSignals() {
    if (confirm('🚨 Are you sure you want to permanently clear all signal history records? This cannot be undone.')) {
      this.signals = [];
      localStorage.removeItem(LifecycleConfig.LS_SIGNALS_KEY);
      if (this.db) {
        const tx = this.db.transaction(LifecycleConfig.STORE_SIGNALS, 'readwrite');
        tx.objectStore(LifecycleConfig.STORE_SIGNALS).clear();
      }
      this.updateActiveCountBadge();
      this.renderJournalTable();
      alert('Signal history cleared.');
    }
  }
};
