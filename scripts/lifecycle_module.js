// ═════════════════════════════════════════════════════════════════════════
// 🦅 EAGLE FLASH — SIGNAL LIFECYCLE INTELLIGENCE ENGINE
// Production-grade real-time signal tracking, checkpoints, MFE/MAE,
// event timeline, rejection engine, replay, and descriptive analytics.
// ═════════════════════════════════════════════════════════════════════════

const LifecycleConfig = {
  DB_NAME: 'EagleFlash_DB',
  DB_VERSION: 1,
  STORE_SIGNALS: 'signals',
  STORE_SNAPSHOTS: 'snapshots',
  STORE_EVENTS: 'events',
  STORE_SETTINGS: 'settings',
  LS_SIGNALS_KEY: 'eagleFlash:v2:lifecycle:signals',
  LS_SETTINGS_KEY: 'eagleFlash:v2:lifecycle:settings',
  SCHEMA_VERSION: 1
};

// 11 Standardized Checkpoint Milestones
const CHECKPOINTS = [
  { id: '15M', label: '15 Min', seconds: 15 * 60 },
  { id: '30M', label: '30 Min', seconds: 30 * 60 },
  { id: '1H',  label: '1 Hour', seconds: 60 * 60 },
  { id: '2H',  label: '2 Hours', seconds: 2 * 60 * 60 },
  { id: '4H',  label: '4 Hours', seconds: 4 * 60 * 60 },
  { id: '8H',  label: '8 Hours', seconds: 8 * 60 * 60 },
  { id: '12H', label: '12 Hours', seconds: 12 * 60 * 60 },
  { id: '1D',  label: '1 Day', seconds: 24 * 60 * 60 },
  { id: '2D',  label: '2 Days', seconds: 48 * 60 * 60 },
  { id: '3D',  label: '3 Days', seconds: 72 * 60 * 60 },
  { id: '7D',  label: '7 Days', seconds: 7 * 24 * 60 * 60 }
];

