// ================================================================
// Eagle Flash — Design System Tokens & Trading Numeric Utilities
// ================================================================

export const TOKENS = {
  bg: {
    0: '#0A0D12',
    1: '#11151C',
    2: '#181D26',
  },
  line: '#232A35',
  text: {
    1: '#E8ECF2', // Primary
    2: '#9AA6B5', // Secondary (≈7:1 contrast on bg-1)
    3: '#6B7686', // Muted/Disabled (≈4:1 contrast)
  },
  semantic: {
    up: '#1FD18A',     // Green (≈9:1 contrast)
    down: '#F2495C',   // Red (≈5:1 contrast)
    warn: '#F5A524',   // Amber caution
    info: '#38BDF8',   // Blue information
    brand: '#F5A524',  // Brand Gold
    paperFill: 'rgba(245, 165, 36, 0.15)',
    paperBorder: '#F5A524',
  },
};

/**
 * Formats price according to instrument tickSize without trailing layout jump
 */
export function formatPrice(price: number | null | undefined, tickSize = 0.01): string {
  if (price === null || price === undefined || isNaN(price)) return '—';
  const decimals = Math.max(0, Math.min(8, Math.round(-Math.log10(tickSize))));
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formats signed percentage with explicit symbol (+ / -)
 */
export function formatPct(val: number | null | undefined, digits = 2): string {
  if (val === null || val === undefined || isNaN(val)) return '—%';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(digits)}%`;
}

/**
 * Formats USD volume or equity concisely ($1.4M, $240.5K, $10,000)
 */
export function formatMoney(val: number | null | undefined, compact = true): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  if (!compact) {
    return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (Math.abs(val) >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
}

/**
 * Returns human-readable relative time ("12m ago", "1h ago", "just now")
 */
export function formatRelativeTime(timestamp: string | number | null | undefined): string {
  if (!timestamp) return '—';
  const ms = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  if (isNaN(ms)) return '—';
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 45) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

/**
 * Formats candle ages ("NOW", "1c", "3c ago")
 */
export function formatCandleAge(candles: number | null | undefined): string {
  if (candles === null || candles === undefined) return '—';
  if (candles === 0) return 'NOW';
  return `${candles}c`;
}
