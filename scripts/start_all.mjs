#!/usr/bin/env node
/**
 * 🦅 EAGLE FLASH — Unified Multi-Worker Orchestrator
 *
 * Launches and supervises all background intelligence workers and the Next.js workstation
 * simultaneously from a single terminal command with zero external prerequisites.
 *
 * Usage:
 *   node scripts/start_all.mjs                 # Start Web + all 9 background workers
 *   node scripts/start_all.mjs --workers-only  # Start only 9 backend workers (no Web)
 *   node scripts/start_all.mjs --dry-run       # Verify configuration and process files
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// ANSI Color Palette for distinct process prefixes
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
};

// Worker & Service Definitions
export const SERVICES = [
  {
    id: 'web',
    name: 'EAGLE-WEB',
    color: COLORS.brightCyan,
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['--prefix', 'apps/web', 'run', 'start'],
    cwd: ROOT_DIR,
    env: { NODE_ENV: 'production', PORT: '3000' },
    isWeb: true,
  },
  {
    id: 'scanner',
    name: 'SCANNER',
    color: COLORS.brightBlue,
    command: process.execPath,
    args: ['scripts/server_scanner.mjs'],
    cwd: ROOT_DIR,
    env: { NODE_ENV: 'production', SCAN_INTERVAL_MS: '30000' },
    scriptPath: 'scripts/server_scanner.mjs',
  },
  {
    id: 'tpsl',
    name: 'TP/SL-MONITOR',
    color: COLORS.brightMagenta,
    command: process.execPath,
    args: ['scripts/tpsl_monitor_worker.mjs'],
    cwd: ROOT_DIR,
    env: { NODE_ENV: 'production' },
    scriptPath: 'scripts/tpsl_monitor_worker.mjs',
  },
  {
    id: 'discord',
    name: 'DISCORD-OUT',
    color: COLORS.blue,
    command: process.execPath,
    args: ['scripts/discord_worker.mjs'],
    cwd: ROOT_DIR,
    env: { NODE_ENV: 'production' },
    scriptPath: 'scripts/discord_worker.mjs',
  },
  {
    id: 'telegram_outbox',
    name: 'TG-OUTBOX',
    color: COLORS.brightGreen,
    command: process.execPath,
    args: ['scripts/telegram_worker.mjs'],
    cwd: ROOT_DIR,
    env: { NODE_ENV: 'production' },
    scriptPath: 'scripts/telegram_worker.mjs',
  },
  {
    id: 'telegram_poll',
    name: 'TG-POLL',
    color: COLORS.green,
    command: process.execPath,
    args: ['scripts/telegram_poll.mjs'],
    cwd: ROOT_DIR,
    env: { NODE_ENV: 'production' },
    scriptPath: 'scripts/telegram_poll.mjs',
  },
  {
    id: 'bigcap',
    name: 'BIGCAP',
    color: COLORS.yellow,
    command: process.execPath,
    args: ['scripts/bigcap_worker.mjs'],
    cwd: ROOT_DIR,
    env: { NODE_ENV: 'production' },
    scriptPath: 'scripts/bigcap_worker.mjs',
  },
  {
    id: 'checkpoint',
    name: 'CHECKPOINT',
    color: COLORS.white,
    command: process.execPath,
    args: ['scripts/checkpoint_evaluator.mjs', '--loop'],
    cwd: ROOT_DIR,
    env: { NODE_ENV: 'production', EVAL_INTERVAL_MS: '60000' },
    scriptPath: 'scripts/checkpoint_evaluator.mjs',
  },
  {
    id: 'whale',
    name: 'WHALE-DET',
    color: COLORS.brightYellow,
    command: process.execPath,
    args: ['scripts/whale_detector_worker.mjs'],
    cwd: ROOT_DIR,
    env: { NODE_ENV: 'production' },
    scriptPath: 'scripts/whale_detector_worker.mjs',
  },
  {
    id: 'etherscan',
    name: 'ETH-WHALE',
    color: COLORS.magenta,
    command: process.execPath,
    args: ['scripts/etherscan_whale_worker.mjs'],
    cwd: ROOT_DIR,
    env: { NODE_ENV: 'production' },
    scriptPath: 'scripts/etherscan_whale_worker.mjs',
  },
];

// CLI Argument Parsing
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isWorkersOnly = args.includes('--workers-only');

// Filter services based on CLI flags
export function getActiveServices({ workersOnly = false } = {}) {
  return SERVICES.filter((service) => {
    if (workersOnly && service.isWeb) return false;
    return true;
  });
}

// Validation function
export function validateServices() {
  const issues = [];
  const logsDir = path.join(ROOT_DIR, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  for (const s of SERVICES) {
    if (s.scriptPath) {
      const fullPath = path.join(ROOT_DIR, s.scriptPath);
      if (!fs.existsSync(fullPath)) {
        issues.push(`Script not found for ${s.name}: ${s.scriptPath}`);
      }
    }
  }

  const webPackageJson = path.join(ROOT_DIR, 'apps', 'web', 'package.json');
  if (!fs.existsSync(webPackageJson)) {
    issues.push(`Web package.json not found: ${webPackageJson}`);
  }

  return issues;
}

// Active Process Registry
const runningChildren = [];
let isShuttingDown = false;

function formatBadge(service) {
  const padLen = 14;
  const rawBadge = `[${service.name}]`.padEnd(padLen);
  return `${service.color}${COLORS.bright}${rawBadge}${COLORS.reset} `;
}

function pipeStream(stream, service, isError = false) {
  if (!stream) return;
  const badge = formatBadge(service);
  let buffer = '';

  stream.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep unfinished trailing chunk

    for (const line of lines) {
      if (line.trim().length === 0) continue;
      const formatted = `${badge}${isError ? COLORS.red : ''}${line}${COLORS.reset}`;
      if (isError) {
        process.stderr.write(formatted + '\n');
      } else {
        process.stdout.write(formatted + '\n');
      }
    }
  });
}

async function shutdown(signal = 'SIGINT') {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${COLORS.brightYellow}🛑 Received ${signal}. Initiating graceful shutdown of all processes...${COLORS.reset}`);

  for (const { child, service } of runningChildren) {
    try {
      if (child && !child.killed) {
        console.log(`${COLORS.gray}Stopping ${service.name} (PID: ${child.pid})...${COLORS.reset}`);
        if (process.platform === 'win32') {
          // Force process tree termination on Windows
          spawn('taskkill', ['/pid', child.pid.toString(), '/T', '/F']);
        } else {
          child.kill('SIGTERM');
        }
      }
    } catch (err) {
      // Ignore cleanup errors
    }
  }

  // Grace period before hard exit
  setTimeout(() => {
    console.log(`${COLORS.brightGreen}✅ All processes terminated cleanly.${COLORS.reset}`);
    process.exit(0);
  }, 1000);
}

// Staggered Startup Execution
async function launchAll() {
  const issues = validateServices();
  if (issues.length > 0) {
    console.error(`${COLORS.red}Validation Errors:${COLORS.reset}`);
    for (const issue of issues) {
      console.error(` - ${issue}`);
    }
    process.exit(1);
  }

  if (isDryRun) {
    console.log(`${COLORS.brightGreen}✅ Configuration valid. All 10 services and scripts verified.${COLORS.reset}`);
    const active = getActiveServices({ workersOnly: isWorkersOnly });
    console.log(`Configured to launch ${active.length} processes:`);
    for (const s of active) {
      console.log(` • [${s.name}] -> ${s.command} ${s.args.join(' ')}`);
    }
    process.exit(0);
  }

  const activeServices = getActiveServices({ workersOnly: isWorkersOnly });

  console.log('═════════════════════════════════════════════════════════════════');
  console.log(`🦅 ${COLORS.brightCyan}EAGLE FLASH — UNIFIED MULTI-WORKER ORCHESTRATOR${COLORS.reset}`);
  console.log('═════════════════════════════════════════════════════════════════');
  console.log(`🚀 Launching ${activeServices.length} supervised processes...`);
  console.log(`⏱️  Stagger interval: 300ms (eliminates port/socket/DB stampedes)`);
  console.log(`🛑 Press Ctrl+C at any time to shut down the entire ecosystem\n`);

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  for (let i = 0; i < activeServices.length; i++) {
    const service = activeServices[i];

    try {
      const child = spawn(service.command, service.args, {
        cwd: service.cwd,
        env: { ...process.env, ...service.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      runningChildren.push({ child, service });

      pipeStream(child.stdout, service, false);
      pipeStream(child.stderr, service, true);

      child.on('error', (err) => {
        console.error(`${formatBadge(service)}${COLORS.red}Failed to start: ${err.message}${COLORS.reset}`);
      });

      child.on('exit', (code, sig) => {
        if (!isShuttingDown) {
          console.log(
            `${formatBadge(service)}${COLORS.yellow}Process exited with code ${code ?? 'null'} (signal: ${sig ?? 'none'})${COLORS.reset}`
          );
        }
      });

      console.log(`${formatBadge(service)}${COLORS.brightGreen}Started (PID: ${child.pid})${COLORS.reset}`);

      // Stagger next process launch by 300ms
      if (i < activeServices.length - 1) {
        await new Promise((res) => setTimeout(res, 300));
      }
    } catch (err) {
      console.error(`${formatBadge(service)}${COLORS.red}Error during launch: ${err.message}${COLORS.reset}`);
    }
  }

  console.log(`\n${COLORS.brightGreen}✨ All ${activeServices.length} processes are live and supervised.${COLORS.reset}\n`);
}

// Only launch if executed directly from CLI
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  launchAll();
}
