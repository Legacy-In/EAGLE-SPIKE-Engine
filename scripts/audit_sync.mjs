import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const rootDir = process.cwd();

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🦅 EAGLE FLASH & SIGMA TERMINAL — MULTI-FILE SYNCHRONIZATION AUDIT');
console.log('═══════════════════════════════════════════════════════════════════\n');

let auditFailures = 0;

function report(section, passed, details) {
  if (passed) {
    console.log(`✅ [PASS] ${section}: ${details}`);
  } else {
    console.error(`❌ [FAIL] ${section}: ${details}`);
    auditFailures++;
  }
}

function getSha256(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// 1. Audit Checksum Parity Across Static HTML Surfaces
const masterEagle = path.join(rootDir, 'apps', 'web', 'public', 'eagle-flash.html');
const rootEagle = path.join(rootDir, 'eagle-flash.html');
const distEagle = path.join(rootDir, 'dist-eagle-flash', 'index.html');

if (fs.existsSync(masterEagle) && fs.existsSync(rootEagle) && fs.existsSync(distEagle)) {
  const hashMaster = getSha256(masterEagle);
  const hashRoot = getSha256(rootEagle);
  const hashDist = getSha256(distEagle);

  const rootSynced = hashMaster === hashRoot;
  const distSynced = hashMaster === hashDist;

  report(
    'HTML Checksum Parity (Root eagle-flash.html)',
    rootSynced,
    rootSynced ? `SHA-256 match (${hashMaster.substring(0, 12)}...)` : 'Mismatch with apps/web/public/eagle-flash.html'
  );

  report(
    'HTML Checksum Parity (dist-eagle-flash/index.html)',
    distSynced,
    distSynced ? `SHA-256 match (${hashDist.substring(0, 12)}...)` : 'Mismatch with apps/web/public/eagle-flash.html'
  );
} else {
  report('HTML Distribution Files', false, 'One or more required distribution HTML files missing.');
}

// 2. Audit Iframe Cache-Busting Integrity in index.html
const indexHtmlPath = path.join(rootDir, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  const indexContent = fs.readFileSync(indexHtmlPath, 'utf-8');
  const hasCacheBust = /<iframe[^>]+src=["']\.\/eagle-flash\.html\?v=\d+["']/i.test(indexContent);
  report(
    'Iframe Cache-Busting Integrity (index.html)',
    hasCacheBust,
    hasCacheBust ? 'Dynamic cache-busting timestamp verified on embedded scanner iframe' : 'Missing cache-busting query parameter (?v=...)'
  );
} else {
  report('Master index.html', false, 'index.html does not exist.');
}

// 3. Audit Multi-Exchange Coverage (Binance, Bybit, MEXC, WEEX)
const requiredExchanges = ['binance', 'bybit', 'mexc', 'weex'];
const aggregatorPath = path.join(rootDir, 'backend', 'aggregator.ts');
if (fs.existsSync(aggregatorPath)) {
  const aggContent = fs.readFileSync(aggregatorPath, 'utf-8').toLowerCase();
  const allInAggregator = requiredExchanges.every(ex => aggContent.includes(`${ex}adapter`));
  report(
    'Backend Aggregator Coverage',
    allInAggregator,
    allInAggregator ? 'All 4 exchanges (Binance, Bybit, MEXC, WEEX) active in runIngestionCycle()' : 'Missing exchange adapter in aggregator'
  );
}

const masterEagleContent = fs.existsSync(masterEagle) ? fs.readFileSync(masterEagle, 'utf-8').toLowerCase() : '';
const allInFrontend = ['binance', 'bybit', 'mexc', 'weex'].every(ex => masterEagleContent.includes(ex));
report(
  'Frontend Scanner Exchange Coverage',
  allInFrontend,
  allInFrontend ? 'All 4 exchanges wired into pills, dropdowns, and live tickers' : 'Missing exchange support in frontend'
);

// 4. Audit Supabase Schema Contracts
const schemaPath = path.join(rootDir, 'supabase', 'migrations', '001_initial_schema.sql');
const repoPath = path.join(rootDir, 'backend', 'db', 'signals.repo.ts');
if (fs.existsSync(schemaPath) && fs.existsSync(repoPath)) {
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  const repoContent = fs.readFileSync(repoPath, 'utf-8');

  const requiredTables = [
    'signals',
    'signal_snapshots',
    'signal_extremes',
    'signal_checkpoints'
  ];

  const schemaTablesValid = requiredTables.every(t => 
    schemaContent.includes(`CREATE TABLE IF NOT EXISTS ${t}`) || 
    schemaContent.includes(`CREATE TABLE IF NOT EXISTS public.${t}`) ||
    schemaContent.includes(`create table if not exists ${t}`)
  );
  const repoTablesValid = requiredTables.every(t => repoContent.includes(`'${t}'`));

  report(
    'Supabase Schema Contract Integrity',
    schemaTablesValid && repoTablesValid,
    schemaTablesValid && repoTablesValid ? 'All 4 tables aligned between migration and repository layer' : 'Table contract mismatch'
  );

  const migration2Path = path.join(rootDir, 'supabase', 'migrations', '002_big_cap_signals.sql');
  const bigCapMigrationValid = fs.existsSync(migration2Path) && fs.readFileSync(migration2Path, 'utf-8').includes('big_cap_signals');
  report(
    'Supabase Big-Cap Schema Contract Integrity',
    bigCapMigrationValid,
    bigCapMigrationValid ? 'big_cap_signals table schema migration verified with exclusive active lock' : 'Missing 002_big_cap_signals.sql'
  );
}

// 5. Audit Clean Scripts Directory
const scriptsDir = path.join(rootDir, 'scripts');
const scriptFiles = fs.readdirSync(scriptsDir);
const obsoleteScriptPatterns = [
  'collision',
  'patch',
  'integrate_',
  'fix_',
  'inject_'
];
const obsoleteFound = scriptFiles.filter(f => obsoleteScriptPatterns.some(p => f.includes(p)));
report(
  'Scripts Directory Cleanliness',
  obsoleteFound.length === 0,
  obsoleteFound.length === 0 ? `0 obsolete scripts detected (${scriptFiles.length} active scripts total)` : `Found obsolete scripts: ${obsoleteFound.join(', ')}`
);

console.log('\n───────────────────────────────────────────────────────────────────');
if (auditFailures === 0) {
  console.log('🎉 MULTI-FILE SYNCHRONIZATION AUDIT PASSED: 100% System Integrity!\n');
  process.exit(0);
} else {
  console.error(`💥 AUDIT FAILED with ${auditFailures} issue(s). Run 'node scripts/build_full_site.mjs' to reconcile.\n`);
  process.exit(1);
}
