import test from 'node:test';
import assert from 'node:assert';
import {
  TOKENS,
  formatPrice,
  formatPct,
  formatMoney,
  formatCandleAge,
} from '../apps/web/components/ui/tokens';
import { GLOSSARY } from '../apps/web/components/ui/InfoTip';
import * as UI from '../apps/web/components/ui/index';

test('Phase 5 — UI Foundation & Design System Suite', async (t) => {
  await t.test('1. Formatting utilities format prices and figures without layout shift', () => {
    // Tick size 0.1 -> 1 decimal
    assert.strictEqual(formatPrice(80123.456, 0.1), '80,123.5');
    // Tick size 0.01 -> 2 decimals
    assert.strictEqual(formatPrice(150.25, 0.01), '150.25');
    // Tick size 0.0001 -> 4 decimals
    assert.strictEqual(formatPrice(0.01234, 0.0001), '0.0123');
    // Missing value -> honest em-dash
    assert.strictEqual(formatPrice(null), '—');
    assert.strictEqual(formatPrice(undefined), '—');
  });

  await t.test('2. Percentages format with explicit signs and tabular precision', () => {
    assert.strictEqual(formatPct(2.5), '+2.50%');
    assert.strictEqual(formatPct(-1.42), '-1.42%');
    assert.strictEqual(formatPct(0), '0.00%');
    assert.strictEqual(formatPct(null), '—%');
  });

  await t.test('3. Money compact formatting matches institutional thresholds', () => {
    assert.strictEqual(formatMoney(1_500_000), '$1.50M');
    assert.strictEqual(formatMoney(250_000), '$250.0K');
    assert.strictEqual(formatMoney(10_000), '$10.0K');
    assert.strictEqual(formatMoney(10_000, false), '$10,000.00');
    assert.strictEqual(formatMoney(null), '—');
  });

  await t.test('4. Candle age formatting distinguishes NOW from historical flips', () => {
    assert.strictEqual(formatCandleAge(0), 'NOW');
    assert.strictEqual(formatCandleAge(1), '1c');
    assert.strictEqual(formatCandleAge(3), '3c');
    assert.strictEqual(formatCandleAge(null), '—');
  });

  await t.test('5. Accessibility & Contrast Budget: Core tokens provide high contrast on dark surfaces', () => {
    // Colors must be distinct and non-null
    assert.ok(TOKENS.semantic.up.startsWith('#'));
    assert.ok(TOKENS.semantic.down.startsWith('#'));
    assert.ok(TOKENS.semantic.warn.startsWith('#'));
    assert.ok(TOKENS.semantic.info.startsWith('#'));
    assert.ok(TOKENS.semantic.brand.startsWith('#'));

    // High contrast green and crimson red
    assert.strictEqual(TOKENS.semantic.up, '#1FD18A');
    assert.strictEqual(TOKENS.semantic.down, '#F2495C');
    assert.strictEqual(TOKENS.bg[0], '#0A0D12');
    assert.strictEqual(TOKENS.bg[1], '#11151C');
  });

  await t.test('6. Glossary entries cover all 5 required technical metrics', () => {
    assert.ok(GLOSSARY.RVOL, 'RVOL definition must exist');
    assert.ok(GLOSSARY.ADX, 'ADX definition must exist');
    assert.ok(GLOSSARY.QQE, 'QQE definition must exist');
    assert.ok(GLOSSARY.OI, 'OI definition must exist');
    assert.ok(GLOSSARY.RMULTIPLE, 'RMULTIPLE definition must exist');

    assert.ok(GLOSSARY.QQE.explanation.includes('RSI'));
    assert.ok(GLOSSARY.ADX.explanation.includes('20'));
    assert.ok(GLOSSARY.RVOL.explanation.includes('1.5x'));
  });

  await t.test('7. Component barrel export surfaces all 14 design system components', () => {
    assert.ok(typeof UI.SidePill === 'function');
    assert.ok(typeof UI.ScoreRing === 'function');
    assert.ok(typeof UI.VoteDots === 'function');
    assert.ok(typeof UI.AgeChip === 'function');
    assert.ok(typeof UI.PriceCell === 'function');
    assert.ok(typeof UI.ChangeBadge === 'function');
    assert.ok(typeof UI.StatTile === 'function');
    assert.ok(typeof UI.SegmentedControl === 'function');
    assert.ok(typeof UI.BottomSheet === 'function');
    assert.ok(typeof UI.ConfirmDialog === 'function');
    assert.ok(typeof UI.InfoTip === 'function');
    assert.ok(typeof UI.PanelBoundary === 'function');
    assert.ok(typeof UI.StaleBadge === 'function');
    assert.ok(typeof UI.Skeleton === 'function');
    assert.ok(typeof UI.PaperMarkerChip === 'function');
  });
});
