/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — 30-MINUTE SIGNAL DEDUPLICATION & COOLDOWN ENGINE
 * Enforces a strict 30-minute cooldown on (SYMBOL + DIRECTION).
 * Prevents identical setups or repeated signals from spamming channels.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';

const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes in milliseconds
const DATA_DIR = path.resolve(process.cwd(), 'data');

export function isTestExecution() {
  return (
    process.env.NODE_ENV === 'test' ||
    Boolean(process.env.TEST_MODE) ||
    Boolean(process.env.VITEST) ||
    process.argv.some(a => a.includes('test') || a.includes('tsx'))
  );
}

export function getDedupStorePath() {
  const fileName = isTestExecution() ? 'test_dispatched_signatures.json' : 'dispatched_signatures.json';
  return path.join(DATA_DIR, fileName);
}

// In-memory signature store: signature -> lastDispatchedTimestamp
const dispatchedSignatures = new Map();

// Load persistent signatures on startup
function loadPersistedSignatures() {
  try {
    const storePath = getDedupStorePath();
    if (fs.existsSync(storePath)) {
      const raw = fs.readFileSync(storePath, 'utf-8');
      const data = JSON.parse(raw);
      const now = Date.now();
      for (const [sig, ts] of Object.entries(data)) {
        if (now - ts < COOLDOWN_MS) {
          dispatchedSignatures.set(sig, ts);
        }
      }
    }
  } catch (e) {}
}

function savePersistedSignatures() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const obj = {};
    const now = Date.now();
    for (const [sig, ts] of dispatchedSignatures.entries()) {
      if (now - ts < COOLDOWN_MS) {
        obj[sig] = ts;
      }
    }
    fs.writeFileSync(getDedupStorePath(), JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {}
}

export function clearAllSignatures() {
  dispatchedSignatures.clear();
}

loadPersistedSignatures();

/**
 * Builds canonical signature for deduplication
 * @param {string} symbol - e.g. "BTCUSDT"
 * @param {string} direction - "LONG" | "SHORT"
 * @returns {string}
 */
export function buildSignalSignature(symbol, direction = 'LONG', type = '') {
  const normSym = (symbol || '').toUpperCase().replace(/[-_]/g, '');
  const cleanSym = normSym.includes(':') ? normSym.split(':')[1] : normSym;
  const normDir = (direction || 'LONG').toUpperCase();
  const normType = (type || '').toUpperCase().trim();
  return normType ? `${cleanSym}:${normDir}:${normType}` : `${cleanSym}:${normDir}`;
}

/**
 * Checks if a symbol + direction (and optional type) is currently in a 30-minute cooldown
 * @param {string} symbol
 * @param {string} direction
 * @param {number} [customCooldownMs]
 * @param {string} [type]
 * @returns {boolean}
 */
export function isSignatureInCooldown(symbol, direction = 'LONG', customCooldownMs = COOLDOWN_MS, type = '') {
  const sig = buildSignalSignature(symbol, direction, type);
  const lastTs = dispatchedSignatures.get(sig);
  if (!lastTs) return false;

  const elapsed = Date.now() - lastTs;
  return elapsed < customCooldownMs;
}

/**
 * Returns remaining cooldown in milliseconds (or 0 if not active)
 */
export function getRemainingCooldownMs(symbol, direction = 'LONG', customCooldownMs = COOLDOWN_MS, type = '') {
  const sig = buildSignalSignature(symbol, direction, type);
  const lastTs = dispatchedSignatures.get(sig);
  if (!lastTs) return 0;

  const remaining = customCooldownMs - (Date.now() - lastTs);
  return Math.max(0, remaining);
}

/**
 * Records a successful signal dispatch and locks the signature for 30 minutes
 */
export function recordSignatureDispatch(symbol, direction = 'LONG', type = '') {
  const sig = buildSignalSignature(symbol, direction, type);
  const now = Date.now();
  dispatchedSignatures.set(sig, now);
  if (type) {
    const baseSig = buildSignalSignature(symbol, direction);
    dispatchedSignatures.set(baseSig, now);
  }
  savePersistedSignatures();
  return { signature: sig, lockedUntil: now + COOLDOWN_MS };
}

/**
 * Removes expired cooldown entries
 */
export function clearExpiredSignatures() {
  const now = Date.now();
  let modified = false;
  for (const [sig, ts] of dispatchedSignatures.entries()) {
    if (now - ts >= COOLDOWN_MS) {
      dispatchedSignatures.delete(sig);
      modified = true;
    }
  }
  if (modified) {
    savePersistedSignatures();
  }
}
