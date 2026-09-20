import fs from 'fs';
import path from 'path';
import vm from 'vm';

console.log('🦅 Applying Terminal Upgrades to eagle-flash.html...');

const htmlPath = path.join(process.cwd(), 'apps', 'web', 'public', 'eagle-flash.html');
const patchPath = path.join(process.cwd(), 'scripts', 'terminal_upgrade_patch.js');

let html = fs.readFileSync(htmlPath, 'utf-8');
const patchCode = fs.readFileSync(patchPath, 'utf-8');

// Extract specific functions from patchCode
function extractFunction(name) {
  const match = patchCode.match(new RegExp(`((?:async\\s+)?function\\s+${name}\\s*\\([\\s\\S]*?\\n\\})(?:\\n\\s*(?:function|async function)|\\s*$)`, 'i'));
  if (!match) {
    throw new Error(`Could not extract function ${name}`);
  }
  return match[1];
}

const sparklineFn = extractFunction('generateSparklineSvg');
const phaseBadgeFn = extractFunction('getSpikePhaseBadge');
const typeBadgeFn = extractFunction('getSpikeTypeBadge');
const qualityBadgeFn = extractFunction('getSpikeQualityBadge');
const scoreBreakdownFn = extractFunction('showScoreBreakdown');
const recalcFn = extractFunction('recalculateAllScores');
const renderTableFn = extractFunction('renderScannerTable');
const openDetailFn = extractFunction('openSymbolDetail');
const renderKPIsFn = extractFunction('renderKPIs');

const helperBlock = [
  '    // ═════════════════════════════════════════════════════════════════════════',
  '    // SPIKE INTELLIGENCE UI HELPERS',
  '    // ═════════════════════════════════════════════════════════════════════════',
  sparklineFn,
  phaseBadgeFn,
  typeBadgeFn,
  qualityBadgeFn,
  scoreBreakdownFn
].join('\n\n');

// 1. Inject helperBlock before recalculateAllScores if not present
if (!html.includes('function generateSparklineSvg')) {
  html = html.replace('function recalculateAllScores()', () => helperBlock + '\n\n    function recalculateAllScores()');
  console.log('✅ Injected helper functions (Sparklines, Badges, Score Decomposition).');
}

// 2. Replace recalculateAllScores
const oldRecalcMatch = html.match(/function recalculateAllScores\(\)[\s\S]*?\n    \}/i);
if (oldRecalcMatch) {
  html = html.replace(oldRecalcMatch[0], () => recalcFn);
  console.log('✅ Replaced recalculateAllScores with 8-factor Explainable Engine.');
}

// 3. Replace renderScannerTable
const oldRenderTableMatch = html.match(/function renderScannerTable\(\)[\s\S]*?\n    \}/i);
if (oldRenderTableMatch) {
  html = html.replace(oldRenderTableMatch[0], () => renderTableFn);
  console.log('✅ Replaced renderScannerTable with primary visible columns & sparklines.');
}

// 4. Replace openSymbolDetail
const oldOpenDetailMatch = html.match(/async function openSymbolDetail\(sym\)[\s\S]*?\n    \}/i);
if (oldOpenDetailMatch) {
  html = html.replace(oldOpenDetailMatch[0], () => openDetailFn);
  console.log('✅ Replaced openSymbolDetail with full Section 30 intelligence sections.');
}

// 5. Replace renderKPIs
const oldRenderKPIsMatch = html.match(/function renderKPIs\(\)[\s\S]*?\n    \}/i);
if (oldRenderKPIsMatch) {
  html = html.replace(oldRenderKPIsMatch[0], () => renderKPIsFn);
  console.log('✅ Replaced renderKPIs with BTC regime pill and freshness telemetry.');
}

// 6. Test syntax of entire script block
const scriptMatch = html.match(/<!-- APPLICATION JAVASCRIPT LOGIC -->\s*<script>([\s\S]*?)<\/script>\s*<\/body>/i);
if (!scriptMatch) {
  console.error('❌ Could not locate script tag!');
  process.exit(1);
}

try {
  new vm.Script(scriptMatch[1]);
  console.log('✅ All JavaScript in eagle-flash.html successfully verified: 0 syntax errors.');
} catch (err) {
  console.error('❌ JavaScript syntax error:', err.message);
  if (err.stack) {
    console.error(err.stack.split('\n').slice(0, 5).join('\n'));
  }
  // Find where syntax fails
  const lines = scriptMatch[1].split('\n');
  for (let i = 1; i <= lines.length; i++) {
    const chunk = lines.slice(0, i).join('\n');
    try {
      new vm.Script(chunk);
    } catch (e) {
      if (e.message !== 'Unexpected end of input') {
        console.error(`Error starts at line ${i}: ${lines[i - 1]}`);
        for (let k = Math.max(0, i - 5); k < Math.min(lines.length, i + 5); k++) {
          console.error(`${k + 1}: ${lines[k]}`);
        }
        break;
      }
    }
  }
  process.exit(1);
}

fs.writeFileSync(htmlPath, html, 'utf-8');
console.log('💾 Successfully saved apps/web/public/eagle-flash.html!');