// Helper: Calculate Median of an array of numbers
function calculateMedian(arr) {
  if (!arr || arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const LifecycleEngine = {
  signals: [],
  settings: {
    enabled: true,
    snapshotIntervalMinutes: 15,
    signalTTLHours: 72,
    cooldownMinutes: 30,
    invalidationPct: 3.0,
    retentionDays: 90,
    maxStoredSignals: 1000,
    showLifecycleColumns: true
  },
  activeFilter: 'ALL',
  activeSide: 'ALL',
  searchQuery: '',
  sortColumn: 'detectedAt',
  sortDirection: 'desc',
  selectedSignalId: null,
  replayStepIndex: 0,
  replayTimeline: [],
  replayTimer: null,
  db: null,
  lastTickTimestamp: null,
  lastPersistenceTimestamp: null,

  // 1. Storage & Initialization
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
            const sStore = db.createObjectStore(LifecycleConfig.STORE_SIGNALS, { keyPath: 'signalId' });
            sStore.createIndex('symbol', 'symbol', { unique: false });
            sStore.createIndex('direction', 'direction', { unique: false });
            sStore.createIndex('status', 'status', { unique: false });
            sStore.createIndex('detectedAt', 'detectedAt', { unique: false });
            sStore.createIndex('signalType', 'signalType', { unique: false });
          }
          if (!db.objectStoreNames.contains(LifecycleConfig.STORE_SNAPSHOTS)) {
            const snapStore = db.createObjectStore(LifecycleConfig.STORE_SNAPSHOTS, { keyPath: 'id', autoIncrement: true });
            snapStore.createIndex('signalId', 'signalId', { unique: false });
            snapStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
          if (!db.objectStoreNames.contains(LifecycleConfig.STORE_EVENTS)) {
            const evStore = db.createObjectStore(LifecycleConfig.STORE_EVENTS, { keyPath: 'id', autoIncrement: true });
            evStore.createIndex('signalId', 'signalId', { unique: false });
            evStore.createIndex('timestamp', 'timestamp', { unique: false });
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
      this.lastPersistenceTimestamp = Date.now();
      // LocalStorage backup
      const serialized = JSON.stringify(this.signals.slice(0, Math.min(this.settings.maxStoredSignals, 300)));
      localStorage.setItem(LifecycleConfig.LS_SIGNALS_KEY, serialized);

      if (this.db) {
        const tx = this.db.transaction(LifecycleConfig.STORE_SIGNALS, 'readwrite');
        tx.objectStore(LifecycleConfig.STORE_SIGNALS).put(signal);
      }
    } catch (e) {}
  },

  cleanExpiredRetention() {
    if (this.settings.retentionDays <= 0) return;
    const cutoff = Date.now() - (this.settings.retentionDays * 24 * 60 * 60 * 1000);
    this.signals = this.signals.filter(s => s.detectedAt >= cutoff);
  },

  // 2. Signal ID Generation (EGL-YYYYMMDD-SYMBOL-XXXX)
  generateId(symbol, date = new Date()) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const cleanSym = symbol.replace(/USDT$/, '');
    const todayPrefix = `EGL-${y}${m}${d}-${cleanSym}-`;
    const todayCount = this.signals.filter(s => s.signalId && s.signalId.startsWith(todayPrefix)).length + 1;
    const seq = String(todayCount).padStart(4, '0');
    return `${todayPrefix}${seq}`;
  },

  // 3. Deduplication Protection (Configurable Cooldown)
  isDuplicate(symbol, signalType, now = Date.now()) {
    const cooldownMs = this.settings.cooldownMinutes * 60 * 1000;
    return this.signals.some(s => 
      s.symbol === symbol &&
      s.signalType === signalType &&
      ['ACTIVE', 'CONFIRMED', 'WARNING', 'EXTENDED'].includes(s.status) &&
      (now - s.detectedAt) < cooldownMs
    );
  },

  // 4. Directional Return Calculation
  // LONG: (priceNow - entryPrice) / entryPrice * 100
  // SHORT: (entryPrice - priceNow) / entryPrice * 100
  calculateReturn(signalType, signalPrice, currentPrice) {
    if (!signalPrice || !currentPrice) return 0;
    if (signalType.includes('LONG')) {
      return parseFloat((((currentPrice - signalPrice) / signalPrice) * 100).toFixed(2));
    } else {
      return parseFloat((((signalPrice - currentPrice) / signalPrice) * 100).toFixed(2));
    }
  },

  // 5. Record Signal with Deeply Frozen Immutable Initial Snapshot
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
    const direction = isLong ? 'LONG' : 'SHORT';

    // IMMUTABLE INITIAL SNAPSHOT — Freeze completely
    const initialSnapshot = Object.freeze({
      price: signalPrice,
      markPrice: symData.markPrice || signalPrice,
      indexPrice: symData.indexPrice || signalPrice,
      price24hChange: symData.price24hChange || 0,
      high24h: symData.high24h || signalPrice,
      low24h: symData.low24h || signalPrice,
      volume24h: symData.turnover24h || 0,
      previous24hVolume: symData.previous24hVolume || 0,
      volumeChangePct: symData.volumeChange24h || 0,
      rvol: symData.relativeVolume || 1.0,
      volumeZScore: symData.volumeZScore || 0,
      openInterest: symData.openInterestValue || 0,
      openInterestChangePct: symData.oiChange24h || 0,
      fundingRate: symData.fundingRate || 0,
      basis: symData.basis || 0,
      takerBuyVolume: symData.takerBuyVolume || 0,
      takerSellVolume: symData.takerSellVolume || 0,
      takerFlow: symData.takerImbalance || 0,
      RSI: symData.rsi || 50,
      trend: symData.trend || 'NEUTRAL',
      eagleScore: symData.signalScore || 70,
      confidence: symData.signalConfidence || 'HIGH',
      spread: symData.spreadPct || 0,
      activePreset: symData.activePreset || 'All Symbols',
      activeFilters: { ...activeFilters },
      scannerState: 'BYBIT_LIVE'
    });

    // Checkpoint structure: { scheduledAt, capturedAt, price, absoluteChange, percentChange, directionalReturn, available }
    const checkpoints = {};
    CHECKPOINTS.forEach(cp => {
      checkpoints[cp.id] = {
        scheduledAt: now + (cp.seconds * 1000),
        capturedAt: null,
        price: null,
        absoluteChange: null,
        percentChange: null,
        directionalReturn: null,
        available: false
      };
    });

    const record = {
      signalId,
      version: LifecycleConfig.SCHEMA_VERSION,
      schemaVersion: LifecycleConfig.SCHEMA_VERSION,
      symbol: symData.symbol,
      signalType: symData.signal,
      direction,
      detectedAt: now,
      detectedAtUTC: nowDate.toISOString(),
      detectedAtLocal: nowDate.toLocaleString(),
      signalPrice,
      initialSnapshot,
      checkpoints,
      extremes: {
        mfePrice: signalPrice,
        mfePct: 0.0,
        mfeTimestamp: now,
        maePrice: signalPrice,
        maePct: 0.0,
        maeTimestamp: now,
        postSignalHigh: signalPrice,
        postSignalHighTimestamp: now,
        postSignalLow: signalPrice,
        postSignalLowTimestamp: now,
        timeToMFE: 0,
        timeToMAE: 0
      },
      currentState: {
        price: signalPrice,
        percentChange: 0.0,
        directionalReturn: 0.0,
        ageMs: 0,
        lastUpdated: now
      },
      warnings: [],
      rejection: null,
      timeline: [
        {
          timestamp: now,
          eventType: 'SIGNAL_DETECTED',
          title: 'Signal Triggered',
          description: `🦅 ${direction} signal triggered at $${signalPrice} (Score ${symData.signalScore}, RVOL ${symData.relativeVolume}x)`,
          price: signalPrice,
          metrics: { score: symData.signalScore, rvol: symData.relativeVolume, oi: symData.openInterestValue }
        }
      ],
      snapshots: [
        {
          timestamp: now,
          price: signalPrice,
          volume: symData.turnover24h || 0,
          oi: symData.openInterestValue || 0,
          funding: symData.fundingRate || 0,
          takerFlow: symData.takerImbalance || 0,
          rsi: symData.rsi || 50,
          trend: symData.trend || 'NEUTRAL',
          score: symData.signalScore || 70,
          change24h: symData.price24hChange || 0
        }
      ],
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
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

  // 6. Real-Time Market Tick Ingestion
  onMarketTick(symbol, currentPrice, tickData = {}) {
    if (!this.settings.enabled) return;
    const now = Date.now();
    this.lastTickTimestamp = now;
    let hasUpdates = false;

    this.signals.forEach(s => {
      if (s.symbol !== symbol) return;
      if (!['ACTIVE', 'CONFIRMED', 'WARNING', 'EXTENDED'].includes(s.status)) return;

      const entryPrice = s.initialSnapshot.price;
      const dirReturn = this.calculateReturn(s.signalType, entryPrice, currentPrice);
      const rawChangePct = parseFloat((((currentPrice - entryPrice) / entryPrice) * 100).toFixed(2));
      const absChange = parseFloat((currentPrice - entryPrice).toFixed(4));

      s.currentState = {
        price: currentPrice,
        percentChange: rawChangePct,
        directionalReturn: dirReturn,
        ageMs: now - s.detectedAt,
        lastUpdated: now
      };
      s.updatedAt = now;

      // 1. Post-Signal High / Low tracking
      if (!s.extremes.postSignalHigh || currentPrice > s.extremes.postSignalHigh) {
        s.extremes.postSignalHigh = currentPrice;
        s.extremes.postSignalHighTimestamp = now;
      }
      if (!s.extremes.postSignalLow || currentPrice < s.extremes.postSignalLow) {
        s.extremes.postSignalLow = currentPrice;
        s.extremes.postSignalLowTimestamp = now;
      }

      // 2. MFE (Maximum Favorable Excursion)
      if (s.extremes.mfePct === null || dirReturn > s.extremes.mfePct) {
        s.extremes.mfePct = dirReturn;
        s.extremes.mfePrice = currentPrice;
        s.extremes.mfeTimestamp = now;
        s.extremes.timeToMFE = now - s.detectedAt;

        // Transition: ACTIVE -> CONFIRMED on sustained move
        if (dirReturn >= 3.0 && s.status === 'ACTIVE') {
          s.status = 'CONFIRMED';
          s.timeline.push({
            timestamp: now,
            eventType: 'BREAKOUT_CONFIRMED',
            title: 'Breakout Confirmed',
            description: `🔥 Move expanded to +${dirReturn}% (New peak price: $${currentPrice})`,
            price: currentPrice,
            metrics: { mfePct: dirReturn }
          });
        }
      }

      // 3. MAE (Maximum Adverse Excursion)
      if (s.extremes.maePct === null || dirReturn < s.extremes.maePct) {
        s.extremes.maePct = dirReturn;
        s.extremes.maePrice = currentPrice;
        s.extremes.maeTimestamp = now;
        s.extremes.timeToMAE = now - s.detectedAt;
      }

      // 4. Standardized Checkpoints (15M -> 7D)
      const elapsedSec = (now - s.detectedAt) / 1000;
      CHECKPOINTS.forEach(cp => {
        const cpData = s.checkpoints[cp.id];
        if (cpData && !cpData.available && elapsedSec >= cp.seconds) {
          cpData.capturedAt = now;
          cpData.price = currentPrice;
          cpData.absoluteChange = absChange;
          cpData.percentChange = rawChangePct;
          cpData.directionalReturn = dirReturn;
          cpData.available = true;

          s.timeline.push({
            timestamp: now,
            eventType: 'CHECKPOINT_REACHED',
            title: `Checkpoint ${cp.id} Captured`,
            description: `⏱️ ${cp.label}: ${dirReturn >= 0 ? '+' : ''}${dirReturn}% (Price $${currentPrice})`,
            price: currentPrice,
            metrics: { checkpoint: cp.id, returnPct: dirReturn }
          });
        }
      });

      // 5. Evidence-based Warning Engine
      this.evaluateWarnings(s, currentPrice, tickData, now, dirReturn);

      // 6. Configurable Rejection & Invalidation Engine
      this.evaluateRejection(s, currentPrice, dirReturn, now);

      // 7. Periodic 15M Snapshots
      const snapshotMs = this.settings.snapshotIntervalMinutes * 60 * 1000;
      if (now - (s.lastSnapshotTime || s.detectedAt) >= snapshotMs) {
        s.snapshots.push({
          timestamp: now,
          price: currentPrice,
          volume: tickData.turnover24h || s.initialSnapshot.volume24h,
          oi: tickData.openInterestValue || s.initialSnapshot.openInterest,
          funding: tickData.fundingRate || s.initialSnapshot.fundingRate,
          takerFlow: tickData.takerImbalance || s.initialSnapshot.takerFlow,
          rsi: tickData.rsi || s.initialSnapshot.RSI,
          trend: tickData.trend || s.initialSnapshot.trend,
          score: tickData.signalScore || s.initialSnapshot.eagleScore,
          change24h: tickData.price24hChange || s.initialSnapshot.price24hChange
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

  // 7. Evidence-Based Warning Detector
  evaluateWarnings(signal, currentPrice, tickData, now, dirReturn) {
    const isLong = signal.direction === 'LONG';
    const warnings = [];

    // Taker Flow Reversal
    if (tickData.takerImbalance != null) {
      if (isLong && tickData.takerImbalance <= -15 && signal.initialSnapshot.takerFlow >= 10) {
        warnings.push({
          type: 'TAKER_FLOW_REVERSAL',
          severity: 'HIGH',
          metric: 'Taker Flow',
          previousValue: `${signal.initialSnapshot.takerFlow}%`,
          currentValue: `${tickData.takerImbalance}%`,
          threshold: '-15%',
          reason: 'Aggressive taker selling pressure reversed against LONG signal'
        });
      } else if (!isLong && tickData.takerImbalance >= 15 && signal.initialSnapshot.takerFlow <= -10) {
        warnings.push({
          type: 'TAKER_FLOW_REVERSAL',
          severity: 'HIGH',
          metric: 'Taker Flow',
          previousValue: `${signal.initialSnapshot.takerFlow}%`,
          currentValue: `${tickData.takerImbalance}%`,
          threshold: '+15%',
          reason: 'Aggressive taker buying pressure reversed against SHORT signal'
        });
      }
    }

    // Volume Fade
    if (tickData.relativeVolume != null && tickData.relativeVolume < 0.95 && signal.initialSnapshot.rvol >= 1.8) {
      warnings.push({
        type: 'VOLUME_FADE',
        severity: 'MEDIUM',
        metric: 'RVOL',
        previousValue: `${signal.initialSnapshot.rvol}x`,
        currentValue: `${tickData.relativeVolume}x`,
        threshold: '0.95x',
        reason: 'Breakout volume faded below baseline baseline average'
      });
    }

    // Heavy Adverse Excursion
    if (dirReturn <= -(this.settings.invalidationPct * 0.5) && signal.status !== 'WARNING') {
      warnings.push({
        type: 'HEAVY_DRAWDOWN',
        severity: 'HIGH',
        metric: 'Directional Return',
        previousValue: '0%',
        currentValue: `${dirReturn}%`,
        threshold: `-${(this.settings.invalidationPct * 0.5).toFixed(1)}%`,
        reason: `Adverse price movement reached ${dirReturn}% (50% of invalidation threshold)`
      });
    }

    // Pullback from MFE Peak
    if (signal.extremes.mfePct >= 2.5 && (signal.extremes.mfePct - dirReturn) >= 2.0) {
      warnings.push({
        type: 'PRICE_PULLBACK',
        severity: 'MEDIUM',
        metric: 'MFE Retracement',
        previousValue: `+${signal.extremes.mfePct}%`,
        currentValue: `${dirReturn}%`,
        threshold: '-2.0% from peak',
        reason: `Price retraced 2.0% from peak MFE excursion (+${signal.extremes.mfePct}%)`
      });
    }

    // Slow Developer: 2 Hours elapsed without reaching +0.5%
    const elapsedHours = (now - signal.detectedAt) / (3600 * 1000);
    if (elapsedHours >= 2.0 && signal.extremes.mfePct < 0.5 && !signal.warnings.some(w => w.type === 'SLOW_DEVELOPER')) {
      warnings.push({
        type: 'SLOW_DEVELOPER',
        severity: 'LOW',
        metric: 'MFE at 2H',
        previousValue: '0%',
        currentValue: `${signal.extremes.mfePct}%`,
        threshold: '+0.5%',
        reason: 'Signal has not expanded (+0.5%) after 2 hours of tracking'
      });
    }

    if (warnings.length > 0) {
      const lastWarn = signal.warnings[signal.warnings.length - 1];
      const timeSinceLast = lastWarn ? now - lastWarn.timestamp : Infinity;
      if (timeSinceLast > 10 * 60 * 1000) { // Cooldown between warning events
        const w = warnings[0];
        signal.warnings.push({
          type: w.type,
          timestamp: now,
          severity: w.severity,
          metric: w.metric,
          previousValue: w.previousValue,
          currentValue: w.currentValue,
          threshold: w.threshold,
          reason: w.reason
        });
        signal.status = 'WARNING';
        signal.timeline.push({
          timestamp: now,
          eventType: 'WARNING_TRIGGERED',
          title: `Warning: ${w.type.replace(/_/g, ' ')}`,
          description: `⚠️ ${w.reason}`,
          price: currentPrice,
          metrics: { trigger: w.type, severity: w.severity }
        });
      }
    }
  },

  // 8. Configurable Rejection & Post-Mortem Engine
  evaluateRejection(signal, currentPrice, dirReturn, now) {
    const elapsedHours = (now - signal.detectedAt) / (3600 * 1000);

    // Rule A: Price Invalidation Limit Breached
    if (dirReturn <= -this.settings.invalidationPct) {
      signal.status = 'REJECTED';
      const postMortemBullets = [
        `Initial ${signal.direction} signal captured at $${signal.initialSnapshot.price} (Eagle Score ${signal.initialSnapshot.eagleScore}, RVOL ${signal.initialSnapshot.rvol}x).`,
        `Peak favorable excursion (MFE) reached +${signal.extremes.mfePct}% at $${signal.extremes.mfePrice} (${this.formatAge(signal.extremes.timeToMFE)} post-signal).`,
        `Deepest adverse excursion (MAE) reached ${signal.extremes.maePct}% at $${signal.extremes.maePrice}.`,
        `Adverse price movement breached the configured -${this.settings.invalidationPct}% invalidation threshold.`,
        `Signal terminated as REJECTED with a realized loss of ${dirReturn}%.`
      ];

      signal.rejection = {
        rejectionTimestamp: now,
        rejectionPrice: currentPrice,
        rejectionPercent: dirReturn,
        directionalReturnAtRejection: dirReturn,
        timeToRejection: now - signal.detectedAt,
        reason: `Price breached -${this.settings.invalidationPct}% invalidation limit`,
        trigger: 'PRICE_INVALIDATION',
        whatHappened: postMortemBullets
      };

      signal.timeline.push({
        timestamp: now,
        eventType: 'SIGNAL_REJECTED',
        title: 'Signal Invalidation Rejection',
        description: `🔴 REJECTED: Price fell to $${currentPrice} (${dirReturn}%), breaching the -${this.settings.invalidationPct}% threshold.`,
        price: currentPrice,
        metrics: { dirReturn, timeToRejection: now - signal.detectedAt }
      });
      this.updateActiveCountBadge();
      return;
    }

    // Rule B: TTL Lifespan Expiration
    if (elapsedHours >= this.settings.signalTTLHours) {
      signal.status = 'EXPIRED';
      const postMortemBullets = [
        `Signal reached maximum horizon TTL (${this.settings.signalTTLHours} hours).`,
        `Overall excursion: Peak MFE +${signal.extremes.mfePct}% / Worst MAE ${signal.extremes.maePct}%.`,
        `Final market state closed at $${currentPrice} (${dirReturn >= 0 ? '+' : ''}${dirReturn}% return).`
      ];

      signal.rejection = {
        rejectionTimestamp: now,
        rejectionPrice: currentPrice,
        rejectionPercent: dirReturn,
        directionalReturnAtRejection: dirReturn,
        timeToRejection: now - signal.detectedAt,
        reason: `Signal holding duration (${this.settings.signalTTLHours}h) expired`,
        trigger: 'TTL_EXPIRED',
        whatHappened: postMortemBullets
      };

      signal.timeline.push({
        timestamp: now,
        eventType: 'SIGNAL_EXPIRED',
        title: 'Holding Horizon Concluded',
        description: `⚪ EXPIRED: Lifespan concluded at ${this.settings.signalTTLHours}h (Final Return: ${dirReturn >= 0 ? '+' : ''}${dirReturn}%)`,
        price: currentPrice,
        metrics: { dirReturn }
      });
      this.updateActiveCountBadge();
    }
  },

  // 9. Formatters & Helpers
  formatAge(ms) {
    if (!ms || ms <= 0) return '0m';
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
    return `<span class="${isPos ? 'c-emerald' : 'c-red'} font-bold tabular">${isPos ? '+' : ''}${Number(val).toFixed(2)}%</span>`;
  },

  getStatusBadge(status) {
    switch (status) {
      case 'ACTIVE': return '<span class="status-badge-active">🟢 ACTIVE</span>';
      case 'CONFIRMED': return '<span class="status-badge-confirmed">🔥 CONFIRMED</span>';
      case 'EXTENDED': return '<span class="status-badge-confirmed">🚀 EXTENDED</span>';
      case 'WARNING': return '<span class="status-badge-warning">⚠️ WARNING</span>';
      case 'REJECTED': return '<span class="status-badge-rejected">🔴 REJECTED</span>';
      case 'FAILED': return '<span class="status-badge-rejected">✕ FAILED</span>';
      case 'EXPIRED': return '<span class="status-badge-expired">⚪ EXPIRED</span>';
      case 'RESOLVED': return '<span class="status-badge-confirmed">✓ RESOLVED</span>';
      default: return `<span class="c-dark">${status}</span>`;
    }
  },

  updateActiveCountBadge() {
    const activeCount = this.signals.filter(s => ['ACTIVE', 'CONFIRMED', 'WARNING', 'EXTENDED'].includes(s.status)).length;
    const b1 = document.getElementById('journal-count');
    const b2 = document.getElementById('m-journal-count');
    if (b1) b1.innerText = activeCount;
    if (b2) b2.innerText = activeCount;
  },

  // 10. Dynamic Evidence-Based "What Happened So Far" Narrative
  generateWhatHappenedSoFar(s) {
    const dirReturn = s.currentState?.directionalReturn || this.calculateReturn(s.signalType, s.initialSnapshot.price, s.currentState?.price || s.initialSnapshot.price);
    const bullets = [];

    // 1. Initial trigger
    bullets.push({
      icon: '🟢',
      color: 'var(--emerald)',
      text: `Signal detected at $${s.initialSnapshot.price} with Eagle Score ${s.initialSnapshot.eagleScore} and RVOL ${s.initialSnapshot.rvol}x.`
    });

    // 2. Favorable expansion
    if (s.extremes.mfePct > 0) {
      bullets.push({
        icon: '🚀',
        color: 'var(--cyan)',
        text: `Price reached peak favorable excursion of +${s.extremes.mfePct}% ($${s.extremes.mfePrice}) after ${this.formatAge(s.extremes.timeToMFE)}.`
      });
    }

    // 3. Adverse excursion
    if (s.extremes.maePct < 0) {
      bullets.push({
        icon: '📉',
        color: s.extremes.maePct <= -2.0 ? 'var(--red)' : 'var(--amber)',
        text: `Deepest adverse excursion dropped to ${s.extremes.maePct}% ($${s.extremes.maePrice}) after ${this.formatAge(s.extremes.timeToMAE)}.`
      });
    }

    // 4. Checkpoints
    const hitCheckpoints = CHECKPOINTS.filter(cp => s.checkpoints[cp.id]?.available);
    if (hitCheckpoints.length > 0) {
      const lastHit = hitCheckpoints[hitCheckpoints.length - 1];
      const ret = s.checkpoints[lastHit.id].directionalReturn;
      bullets.push({
        icon: '⏱️',
        color: ret >= 0 ? 'var(--emerald)' : 'var(--red)',
        text: `Latest captured checkpoint (${lastHit.id}) performance recorded at ${ret >= 0 ? '+' : ''}${ret}%.`
      });
    }

    // 5. Evidence warnings
    if (s.warnings.length > 0) {
      const latestWarn = s.warnings[s.warnings.length - 1];
      bullets.push({
        icon: '⚠️',
        color: 'var(--amber)',
        text: `Evidence alert: ${latestWarn.reason}.`
      });
    }

    // 6. Final resolution
    if (s.status === 'REJECTED') {
      bullets.push({
        icon: '🔴',
        color: 'var(--red)',
        text: `Signal invalidated: ${s.rejection?.reason || 'Adverse move breached threshold'}. Realized return: ${s.rejection?.rejectionPercent}%.`
      });
    } else if (s.status === 'CONFIRMED' || s.status === 'EXTENDED') {
      bullets.push({
        icon: '🔥',
        color: 'var(--emerald)',
        text: 'Breakout confirmed with sustained multi-checkpoint follow-through.'
      });
    } else if (s.status === 'EXPIRED') {
      bullets.push({
        icon: '⚪',
        color: 'var(--text-dark)',
        text: `Tracking concluded upon reaching ${this.settings.signalTTLHours}h holding horizon.`
      });
    } else {
      bullets.push({
        icon: '🟢',
        color: 'var(--emerald)',
        text: `Signal remains actively tracked. Current directional return: ${dirReturn >= 0 ? '+' : ''}${dirReturn}%.`
      });
    }

    return bullets;
  },

  // 11. Render Signal Journal Tab View
  renderJournalTab() {
    if (typeof State !== 'undefined' && State.symbols) {
      State.symbols.forEach(s => {
        if (s.signal === 'LONG CANDIDATE' || s.signal === 'SHORT CANDIDATE') {
          this.recordSignal(s, { source: 'JOURNAL_SYNC' });
        }
      });
    }
    this.renderKPIs();
    this.renderJournalTable();
  },

  renderKPIs() {
    const total = this.signals.length;
    const active = this.signals.filter(s => ['ACTIVE', 'CONFIRMED', 'WARNING', 'EXTENDED'].includes(s.status)).length;
    const confirmedCount = this.signals.filter(s => ['CONFIRMED', 'EXTENDED', 'RESOLVED'].includes(s.status)).length;
    const rejectedCount = this.signals.filter(s => ['REJECTED', 'FAILED'].includes(s.status)).length;

    const confirmedPct = total > 0 ? ((confirmedCount / total) * 100).toFixed(1) + '%' : '0.0%';
    const rejectedPct = total > 0 ? ((rejectedCount / total) * 100).toFixed(1) + '%' : '0.0%';

    const getAvg = (fn) => {
      const vals = this.signals.map(fn).filter(v => v !== null && v !== undefined && !isNaN(v));
      if (vals.length === 0) return null;
      return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
    };

    const avg4h = getAvg(s => s.checkpoints['4H']?.directionalReturn);
    const avg8h = getAvg(s => s.checkpoints['8H']?.directionalReturn);
    const avg1d = getAvg(s => s.checkpoints['1D']?.directionalReturn);
    const avgMFE = getAvg(s => s.extremes.mfePct);
    const avgMAE = getAvg(s => s.extremes.maePct);

    // Average time to rejection
    const rejectedSignals = this.signals.filter(s => s.rejection?.timeToRejection);
    const avgTimeToRejection = rejectedSignals.length > 0
      ? this.formatAge(rejectedSignals.reduce((acc, s) => acc + s.rejection.timeToRejection, 0) / rejectedSignals.length)
      : '—';

    const setHtml = (id, html) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    };

    setHtml('jkpi-total', total);
    setHtml('jkpi-active', active);
    setHtml('jkpi-confirmed', `${confirmedCount} <span style="font-size:10px; color:var(--text-dark);">(${confirmedPct})</span>`);
    setHtml('jkpi-rejected', `${rejectedCount} <span style="font-size:10px; color:var(--text-dark);">(${rejectedPct})</span>`);
    setHtml('jkpi-avg4h', avg4h !== null ? this.formatPct(Number(avg4h)) : 'PENDING');
    setHtml('jkpi-avg8h', avg8h !== null ? this.formatPct(Number(avg8h)) : 'PENDING');
    setHtml('jkpi-avg1d', avg1d !== null ? this.formatPct(Number(avg1d)) : 'PENDING');
    setHtml('jkpi-avgmfe', avgMFE !== null ? `<span class="c-emerald font-bold">+${avgMFE}%</span>` : 'PENDING');
    setHtml('jkpi-avgmae', avgMAE !== null ? `<span class="c-red font-bold">${avgMAE}%</span>` : 'PENDING');
    setHtml('jkpi-avgttr', `<span class="tabular font-bold">${avgTimeToRejection}</span>`);
  },

  renderJournalTable() {
    const tbody = document.getElementById('journal-tbody');
    if (!tbody) return;

    let list = [...this.signals];

    // Filter by Status
    if (this.activeFilter !== 'ALL') {
      list = list.filter(s => s.status === this.activeFilter);
    }
    // Filter by Side (LONG / SHORT)
    if (this.activeSide !== 'ALL') {
      list = list.filter(s => s.direction === this.activeSide);
    }
    // Filter by Search Query
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(s => s.symbol.toLowerCase().includes(q) || s.signalId.toLowerCase().includes(q));
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="20" class="c-dark" style="text-align:center; padding:40px; font-family:var(--font-mono);">
        No signals in journal matching filter criteria.<br>Qualifying anomaly candidates (Score ≥ 72, RVOL ≥ 1.5x) are automatically captured here.
      </td></tr>`;
      return;
    }

    // Sort Table
    list.sort((a, b) => {
      let valA, valB;
      if (this.sortColumn === 'score') {
        valA = a.initialSnapshot.eagleScore;
        valB = b.initialSnapshot.eagleScore;
      } else if (this.sortColumn === 'currentPct') {
        valA = a.currentState?.directionalReturn ?? 0;
        valB = b.currentState?.directionalReturn ?? 0;
      } else if (this.sortColumn === 'mfePct') {
        valA = a.extremes.mfePct ?? 0;
        valB = b.extremes.mfePct ?? 0;
      } else if (this.sortColumn === 'maePct') {
        valA = a.extremes.maePct ?? 0;
        valB = b.extremes.maePct ?? 0;
      } else {
        valA = a[this.sortColumn] ?? 0;
        valB = b[this.sortColumn] ?? 0;
      }
      if (typeof valA === 'string') {
        return this.sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return this.sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    let html = '';
    const now = Date.now();

    list.forEach((s, idx) => {
      const age = this.formatAge(now - s.detectedAt);
      const isLong = s.direction === 'LONG';
      const sideBadge = `<span class="signal-badge ${isLong ? 'sig-long' : 'sig-short'}">${s.direction}</span>`;
      const sigBadge = `<span style="font-size:10px; font-weight:700; color:${isLong ? 'var(--emerald)' : 'var(--red)'};">${s.signalType}</span>`;
      const statusBadge = this.getStatusBadge(s.status);
      const mfeFormatted = s.extremes.mfePct !== null ? `<span class="c-emerald font-bold tabular">+${s.extremes.mfePct.toFixed(2)}%</span>` : '<span class="c-dark">—</span>';
      const maeFormatted = s.extremes.maePct !== null ? `<span class="c-red font-bold tabular">${s.extremes.maePct.toFixed(2)}%</span>` : '<span class="c-dark">—</span>';
      const currReturn = s.currentState?.directionalReturn ?? this.calculateReturn(s.signalType, s.initialSnapshot.price, s.currentState?.price || s.initialSnapshot.price);
      const currPrice = s.currentState?.price || s.initialSnapshot.price;
      const ttr = s.rejection?.timeToRejection ? this.formatAge(s.rejection.timeToRejection) : '—';
      const rejectionNote = s.rejection?.reason || (s.warnings.length > 0 ? s.warnings[s.warnings.length - 1].reason : '—');

      html += `
        <tr onclick="LifecycleEngine.openDetailModal('${s.signalId}')" style="cursor:pointer;">
          <td class="tabular c-dark">${idx + 1}</td>
          <td class="tabular font-bold" style="color:var(--cyan); font-size:11px;">${s.signalId}</td>
          <td class="tabular font-bold" style="color:var(--text);">${s.symbol}</td>
          <td>${sideBadge}</td>
          <td>${sigBadge}</td>
          <td class="tabular font-bold" style="color:var(--emerald);">${s.initialSnapshot.eagleScore}</td>
          <td class="tabular c-muted" style="font-size:11px;" title="${s.detectedAtUTC}">${s.detectedAtLocal.slice(11)}</td>
          <td class="tabular font-bold">${age}</td>
          <td class="tabular font-bold">$${s.initialSnapshot.price >= 1 ? s.initialSnapshot.price.toFixed(2) : s.initialSnapshot.price.toFixed(4)}</td>
          <td class="tabular">$${currPrice >= 1 ? currPrice.toFixed(2) : currPrice.toFixed(4)}</td>
          <td>${this.formatPct(currReturn)}</td>
          <td>${this.formatPct(s.checkpoints['4H']?.directionalReturn)}</td>
          <td>${this.formatPct(s.checkpoints['8H']?.directionalReturn)}</td>
          <td>${this.formatPct(s.checkpoints['1D']?.directionalReturn)}</td>
          <td>${mfeFormatted}</td>
          <td>${maeFormatted}</td>
          <td>${statusBadge}</td>
          <td class="c-muted" style="font-size:10px; max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${rejectionNote}">
            ${rejectionNote}
          </td>
          <td class="tabular c-dark">${ttr}</td>
          <td>
            <button class="btn btn-sm" onclick="event.stopPropagation(); LifecycleEngine.openDetailModal('${s.signalId}')">Inspect ↗</button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  },

  // 12. Open Lifecycle Detail Modal
  openDetailModal(signalId) {
    const s = this.signals.find(x => x.signalId === signalId);
    if (!s) return;
    this.selectedSignalId = signalId;

    const isLong = s.direction === 'LONG';
    const currReturn = s.currentState?.directionalReturn ?? this.calculateReturn(s.signalType, s.initialSnapshot.price, s.currentState?.price || s.initialSnapshot.price);
    const currPrice = s.currentState?.price || s.initialSnapshot.price;
    const returnColor = currReturn >= 0 ? 'var(--emerald)' : 'var(--red)';

    document.getElementById('ld-symbol').innerText = s.symbol;
    document.getElementById('ld-signal-id').innerText = s.signalId;
    document.getElementById('ld-signal-badge').className = `signal-badge ${isLong ? 'sig-long' : 'sig-short'}`;
    document.getElementById('ld-signal-badge').innerText = `${s.direction} CANDIDATE`;
    document.getElementById('ld-status-badge').innerHTML = this.getStatusBadge(s.status);
    document.getElementById('ld-detected').innerText = `${s.detectedAtLocal} (${s.detectedAtUTC.slice(11, 19)} UTC)`;
    document.getElementById('ld-age').innerText = this.formatAge(Date.now() - s.detectedAt);
    document.getElementById('ld-entry-price').innerText = '$' + s.initialSnapshot.price;
    document.getElementById('ld-current-price').innerText = '$' + currPrice;
    document.getElementById('ld-return').innerHTML = `<span style="color:${returnColor}; font-weight:700;">${currReturn >= 0 ? '+' : ''}${currReturn}%</span>`;

    // 1. Performance Checkpoint Cards
    const cpContainer = document.getElementById('ld-checkpoints-grid');
    let cpHtml = '';
    const elapsedSec = (Date.now() - s.detectedAt) / 1000;

    CHECKPOINTS.forEach(cp => {
      const cpData = s.checkpoints[cp.id];
      const isCaptured = cpData && cpData.available;
      const isPast = elapsedSec > cp.seconds;
      let labelVal = '<span class="c-dark">PENDING</span>';

      if (isCaptured) {
        const ret = cpData.directionalReturn;
        labelVal = `<span class="${ret >= 0 ? 'c-emerald' : 'c-red'} font-bold">${ret >= 0 ? '+' : ''}${ret}%</span>`;
      } else if (isPast) {
        labelVal = '<span class="c-dark" style="font-size:9px;">DATA UNAVAILABLE</span>';
      }

      cpHtml += `
        <div class="cp-card ${!isCaptured ? 'cp-pending' : ''}">
          <div class="cp-label">${cp.id}</div>
          <div class="cp-value tabular">${labelVal}</div>
        </div>
      `;
    });
    cpContainer.innerHTML = cpHtml;

    // 2. Extremes Panel
    document.getElementById('ld-mfe-pct').innerText = (s.extremes.mfePct >= 0 ? '+' : '') + s.extremes.mfePct.toFixed(2) + '%';
    document.getElementById('ld-mfe-price').innerText = '$' + s.extremes.mfePrice;
    document.getElementById('ld-mfe-time').innerText = `Time to peak: ${this.formatAge(s.extremes.timeToMFE)}`;

    document.getElementById('ld-mae-pct').innerText = (s.extremes.maePct || 0).toFixed(2) + '%';
    document.getElementById('ld-mae-price').innerText = '$' + (s.extremes.maePrice || s.initialSnapshot.price);
    document.getElementById('ld-mae-time').innerText = `Time to adverse: ${this.formatAge(s.extremes.timeToMAE || 0)}`;

    document.getElementById('ld-post-high').innerText = '$' + (s.extremes.postSignalHigh || s.initialSnapshot.price);
    document.getElementById('ld-post-low').innerText = '$' + (s.extremes.postSignalLow || s.initialSnapshot.price);

    // 3. What Happened So Far Dynamic Bullets
    const summaryContainer = document.getElementById('ld-summary-bullets');
    const bullets = this.generateWhatHappenedSoFar(s);
    summaryContainer.innerHTML = bullets.map(b => `
      <div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:6px; font-size:12px;">
        <span style="color:${b.color}; font-weight:700;">${b.icon}</span>
        <span style="color:var(--text);">${b.text}</span>
      </div>
    `).join('');

    // 4. Chronological Event Timeline
    const timelineContainer = document.getElementById('ld-timeline-container');
    timelineContainer.innerHTML = s.timeline.map(ev => `
      <div class="timeline-item">
        <div class="timeline-dot ${ev.eventType.includes('REJECT') ? 'dot-red' : ev.eventType.includes('BREAKOUT') || ev.eventType.includes('DETECT') ? 'dot-green' : 'dot-blue'}"></div>
        <div class="timeline-content">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:12px; color:var(--text);">${ev.title || ev.eventType.replace(/_/g, ' ')}</strong>
            <span class="tabular c-dark" style="font-size:10px;">${new Date(ev.timestamp).toLocaleTimeString()} (${new Date(ev.timestamp).toISOString().slice(11, 19)} UTC)</span>
          </div>
          <div class="c-muted" style="font-size:11px; margin-top:2px;">${ev.description}</div>
        </div>
      </div>
    `).join('');

    // 5. Initial Snapshot Immutable Metrics
    document.getElementById('ld-snap-score').innerText = s.initialSnapshot.eagleScore + ' / 100';
    document.getElementById('ld-snap-rvol').innerText = s.initialSnapshot.rvol + 'x';
    document.getElementById('ld-snap-oi').innerText = '$' + (s.initialSnapshot.openInterest / 1e6).toFixed(1) + 'M';
    document.getElementById('ld-snap-funding').innerText = (s.initialSnapshot.fundingRate * 100).toFixed(4) + '%';
    document.getElementById('ld-snap-trend').innerText = s.initialSnapshot.trend;
    document.getElementById('ld-snap-taker').innerText = (s.initialSnapshot.takerFlow >= 0 ? '+' : '') + s.initialSnapshot.takerFlow.toFixed(1) + '%';

    // 6. Post-Mortem Card (if rejected / expired / resolved)
    const pmCard = document.getElementById('ld-postmortem-card');
    if (['REJECTED', 'EXPIRED', 'RESOLVED', 'FAILED'].includes(s.status) && s.rejection) {
      pmCard.style.display = 'block';
      document.getElementById('ld-pm-status').innerText = s.status;
      document.getElementById('ld-pm-reason').innerText = s.rejection.reason;
      document.getElementById('ld-pm-time').innerText = `${new Date(s.rejection.rejectionTimestamp).toLocaleString()} (${new Date(s.rejection.rejectionTimestamp).toISOString().slice(11, 19)} UTC)`;
      document.getElementById('ld-pm-duration').innerText = this.formatAge(s.rejection.timeToRejection);
      document.getElementById('ld-pm-return').innerText = (s.rejection.rejectionPercent >= 0 ? '+' : '') + s.rejection.rejectionPercent.toFixed(2) + '%';

      const pmBulletsContainer = document.getElementById('ld-pm-bullets');
      if (pmBulletsContainer && s.rejection.whatHappened) {
        pmBulletsContainer.innerHTML = s.rejection.whatHappened.map(b => `<li>• ${b}</li>`).join('');
      }
    } else {
      pmCard.style.display = 'none';
    }

    // 7. Render Normalized SVG Chart & Initialize Strict No Look-Ahead Replay
    this.renderNormalizedChart(s);
    this.setupStrictReplay(s);

    // Open Modal
    document.getElementById('lifecycle-detail-modal').classList.add('open');
  },

  // 13. Normalized Price Chart (0% at signal entry, Directional Return Axis)
  renderNormalizedChart(signal) {
    const container = document.getElementById('ld-chart-container');
    if (!container) return;

    const points = [{ label: 'T=0', returnPct: 0.0, price: signal.initialSnapshot.price }];
    CHECKPOINTS.forEach(cp => {
      if (signal.checkpoints[cp.id]?.available) {
        points.push({
          label: cp.id,
          returnPct: signal.checkpoints[cp.id].directionalReturn,
          price: signal.checkpoints[cp.id].price
        });
      }
    });

    const width = container.clientWidth || 500;
    const height = 150;
    const pad = 30;

    const minPct = Math.min(-3.5, ...points.map(p => p.returnPct), signal.extremes.maePct || 0);
    const maxPct = Math.max(4.0, ...points.map(p => p.returnPct), signal.extremes.mfePct || 0);
    const range = (maxPct - minPct) || 1;

    const getX = (i) => pad + (i / Math.max(1, points.length - 1)) * (width - 2 * pad);
    const getY = (pct) => height - pad - ((pct - minPct) / range) * (height - 2 * pad);
    const zeroY = getY(0);
    const invalidationY = getY(-this.settings.invalidationPct);

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.returnPct)}`).join(' ');

    container.innerHTML = `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow:visible;">
        <!-- Zero Baseline -->
        <line x1="${pad}" y1="${zeroY}" x2="${width - pad}" y2="${zeroY}" stroke="#2A3A56" stroke-dasharray="4" />
        <text x="${width - pad + 4}" y="${zeroY + 3}" fill="#64748B" font-size="9" font-family="monospace">0%</text>

        <!-- Invalidation Threshold line -->
        <line x1="${pad}" y1="${invalidationY}" x2="${width - pad}" y2="${invalidationY}" stroke="rgba(255,71,87,0.4)" stroke-dasharray="3" />
        <text x="${width - pad + 4}" y="${invalidationY + 3}" fill="#FF4757" font-size="8" font-family="monospace">-${this.settings.invalidationPct}%</text>

        <!-- Directional Path -->
        <path d="${pathD}" fill="none" stroke="${signal.direction === 'LONG' ? '#00E599' : '#FF4757'}" stroke-width="2.5" />

        <!-- Data Nodes -->
        ${points.map((p, i) => `
          <circle cx="${getX(i)}" cy="${getY(p.returnPct)}" r="4" fill="${p.returnPct >= 0 ? '#00E599' : '#FF4757'}" />
          <text x="${getX(i)}" y="${getY(p.returnPct) - 7}" fill="#F4F7FC" font-size="9" font-family="monospace" text-anchor="middle">
            ${p.returnPct >= 0 ? '+' : ''}${p.returnPct}%
          </text>
          <text x="${getX(i)}" y="${height - 8}" fill="#94A3B8" font-size="9" font-family="monospace" text-anchor="middle">
            ${p.label}
          </text>
        `).join('')}
      </svg>
    `;
  },

  // 14. Strict No Look-Ahead Historical Replay
  // Strictly isolates past states from future checkpoints / MFE / MAE
  setupStrictReplay(signal) {
    if (this.replayTimer) clearInterval(this.replayTimer);

    const steps = [
      {
        stepIndex: 0,
        timestamp: signal.detectedAt,
        timeLabel: 'T+0 (Detection)',
        price: signal.initialSnapshot.price,
        returnPct: 0.0,
        knownCheckpoints: [],
        knownMFE: 0.0,
        knownMAE: 0.0,
        description: `Signal detected at $${signal.initialSnapshot.price}. Future market trajectory is unknown.`
      }
    ];

    // Build chronological replay steps from snapshots & checkpoints
    let runningMFE = 0.0;
    let runningMAE = 0.0;

    CHECKPOINTS.forEach(cp => {
      const cpData = signal.checkpoints[cp.id];
      if (cpData && cpData.available) {
        const ret = cpData.directionalReturn;
        if (ret > runningMFE) runningMFE = ret;
        if (ret < runningMAE) runningMAE = ret;

        steps.push({
          stepIndex: steps.length,
          timestamp: cpData.capturedAt,
          timeLabel: `T+${cp.id}`,
          price: cpData.price,
          returnPct: ret,
          knownCheckpoints: steps[steps.length - 1].knownCheckpoints.concat({ id: cp.id, ret }),
          knownMFE: runningMFE,
          knownMAE: runningMAE,
          description: `Progressed to ${cp.label}. Price reached $${cpData.price} (${ret >= 0 ? '+' : ''}${ret}% directional return).`
        });
      }
    });

    // Add termination step if rejected
    if (signal.rejection) {
      steps.push({
        stepIndex: steps.length,
        timestamp: signal.rejection.rejectionTimestamp,
        timeLabel: 'Resolution (Rejection)',
        price: signal.rejection.rejectionPrice,
        returnPct: signal.rejection.rejectionPercent,
        knownCheckpoints: steps[steps.length - 1].knownCheckpoints,
        knownMFE: runningMFE,
        knownMAE: runningMAE,
        description: `Signal terminated: ${signal.rejection.reason}.`
      });
    }

    this.replayTimeline = steps;
    this.replayStepIndex = 0;
    this.renderStrictReplayStep();
  },

  setReplayStep(idx) {
    if (!this.replayTimeline || this.replayTimeline.length === 0) return;
    this.replayStepIndex = Math.max(0, Math.min(idx, this.replayTimeline.length - 1));
    this.renderStrictReplayStep();
  },

  toggleReplayPlay() {
    if (this.replayTimer) {
      clearInterval(this.replayTimer);
      this.replayTimer = null;
      document.getElementById('btn-replay-play').innerText = '▶ Play';
    } else {
      document.getElementById('btn-replay-play').innerText = '⏸ Pause';
      this.replayTimer = setInterval(() => {
        if (this.replayStepIndex >= this.replayTimeline.length - 1) {
          clearInterval(this.replayTimer);
          this.replayTimer = null;
          document.getElementById('btn-replay-play').innerText = '▶ Play';
        } else {
          this.replayStepIndex++;
          this.renderStrictReplayStep();
        }
      }, 1200);
    }
  },

  renderStrictReplayStep() {
    const step = this.replayTimeline[this.replayStepIndex];
    if (!step) return;

    document.getElementById('replay-step-label').innerText = step.timeLabel;
    document.getElementById('replay-step-price').innerText = '$' + step.price;
    document.getElementById('replay-step-return').innerHTML = `<span style="color:${step.returnPct >= 0 ? 'var(--emerald)' : 'var(--red)'}; font-weight:700;">${step.returnPct >= 0 ? '+' : ''}${step.returnPct}%</span>`;
    document.getElementById('replay-step-desc').innerText = step.description;
    document.getElementById('replay-step-progress').innerText = `Step ${this.replayStepIndex + 1} of ${this.replayTimeline.length}`;

    // Update scrubber slider
    const slider = document.getElementById('replay-scrubber');
    if (slider) {
      slider.max = this.replayTimeline.length - 1;
      slider.value = this.replayStepIndex;
    }
  },

  // 15. Cohort Analytics Grouping & Median Calculations
  renderCohortAnalytics() {
    const tbody = document.getElementById('cohort-tbody');
    if (!tbody) return;

    const cohorts = [
      { label: 'Eagle Score 90–100 (Institutional Conviction)', filter: s => s.initialSnapshot.eagleScore >= 90 },
      { label: 'Eagle Score 80–89 (High Conviction)', filter: s => s.initialSnapshot.eagleScore >= 80 && s.initialSnapshot.eagleScore < 90 },
      { label: 'Eagle Score 72–79 (Candidate Baseline)', filter: s => s.initialSnapshot.eagleScore >= 72 && s.initialSnapshot.eagleScore < 80 },
      { label: 'RVOL ≥ 3.0x (Hyper Volume Spike)', filter: s => s.initialSnapshot.rvol >= 3.0 },
      { label: 'RVOL 2.0x – 2.9x (Strong Expansion)', filter: s => s.initialSnapshot.rvol >= 2.0 && s.initialSnapshot.rvol < 3.0 },
      { label: 'RVOL 1.5x – 1.9x (Moderate Anomaly)', filter: s => s.initialSnapshot.rvol >= 1.5 && s.initialSnapshot.rvol < 2.0 },
      { label: 'Direction: LONG Candidates', filter: s => s.direction === 'LONG' },
      { label: 'Direction: SHORT Candidates', filter: s => s.direction === 'SHORT' }
    ];

    let html = '';
    cohorts.forEach(c => {
      const matches = this.signals.filter(c.filter);
      const n = matches.length;
      if (n === 0) {
        html += `<tr><td>${c.label}</td><td class="tabular">0</td><td class="c-dark">—</td><td class="c-dark">—</td><td class="c-dark">—</td><td class="c-dark">—</td><td class="c-dark">—</td><td class="c-dark">—</td></tr>`;
        return;
      }

      const getStats = (extractor) => {
        const vals = matches.map(extractor).filter(v => v !== null && v !== undefined && !isNaN(v));
        if (vals.length === 0) return { mean: '—', median: '—' };
        const mean = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
        const median = calculateMedian(vals).toFixed(2);
        return { mean: (mean >= 0 ? '+' : '') + mean + '%', median: (median >= 0 ? '+' : '') + median + '%' };
      };

      const stat4h = getStats(s => s.checkpoints['4H']?.directionalReturn);
      const stat8h = getStats(s => s.checkpoints['8H']?.directionalReturn);
      const stat1d = getStats(s => s.checkpoints['1D']?.directionalReturn);
      const statMFE = getStats(s => s.extremes.mfePct);
      const statMAE = getStats(s => s.extremes.maePct);

      const rejected = matches.filter(s => s.rejection?.timeToRejection);
      const avgTTR = rejected.length > 0
        ? this.formatAge(rejected.reduce((a, s) => a + s.rejection.timeToRejection, 0) / rejected.length)
        : '—';

      html += `
        <tr>
          <td style="font-weight:700;">${c.label}</td>
          <td class="tabular font-bold" style="color:var(--cyan);">${n}</td>
          <td class="tabular">${stat4h.mean} <span class="c-dark" style="font-size:10px;">(med ${stat4h.median})</span></td>
          <td class="tabular">${stat8h.mean} <span class="c-dark" style="font-size:10px;">(med ${stat8h.median})</span></td>
          <td class="tabular">${stat1d.mean} <span class="c-dark" style="font-size:10px;">(med ${stat1d.median})</span></td>
          <td class="tabular c-emerald">${statMFE.mean} <span class="c-dark" style="font-size:10px;">(med ${statMFE.median})</span></td>
          <td class="tabular c-red">${statMAE.mean} <span class="c-dark" style="font-size:10px;">(med ${statMAE.median})</span></td>
          <td class="tabular">${avgTTR}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  },

  // 16. Export Capabilities
  exportJournalCSV() {
    if (this.signals.length === 0) {
      alert('No signals to export.');
      return;
    }
    const headers = [
      'Signal ID', 'Symbol', 'Side', 'Signal', 'Score', 'Detected Local', 'Detected UTC',
      'Entry Price', 'Current Price', 'Current %', '15M %', '30M %', '1H %', '2H %',
      '4H %', '8H %', '12H %', '1D %', '2D %', '3D %', '7D %',
      'MFE %', 'MFE Price', 'MAE %', 'MAE Price', 'Status', 'Rejection Reason', 'Time To Rejection'
    ];

    const rows = this.signals.map(s => [
      s.signalId, s.symbol, s.direction, s.signalType, s.initialSnapshot.eagleScore,
      s.detectedAtLocal, s.detectedAtUTC, s.initialSnapshot.price,
      s.currentState?.price || s.initialSnapshot.price,
      s.currentState?.directionalReturn || 0,
      s.checkpoints['15M']?.directionalReturn ?? 'PENDING',
      s.checkpoints['30M']?.directionalReturn ?? 'PENDING',
      s.checkpoints['1H']?.directionalReturn ?? 'PENDING',
      s.checkpoints['2H']?.directionalReturn ?? 'PENDING',
      s.checkpoints['4H']?.directionalReturn ?? 'PENDING',
      s.checkpoints['8H']?.directionalReturn ?? 'PENDING',
      s.checkpoints['12H']?.directionalReturn ?? 'PENDING',
      s.checkpoints['1D']?.directionalReturn ?? 'PENDING',
      s.checkpoints['2D']?.directionalReturn ?? 'PENDING',
      s.checkpoints['3D']?.directionalReturn ?? 'PENDING',
      s.checkpoints['7D']?.directionalReturn ?? 'PENDING',
      s.extremes.mfePct ?? '—', s.extremes.mfePrice ?? '—',
      s.extremes.maePct ?? '—', s.extremes.maePrice ?? '—',
      s.status, s.rejection?.reason ?? '—',
      s.rejection?.timeToRejection ? this.formatAge(s.rejection.timeToRejection) : '—'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `eagle_flash_signal_journal_${Date.now()}.csv`;
    a.click();
  },

  exportTimelineCSV() {
    if (this.signals.length === 0) {
      alert('No events to export.');
      return;
    }
    const headers = ['Signal ID', 'Symbol', 'Timestamp UTC', 'Event Type', 'Title', 'Description', 'Price'];
    const rows = [];
    this.signals.forEach(s => {
      s.timeline.forEach(ev => {
        rows.push([
          s.signalId, s.symbol, new Date(ev.timestamp).toISOString(),
          ev.eventType, ev.title || '', ev.description || '', ev.price || ''
        ]);
      });
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `eagle_flash_events_timeline_${Date.now()}.csv`;
    a.click();
  },

  exportSignalsJSON() {
    const payload = {
      version: LifecycleConfig.SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      signalsCount: this.signals.length,
      signals: this.signals
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `eagle_flash_lifecycle_dataset_${Date.now()}.json`;
    a.click();
  },

  exportSelectedSignalJSON() {
    if (!this.selectedSignalId) return;
    const s = this.signals.find(x => x.signalId === this.selectedSignalId);
    if (!s) return;
    const jsonStr = JSON.stringify(s, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${s.signalId}.json`;
    a.click();
  },

  // 17. Import & Validation (MERGE / SKIP DUPLICATES / REPLACE)
  importSignalsJSON(jsonText, mode = 'MERGE') {
    try {
      const parsed = JSON.parse(jsonText);
      const incomingList = Array.isArray(parsed) ? parsed : (parsed.signals || []);
      if (!Array.isArray(incomingList) || incomingList.length === 0) {
        throw new Error('No valid signal records found in JSON.');
      }

      let validCount = 0;
      const validatedSignals = [];

      for (const item of incomingList) {
        if (!item.signalId || !item.symbol || !item.initialSnapshot || !item.detectedAt) {
          continue;
        }
        validatedSignals.push(item);
        validCount++;
      }

      if (validCount === 0) {
        throw new Error('All signal records failed schema validation.');
      }

      if (mode === 'REPLACE') {
        this.signals = validatedSignals;
      } else if (mode === 'SKIP_DUPLICATES') {
        const existingIds = new Set(this.signals.map(s => s.signalId));
        validatedSignals.forEach(s => {
          if (!existingIds.has(s.signalId)) {
            this.signals.push(s);
          }
        });
      } else { // MERGE
        const map = new Map(this.signals.map(s => [s.signalId, s]));
        validatedSignals.forEach(s => {
          map.set(s.signalId, s);
        });
        this.signals = Array.from(map.values());
      }

      this.persistSignal(this.signals[0]);
      this.updateActiveCountBadge();
      this.renderJournalTab();
      return { success: true, count: validCount };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  clearAllSignals() {
    if (confirm('🚨 Are you sure you want to permanently clear all signal lifecycle history records? This cannot be undone.')) {
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
