import fs from 'fs';
import path from 'path';

const file = path.join('apps', 'web', 'public', 'eagle-flash.html');
let content = fs.readFileSync(file, 'utf8');

// 1. Add Telegram Button & Status Pill to SIGNALS header
const headerTarget = '<span class="c-dark" style="font-size:10px;" id="sig-kpi-updated">UPDATED: JUST NOW</span>';
const headerAddition = `<span class="c-dark" style="font-size:10px;" id="sig-kpi-updated">UPDATED: JUST NOW</span>
          <button class="btn-sm" id="btn-tg-forward" onclick="LifecycleEngine.forwardCurrentSignalsToTelegram()" title="Push current high-confidence signals to configured Telegram channel" style="background:rgba(0,136,204,0.18); border:1px solid #0088cc; color:#00b4d8; cursor:pointer; font-weight:700; display:inline-flex; align-items:center; gap:5px; padding:2px 8px; border-radius:4px; font-size:10px; font-family:var(--font-mono);">
            <span>⚡</span><span>FORWARD TO TELEGRAM</span>
          </button>
          <span id="tg-channel-status" class="badge-status" style="border-color:#0088cc; color:#00b4d8; font-size:10px;">TG: @eaglespike_bot</span>`;

if (content.includes(headerTarget) && !content.includes('btn-tg-forward')) {
  content = content.replace(headerTarget, headerAddition);
  console.log('✅ Added Telegram header button & status pill');
} else {
  console.log('ℹ️ Header target already patched or not found');
}

// 2. Update LifecycleEngine init()
const initTarget = `  async init() {
    await this.initStorage();
    await this.loadSettings();
    await this.loadSignals();
    this.cleanExpiredRetention();
    this.updateActiveCountBadge();
  },`;

const initReplacement = `  async init() {
    await this.initStorage();
    await this.loadSettings();
    await this.loadSignals();
    this.cleanExpiredRetention();
    this.updateActiveCountBadge();
    this.syncStoredSignalsToBackend();
    this.checkTelegramStatus();
  },`;

if (content.includes(initTarget)) {
  content = content.replace(initTarget, initReplacement);
  console.log('✅ Injected syncStoredSignalsToBackend & checkTelegramStatus into LifecycleEngine.init()');
} else {
  console.log('ℹ️ Init target already updated or not matched');
}

// 3. Update recordSignal to invoke forwardSignalToBackend
const recordTarget = `    this.persistSignal(record);
    this.updateActiveCountBadge();
    return record;`;

const recordReplacement = `    this.persistSignal(record);
    this.updateActiveCountBadge();
    this.forwardSignalToBackend(record);
    return record;`;

if (content.includes(recordTarget)) {
  content = content.replace(recordTarget, recordReplacement);
  console.log('✅ Injected forwardSignalToBackend into LifecycleEngine.recordSignal()');
} else {
  console.log('ℹ️ Record signal target already updated or not matched');
}

