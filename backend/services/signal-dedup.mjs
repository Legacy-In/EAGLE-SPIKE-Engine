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
const DEDUP_STORE_PATH = path.join(DATA_DIR, 'dispatched_signatures.json');

// In-memory signature store: signature -> lastDispatchedTimestamp
const dispatchedSignatures = new Map();

// Load persistent signatures on startup
function loadPersistedSignatures() {
  try {
    if (fs.existsSync(DEDUP_STORE_PATH)) {
      const raw = fs.readFileSync(DEDUP_STORE_PATH, 'utf-8');
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
    fs.writeFileSync(DEDUP_STORE_PATH, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {}
}

loadPersistedSignatures();

/**
 * Builds canonical signature for deduplication
 * @param {string} symbol - e.g. "BTCUSDT"
 * @param {string} direction - "LONG" | "SHORT"
 * @returns {string}
 */
export function buildSignalSignature(symbol, direction = 'LONG') {
  const normSym = (symbol || '').toUpperCase().replace(/[-_]/g, '');
  const cleanSym = normSym.includes(':') ? normSym.split(':')[1] : normSym;
  const normDir = (direction || 'LONG').toUpperCase();
  return `${cleanSym}:${normDir}`;
}

/**
 * Checks if a symbol + direction is currently in a 30-minute cooldown
 * @param {string} symbol
 * @param {string} direction
 * @param {number} [customCooldownMs]
 * @returns {boolean}
 */
export function isSignatureInCooldown(symbol, direction = 'LONG', customCooldownMs = COOLDOWN_MS) {
  const sig = buildSignalSignature(symbol, direction);
  const lastTs = dispatchedSignatures.get(sig);
  if (!lastTs) return false;

  const elapsed = Date.now() - lastTs;
  return elapsed < customCooldownMs;
}

/**
 * Returns remaining cooldown in milliseconds (or 0 if not active)
 */
export function getRemainingCooldownMs(symbol, direction = 'LONG', customCooldownMs = COOLDOWN_MS) {
  const sig = buildSignalSignature(symbol, direction);
  const lastTs = dispatchedSignatures.get(sig);
  if (!lastTs) return 0;

  const remaining = customCooldownMs - (Date.now() - lastTs);
  return Math.max(0, remaining);
}

/**
 * Records a successful signal dispatch and locks the signature for 30 minutes
 */
export function recordSignatureDispatch(symbol, direction = 'LONG') {
  const sig = buildSignalSignature(symbol, direction);
  const now = Date.now();
  dispatchedSignatures.set(sig, now);
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
