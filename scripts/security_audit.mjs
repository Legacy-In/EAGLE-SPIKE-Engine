import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔒 Running EAGLE FLASH Security & Secret Leakage Audit...\n');

let violations = 0;
const rootDir = process.cwd();

// 1. Check .gitignore for .env protection
const gitignorePath = path.join(rootDir, '.gitignore');
if (!fs.existsSync(gitignorePath)) {
  console.error('❌ CRITICAL: .gitignore missing!');
  violations++;
} else {
  const giContent = fs.readFileSync(gitignorePath, 'utf-8');
  if (!giContent.includes('.env')) {
    console.error('❌ CRITICAL: .env is not present in .gitignore!');
    violations++;
  } else {
    console.log('✅ .gitignore properly protects .env files.');
  }
}

// 2. Check Git tracking status for sensitive files
try {
  const trackedFiles = execSync('git ls-files', { encoding: 'utf-8' });
  const sensitiveNames = ['.env', '.env.local', '.env.production', '.env.development'];
  for (const name of sensitiveNames) {
    if (trackedFiles.split('\n').map(s => s.trim()).includes(name)) {
      console.error(`❌ CRITICAL: Sensitive environment file '${name}' is tracked by Git!`);
      violations++;
    }
  }
  if (violations === 0) {
    console.log('✅ No sensitive .env files are tracked by Git.');
  }
} catch (e) {
  console.warn('⚠️ Could not run git ls-files, skipping git tracking check:', e.message);
}

// 3. Scan codebase for leaked secrets & Telegram Bot tokens
const SCAN_DIRS = ['apps', 'dist-eagle-flash', 'packages', 'services', 'scripts'];
const SCAN_FILES = ['index.html', 'eagle-flash.html', 'README.md'];

// Patterns to detect
const TOKEN_PATTERN = /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/g;
const PRIVATE_KEY_PATTERN = /BEGIN\s+(?:RSA|OPENSSH|EC|PRIVATE)\s+KEY/i;
const CLIENT_TELEGRAM_FETCH = /https:\/\/api\.telegram\.org\/bot(?!\$\{)/i;

function scanFile(filePath) {
  const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  // Skip node_modules, .git, .next, and test files with synthetic test mocks
  if (relPath.includes('node_modules/') || relPath.includes('.git/') || relPath.includes('.next/')) {
    return;
  }
  if (relPath.endsWith('.env') || relPath.endsWith('.env.local')) {
    return; // .env files are ignored by git, checked separately
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Check 1: Real telegram bot token format
  const tokenMatches = content.match(TOKEN_PATTERN);
  if (tokenMatches) {
    // If it's not a dummy placeholder
    const realMatches = tokenMatches.filter(t => !t.includes('123456789') && !t.includes('000000000'));
    if (realMatches.length > 0) {
      console.error(`❌ CRITICAL: Found hardcoded Telegram Bot Token in ${relPath}: ${realMatches[0].slice(0, 8)}...`);
      violations++;
    }
  }

  // Check 2: Private Key
  if (PRIVATE_KEY_PATTERN.test(content)) {
    console.error(`❌ CRITICAL: Found private key pattern in ${relPath}`);
    violations++;
  }

  // Check 3: Client files directly calling Telegram Bot API
  if (relPath.endsWith('.html') || relPath.includes('apps/web/public/')) {
    if (CLIENT_TELEGRAM_FETCH.test(content)) {
      console.error(`❌ CRITICAL: Client-side file calls Telegram Bot API directly in ${relPath}`);
      violations++;
    }
    if (content.includes('TELEGRAM_BOT_TOKEN') && !content.includes('// documentation') && !content.includes('process.env')) {
      console.error(`❌ WARNING: TELEGRAM_BOT_TOKEN referenced in client-side file ${relPath}`);
      violations++;
    }
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '.next') {
        walkDir(full);
      }
    } else if (entry.isFile()) {
      scanFile(full);
    }
  }
}

for (const dir of SCAN_DIRS) {
  walkDir(path.join(rootDir, dir));
}
for (const file of SCAN_FILES) {
  const full = path.join(rootDir, file);
  if (fs.existsSync(full)) {
    scanFile(full);
  }
}

console.log('\n----------------------------------------');
if (violations > 0) {
  console.error(`❌ SECURITY AUDIT FAILED: Found ${violations} security issue(s).`);
  process.exit(1);
} else {
  console.log('✅ SECURITY AUDIT PASSED: 0 secrets leaked, zero client-side tokens detected.');
  process.exit(0);
}