// 4. Inject Telegram Helper Methods onto LifecycleEngine
const helperMethods = `
  // 5.1 Telegram & Backend Auto-Forwarding Bridge
  forwardSignalToBackend(record, forceAlert = false) {
    if (!record || !record.symbol) return;
    if (!this._forwardedSignalIds) this._forwardedSignalIds = new Set();
    if (this._forwardedSignalIds.has(record.signalId) && !forceAlert) return;
    this._forwardedSignalIds.add(record.signalId);

    const payload = {
      signalId: record.signalId,
      symbol: record.symbol,
      price: record.signalPrice,
      exchange: record.initialSnapshot?.scannerState?.includes('BYBIT') ? 'BYBIT' : (record.exchange || 'BYBIT'),
      eagleScore: record.initialSnapshot?.eagleScore || 70,
      rvol: record.initialSnapshot?.rvol || 1.0,
      volumeZ: record.initialSnapshot?.volumeZScore || 0,
      returns5m: record.currentState?.percentChange || record.initialSnapshot?.price24hChange || 0,
      returns15m: record.initialSnapshot?.price24hChange || 0,
      returns1h: record.initialSnapshot?.price24hChange || 0,
      openInterestUsd: record.initialSnapshot?.openInterest || 0,
      oiChangePct: record.initialSnapshot?.openInterestChangePct || 0,
      takerFlow: record.initialSnapshot?.takerFlow || 0,
      spikePhase: record.signalType?.includes('LONG') ? 'ACCELERATION' : 'BREAKDOWN',
      spikeType: 'MOMENTUM',
      spikeQuality: (record.initialSnapshot?.eagleScore || 70) >= 80 ? 'HIGH' : 'MEDIUM',
      detectedAt: record.detectedAt,
      triggerReasons: [
        \`Eagle Score: \${record.initialSnapshot?.eagleScore || 70}/100\`,
        \`Signal: \${record.signalType}\`,
        \`Price: $\${record.signalPrice}\`,
        \`RVOL: \${(record.initialSnapshot?.rvol || 1.0).toFixed(1)}x\`
      ],
      forceAlert: forceAlert
    };

    try {
      fetch('/api/spikes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(err => console.debug('Signal forward silent catch:', err?.message));
    } catch (e) {}
  },

  syncStoredSignalsToBackend() {
    if (!this.signals || this.signals.length === 0) return;
    try {
      const batch = this.signals.slice(0, 30).map(s => ({
        signalId: s.signalId,
        symbol: s.symbol,
        price: s.signalPrice,
        exchange: s.initialSnapshot?.scannerState?.includes('BYBIT') ? 'BYBIT' : (s.exchange || 'BYBIT'),
        eagleScore: s.initialSnapshot?.eagleScore || 70,
        rvol: s.initialSnapshot?.rvol || 1.0,
        volumeZ: s.initialSnapshot?.volumeZScore || 0,
        returns5m: s.currentState?.percentChange || s.initialSnapshot?.price24hChange || 0,
        returns15m: s.initialSnapshot?.price24hChange || 0,
        returns1h: s.initialSnapshot?.price24hChange || 0,
        openInterestUsd: s.initialSnapshot?.openInterest || 0,
        oiChangePct: s.initialSnapshot?.openInterestChangePct || 0,
        takerFlow: s.initialSnapshot?.takerFlow || 0,
        spikePhase: s.signalType?.includes('LONG') ? 'ACCELERATION' : 'BREAKDOWN',
        spikeType: 'MOMENTUM',
        spikeQuality: (s.initialSnapshot?.eagleScore || 70) >= 80 ? 'HIGH' : 'MEDIUM',
        detectedAt: s.detectedAt,
        triggerReasons: [
          \`Eagle Score: \${s.initialSnapshot?.eagleScore || 70}/100\`,
          \`Signal: \${s.signalType}\`,
          \`Price: $\${s.signalPrice}\`
        ]
      }));

      fetch('/api/spikes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signals: batch, forceAlert: false })
      }).catch(err => console.debug('Initial batch sync silent catch:', err?.message));
    } catch (e) {}
  },

  async forwardCurrentSignalsToTelegram() {
    const active = this.signals.filter(s => ['ACTIVE', 'CONFIRMED'].includes(s.status) || (s.initialSnapshot?.eagleScore || 0) >= 65);
    const targetList = active.length > 0 ? active : this.signals.slice(0, 5);

    if (targetList.length === 0) {
      alert('⚠️ No signals in current session to forward. Wait for the scanner to detect volume anomalies.');
      return;
    }

    const btn = document.getElementById('btn-tg-forward');
    if (btn) btn.innerHTML = '<span>⏳</span><span>FORWARDING...</span>';

    try {
      const batch = targetList.map(s => ({
        signalId: s.signalId,
        symbol: s.symbol,
        price: s.signalPrice,
        exchange: s.initialSnapshot?.scannerState?.includes('BYBIT') ? 'BYBIT' : (s.exchange || 'BYBIT'),
        eagleScore: s.initialSnapshot?.eagleScore || 70,
        rvol: s.initialSnapshot?.rvol || 1.0,
        volumeZ: s.initialSnapshot?.volumeZScore || 0,
        returns5m: s.currentState?.percentChange || s.initialSnapshot?.price24hChange || 0,
        returns15m: s.initialSnapshot?.price24hChange || 0,
        returns1h: s.initialSnapshot?.price24hChange || 0,
        openInterestUsd: s.initialSnapshot?.openInterest || 0,
        oiChangePct: s.initialSnapshot?.openInterestChangePct || 0,
        takerFlow: s.initialSnapshot?.takerFlow || 0,
        spikePhase: s.signalType?.includes('LONG') ? 'ACCELERATION' : 'BREAKDOWN',
        spikeType: 'MOMENTUM',
        spikeQuality: (s.initialSnapshot?.eagleScore || 70) >= 80 ? 'HIGH' : 'MEDIUM',
        detectedAt: s.detectedAt,
        triggerReasons: [
          \`Eagle Score: \${s.initialSnapshot?.eagleScore || 70}/100\`,
          \`Signal: \${s.signalType}\`,
          \`Price: $\${s.signalPrice}\`
        ]
      }));

      const res = await fetch('/api/spikes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signals: batch, forceAlert: true })
      });

      const json = await res.json();
      if (json.success) {
        alert(\`🦅 Successfully dispatched \${batch.length} signals to your configured Telegram channel!\`);
      } else {
        alert(\`⚠️ Could not dispatch to Telegram channel: \${json.error || 'Check TELEGRAM_CHAT_ID in .env'}\`);
      }
    } catch (err) {
      alert(\`❌ Telegram forward failed: \${err.message}\`);
    } finally {
      if (btn) btn.innerHTML = '<span>⚡</span><span>FORWARD TO TELEGRAM</span>';
    }
  },

  async checkTelegramStatus() {
    try {
      const res = await fetch('/api/telegram/status');
      const json = await res.json();
      const el = document.getElementById('tg-channel-status');
      if (!el) return;
      if (json.connected && json.channelConfigured) {
        el.className = 'badge-status status-live';
        el.style.borderColor = 'var(--emerald)';
        el.style.color = 'var(--emerald)';
        el.textContent = \`TG: CONNECTED (\${json.configuredTargets?.[0] || 'CHANNEL'})\`;
      } else if (json.connected) {
        el.className = 'badge-status';
        el.style.borderColor = 'var(--amber)';
        el.style.color = 'var(--amber)';
        el.textContent = 'TG: CHANNEL PENDING';
        el.title = 'Set TELEGRAM_CHAT_ID in .env and add @eaglespike_bot as an Admin in your channel';
      }
    } catch (e) {}
  },
`;

const anchor = '  // 5. Directional Return Calculation';
if (content.includes(anchor) && !content.includes('forwardSignalToBackend(record, forceAlert')) {
  content = content.replace(anchor, helperMethods + '\n' + anchor);
  console.log('✅ Injected Telegram helper methods into LifecycleEngine in eagle-flash.html');
} else {
  console.log('ℹ️ Helper methods already injected or anchor not found');
}

fs.writeFileSync(file, content, 'utf8');
console.log('Saved updated eagle-flash.html.');
