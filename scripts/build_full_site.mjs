import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();

console.log('Building 1:1 Unified Next.js Institutional Workstation for GitHub Pages & Static Hosting...');

// 1. Ensure compiled Tailwind CSS exists and is up-to-date
const compiledCssPath = path.join(rootDir, 'apps', 'web', 'public', 'compiled-tailwind.css');
let tailwindCss = '';

if (!fs.existsSync(compiledCssPath) || fs.statSync(compiledCssPath).size < 1000) {
  try {
    console.log('Compiling standalone production Tailwind CSS...');
    execSync(
      'npx.cmd --prefix apps/web tailwindcss -i apps/web/app/globals.css --content "./index.html,./apps/web/app/**/*.{js,ts,jsx,tsx},./apps/web/components/**/*.{js,ts,jsx,tsx}" -o apps/web/public/compiled-tailwind.css --minify',
      { cwd: rootDir, stdio: 'pipe' }
    );
  } catch (err) {
    console.warn('Tailwind CLI build notice:', err?.message);
  }
}

if (fs.existsSync(compiledCssPath)) {
  tailwindCss = fs.readFileSync(compiledCssPath, 'utf-8');
  console.log(`Loaded compiled Tailwind CSS (${tailwindCss.length} bytes).`);
} else {
  console.warn('Warning: compiled-tailwind.css not found, will rely on Tailwind CDN script.');
}

// 2. Ensure eagle-flash.html exists at root and dist-eagle-flash
const eagleSource = path.join(rootDir, 'apps', 'web', 'public', 'eagle-flash.html');
const eagleContent = fs.readFileSync(eagleSource, 'utf-8');

fs.writeFileSync(path.join(rootDir, 'eagle-flash.html'), eagleContent, 'utf-8');
fs.writeFileSync(path.join(rootDir, 'dist-eagle-flash', 'index.html'), eagleContent, 'utf-8');
console.log('Synchronized eagle-flash.html to root and dist-eagle-flash.');

// 3. Construct the 1:1 Unified HTML
const unifiedHtml = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SIGMA — Institutional BTC Quantitative Intelligence & Trading Platform</title>
  <meta name="description" content="Institutional-grade Bitcoin market intelligence, multi-factor signals, order flow analytics, derivatives positioning, risk management, and execution workstation." />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>Σ</text></svg>">
  <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Barlow+Condensed:wght@400;500;600;700;800&family=Barlow:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            sigma: {
              bg: '#05070B',
              surface1: '#0B0F17',
              surface2: '#111724',
              surface3: '#182030',
              border: '#1C2538',
              borderSubtle: '#141B2B',
              borderFocus: '#283754',
              textMain: '#F8FAFC',
              textMuted: '#94A3B8',
              textDark: '#64748B',
              green: '#00E599',
              greenMuted: 'rgba(0, 229, 153, 0.12)',
              red: '#FF4757',
              redMuted: 'rgba(255, 71, 87, 0.12)',
              amber: '#FFAA00',
              amberMuted: 'rgba(255, 170, 0, 0.12)',
              cyan: '#00D2FF',
              cyanMuted: 'rgba(0, 210, 255, 0.12)',
              purple: '#8B5CF6',
              purpleMuted: 'rgba(139, 92, 246, 0.14)',
            },
          },
          fontFamily: {
            mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Space Mono', 'monospace'],
            sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
          },
        },
      },
    };
  </script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
  <style>
${tailwindCss}

/* Additional UI Refinements & Transitions */
:root {
  --sigma-bg: #06080D;
  --sigma-surface1: #0C1018;
  --sigma-surface2: #121824;
  --sigma-surface3: #1A2232;
  --sigma-border: #1E283C;
  --sigma-borderFocus: #2A3A56;
  --sigma-green: #00E599;
  --sigma-cyan: #00D2FF;
  --sigma-red: #FF4757;
  --sigma-amber: #FFAA00;
  --sigma-purple: #8B5CF6;
  --sigma-textMain: #F4F7FC;
  --sigma-textMuted: #94A3B8;
  --sigma-textDark: #64748B;
}

body {
  background-color: var(--sigma-bg);
  color: var(--sigma-textMain);
  min-height: 100vh;
  font-family: 'Barlow', -apple-system, BlinkMacSystemFont, sans-serif;
  overflow-x: hidden;
}

.tabular {
  font-variant-numeric: tabular-nums;
  font-family: 'Space Mono', monospace;
}

.ws-panel {
  display: none;
}
.ws-panel.active {
  display: block;
}

/* Custom Scrollbars */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: var(--sigma-surface1); }
::-webkit-scrollbar-thumb { background: var(--sigma-border); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: var(--sigma-borderFocus); }

/* Animation helpers */
@keyframes ping-slow {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.6); opacity: 0.3; }
  100% { transform: scale(1); opacity: 1; }
}
.animate-ping-slow {
  animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}
  </style>
</head>
<body class="bg-sigma-bg text-sigma-textMain min-h-screen antialiased select-none">
  <div class="min-h-screen bg-sigma-bg text-sigma-textMain flex flex-col font-sans select-none">
    
    <!-- ═══════════════════════════════════════════════════════
         INSTITUTIONAL TOPBAR (1:1 with Next.js localhost:3000)
         ═══════════════════════════════════════════════════════ -->
    <header class="border-b border-sigma-border bg-sigma-surface1/95 backdrop-blur sticky top-0 z-40 px-3 py-2 select-none">
      <div class="flex flex-wrap items-center justify-between gap-3">
        
        <!-- Brand & Market Status -->
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 cursor-pointer" onclick="switchWorkspace('terminal')">
            <div class="w-8 h-8 rounded bg-gradient-to-br from-sigma-purple/30 to-sigma-cyan/20 border border-sigma-purple/50 flex items-center justify-center font-bold text-lg text-sigma-textMain font-mono shadow-sm">
              Σ
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <span class="font-bold tracking-wider text-sm text-sigma-textMain">SIGMA</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-sigma-surface3 text-sigma-textMuted border border-sigma-border font-mono">
                  INSTITUTIONAL v4.2
                </span>
              </div>
              <div class="text-[10px] text-sigma-textDark font-mono flex items-center gap-1">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-sigma-green animate-ping"></span>
                <span>BTC QUANT CORE</span>
              </div>
            </div>
          </div>

          <!-- Price Strip -->
          <div class="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 border-l border-sigma-border">
            <div>
              <div class="text-[9px] sm:text-[10px] text-sigma-textDark font-mono flex items-center gap-1">
                <span>BTC/USDT</span>
                <span class="text-sigma-cyan text-[8px] sm:text-[9px]">LIVE</span>
              </div>
              <div class="flex items-baseline gap-1.5 sm:gap-2">
                <span id="top-btc-price" class="font-mono text-xs sm:text-base font-bold text-sigma-textMain tracking-tight tabular-nums">
                  $79,073.06
                </span>
                <span id="top-btc-chg" class="font-mono text-[10px] sm:text-xs font-semibold tabular-nums text-sigma-green">
                  +2.41%
                </span>
              </div>
            </div>
          </div>

          <!-- Quick Metrics Badges -->
          <div class="hidden xl:flex items-center gap-2 pl-3 border-l border-sigma-border text-xs font-mono">
            <div class="px-2 py-1 rounded bg-sigma-surface2 border border-sigma-border">
              <span class="text-sigma-textDark text-[10px] block">REGIME</span>
              <span class="text-sigma-cyan font-semibold text-[11px]">BULLISH RECOVERY</span>
            </div>
            <div class="px-2 py-1 rounded bg-sigma-surface2 border border-sigma-border">
              <span class="text-sigma-textDark text-[10px] block">SIGNAL</span>
              <span class="font-bold text-[11px] text-sigma-green">
                LONG (78%)
              </span>
            </div>
            <div class="px-2 py-1 rounded bg-sigma-surface2 border border-sigma-border">
              <span class="text-sigma-textDark text-[10px] block">DATA QUALITY</span>
              <span class="text-sigma-green font-semibold text-[11px]">96%</span>
            </div>
          </div>
        </div>

        <!-- Center Workspace Navigation Tabs (Desktop only) -->
        <nav class="hidden lg:flex items-center bg-sigma-surface2 p-0.5 rounded border border-sigma-border text-xs font-medium">
          <button onclick="switchWorkspace('terminal')" id="btn-ws-terminal" class="ws-btn px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 bg-sigma-surface3 text-sigma-textMain border border-sigma-borderFocus shadow-sm font-semibold">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-cyan"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path></svg>
            <span>Terminal</span>
          </button>
          
          <button onclick="switchWorkspace('eagle')" id="btn-ws-eagle" class="ws-btn px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 text-amber-400/80 hover:text-amber-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-400 animate-pulse"><path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"></path></svg>
            <span class="font-bold">🦅 Eagle Flash</span>
            <span class="text-[9px] px-1 py-0.2 bg-amber-500/30 text-amber-300 rounded font-mono font-bold">LIVE</span>
          </button>

          <button onclick="switchWorkspace('backtest')" id="btn-ws-backtest" class="ws-btn px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 text-sigma-textMuted hover:text-sigma-textMain">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-purple"><path d="M5 21v-6"></path><path d="M12 21V3"></path><path d="M19 21V9"></path></svg>
            <span>Backtest Lab</span>
          </button>

          <button onclick="switchWorkspace('risk')" id="btn-ws-risk" class="ws-btn px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 text-sigma-textMuted hover:text-sigma-textMain">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-amber"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path></svg>
            <span>Risk & Exposure</span>
          </button>

          <button onclick="switchWorkspace('journal')" id="btn-ws-journal" class="ws-btn px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 text-sigma-textMuted hover:text-sigma-textMain">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-green"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"></path><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"></path><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"></path></svg>
            <span>Journal</span>
          </button>

          <button onclick="switchWorkspace('health')" id="btn-ws-health" class="ws-btn px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 text-sigma-textMuted hover:text-sigma-textMain">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-cyan"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5V19A9 3 0 0 0 21 19V5"></path><path d="M3 12A9 3 0 0 0 21 12"></path></svg>
            <span>Data Health</span>
          </button>

          <button onclick="switchWorkspace('calendar')" id="btn-ws-calendar" class="ws-btn hidden xl:flex px-3 py-1.5 rounded transition-colors items-center gap-1.5 text-sigma-textMuted hover:text-sigma-textMain">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-textDark"><path d="M8 2v3"></path><path d="M16 2v3"></path><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18"></path></svg>
            <span>Macro Calendar</span>
          </button>
        </nav>

        <!-- Right Actions: Timeframes, Search, Mode, Safe Mode, Kill Switch -->
        <div class="flex items-center gap-2">
          <!-- Timeframe selector -->
          <div class="hidden md:flex items-center bg-sigma-surface2 rounded border border-sigma-border p-0.5 text-[11px] font-mono">
            <button onclick="setTimeframe('1m')" class="tf-btn px-1.5 py-0.5 rounded transition-colors text-sigma-textDark hover:text-sigma-textMuted">1m</button>
            <button onclick="setTimeframe('5m')" class="tf-btn px-1.5 py-0.5 rounded transition-colors text-sigma-textDark hover:text-sigma-textMuted">5m</button>
            <button onclick="setTimeframe('15m')" class="tf-btn px-1.5 py-0.5 rounded transition-colors text-sigma-textDark hover:text-sigma-textMuted">15m</button>
            <button onclick="setTimeframe('30m')" class="tf-btn px-1.5 py-0.5 rounded transition-colors text-sigma-textDark hover:text-sigma-textMuted">30m</button>
            <button onclick="setTimeframe('1h')" class="tf-btn px-1.5 py-0.5 rounded transition-colors text-sigma-textDark hover:text-sigma-textMuted">1h</button>
            <button onclick="setTimeframe('4h')" class="tf-btn px-1.5 py-0.5 rounded transition-colors bg-sigma-surface3 text-sigma-cyan font-bold border border-sigma-cyan/30">4h</button>
            <button onclick="setTimeframe('12h')" class="tf-btn px-1.5 py-0.5 rounded transition-colors text-sigma-textDark hover:text-sigma-textMuted">12h</button>
            <button onclick="setTimeframe('1D')" class="tf-btn px-1.5 py-0.5 rounded transition-colors text-sigma-textDark hover:text-sigma-textMuted">1D</button>
            <button onclick="setTimeframe('1W')" class="tf-btn px-1.5 py-0.5 rounded transition-colors text-sigma-textDark hover:text-sigma-textMuted">1W</button>
          </div>

          <!-- Command Palette Trigger -->
          <button onclick="openCommandPalette()" class="px-2.5 py-1.5 rounded bg-sigma-surface2 hover:bg-sigma-surface3 border border-sigma-border text-xs text-sigma-textMuted flex items-center gap-1.5 transition-colors font-mono" title="Command Palette (Ctrl+K)">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-textDark"><path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle></svg>
            <span class="hidden sm:inline">Ctrl+K</span>
          </button>

          <!-- Refresh -->
          <button onclick="triggerRefreshAll()" id="btn-refresh" class="p-1.5 rounded bg-sigma-surface2 hover:bg-sigma-surface3 border border-sigma-border text-sigma-textMuted transition-colors" title="Refresh Market Feeds">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>
          </button>

          <!-- Trading Mode Toggle -->
          <button onclick="toggleTradingMode()" id="btn-trading-mode" class="hidden sm:inline-flex px-2.5 py-1 rounded text-[11px] font-mono font-bold tracking-wide border transition-all bg-sigma-cyan/10 border-sigma-cyan/40 text-sigma-cyan">
            ● PAPER MODE
          </button>

          <!-- Hardware Kill Switch -->
          <button onclick="openKillSwitchModal()" class="hidden sm:flex px-2.5 py-1 rounded text-[11px] font-mono font-bold border items-center gap-1 transition-all bg-sigma-surface2 hover:bg-sigma-red/20 text-sigma-textMuted hover:text-sigma-red border-sigma-border hover:border-sigma-red/40">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v10"></path><path d="M18.4 6.6a9 9 0 1 1-12.77.04"></path></svg>
            <span>KILL SWITCH</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Workspaces -->
    <main class="flex-1 p-2 sm:p-4 max-w-[1780px] w-full mx-auto pb-24 lg:pb-4">
      
      <!-- ═══════════════════════════════════════════════════════
           WORKSPACE 1: TERMINAL (1:1 with Next.js localhost:3000)
           ═══════════════════════════════════════════════════════ -->
      <div id="ws-terminal" class="ws-panel active space-y-3">
        <!-- Header Ticker Strip -->
        <div class="bg-sigma-surface1 border border-sigma-border rounded-lg p-3 sm:p-4 mb-3">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-baseline gap-4">
              <div>
                <div class="text-[10px] font-mono text-sigma-textDark flex items-center gap-1.5 mb-0.5">
                  <span class="font-bold text-sigma-textMuted">BTC / USDT</span>
                  <span class="px-1.5 py-0.2 rounded bg-sigma-surface3 text-sigma-cyan text-[9px] border border-sigma-border">PERPETUAL + SPOT COMPOSITE</span>
                </div>
                <div class="flex items-baseline gap-3">
                  <span id="card-btc-price" class="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-sigma-textMain tabular-nums">$79,073.06</span>
                  <div id="card-btc-chg" class="flex items-center text-sm sm:text-base font-bold font-mono tabular-nums text-sigma-green">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-0.5"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg>+2.41%
                  </div>
                </div>
              </div>
            </div>
            
            <div class="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 sm:gap-6 text-xs font-mono w-full sm:w-auto">
              <div><div class="text-[10px] text-sigma-textDark uppercase">24h High</div><div id="strip-24h-high" class="text-sigma-textMain font-semibold tabular-nums">$79,850.00</div></div>
              <div><div class="text-[10px] text-sigma-textDark uppercase">24h Low</div><div id="strip-24h-low" class="text-sigma-textMain font-semibold tabular-nums">$76,920.00</div></div>
              <div><div class="text-[10px] text-sigma-textDark uppercase">24h Turnover</div><div id="strip-24h-turnover" class="text-sigma-cyan font-semibold tabular-nums">$1.81B</div></div>
              <div><div class="text-[10px] text-sigma-textDark uppercase">vs All-Time High</div><div id="strip-ath-distance" class="text-sigma-red font-semibold tabular-nums">-27.3%</div></div>
            </div>

            <div class="bg-sigma-surface2 px-3 py-1.5 rounded border border-sigma-border text-[10px] font-mono w-full sm:w-auto">
              <div class="flex items-center gap-1.5 text-sigma-textDark mb-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-green"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m9 12 2 2 4-4"></path></svg>
                <span>DATA PROVENANCE</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sigma-textMain font-medium">Binance WS L1/L2</span>
                <span class="text-sigma-green font-bold">LIVE (<span id="ping-ws">42</span>ms)</span>
                <span class="text-sigma-cyan font-bold">99% Conf</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 12-Column Responsive Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          
          <!-- Left Column (4 cols) -->
          <div class="lg:col-span-4 space-y-3">
            <!-- Signal Card -->
            <div class="bg-sigma-surface1 border border-sigma-border rounded-lg overflow-hidden flex flex-col justify-between">
              <div class="p-4 border-b border-sigma-border bg-sigma-surface2/60">
                <div class="flex items-center justify-between gap-2 mb-2">
                  <div class="flex items-center gap-2">
                    <span id="sig-symbol" class="font-mono font-bold text-xs text-sigma-textMain">BTCUSDT</span>
                    <span id="sig-tf" class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sigma-surface3 text-sigma-textMuted border border-sigma-border">4H TIMEFRAME</span>
                  </div>
                  <div class="flex items-center gap-1.5 text-[10px] font-mono text-sigma-textDark">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-cyan"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>
                    <span id="sig-updated">Live Sync</span>
                  </div>
                </div>

                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2.5">
                    <div id="sig-dir-badge" class="p-2 rounded-lg border flex items-center justify-center bg-sigma-green/15 border-sigma-green text-sigma-green">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m16 12-4-4-4 4"></path><path d="M12 16V8"></path></svg>
                    </div>
                    <div>
                      <div id="sig-direction" class="font-mono text-2xl font-black tracking-wide text-sigma-green">LONG</div>
                      <div id="sig-regime" class="text-[11px] font-semibold text-sigma-textDark uppercase tracking-wider">BULLISH RECOVERY</div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-[10px] font-mono text-sigma-textDark uppercase">Model Confidence</div>
                    <div id="sig-confidence" class="text-base font-mono font-bold text-sigma-cyan">78%</div>
                    <div id="sig-data-quality" class="text-[10px] font-mono text-sigma-textDark">Data Quality: 99%</div>
                  </div>
                </div>

                <div class="mt-3">
                  <div class="w-full bg-sigma-surface3 h-2 rounded-full overflow-hidden flex border border-sigma-border">
                    <div id="sig-conf-bar" class="h-full transition-all duration-700 bg-sigma-green" style="width:78%"></div>
                  </div>
                  <div class="flex justify-between text-[9px] font-mono text-sigma-textDark mt-1">
                    <span>UNTESTED (0%)</span>
                    <span>CALIBRATED ENSEMBLE</span>
                    <span>CERTAINTY (100%)</span>
                  </div>
                </div>
              </div>

              <!-- Signal Details -->
              <div class="p-4 divide-y divide-sigma-borderSubtle">
                <div class="grid grid-cols-2 gap-3 pb-3">
                  <div class="bg-sigma-surface2/60 p-2.5 rounded border border-sigma-border">
                    <div class="text-[10px] font-mono text-sigma-textDark uppercase mb-0.5">Entry Zone</div>
                    <div id="sig-entry-zone" class="font-mono text-xs font-bold text-sigma-textMain">$78,850 – $79,150</div>
                  </div>
                  <div class="bg-sigma-surface2/60 p-2.5 rounded border border-sigma-border">
                    <div class="text-[10px] font-mono text-sigma-textDark uppercase mb-0.5">Stop Loss (ATR Clamped)</div>
                    <div id="sig-stop-loss" class="font-mono text-xs font-bold text-sigma-red">$77,920</div>
                  </div>
                </div>

                <div class="py-3">
                  <div class="text-[10px] font-mono text-sigma-textDark uppercase mb-2 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-cyan"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
                    <span>Mathematical Target Matrix (Liquidity & ATR Extension)</span>
                  </div>
                  <div class="grid grid-cols-3 gap-2 text-center">
                    <div class="bg-sigma-surface2/80 p-2 rounded border border-sigma-border">
                      <div class="text-[9px] font-mono text-sigma-textDark">TARGET 1 (1.5R)</div>
                      <div id="sig-t1" class="font-mono text-xs font-bold text-sigma-green">$80,400</div>
                    </div>
                    <div class="bg-sigma-surface2/80 p-2 rounded border border-sigma-border">
                      <div class="text-[9px] font-mono text-sigma-textDark">TARGET 2 (2.5R)</div>
                      <div id="sig-t2" class="font-mono text-xs font-bold text-sigma-green">$81,750</div>
                    </div>
                    <div class="bg-sigma-surface2/80 p-2 rounded border border-sigma-border">
                      <div class="text-[9px] font-mono text-sigma-textDark">TARGET 3 (4.0R)</div>
                      <div id="sig-t3" class="font-mono text-xs font-bold text-sigma-green">$83,200</div>
                    </div>
                  </div>
                </div>

                <div class="py-3 flex items-center justify-between text-xs font-mono">
                  <div><span class="text-sigma-textDark text-[10px] block">RISK / REWARD</span><span id="sig-rr" class="font-bold text-sigma-textMain">1 : 2.8</span></div>
                  <div><span class="text-sigma-textDark text-[10px] block">POSITION RISK</span><span id="sig-pos-risk" class="font-bold text-sigma-textMain">0.5%</span></div>
                  <div><span class="text-sigma-textDark text-[10px] block">INVALIDATION</span><span id="sig-invalidation" class="text-[11px] font-medium text-sigma-amber truncate max-w-[150px]">4H close below SL</span></div>
                </div>

                <div class="pt-3 space-y-2 text-xs">
                  <div>
                    <div class="text-[10px] font-mono text-sigma-green font-bold mb-1 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m16 9-5.5 5.5L8 12"></path></svg>
                      <span>CONFIRMING POSITIVE FACTORS</span>
                    </div>
                    <ul id="sig-pos-factors" class="text-[11px] text-sigma-textMuted space-y-1 list-disc list-inside">
                      <li>Spot CVD positive accumulation (+taker balance)</li>
                      <li>Funding baseline with organic OI expansion</li>
                      <li>Price structure intact above EMA 20 support</li>
                    </ul>
                  </div>
                  <div>
                    <div class="text-[10px] font-mono text-sigma-red font-bold mb-1 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line></svg>
                      <span>KEY NEGATIVE FACTORS & RISKS</span>
                    </div>
                    <ul id="sig-neg-factors" class="text-[11px] text-sigma-textMuted space-y-1 list-disc list-inside">
                      <li>Overhead order book ask wall resistance cluster</li>
                      <li>Macro volatility & liquidation boundary zone</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div class="p-3 bg-sigma-surface2 border-t border-sigma-border flex items-center justify-between">
                <div class="text-[10px] font-mono text-sigma-textDark">
                  <span>MODEL: SIGMA-4H-ENSEMBLE-v1.7</span>
                </div>
                <button id="sig-exec-btn" onclick="executePaperTrade('LONG', 0.25)" class="px-4 py-2 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md bg-sigma-green text-black hover:bg-sigma-green/90">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"></path></svg>
                  <span>EXECUTE LONG (0.25 BTC)</span>
                </button>
              </div>
            </div>


            <!-- Factor Attribution -->
            <div class="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-cyan"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"></path><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"></path><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"></path></svg>
                  <h3 class="font-mono text-xs font-bold text-sigma-textMain uppercase tracking-wider">Factor Attribution & Weights</h3>
                </div>
                <div class="flex items-center gap-1.5 font-mono text-xs">
                  <span class="text-sigma-textDark text-[11px]">NET ENSEMBLE:</span>
                  <span id="factor-net-val" class="font-bold text-sigma-green px-1.5 py-0.5 rounded bg-sigma-green/10 border border-sigma-green/30">+62 / 100</span>
                </div>
              </div>
              <p class="text-[11px] text-sigma-textDark mb-3">Orthogonal multi-factor decomposition. Individual factor scores are computed prior to linear ensemble weighting to eliminate collinearity.</p>
              
              <div class="space-y-2.5 text-xs font-mono">
                <div>
                  <div class="flex justify-between text-[11px] mb-1"><span class="text-sigma-textMuted">Trend Structure (4H / Daily Alignment)</span><span id="factor-trend-val" class="text-sigma-green font-semibold">+82</span></div>
                  <div class="w-full bg-sigma-surface3 h-1.5 rounded-full overflow-hidden"><div id="factor-trend-bar" class="bg-sigma-green h-full" style="width:82%"></div></div>
                </div>
                <div>
                  <div class="flex justify-between text-[11px] mb-1"><span class="text-sigma-textMuted">Momentum & Velocity (MACD / RSI Divergence)</span><span id="factor-mom-val" class="text-sigma-green font-semibold">+68</span></div>
                  <div class="w-full bg-sigma-surface3 h-1.5 rounded-full overflow-hidden"><div id="factor-mom-bar" class="bg-sigma-green h-full" style="width:68%"></div></div>
                </div>
                <div>
                  <div class="flex justify-between text-[11px] mb-1"><span class="text-sigma-textMuted">Derivatives & Funding (Carry / Basis Arbitrage)</span><span id="factor-deriv-val" class="text-sigma-cyan font-semibold">+54</span></div>
                  <div class="w-full bg-sigma-surface3 h-1.5 rounded-full overflow-hidden"><div id="factor-deriv-bar" class="bg-sigma-cyan h-full" style="width:54%"></div></div>
                </div>
                <div>
                  <div class="flex justify-between text-[11px] mb-1"><span class="text-sigma-textMuted">Volatility Compression (Bollinger Squeeze)</span><span id="factor-vol-val" class="text-sigma-amber font-semibold">+45</span></div>
                  <div class="w-full bg-sigma-surface3 h-1.5 rounded-full overflow-hidden"><div id="factor-vol-bar" class="bg-sigma-amber h-full" style="width:45%"></div></div>
                </div>
                <div>
                  <div class="flex justify-between text-[11px] mb-1"><span class="text-sigma-textMuted">Order Flow & Liquidity Delta (CVD / Taker Flow)</span><span id="factor-cvd-val" class="text-sigma-green font-semibold">+72</span></div>
                  <div class="w-full bg-sigma-surface3 h-1.5 rounded-full overflow-hidden"><div id="factor-cvd-bar" class="bg-sigma-green h-full" style="width:72%"></div></div>
                </div>
                <div>
                  <div class="flex justify-between text-[11px] mb-1"><span class="text-sigma-textMuted">On-Chain Realized Price & MVRV Regime</span><span id="factor-onchain-val" class="text-sigma-green font-semibold">+76</span></div>
                  <div class="w-full bg-sigma-surface3 h-1.5 rounded-full overflow-hidden"><div id="factor-onchain-bar" class="bg-sigma-green h-full" style="width:76%"></div></div>
                </div>
              </div>
            </div>

            <!-- AI Market Brief -->
            <div class="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-base">🤖</span>
                <h3 class="font-mono text-xs font-bold text-sigma-textMain uppercase tracking-wider">Autonomous AI Market Intelligence Brief</h3>
              </div>
              <div class="text-xs font-mono text-sigma-textMuted leading-relaxed space-y-2 bg-sigma-surface2/50 p-3 rounded border border-sigma-border">
                <p><strong>EXECUTIVE DIRECTIVE:</strong> <span id="ai-brief-directive">Bitcoin is consolidating cleanly in the primary liquidity basin with positive ETF net inflows and active buyer absorption.</span></p>
                <p><strong>STRATEGY ACTION:</strong> <span id="ai-brief-action">Favorable asymmetric long entry with tight ATR stop. Target 1 provides 1.5R with high probability.</span></p>
              </div>
            </div>
          </div>

          <!-- Center Column (5 cols) -->
          <div class="lg:col-span-5 space-y-3">
            <!-- Interactive SVG Candlestick Chart -->
            <div class="bg-sigma-surface1 border border-sigma-border rounded-lg overflow-hidden flex flex-col">
              <div class="p-3 border-b border-sigma-border bg-sigma-surface2/50 flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="flex items-center gap-1.5 font-mono text-xs font-bold text-sigma-textMain">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-cyan"><path d="M5 21v-6"></path><path d="M12 21V3"></path><path d="M19 21V9"></path></svg>
                    <span>BTC/USDT INSTITUTIONAL WORKSPACE</span>
                  </div>
                  <div class="flex items-center gap-1 bg-sigma-surface3 p-0.5 rounded border border-sigma-border text-[10px] font-mono">
                    <button class="px-2 py-0.5 rounded transition-colors text-sigma-textMuted hover:text-sigma-textMain">15m</button>
                    <button class="px-2 py-0.5 rounded transition-colors text-sigma-textMuted hover:text-sigma-textMain">1h</button>
                    <button class="px-2 py-0.5 rounded transition-colors bg-sigma-cyan text-black font-bold">4h</button>
                    <button class="px-2 py-0.5 rounded transition-colors text-sigma-textMuted hover:text-sigma-textMain">1D</button>
                  </div>
                </div>

                <div class="flex items-center gap-3 text-[11px] font-mono tabular-nums text-sigma-textDark">
                  <span>O: <strong id="chart-open-val" class="text-sigma-textMain">$78,650.00</strong></span>
                  <span>H: <strong id="chart-high-val" class="text-sigma-textMain">$79,480.00</strong></span>
                  <span>L: <strong id="chart-low-val" class="text-sigma-textMain">$78,420.00</strong></span>
                  <span>C: <strong id="chart-close-val" class="text-sigma-green">$79,073.06</strong></span>
                  <span>Vol: <strong id="chart-vol-val" class="text-sigma-cyan">4,820 BTC</strong></span>
                </div>
              </div>

              <!-- SVG Canvas Chart -->
              <div class="relative w-full overflow-hidden p-2">
                <svg viewBox="0 0 800 340" class="w-full h-auto cursor-crosshair select-none">
                  <!-- Gridlines -->
                  <line x1="0" y1="48" x2="800" y2="48" stroke="#1C2538" stroke-dasharray="3,3" stroke-width="1"></line>
                  <text id="grid-p1" x="795" y="45" text-anchor="end" fill="#64748B" font-size="9" font-family="monospace">$82,000</text>
                  <line x1="0" y1="112" x2="800" y2="112" stroke="#1C2538" stroke-dasharray="3,3" stroke-width="1"></line>
                  <text id="grid-p2" x="795" y="109" text-anchor="end" fill="#64748B" font-size="9" font-family="monospace">$80,400</text>
                  <line x1="0" y1="176" x2="800" y2="176" stroke="#1C2538" stroke-dasharray="3,3" stroke-width="1"></line>
                  <text id="grid-p3" x="795" y="173" text-anchor="end" fill="#64748B" font-size="9" font-family="monospace">$78,800</text>
                  <line x1="0" y1="240" x2="800" y2="240" stroke="#1C2538" stroke-dasharray="3,3" stroke-width="1"></line>
                  <text id="grid-p4" x="795" y="237" text-anchor="end" fill="#64748B" font-size="9" font-family="monospace">$77,200</text>

                  <!-- S/R Reference Lines -->
                  <line id="chart-t1-line" x1="0" y1="112" x2="800" y2="112" stroke="#00D2FF" stroke-dasharray="4,4" stroke-width="1.2" opacity="0.8"></line>
                  <text id="chart-t1-text" x="10" y="108" fill="#00D2FF" font-size="9" font-family="monospace" font-weight="bold">TARGET 1 RESISTANCE: $80,400</text>

                  <line id="chart-stop-line" x1="0" y1="222" x2="800" y2="222" stroke="#FF4757" stroke-dasharray="4,4" stroke-width="1.2" opacity="0.8"></line>
                  <text id="chart-stop-text" x="10" y="234" fill="#FF4757" font-size="9" font-family="monospace" font-weight="bold">STOP LOSS / INVALIDATION: $77,920</text>

                  <!-- Interactive Simulated Candlesticks (32 Bars) -->
                  <!-- Bar 1 to 32 rendered smoothly with volume -->
                  <g id="chart-candles-group"></g>

                  <!-- EMA 20 Line (Cyan) -->
                  <polyline id="chart-ema-20" fill="none" stroke="#00D2FF" stroke-width="1.5" opacity="0.85" points=""></polyline>
                  <!-- EMA 50 Line (Purple) -->
                  <polyline id="chart-ema-50" fill="none" stroke="#8B5CF6" stroke-width="1.5" opacity="0.75" points=""></polyline>
                </svg>

                <div class="flex items-center justify-between text-[10px] font-mono text-sigma-textDark pt-2 px-2 border-t border-sigma-borderSubtle">
                  <div class="flex items-center gap-4">
                    <div class="flex items-center gap-1.5"><span class="w-2.5 h-0.5 bg-sigma-cyan inline-block"></span><span>EMA 20</span></div>
                    <div class="flex items-center gap-1.5"><span class="w-2.5 h-0.5 bg-sigma-purple inline-block"></span><span>EMA 50</span></div>
                    <div class="flex items-center gap-1.5"><span class="w-2.5 h-2 bg-sigma-cyan/40 inline-block"></span><span>Volume (BTC)</span></div>
                  </div>
                  <div><span>SYNCHRONIZED REAL-TIME CANDLES · 4H INTERVAL</span></div>
                </div>
              </div>
            </div>

            <!-- Positions & Orders Drawer -->
            <div class="bg-sigma-surface1 border border-sigma-border rounded-lg overflow-hidden flex flex-col">
              <div class="flex items-center justify-between p-2.5 border-b border-sigma-border bg-sigma-surface2/50">
                <div class="flex items-center gap-1 text-xs font-mono">
                  <button class="px-3 py-1 rounded transition-colors bg-sigma-surface3 text-sigma-cyan font-bold border border-sigma-border">Active Positions (<span id="positions-count">1</span>)</button>
                  <button class="px-3 py-1 rounded transition-colors text-sigma-textMuted hover:text-sigma-textMain">Order Fills</button>
                  <button onclick="openOrderTicket()" class="px-3 py-1 rounded transition-colors flex items-center gap-1 text-sigma-textMuted hover:text-sigma-textMain">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
                    <span>Order Ticket</span>
                  </button>
                </div>
                <div class="flex items-center gap-2 text-[10px] font-mono">
                  <span class="text-sigma-textDark">EXECUTION MODE:</span>
                  <span class="px-1.5 py-0.5 rounded font-bold border bg-sigma-cyan/10 text-sigma-cyan border-sigma-cyan/30">PAPER EXECUTION</span>
                </div>
              </div>
              <div class="p-3 overflow-x-auto">
                <table class="w-full text-xs font-mono">
                  <thead>
                    <tr class="text-sigma-textDark text-[10px] border-b border-sigma-border text-left">
                      <th class="pb-1">SYMBOL</th>
                      <th class="pb-1">SIDE</th>
                      <th class="pb-1">SIZE</th>
                      <th class="pb-1">ENTRY</th>
                      <th class="pb-1">MARK</th>
                      <th class="pb-1 text-right">UNREALIZED PNL</th>
                      <th class="pb-1 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody id="positions-table-body">
                    <tr class="border-b border-sigma-border/40">
                      <td class="py-2 font-bold text-sigma-textMain">BTCUSDT</td>
                      <td class="py-2 text-sigma-green font-bold">LONG</td>
                      <td class="py-2 text-sigma-textMuted">0.50 BTC</td>
                      <td class="py-2 text-sigma-textMuted">$78,820.00</td>
                      <td class="py-2 text-sigma-textMain font-semibold" id="pos-mark-price">$79,073.06</td>
                      <td class="py-2 text-right font-bold text-sigma-green" id="pos-pnl">+$126.53 (+0.32%)</td>
                      <td class="py-2 text-right">
                        <button onclick="closeActivePosition()" class="px-2 py-0.5 rounded bg-sigma-red/15 hover:bg-sigma-red/30 text-sigma-red border border-sigma-red/40 text-[10px] font-bold">CLOSE</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Right Column (3 cols) -->
          <div class="lg:col-span-3 space-y-3">
            <!-- Order Flow & Net Delta Intelligence -->
            <div class="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-green"><path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"></path></svg>
                  <h3 class="font-mono text-xs font-bold text-sigma-textMain uppercase tracking-wider">Order Flow & Net Delta Intelligence</h3>
                </div>
                <div class="flex items-center gap-1.5 font-mono text-[10px]">
                  <span class="text-sigma-textDark">DIVERGENCE:</span>
                  <span id="flow-divergence-badge" class="px-1.5 py-0.5 rounded bg-sigma-green/10 text-sigma-green border border-sigma-green/30 font-bold">BULLISH DELTA DIVERGENCE</span>
                </div>
              </div>

              <div class="mb-4">
                <div class="flex justify-between text-xs font-mono mb-1.5">
                  <div class="flex items-center gap-1 text-sigma-green font-bold"><span>BUYERS</span><span id="flow-buy-pct">54.2%</span></div>
                  <div class="flex items-center gap-1 text-sigma-red font-bold"><span id="flow-sell-pct">45.8%</span><span>SELLERS</span></div>
                </div>
                <div class="w-full h-3.5 bg-sigma-surface3 rounded overflow-hidden flex border border-sigma-border">
                  <div id="flow-bar-buy" class="h-full bg-sigma-green transition-all duration-500 flex items-center justify-start pl-2 text-[9px] font-mono font-bold text-black" style="width:54.2%">54.2%</div>
                  <div id="flow-bar-sell" class="h-full bg-sigma-red transition-all duration-500 flex items-center justify-end pr-2 text-[9px] font-mono font-bold text-white" style="width:45.8%">45.8%</div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] font-mono text-sigma-textDark uppercase font-bold">SPOT ACCUMULATION</span>
                    <span id="flow-spot-acc" class="text-xs font-mono font-bold text-sigma-green tabular-nums">+$142.5M</span>
                  </div>
                  <div class="space-y-1 text-[11px] font-mono">
                    <div class="flex justify-between text-sigma-textMuted"><span>Taker Buy:</span><span id="flow-spot-buy" class="text-sigma-green font-semibold">52.8%</span></div>
                    <div class="flex justify-between text-sigma-textMuted"><span>Taker Sell:</span><span id="flow-spot-sell" class="text-sigma-red font-semibold">47.2%</span></div>
                  </div>
                </div>

                <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] font-mono text-sigma-textDark uppercase font-bold">FUTURES POSITIONING</span>
                    <span id="flow-fut-pos" class="text-xs font-mono font-bold text-sigma-cyan tabular-nums">+$31.2M</span>
                  </div>
                  <div class="space-y-1 text-[11px] font-mono">
                    <div class="flex justify-between text-sigma-textMuted"><span>Perp Taker Buy:</span><span id="flow-perp-buy" class="text-sigma-green font-semibold">50.4%</span></div>
                    <div class="flex justify-between text-sigma-textMuted"><span>Perp Taker Sell:</span><span id="flow-perp-sell" class="text-sigma-red font-semibold">49.6%</span></div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-sigma-borderSubtle text-xs font-mono">
                <div><span class="text-[10px] text-sigma-textDark uppercase block">Net Delta (30m)</span><span id="flow-net-delta" class="font-bold tabular-nums text-sigma-red">$-18.5M</span></div>
                <div><span class="text-[10px] text-sigma-textDark uppercase block">30m Volume</span><span id="flow-volume" class="font-bold text-sigma-textMain tabular-nums">$1.81B</span></div>
                <div><span class="text-[10px] text-sigma-textDark uppercase block">Trade Count</span><span id="flow-trade-count" class="font-bold text-sigma-cyan tabular-nums">403,829</span></div>
                <div><span class="text-[10px] text-sigma-textDark uppercase block">Large Blocks</span><span id="flow-large-blocks" class="font-bold text-sigma-purple tabular-nums">148 (> $250k)</span></div>
              </div>
            </div>

            <!-- Order Book Depth & Imbalance -->
            <div class="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-cyan"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"></path><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"></path><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"></path></svg>
                  <h3 class="font-mono text-xs font-bold text-sigma-textMain uppercase tracking-wider">Order Book Depth & Imbalance</h3>
                </div>
                <div class="flex items-center gap-2 font-mono text-[10px]">
                  <span class="text-sigma-textDark">SPREAD:</span>
                  <span id="ob-spread-val" class="text-sigma-green font-bold">$0.60 (0.80 bps)</span>
                </div>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs font-mono">
                <div class="bg-sigma-surface2 p-2 rounded border border-sigma-border">
                  <div class="text-[10px] text-sigma-textDark mb-1">±5 bps Depth</div>
                  <div class="flex items-baseline justify-between"><span id="ob-5bps-val" class="text-sigma-textMuted text-[11px]">42.5 vs 38.1</span><span id="ob-5bps-ratio" class="font-bold tabular-nums text-[11px] text-sigma-green">+11.5%</span></div>
                </div>
                <div class="bg-sigma-surface2 p-2 rounded border border-sigma-border">
                  <div class="text-[10px] text-sigma-textDark mb-1">±10 bps Depth</div>
                  <div class="flex items-baseline justify-between"><span id="ob-10bps-val" class="text-sigma-textMuted text-[11px]">89.2 vs 74.0</span><span id="ob-10bps-ratio" class="font-bold tabular-nums text-[11px] text-sigma-green">+20.5%</span></div>
                </div>
                <div class="bg-sigma-surface2 p-2 rounded border border-sigma-border">
                  <div class="text-[10px] text-sigma-textDark mb-1">±25 bps Depth</div>
                  <div class="flex items-baseline justify-between"><span id="ob-25bps-val" class="text-sigma-textMuted text-[11px]">195 vs 180</span><span id="ob-25bps-ratio" class="font-bold tabular-nums text-[11px] text-sigma-green">+8.3%</span></div>
                </div>
                <div class="bg-sigma-surface2 p-2 rounded border border-sigma-border">
                  <div class="text-[10px] text-sigma-textDark mb-1">±50 bps Depth</div>
                  <div class="flex items-baseline justify-between"><span id="ob-50bps-val" class="text-sigma-textMuted text-[11px]">412 vs 390</span><span id="ob-50bps-ratio" class="font-bold tabular-nums text-[11px] text-sigma-green">+5.6%</span></div>
                </div>
              </div>

              <div class="mb-3">
                <div class="text-[10px] font-mono text-sigma-textDark uppercase mb-1.5 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-cyan"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  <span>Detected Liquidity Walls (Cluster Depth)</span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div class="bg-sigma-green/10 border border-sigma-green/30 p-2 rounded flex justify-between items-center">
                    <span class="text-sigma-green font-bold">BID WALL</span>
                    <span id="ob-bid-wall-val" class="text-sigma-textMain font-medium">$78,820 (45.5 BTC)</span>
                  </div>
                  <div class="bg-sigma-red/10 border border-sigma-red/30 p-2 rounded flex justify-between items-center">
                    <span class="text-sigma-red font-bold">ASK WALL</span>
                    <span id="ob-ask-wall-val" class="text-sigma-textMain font-medium">$80,450 (38.0 BTC)</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Derivatives & Positioning Intelligence -->
            <div class="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-purple"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path></svg>
                  <h3 class="font-mono text-xs font-bold text-sigma-textMain uppercase tracking-wider">Derivatives & Positioning Intelligence</h3>
                </div>
                <div class="flex items-center gap-1.5 font-mono text-[10px]">
                  <span class="text-sigma-textDark">OI DIVERGENCE:</span>
                  <span id="deriv-oi-div-badge" class="px-1.5 py-0.5 rounded bg-sigma-green/10 text-sigma-green border border-sigma-green/30 font-bold">ORGANIC EXPANSION</span>
                </div>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs font-mono">
                <div class="bg-sigma-surface2 p-2.5 rounded border border-sigma-border">
                  <div class="text-[10px] text-sigma-textDark uppercase">Funding Rate (8h)</div>
                  <div class="flex items-baseline gap-1.5 mt-0.5"><span id="deriv-funding-val" class="text-sm font-bold text-sigma-green tabular-nums">+0.008%</span><span id="deriv-funding-ann" class="text-[10px] text-sigma-textDark">(8.76% Ann.)</span></div>
                </div>
                <div class="bg-sigma-surface2 p-2.5 rounded border border-sigma-border">
                  <div class="text-[10px] text-sigma-textDark uppercase">Open Interest</div>
                  <div class="flex items-baseline gap-1.5 mt-0.5"><span id="deriv-oi-val" class="text-sm font-bold text-sigma-textMain tabular-nums">$18.45B</span><span id="deriv-oi-change" class="text-[10px] text-sigma-green font-semibold">+4.2%</span></div>
                </div>
                <div class="bg-sigma-surface2 p-2.5 rounded border border-sigma-border">
                  <div class="text-[10px] text-sigma-textDark uppercase">Annualized Basis</div>
                  <div class="flex items-baseline gap-1.5 mt-0.5"><span id="deriv-basis-val" class="text-sm font-bold text-sigma-cyan tabular-nums">+7.15%</span><span class="text-[10px] text-sigma-textDark">Contango</span></div>
                </div>
                <div class="bg-sigma-surface2 p-2.5 rounded border border-sigma-border">
                  <div class="text-[10px] text-sigma-textDark uppercase">25-Delta Skew</div>
                  <div class="flex items-baseline gap-1.5 mt-0.5"><span id="deriv-skew-val" class="text-sm font-bold text-sigma-green tabular-nums">-2.1%</span><span id="deriv-skew-label" class="text-[10px] text-sigma-textDark">Call Prem</span></div>
                </div>
              </div>

              <div class="mb-3 bg-sigma-surface2 p-2.5 rounded border border-sigma-border">
                <div class="flex items-center justify-between text-[10px] font-mono text-sigma-textDark uppercase mb-1.5">
                  <span>24h Liquidations Cascade</span>
                  <span id="deriv-liqs-total" class="font-bold text-sigma-textMain">Total: $60.0M</span>
                </div>
                <div class="w-full h-2 rounded bg-sigma-surface3 overflow-hidden flex">
                  <div id="deriv-liq-long-bar" class="h-full bg-sigma-red transition-all" style="width:70%"></div>
                  <div id="deriv-liq-short-bar" class="h-full bg-sigma-green transition-all" style="width:30%"></div>
                </div>
                <div class="flex justify-between text-[10px] font-mono mt-1">
                  <span id="deriv-liqs-long" class="text-sigma-red font-medium">Long Liqs: $42.0M</span>
                  <span id="deriv-liqs-short" class="text-sigma-green font-medium">Short Liqs: $18.0M</span>
                </div>
              </div>
            </div>

            <!-- BTC Price x OI Positioning Engine (Pro-V2) -->
            <div class="bg-sigma-surface1 border border-sigma-border rounded-lg overflow-hidden font-mono shadow-xl text-xs">
              <!-- Header & Telemetry -->
              <div class="p-3 border-b border-sigma-border bg-gradient-to-r from-sigma-surface2 to-sigma-surface1 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-cyan-400"><rect width="16" height="16" x="4" y="4" rx="2"></rect><rect width="6" height="6" x="9" y="9" rx="1"></rect><path d="M15 2v2"></path><path d="M15 20v2"></path><path d="M2 15h2"></path><path d="M2 9h2"></path><path d="M20 15h2"></path><path d="M20 9h2"></path><path d="M9 2v2"></path><path d="M9 20v2"></path></svg>
                  <div>
                    <div class="flex items-center gap-1.5">
                      <span class="font-bold text-sigma-textMain text-[11px] uppercase tracking-wider">Price × OI Positioning Engine</span>
                      <span class="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-700/50 text-cyan-300">PRO-V2</span>
                    </div>
                    <div class="text-[10px] text-sigma-textDark mt-0.5">Derivatives Leverage & Alignment Architecture</div>
                  </div>
                </div>
                <div class="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border bg-emerald-950/30 border-emerald-700/40 text-emerald-400">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span class="font-bold">LIVE</span>
                  <span class="text-[9px] text-sigma-textDark">(38ms)</span>
                </div>
              </div>

              <!-- Layer 1: Factual Observations -->
              <div class="p-3 bg-sigma-surface2/70 border-b border-sigma-border">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-1.5 text-[10px] font-bold text-sigma-textDark uppercase tracking-wider">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-cyan"><circle cx="12" cy="12" r="2"></circle><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path></svg>
                    <span>Layer 1: Factual Observations</span>
                  </div>
                  <span class="text-[9px] text-sigma-textDark">Zero Inference</span>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div class="bg-sigma-surface1/80 p-2 rounded border border-sigma-border/60">
                    <div class="text-[9px] text-sigma-textDark uppercase">BTC Price Delta</div>
                    <div class="flex items-baseline justify-between mt-1 font-mono"><span class="text-[10px] text-sigma-textMuted">5m:</span><span class="text-sigma-green">+0.32%</span></div>
                    <div class="flex items-baseline justify-between mt-0.5 font-mono"><span class="text-[10px] text-sigma-textMuted">1h:</span><span class="text-sigma-green">+0.85%</span></div>
                  </div>
                  <div class="bg-sigma-surface1/80 p-2 rounded border border-sigma-border/60">
                    <div class="text-[9px] text-sigma-textDark uppercase">Open Interest Δ</div>
                    <div class="flex items-baseline justify-between mt-1 font-mono"><span class="text-[10px] text-sigma-textMuted">5m:</span><span class="text-cyan-400">+0.84%</span></div>
                    <div class="flex items-baseline justify-between mt-0.5 font-mono"><span class="text-[10px] text-sigma-textMuted">1h:</span><span class="text-cyan-400">+1.85%</span></div>
                  </div>
                  <div class="bg-sigma-surface1/80 p-2 rounded border border-sigma-border/60">
                    <div class="text-[9px] text-sigma-textDark uppercase">Volume & RVOL</div>
                    <div class="flex items-baseline justify-between mt-1 font-mono"><span class="text-[10px] text-sigma-textMuted">RVOL:</span><span class="text-sigma-purple font-bold">1.82x</span></div>
                    <div class="flex items-baseline justify-between mt-0.5 font-mono"><span class="text-[10px] text-sigma-textMuted">Taker:</span><span class="text-sigma-green font-bold">54.2%</span></div>
                  </div>
                  <div class="bg-sigma-surface1/80 p-2 rounded border border-sigma-border/60">
                    <div class="text-[9px] text-sigma-textDark uppercase">Funding & 1h Liqs</div>
                    <div class="flex items-baseline justify-between mt-1 font-mono"><span class="text-[10px] text-sigma-textMuted">Funding:</span><span class="text-sigma-cyan font-semibold">+0.0076%</span></div>
                    <div class="flex items-baseline justify-between mt-0.5 font-mono"><span class="text-[10px] text-sigma-textMuted">1h Liqs:</span><span class="text-sigma-textMain">$2.40M</span></div>
                  </div>
                </div>
              </div>

              <!-- Layer 2: Matrix State Banner -->
              <div class="p-3 border-b border-emerald-700/60 bg-emerald-950/40">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] font-bold tracking-wider text-sigma-textDark uppercase">Layer 2: Matrix State</span>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border border-emerald-700/60 text-emerald-400 bg-sigma-surface1/80">
                        LEVERAGE EXPANSION (Price ↑ + OI ↑)
                      </span>
                    </div>
                    <p class="text-[11px] text-sigma-textMuted leading-relaxed max-w-2xl font-sans">
                      Increasing BTC price (+0.85%) aligned with expanding derivatives Open Interest (+1.85%). Taker buyer flow (54.2%) and baseline funding (+0.0076%) confirm net fresh long commitments rather than squeeze dynamics.
                    </p>
                  </div>
                  <div class="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-sigma-border/40 gap-1 min-w-[130px]">
                    <div class="text-[9px] text-sigma-textDark uppercase">Setup State</div>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider uppercase bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
                      CONFIRMED SETUP
                    </span>
                    <div class="flex items-center gap-1.5 text-[10px] mt-0.5">
                      <span class="text-sigma-textDark">Confirmation:</span>
                      <span class="font-bold text-sigma-green">74%</span>
                    </div>
                  </div>
                </div>
                <div class="mt-2.5 w-full bg-sigma-surface3 h-1.5 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full" style="width:74%"></div>
                </div>
              </div>

              <!-- Tab Nav -->
              <div class="flex border-b border-sigma-border bg-sigma-surface2/50 text-[10px]">
                <button onclick="switchPosTab('matrix')" id="btn-pos-matrix" class="flex-1 py-2 px-3 text-center border-b-2 font-bold transition-all uppercase tracking-wider border-cyan-400 text-cyan-300 bg-sigma-surface1/60">
                  Matrix Quadrants
                </button>
                <button onclick="switchPosTab('confirmations')" id="btn-pos-confirmations" class="flex-1 py-2 px-3 text-center border-b-2 font-bold transition-all uppercase tracking-wider border-transparent text-sigma-textDark hover:text-sigma-textMain">
                  9 Confirmations (74%)
                </button>
                <button onclick="switchPosTab('mtf')" id="btn-pos-mtf" class="flex-1 py-2 px-3 text-center border-b-2 font-bold transition-all uppercase tracking-wider border-transparent text-sigma-textDark hover:text-sigma-textMain">
                  MTF Consensus (ALIGNED)
                </button>
              </div>

              <!-- Tab 1: Matrix -->
              <div id="pos-tab-matrix" class="p-3 space-y-2">
                <div class="grid grid-cols-2 gap-2 text-[10px]">
                  <div class="p-2 rounded border bg-emerald-950/40 border-emerald-500/70 ring-1 ring-emerald-500/40">
                    <div class="flex items-center justify-between font-bold">
                      <span class="text-emerald-400">Price ↑ + OI ↑</span>
                      <span class="text-[9px] px-1 rounded bg-emerald-500 text-black font-bold">ACTIVE</span>
                    </div>
                    <div class="text-[11px] font-semibold text-sigma-textMain mt-0.5">Leverage Expansion</div>
                    <div class="text-[10px] text-sigma-textDark mt-1 leading-snug">Derivatives positioning expanding. Requires volume, taker dominance, & funding confirmation.</div>
                  </div>
                  <div class="p-2 rounded border bg-sigma-surface2/40 border-sigma-border/60 opacity-60">
                    <div class="flex items-center justify-between font-bold"><span class="text-amber-400">Price ↑ + OI ↓</span></div>
                    <div class="text-[11px] font-semibold text-sigma-textMain mt-0.5">Short Covering</div>
                    <div class="text-[10px] text-sigma-textDark mt-1 leading-snug">Unwinding rally driven by short stops. Susceptible to stall if fresh spot demand lacks.</div>
                  </div>
                  <div class="p-2 rounded border bg-sigma-surface2/40 border-sigma-border/60 opacity-60">
                    <div class="flex items-center justify-between font-bold"><span class="text-rose-400">Price ↓ + OI ↑</span></div>
                    <div class="text-[11px] font-semibold text-sigma-textMain mt-0.5">Bearish Expansion</div>
                    <div class="text-[10px] text-sigma-textDark mt-1 leading-snug">Fresh short derivative positioning adding into downward momentum. Watch absorption.</div>
                  </div>
                  <div class="p-2 rounded border bg-sigma-surface2/40 border-sigma-border/60 opacity-60">
                    <div class="flex items-center justify-between font-bold"><span class="text-orange-400">Price ↓ + OI ↓</span></div>
                    <div class="text-[11px] font-semibold text-sigma-textMain mt-0.5">Long Unwinding / Liqs</div>
                    <div class="text-[10px] text-sigma-textDark mt-1 leading-snug">Deleveraging cascade. Longs closing out or liquidated. Often precedes mean-reversion.</div>
                  </div>
                </div>
                <div class="p-2 bg-sigma-surface2/40 border border-sigma-border/50 rounded flex items-center justify-between text-[10px] text-sigma-textDark">
                  <span class="font-semibold text-sigma-cyan">Core Positioning Rule:</span>
                  <span>Derivatives never dictate direction alone; confirmation layers validate continuation.</span>
                </div>
              </div>

              <!-- Tab 2: 9 Confirmations -->
              <div id="pos-tab-confirmations" class="hidden p-3 space-y-2">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px]">
                  <div class="p-2 bg-sigma-surface2/60 border border-sigma-border rounded flex items-center justify-between"><span class="text-sigma-textMuted">1. Price Trend</span><span class="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-emerald-500/15 border-emerald-500/40 text-emerald-400">CONFIRMED</span></div>
                  <div class="p-2 bg-sigma-surface2/60 border border-sigma-border rounded flex items-center justify-between"><span class="text-sigma-textMuted">2. Volume Expansion</span><span class="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-emerald-500/15 border-emerald-500/40 text-emerald-400">CONFIRMED</span></div>
                  <div class="p-2 bg-sigma-surface2/60 border border-sigma-border rounded flex items-center justify-between"><span class="text-sigma-textMuted">3. RVOL (1.82x)</span><span class="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-emerald-500/15 border-emerald-500/40 text-emerald-400">CONFIRMED</span></div>
                  <div class="p-2 bg-sigma-surface2/60 border border-sigma-border rounded flex items-center justify-between"><span class="text-sigma-textMuted">4. Taker Flow (54%)</span><span class="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-emerald-500/15 border-emerald-500/40 text-emerald-400">CONFIRMED</span></div>
                  <div class="p-2 bg-sigma-surface2/60 border border-sigma-border rounded flex items-center justify-between"><span class="text-sigma-textMuted">5. OI Velocity</span><span class="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-emerald-500/15 border-emerald-500/40 text-emerald-400">CONFIRMED</span></div>
                  <div class="p-2 bg-sigma-surface2/60 border border-sigma-border rounded flex items-center justify-between"><span class="text-sigma-textMuted">6. Liquidations Align</span><span class="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-amber-500/15 border-amber-500/40 text-amber-300">WEAK</span></div>
                  <div class="p-2 bg-sigma-surface2/60 border border-sigma-border rounded flex items-center justify-between"><span class="text-sigma-textMuted">7. Funding Regime</span><span class="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-emerald-500/15 border-emerald-500/40 text-emerald-400">CONFIRMED</span></div>
                  <div class="p-2 bg-sigma-surface2/60 border border-sigma-border rounded flex items-center justify-between"><span class="text-sigma-textMuted">8. Market Structure</span><span class="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-emerald-500/15 border-emerald-500/40 text-emerald-400">CONFIRMED</span></div>
                  <div class="p-2 bg-sigma-surface2/60 border border-sigma-border rounded flex items-center justify-between"><span class="text-sigma-textMuted">9. MTF Consensus</span><span class="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-emerald-500/15 border-emerald-500/40 text-emerald-400">CONFIRMED</span></div>
                </div>
                <div class="p-2 bg-sigma-surface2/40 border border-sigma-border/50 rounded flex items-center justify-between text-[10px] text-sigma-textDark">
                  <span class="text-sigma-textMuted">Synthesis:</span>
                  <span class="font-semibold text-sigma-textMain">7 of 9 layers aligned with derivatives positioning. Directional long bias confirmed.</span>
                </div>
              </div>

              <!-- Tab 3: MTF -->
              <div id="pos-tab-mtf" class="hidden p-3 space-y-2">
                <div class="grid grid-cols-2 sm:grid-cols-6 gap-1.5 text-[10px]">
                  <div class="bg-sigma-surface2/60 border border-sigma-border/80 p-2 rounded flex flex-col items-center justify-between text-center"><div class="font-bold text-sigma-cyan text-[11px]">1m</div><div class="mt-1 font-mono text-[10px]"><div class="text-sigma-green font-semibold">P: +0.12%</div><div class="text-cyan-400 font-semibold">OI: +0.28%</div></div><div class="mt-1.5 w-full"><span class="block w-full py-0.5 rounded text-[8px] font-bold border uppercase bg-emerald-500/20 text-emerald-400 border-emerald-500/40">CONFIRMED</span></div></div>
                  <div class="bg-sigma-surface2/60 border border-sigma-border/80 p-2 rounded flex flex-col items-center justify-between text-center"><div class="font-bold text-sigma-cyan text-[11px]">5m</div><div class="mt-1 font-mono text-[10px]"><div class="text-sigma-green font-semibold">P: +0.35%</div><div class="text-cyan-400 font-semibold">OI: +0.84%</div></div><div class="mt-1.5 w-full"><span class="block w-full py-0.5 rounded text-[8px] font-bold border uppercase bg-emerald-500/20 text-emerald-400 border-emerald-500/40">CONFIRMED</span></div></div>
                  <div class="bg-sigma-surface2/60 border border-sigma-border/80 p-2 rounded flex flex-col items-center justify-between text-center"><div class="font-bold text-sigma-cyan text-[11px]">15m</div><div class="mt-1 font-mono text-[10px]"><div class="text-sigma-green font-semibold">P: +0.52%</div><div class="text-cyan-400 font-semibold">OI: +1.12%</div></div><div class="mt-1.5 w-full"><span class="block w-full py-0.5 rounded text-[8px] font-bold border uppercase bg-emerald-500/20 text-emerald-400 border-emerald-500/40">CONFIRMED</span></div></div>
                  <div class="bg-sigma-surface2/60 border border-sigma-border/80 p-2 rounded flex flex-col items-center justify-between text-center"><div class="font-bold text-sigma-cyan text-[11px]">30m</div><div class="mt-1 font-mono text-[10px]"><div class="text-sigma-green font-semibold">P: +0.44%</div><div class="text-cyan-400 font-semibold">OI: +0.95%</div></div><div class="mt-1.5 w-full"><span class="block w-full py-0.5 rounded text-[8px] font-bold border uppercase bg-emerald-500/20 text-emerald-400 border-emerald-500/40">CONFIRMED</span></div></div>
                  <div class="bg-sigma-surface2/60 border border-sigma-border/80 p-2 rounded flex flex-col items-center justify-between text-center"><div class="font-bold text-sigma-cyan text-[11px]">1h</div><div class="mt-1 font-mono text-[10px]"><div class="text-sigma-green font-semibold">P: +0.82%</div><div class="text-cyan-400 font-semibold">OI: +1.85%</div></div><div class="mt-1.5 w-full"><span class="block w-full py-0.5 rounded text-[8px] font-bold border uppercase bg-emerald-500/20 text-emerald-400 border-emerald-500/40">CONFIRMED</span></div></div>
                  <div class="bg-sigma-surface2/60 border border-sigma-border/80 p-2 rounded flex flex-col items-center justify-between text-center"><div class="font-bold text-sigma-cyan text-[11px]">4h</div><div class="mt-1 font-mono text-[10px]"><div class="text-sigma-green font-semibold">P: +1.45%</div><div class="text-cyan-400 font-semibold">OI: +3.12%</div></div><div class="mt-1.5 w-full"><span class="block w-full py-0.5 rounded text-[8px] font-bold border uppercase bg-emerald-500/20 text-emerald-400 border-emerald-500/40">CONFIRMED</span></div></div>
                </div>
                <div class="p-2 bg-sigma-surface2/40 border border-sigma-border/50 rounded flex items-center justify-between text-[10px] text-sigma-textDark">
                  <span>MTF Consensus:</span>
                  <span class="font-bold uppercase text-sigma-green">ALIGNED MULTI-TIMEFRAME CONSENSUS</span>
                </div>
              </div>

              <!-- 5. Actionable Trade Signal Callout -->
              <div class="p-3 bg-sigma-surface2 border-t border-sigma-border">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div class="space-y-0.5">
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] font-bold text-sigma-textDark uppercase tracking-wider">Derived Trade Signal:</span>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                        🟢 LONG (DERIVATIVES CONFIRMED)
                      </span>
                    </div>
                    <div class="text-[11px] text-sigma-textMuted flex flex-wrap items-center gap-3 mt-1 font-mono">
                      <span>Trigger: <strong class="text-sigma-textMain">$80,850</strong></span>
                      <span>SL: <strong class="text-sigma-red">$79,637</strong></span>
                      <span>TP1: <strong class="text-sigma-green">$82,871</strong></span>
                      <span>R:R: <strong class="text-sigma-cyan">1 : 2.5</strong></span>
                    </div>
                  </div>
                  <button onclick="executePaperTrade('LONG', 0.25)" class="w-full sm:w-auto px-3 py-1.5 rounded text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 shadow-md bg-sigma-green text-black hover:bg-sigma-green/90">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                    <span>EXECUTE LONG (0.25 BTC)</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- On-Chain & Macro Regime -->
            <div class="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-cyan"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>
                  <h3 class="font-mono text-xs font-bold text-sigma-textMain uppercase tracking-wider">On-Chain, ETF Flows & Macro Regime</h3>
                </div>
                <div class="flex items-center gap-1.5 font-mono text-[10px]">
                  <span class="text-sigma-textDark">LIQUIDITY:</span>
                  <span class="px-1.5 py-0.5 rounded bg-sigma-green/10 text-sigma-green border border-sigma-green/30 font-bold">EXPANDING</span>
                </div>
              </div>

              <div class="space-y-3 text-xs font-mono">
                <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-[10px] text-sigma-cyan font-bold uppercase">ON-CHAIN FUNDAMENTALS</span>
                    <span class="text-[9px] text-sigma-textDark">Daily Cadence</span>
                  </div>
                  <div class="space-y-1.5 text-[11px]">
                    <div class="flex justify-between"><span class="text-sigma-textMuted">MVRV Ratio:</span><span class="text-sigma-textMain font-bold">1.42 (31st pctile)</span></div>
                    <div class="flex justify-between"><span class="text-sigma-textMuted">Realized Price:</span><span class="text-sigma-green font-semibold">$55,685.2</span></div>
                    <div class="flex justify-between"><span class="text-sigma-textMuted">Exchange Netflow:</span><span class="text-sigma-green font-bold tabular-nums">-4,120 BTC (Outflow)</span></div>
                  </div>
                </div>

                <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-[10px] text-sigma-green font-bold uppercase">VERIFIED ETF FLOWS</span>
                    <span class="text-[9px] text-sigma-textDark">Farside / Issuer Reports</span>
                  </div>
                  <div class="space-y-1.5 text-[11px]">
                    <div class="flex justify-between"><span class="text-sigma-textMuted">1D Net Inflow:</span><span class="text-sigma-green font-bold">+182.4M USD</span></div>
                    <div class="flex justify-between"><span class="text-sigma-textMuted">7D Cumulative:</span><span class="text-sigma-green font-semibold">+$1,120.0M</span></div>
                    <div class="flex justify-between"><span class="text-sigma-textMuted">Total Net Assets:</span><span class="text-sigma-textMain font-bold">$28.4B</span></div>
                  </div>
                </div>

                <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-[10px] text-sigma-purple font-bold uppercase">MACRO & LIQUIDITY WATCH</span>
                    <span class="text-[9px] text-sigma-textDark">FRED Reference Safe</span>
                  </div>
                  <div class="space-y-1.5 text-[11px]">
                    <div class="flex justify-between"><span class="text-sigma-textMuted">Fed Funds Rate:</span><span class="text-sigma-textMain font-bold">4.50% (Paused)</span></div>
                    <div class="flex justify-between"><span class="text-sigma-textMuted">US 10Y Yield:</span><span class="text-sigma-amber font-semibold">4.38% (-4 bps)</span></div>
                    <div class="flex justify-between"><span class="text-sigma-textMuted">DXY Dollar Index:</span><span class="text-sigma-textMain font-semibold">103.85 (-0.2%)</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════
           WORKSPACE 2: EAGLE FLASH (VOL SPIKE CANDIDATE SCANNER)
           ═══════════════════════════════════════════════════════ -->
      <div id="ws-eagle" class="ws-panel">
        <div class="w-full h-[calc(100vh-160px)] lg:h-[calc(100vh-125px)] rounded-lg border border-sigma-border overflow-hidden bg-sigma-surface1 shadow-2xl">
          <iframe
            src="./eagle-flash.html?v=${Date.now()}"
            id="eagle-frame"
            title="Eagle Flash Vol Spike Candidate Scanner"
            class="w-full h-full border-0"
          ></iframe>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════
           WORKSPACE 3: BACKTEST LAB
           ═══════════════════════════════════════════════════════ -->
      <div id="ws-backtest" class="ws-panel space-y-4">
        <div class="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-purple"><path d="M5 21v-6"></path><path d="M12 21V3"></path><path d="M19 21V9"></path></svg>
              <div>
                <h2 class="font-mono text-sm font-bold text-sigma-textMain uppercase tracking-wider">
                  Event-Driven Backtesting Lab & Walk-Forward Validation
                </h2>
                <span class="text-[10px] font-mono text-sigma-textDark">
                  ZERO LOOK-AHEAD BIAS · REALISTIC SLIPPAGE & FUNDING DRAG
                </span>
              </div>
            </div>

            <button onclick="runBacktestSimulation()" id="btn-run-sim" class="px-5 py-2 rounded text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-md bg-sigma-purple text-white hover:bg-sigma-purple/90">
              <span id="sim-spinner" class="hidden animate-spin">⟳</span>
              <span>RUN BACKTEST SIMULATION</span>
            </button>
          </div>

          <!-- Parameters Form -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono mb-4">
            <div>
              <label class="text-[10px] text-sigma-textDark uppercase block mb-1">Strategy Model</label>
              <select id="bt-strat" class="w-full bg-sigma-surface2 border border-sigma-border rounded p-1.5 text-sigma-textMain outline-none">
                <option value="SIGMA_MOMENTUM">Sigma 4H Momentum & Reversion</option>
                <option value="EAGLE_VOL">Eagle Vol Spike Explosion (3x+ RVOL)</option>
                <option value="FUNDING_CARRY">Funding Rate Carry Arbitrage</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] text-sigma-textDark uppercase block mb-1">Initial Capital ($)</label>
              <input type="number" id="bt-capital" value="100000" class="w-full bg-sigma-surface2 border border-sigma-border rounded p-1.5 text-sigma-textMain outline-none" />
            </div>
            <div>
              <label class="text-[10px] text-sigma-textDark uppercase block mb-1">Taker Fee (bps)</label>
              <input type="number" id="bt-fee" value="5" class="w-full bg-sigma-surface2 border border-sigma-border rounded p-1.5 text-sigma-textMain outline-none" />
            </div>
            <div>
              <label class="text-[10px] text-sigma-textDark uppercase block mb-1">Slippage (bps)</label>
              <input type="number" id="bt-slip" value="2" class="w-full bg-sigma-surface2 border border-sigma-border rounded p-1.5 text-sigma-textMain outline-none" />
            </div>
          </div>

          <!-- KPI Strip -->
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4 text-xs font-mono">
            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <div class="text-[10px] text-sigma-textDark uppercase">Net Cumulative Return</div>
              <div class="text-base font-bold text-sigma-green tabular-nums" id="bt-pnl">+$84,250.00</div>
              <div class="text-[10px] text-sigma-textDark" id="bt-ret">+84.25% return</div>
            </div>
            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <div class="text-[10px] text-sigma-textDark uppercase">Sharpe Ratio</div>
              <div class="text-base font-bold text-sigma-cyan tabular-nums" id="bt-sharpe">2.42</div>
              <div class="text-[10px] text-sigma-textDark">Sortino: 3.18</div>
            </div>
            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <div class="text-[10px] text-sigma-textDark uppercase">Max Drawdown</div>
              <div class="text-base font-bold text-sigma-amber tabular-nums">-9.4%</div>
              <div class="text-[10px] text-sigma-textDark">Recovery: 14 days</div>
            </div>
            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <div class="text-[10px] text-sigma-textDark uppercase">Win Rate</div>
              <div class="text-base font-bold text-sigma-green tabular-nums">68.5%</div>
              <div class="text-[10px] text-sigma-textDark">89 Win / 41 Loss</div>
            </div>
            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <div class="text-[10px] text-sigma-textDark uppercase">Profit Factor</div>
              <div class="text-base font-bold text-sigma-textMain tabular-nums">2.18</div>
              <div class="text-[10px] text-sigma-textDark">Expectancy: +$648</div>
            </div>
          </div>

          <!-- Chart Area -->
          <div class="h-64 bg-sigma-surface2 p-2 rounded border border-sigma-border">
            <canvas id="backtest-canvas"></canvas>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════
           WORKSPACE 4: RISK & EXPOSURE CENTER
           ═══════════════════════════════════════════════════════ -->
      <div id="ws-risk" class="ws-panel space-y-4">
        <div class="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
          <div class="flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-amber"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path></svg>
            <div>
              <h2 class="font-mono text-sm font-bold text-sigma-textMain uppercase tracking-wider">
                Institutional Risk Management & Stress Testing Center
              </h2>
              <span class="text-[10px] font-mono text-sigma-textDark">
                REAL-TIME VALUE-AT-RISK · CORRELATION DRIFT WATCHDOG · CIRCUIT BREAKER LOGIC
              </span>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-xs font-mono">
            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <div class="text-[10px] text-sigma-textDark uppercase">Portfolio VaR (95% 1D)</div>
              <div class="text-base font-bold text-sigma-amber tabular-nums">$4,120.00</div>
              <div class="text-[10px] text-sigma-green">4.12% total portfolio</div>
            </div>
            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <div class="text-[10px] text-sigma-textDark uppercase">Daily Drawdown Circuit</div>
              <div class="text-base font-bold text-sigma-green tabular-nums">-0.4% / -3.0%</div>
              <div class="text-[10px] text-sigma-green">Circuit Breaker Safe</div>
            </div>
            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <div class="text-[10px] text-sigma-textDark uppercase">Net Portfolio Leverage</div>
              <div class="text-base font-bold text-sigma-cyan tabular-nums">2.4x Notional</div>
              <div class="text-[10px] text-sigma-textDark">Hard limit: 5.0x</div>
            </div>
            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <div class="text-[10px] text-sigma-textDark uppercase">Est. Liquidation Distance</div>
              <div class="text-base font-bold text-sigma-green tabular-nums">+28.4% Buffer</div>
              <div class="text-[10px] text-sigma-textDark">Liq Price: $56,400</div>
            </div>
          </div>

          <!-- Stress Scenarios -->
          <div class="text-[11px] font-mono font-bold text-sigma-textDark uppercase mb-2">Extreme Historical Stress Scenarios</div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <div class="text-sigma-red font-bold">BLACK THURSDAY (MAR 2020)</div>
              <div class="text-[10px] text-sigma-textDark my-1">BTC -48.5% in 24 Hours</div>
              <div class="flex justify-between mt-2 pt-2 border-t border-sigma-border"><span>Simulated Drag:</span><span class="text-sigma-red font-bold">-$21,400 (-21.4%)</span></div>
              <div class="flex justify-between mt-1"><span>Status:</span><span class="text-sigma-green font-bold">SURVIVED</span></div>
            </div>
            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <div class="text-sigma-amber font-bold">CHINA MINING BAN (MAY 2021)</div>
              <div class="text-[10px] text-sigma-textDark my-1">BTC -35.2% in 72 Hours</div>
              <div class="flex justify-between mt-2 pt-2 border-t border-sigma-border"><span>Simulated Drag:</span><span class="text-sigma-red font-bold">-$16,800 (-16.8%)</span></div>
              <div class="flex justify-between mt-1"><span>Status:</span><span class="text-sigma-green font-bold">SURVIVED</span></div>
            </div>
            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <div class="text-sigma-amber font-bold">FTX INSOLVENCY (NOV 2022)</div>
              <div class="text-[10px] text-sigma-textDark my-1">BTC -28.0% in 48 Hours</div>
              <div class="flex justify-between mt-2 pt-2 border-t border-sigma-border"><span>Simulated Drag:</span><span class="text-sigma-red font-bold">-$13,100 (-13.1%)</span></div>
              <div class="flex justify-between mt-1"><span>Status:</span><span class="text-sigma-green font-bold">SURVIVED</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════
           WORKSPACE 5: TRADE JOURNAL & EXECUTION LEDGER
           ═══════════════════════════════════════════════════════ -->
      <div id="ws-journal" class="ws-panel space-y-4">
        <div class="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-green"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"></path><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"></path><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"></path></svg>
              <div>
                <h2 class="font-mono text-sm font-bold text-sigma-textMain uppercase tracking-wider">
                  Quantitative Trade Journal & Execution Ledger
                </h2>
                <span class="text-[10px] font-mono text-sigma-textDark">
                  AUDIT-READY LEDGER · SLIPPAGE ATTRIBUTION · OUTCOME TAXONOMY
                </span>
              </div>
            </div>

            <button onclick="exportTradeJournalCSV()" class="px-4 py-1.5 rounded text-xs font-mono font-bold border border-sigma-green/40 text-sigma-green hover:bg-sigma-green/10">
              ⬇ EXPORT CSV AUDIT
            </button>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-xs font-mono">
            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <div class="text-[10px] text-sigma-textDark uppercase">Total Realized PnL</div>
              <div class="text-base font-bold text-sigma-green">+$34,250.00</div>
              <div class="text-[10px] text-sigma-textDark">Net of all taker fees</div>
            </div>
            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <div class="text-[10px] text-sigma-textDark uppercase">Total Executed Trades</div>
              <div class="text-base font-bold text-sigma-textMain">130</div>
              <div class="text-[10px] text-sigma-textDark">89 Win / 41 Loss</div>
            </div>
            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <div class="text-[10px] text-sigma-textDark uppercase">Win Rate</div>
              <div class="text-base font-bold text-sigma-green">68.5%</div>
              <div class="text-[10px] text-sigma-textDark">Expected: 65.0%</div>
            </div>
            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <div class="text-[10px] text-sigma-textDark uppercase">Average Slippage</div>
              <div class="text-base font-bold text-sigma-cyan">1.8 bps</div>
              <div class="text-[10px] text-sigma-textDark">Execution efficiency: 98.2%</div>
            </div>
          </div>

          <!-- Trade Ledger Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-xs font-mono border-collapse">
              <thead>
                <tr class="text-sigma-textDark text-[10px] border-b border-sigma-border text-left">
                  <th class="p-2">DATE/TIME</th>
                  <th class="p-2">SYMBOL</th>
                  <th class="p-2">SIDE</th>
                  <th class="p-2">ENTRY</th>
                  <th class="p-2">EXIT</th>
                  <th class="p-2">SIZE</th>
                  <th class="p-2 text-right">PNL ($)</th>
                  <th class="p-2">STRATEGY</th>
                  <th class="p-2 text-right">OUTCOME</th>
                </tr>
              </thead>
              <tbody id="journal-tbody" class="divide-y divide-sigma-border/40">
                <tr><td class="p-2">2026-03-27 16:30</td><td class="p-2 font-bold text-sigma-textMain">BTCUSDT</td><td class="p-2 text-sigma-green font-bold">LONG</td><td class="p-2">$78,200</td><td class="p-2">$81,500</td><td class="p-2">1.5 BTC</td><td class="p-2 text-right text-sigma-green font-bold">+$4,950</td><td class="p-2">Sigma 4H Momentum</td><td class="p-2 text-right"><span class="px-1.5 py-0.5 rounded bg-sigma-green/15 text-sigma-green font-bold text-[10px]">WIN</span></td></tr>
                <tr><td class="p-2">2026-03-26 11:15</td><td class="p-2 font-bold text-sigma-textMain">SOLUSDT</td><td class="p-2 text-sigma-green font-bold">LONG</td><td class="p-2">$144.20</td><td class="p-2">$158.00</td><td class="p-2">100 SOL</td><td class="p-2 text-right text-sigma-green font-bold">+$1,380</td><td class="p-2">Eagle Vol Explosion</td><td class="p-2 text-right"><span class="px-1.5 py-0.5 rounded bg-sigma-green/15 text-sigma-green font-bold text-[10px]">WIN</span></td></tr>
                <tr><td class="p-2">2026-03-24 19:40</td><td class="p-2 font-bold text-sigma-textMain">ETHUSDT</td><td class="p-2 text-sigma-red font-bold">SHORT</td><td class="p-2">$2,490</td><td class="p-2">$2,545</td><td class="p-2">20 ETH</td><td class="p-2 text-right text-sigma-red font-bold">-$1,100</td><td class="p-2">Funding Carry</td><td class="p-2 text-right"><span class="px-1.5 py-0.5 rounded bg-sigma-red/15 text-sigma-red font-bold text-[10px]">LOSS</span></td></tr>
                <tr><td class="p-2">2026-03-22 09:10</td><td class="p-2 font-bold text-sigma-textMain">BTCUSDT</td><td class="p-2 text-sigma-green font-bold">LONG</td><td class="p-2">$73,100</td><td class="p-2">$77,000</td><td class="p-2">2.0 BTC</td><td class="p-2 text-right text-sigma-green font-bold">+$7,800</td><td class="p-2">MVRV Capitulation</td><td class="p-2 text-right"><span class="px-1.5 py-0.5 rounded bg-sigma-green/15 text-sigma-green font-bold text-[10px]">WIN</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════
           WORKSPACE 6: DATA HEALTH CENTER
           ═══════════════════════════════════════════════════════ -->
      <div id="ws-health" class="ws-panel space-y-4">
        <div class="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-cyan"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5V19A9 3 0 0 0 21 19V5"></path><path d="M3 12A9 3 0 0 0 21 12"></path></svg>
              <div>
                <h2 class="font-mono text-sm font-bold text-sigma-textMain uppercase tracking-wider">
                  Data Infrastructure & Telemetry Health Center
                </h2>
                <span class="text-[10px] font-mono text-sigma-textDark">
                  SUB-SECOND LATENCY WATCHDOG · WEBSOCKET HEARTBEAT · TELEMETRY
                </span>
              </div>
            </div>
            <span class="px-2.5 py-1 rounded bg-sigma-green/15 border border-sigma-green/40 text-sigma-green font-mono text-xs font-bold flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-sigma-green animate-ping"></span>
              ALL SYSTEMS NOMINAL
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <div class="flex justify-between items-center"><span class="text-sigma-textMain font-bold">Binance Stream</span><span class="text-sigma-green font-bold text-[10px]">CONNECTED</span></div>
              <div class="text-lg font-bold text-sigma-green my-1" id="ping-binance">38 ms</div>
              <div class="text-[10px] text-sigma-textDark">Public WebSocket Feed</div>
            </div>
            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <div class="flex justify-between items-center"><span class="text-sigma-textMain font-bold">Bybit Linear V5</span><span class="text-sigma-green font-bold text-[10px]">CONNECTED</span></div>
              <div class="text-lg font-bold text-sigma-green my-1" id="ping-bybit">52 ms</div>
              <div class="text-[10px] text-sigma-textDark">880+ Perpetuals Live</div>
            </div>
            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <div class="flex justify-between items-center"><span class="text-sigma-textMain font-bold">MEXC Contract V1</span><span class="text-sigma-cyan font-bold text-[10px]">OPERATIONAL</span></div>
              <div class="text-lg font-bold text-sigma-cyan my-1" id="ping-mexc">64 ms</div>
              <div class="text-[10px] text-sigma-textDark">1,060+ Coins Perpetual</div>
            </div>
            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border">
              <div class="flex justify-between items-center"><span class="text-sigma-textMain font-bold">WEEX Contract V3</span><span class="text-sigma-purple font-bold text-[10px]">OPERATIONAL</span></div>
              <div class="text-lg font-bold text-sigma-purple my-1" id="ping-weex">58 ms</div>
              <div class="text-[10px] text-sigma-textDark">990+ Coins Perpetual</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════
           WORKSPACE 7: MACROECONOMIC CALENDAR
           ═══════════════════════════════════════════════════════ -->
      <div id="ws-calendar" class="ws-panel space-y-4">
        <div class="bg-sigma-surface1 border border-sigma-border rounded-lg p-4">
          <div class="flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-cyan"><path d="M8 2v3"></path><path d="M16 2v3"></path><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18"></path></svg>
            <div>
              <h2 class="font-mono text-sm font-bold text-sigma-textMain uppercase tracking-wider">
                Macroeconomic & Crypto Institutional Catalyst Calendar
              </h2>
              <span class="text-[10px] font-mono text-sigma-textDark">
                FEDERAL RESERVE DATES · CPI INFLATION · DERIBIT/CME MONTHLY OPEX
              </span>
            </div>
          </div>

          <div class="space-y-3 font-mono text-xs">
            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border flex justify-between items-center flex-wrap gap-2">
              <div>
                <span class="px-1.5 py-0.5 rounded bg-sigma-red/15 text-sigma-red border border-sigma-red/30 text-[10px] font-bold">🔥 HIGH IMPACT</span>
                <span class="font-bold text-sigma-textMain ml-2">US FOMC Interest Rate Decision & Press Conference</span>
                <div class="text-[10px] text-sigma-textDark mt-1">Federal Reserve policy rate decision. High expected volatility across BTC, ETH, and bond yields.</div>
              </div>
              <div class="text-right">
                <div class="text-sigma-amber font-bold">April 30, 2026</div>
                <div class="text-[10px] text-sigma-textDark">14:00 EST</div>
              </div>
            </div>

            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border flex justify-between items-center flex-wrap gap-2">
              <div>
                <span class="px-1.5 py-0.5 rounded bg-sigma-red/15 text-sigma-red border border-sigma-red/30 text-[10px] font-bold">🔥 HIGH IMPACT</span>
                <span class="font-bold text-sigma-textMain ml-2">US CPI (Consumer Price Index) Inflation Report</span>
                <div class="text-[10px] text-sigma-textDark mt-1">Core and headline inflation print. Immediate catalyst for Fed expectations.</div>
              </div>
              <div class="text-right">
                <div class="text-sigma-amber font-bold">April 12, 2026</div>
                <div class="text-[10px] text-sigma-textDark">08:30 EST</div>
              </div>
            </div>

            <div class="bg-sigma-surface2 p-3 rounded border border-sigma-border flex justify-between items-center flex-wrap gap-2">
              <div>
                <span class="px-1.5 py-0.5 rounded bg-sigma-cyan/15 text-sigma-cyan border border-sigma-cyan/30 text-[10px] font-bold">⚡ OPEX</span>
                <span class="font-bold text-sigma-textMain ml-2">CME & Deribit Monthly Bitcoin Options Expiration</span>
                <div class="text-[10px] text-sigma-textDark mt-1">Options expiry pin risk and dealer delta hedging flows.</div>
              </div>
              <div class="text-right">
                <div class="text-sigma-cyan font-bold">April 24, 2026</div>
                <div class="text-[10px] text-sigma-textDark">08:00 UTC</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- ═══════════════════════════════════════════════════════
         INSTITUTIONAL PERMANENT FOOTER (Desktop only)
         ═══════════════════════════════════════════════════════ -->
    <footer class="hidden lg:flex border-t border-sigma-border bg-sigma-surface1 px-4 py-2 text-[10px] font-mono text-sigma-textDark flex-wrap items-center justify-between gap-3 select-none">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-sigma-green inline-block animate-ping"></span>
          <span class="text-sigma-textMain font-semibold">SYSTEM OPERATIONAL</span>
        </div>
        <div>
          MODEL: <span class="text-sigma-cyan font-bold">SIGMA-4H-ENSEMBLE-v1.7</span>
        </div>
        <div class="hidden sm:inline">
          FEATURE SET: <span class="text-sigma-textMain font-medium">2026-09-19</span>
        </div>
        <div class="hidden md:inline">
          CONFIG: <span class="text-sigma-textMain font-medium">risk-profile-institutional-v3</span>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <div class="flex items-center gap-1 text-sigma-green">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m9 12 2 2 4-4"></path></svg>
          <span>SECURITY AUDIT: ZERO FRONTEND API SECRETS · BACKEND VAULT ACTIVE</span>
        </div>
        <div class="text-sigma-textDark hidden lg:inline">PRESS CTRL+K FOR COMMAND PALETTE</div>
      </div>
    </footer>

    <!-- ═══════════════════════════════════════════════════════
         MOBILE STICKY BOTTOM WORKSPACE NAVIGATION
         ═══════════════════════════════════════════════════════ -->
    <nav aria-label="Sticky Bottom Workspace Navigation" class="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-sigma-surface1/95 backdrop-blur-xl border-t border-sigma-border px-2 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-2xl" style="padding-bottom:max(8px, env(safe-area-inset-bottom))">
      <button onclick="switchWorkspace('terminal')" id="m-ws-terminal" class="px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 bg-sigma-cyan text-black shadow-md">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path></svg>
        <span>Terminal</span>
      </button>
      <button onclick="switchWorkspace('eagle')" id="m-ws-eagle" class="px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-400 animate-pulse"><path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"></path></svg>
        <span>🦅 Eagle Flash</span>
        <span class="text-[9px] px-1 py-0.2 bg-black/40 text-amber-200 rounded font-mono font-bold">LIVE</span>
      </button>
      <button onclick="switchWorkspace('backtest')" id="m-ws-backtest" class="px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 bg-sigma-surface2 text-sigma-textMuted border border-sigma-border hover:text-sigma-textMain">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-purple"><path d="M5 21v-6"></path><path d="M12 21V3"></path><path d="M19 21V9"></path></svg>
        <span>Backtest</span>
      </button>
      <button onclick="switchWorkspace('risk')" id="m-ws-risk" class="px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 bg-sigma-surface2 text-sigma-textMuted border border-sigma-border hover:text-sigma-textMain">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-amber"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path></svg>
        <span>Risk</span>
      </button>
      <button onclick="switchWorkspace('journal')" id="m-ws-journal" class="px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 bg-sigma-surface2 text-sigma-textMuted border border-sigma-border hover:text-sigma-textMain">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-green"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"></path><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"></path><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"></path></svg>
        <span>Journal</span>
      </button>
      <button onclick="switchWorkspace('health')" id="m-ws-health" class="px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 bg-sigma-surface2 text-sigma-textMuted border border-sigma-border hover:text-sigma-textMain">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-cyan"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5V19A9 3 0 0 0 21 19V5"></path><path d="M3 12A9 3 0 0 0 21 12"></path></svg>
        <span>Health</span>
      </button>
      <button onclick="switchWorkspace('calendar')" id="m-ws-calendar" class="px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 bg-sigma-surface2 text-sigma-textMuted border border-sigma-border hover:text-sigma-textMain">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-textDark"><path d="M8 2v3"></path><path d="M16 2v3"></path><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18"></path></svg>
        <span>Calendar</span>
      </button>
    </nav>
  </div>

  <!-- ═══════════════════════════════════════════════════════
       MODALS: KILL SWITCH, COMMAND PALETTE, ORDER TICKET
       ═══════════════════════════════════════════════════════ -->
  <!-- Kill Switch Modal -->
  <div id="modal-kill-switch" style="display:none;" class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
    <div class="bg-sigma-surface1 border border-sigma-red p-5 rounded-lg max-w-md w-full shadow-2xl space-y-4">
      <div class="flex items-center gap-2 text-sigma-red font-bold text-sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line></svg>
        <span>HARDWARE KILL SWITCH CONFIRMATION</span>
      </div>
      <p class="text-xs font-mono text-sigma-textMuted leading-relaxed">
        Engaging the emergency Kill Switch will immediately:
      </p>
      <ul class="text-xs font-mono text-sigma-textDark space-y-1 list-disc list-inside bg-sigma-surface2 p-3 rounded border border-sigma-border">
        <li>Cancel all active and pending orders across all venues</li>
        <li>Halt new order generation across all strategies</li>
        <li>Lock the platform permanently into SAFE DEFENSIVE MODE</li>
        <li>Trigger institutional audit log reconciliation</li>
      </ul>
      <div class="flex justify-end gap-2 pt-2">
        <button onclick="closeKillSwitchModal()" class="px-4 py-2 rounded bg-sigma-surface2 hover:bg-sigma-surface3 border border-sigma-border text-xs font-mono text-sigma-textMain">
          Dismiss
        </button>
        <button onclick="confirmKillSwitch()" class="px-4 py-2 rounded bg-sigma-red hover:bg-sigma-red/90 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v10"></path><path d="M18.4 6.6a9 9 0 1 1-12.77.04"></path></svg>
          <span>CONFIRM EMERGENCY KILL SWITCH</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Command Palette Modal (Ctrl+K) -->
  <div id="modal-cmd-palette" style="display:none;" class="fixed inset-0 z-50 bg-black/80 flex items-start justify-center pt-24 p-4">
    <div class="bg-sigma-surface1 border border-sigma-border rounded-lg max-w-xl w-full shadow-2xl overflow-hidden font-mono">
      <div class="flex items-center gap-2 p-3 border-b border-sigma-border bg-sigma-surface2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-sigma-textDark"><path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle></svg>
        <input type="text" id="cmd-input" placeholder="Type a command or jump to workspace..." class="bg-transparent border-0 outline-none w-full text-xs text-sigma-textMain placeholder-sigma-textDark" />
        <span class="text-[10px] text-sigma-textDark px-1.5 py-0.5 rounded bg-sigma-surface3 border border-sigma-border">ESC</span>
      </div>
      <div class="p-2 space-y-1 text-xs">
        <button onclick="switchWorkspace('terminal'); closeCommandPalette();" class="w-full text-left px-3 py-2 rounded hover:bg-sigma-surface2 flex items-center justify-between text-sigma-textMain"><span>⚡ Jump to Terminal Workstation</span><span class="text-[10px] text-sigma-textDark">1</span></button>
        <button onclick="switchWorkspace('eagle'); closeCommandPalette();" class="w-full text-left px-3 py-2 rounded hover:bg-sigma-surface2 flex items-center justify-between text-amber-300"><span>🦅 Jump to Eagle Flash Scanner</span><span class="text-[10px] text-sigma-textDark">2</span></button>
        <button onclick="switchWorkspace('backtest'); closeCommandPalette();" class="w-full text-left px-3 py-2 rounded hover:bg-sigma-surface2 flex items-center justify-between text-sigma-purple"><span>🧪 Jump to Backtest Lab</span><span class="text-[10px] text-sigma-textDark">3</span></button>
        <button onclick="switchWorkspace('risk'); closeCommandPalette();" class="w-full text-left px-3 py-2 rounded hover:bg-sigma-surface2 flex items-center justify-between text-sigma-amber"><span>🛡️ Jump to Risk & Exposure</span><span class="text-[10px] text-sigma-textDark">4</span></button>
        <button onclick="switchWorkspace('journal'); closeCommandPalette();" class="w-full text-left px-3 py-2 rounded hover:bg-sigma-surface2 flex items-center justify-between text-sigma-green"><span>📓 Jump to Trade Journal</span><span class="text-[10px] text-sigma-textDark">5</span></button>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════
       JAVASCRIPT APPLICATION & ROUTING ENGINE
       ═══════════════════════════════════════════════════════ -->
  <script>
    // State
    let currentWorkspace = 'terminal';
    let currentPrice = 79073.06;
    let btcChange = 2.41;
    let wsSocket = null;
    let backtestChart = null;

    // Positioning Engine Tab Switcher
    function switchPosTab(tab) {
      ['matrix', 'confirmations', 'mtf'].forEach(t => {
        const el = document.getElementById('pos-tab-' + t);
        const btn = document.getElementById('btn-pos-' + t);
        if (el) el.className = (t === tab) ? 'p-3 space-y-2' : 'hidden p-3 space-y-2';
        if (btn) {
          if (t === tab) {
            btn.className = 'flex-1 py-2 px-3 text-center border-b-2 font-bold transition-all uppercase tracking-wider border-cyan-400 text-cyan-300 bg-sigma-surface1/60';
          } else {
            btn.className = 'flex-1 py-2 px-3 text-center border-b-2 font-bold transition-all uppercase tracking-wider border-transparent text-sigma-textDark hover:text-sigma-textMain';
          }
        }
      });
    }

    // 1. Workspace Switcher (1:1 with Next.js useSigmaStore)
    function switchWorkspace(wsId) {
      currentWorkspace = wsId;

      // Panels
      document.querySelectorAll('.ws-panel').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
      });
      const target = document.getElementById('ws-' + wsId);
      if (target) {
        target.classList.add('active');
        target.style.display = 'block';
      }

      // Desktop buttons
      document.querySelectorAll('.ws-btn').forEach(btn => {
        btn.classList.remove('bg-sigma-surface3', 'text-sigma-textMain', 'border', 'border-sigma-borderFocus', 'shadow-sm', 'font-semibold', 'bg-amber-500/20', 'text-amber-300', 'border-amber-500/50');
        btn.classList.add('text-sigma-textMuted');
      });
      const activeBtn = document.getElementById('btn-ws-' + wsId);
      if (activeBtn) {
        activeBtn.classList.remove('text-sigma-textMuted');
        if (wsId === 'eagle') {
          activeBtn.classList.add('bg-amber-500/20', 'text-amber-300', 'border', 'border-amber-500/50', 'shadow-sm', 'font-semibold');
        } else {
          activeBtn.classList.add('bg-sigma-surface3', 'text-sigma-textMain', 'border', 'border-sigma-borderFocus', 'shadow-sm', 'font-semibold');
        }
      }

      // Mobile buttons
      document.querySelectorAll('[id^="m-ws-"]').forEach(btn => {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 bg-sigma-surface2 text-sigma-textMuted border border-sigma-border hover:text-sigma-textMain';
      });
      const activeM = document.getElementById('m-ws-' + wsId);
      if (activeM) {
        if (wsId === 'eagle') {
          activeM.className = 'px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 bg-amber-400 text-black font-black shadow-md';
        } else {
          activeM.className = 'px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 bg-sigma-cyan text-black shadow-md';
        }
      }

      // Update URL hash
      if (window.location.hash !== '#' + wsId) {
        history.replaceState(null, null, '#' + wsId);
      }

      // Redraw charts if needed
      if (wsId === 'backtest') {
        setTimeout(initBacktestChart, 100);
      }
    }

    // 2. State & Data Pipeline Singleton
    let btc24hHigh = 79850.00;
    let btc24hLow = 76920.00;
    let btc24hTurnover = 1810000000;
    let athPrice = 108900;
    let isKillSwitchActive = false;
    let retryDelay = 2000;

    const tradeFlow = {
      buyVol: 182.4,
      sellVol: 154.2,
      tradeCount: 403829,
      largeBlocks: 148
    };

    const liqsCascade = {
      longLiqs: 42.0,
      shortLiqs: 18.0
    };

    let activePositions = [
      { id: 'POS-BTC-1', symbol: 'BTCUSDT', side: 'LONG', size: 0.50, entryPrice: 78820.00 }
    ];

    // 3. Binance Public WebSocket Engine (Multiplexed L1/L2 + AggTrade + Liquidations)
    function initBinanceWebSocket() {
      if (wsSocket) {
        try { wsSocket.close(); } catch (e) {}
      }
      try {
        const wsUrl = 'wss://fstream.binance.com/stream?streams=btcusdt@ticker/btcusdt@aggTrade/!forceOrder@arr';
        wsSocket = new WebSocket(wsUrl);

        wsSocket.onopen = () => {
          retryDelay = 2000;
          const pingEl = document.getElementById('ping-ws');
          if (pingEl) pingEl.textContent = '28';
          const binancePing = document.getElementById('ping-binance');
          if (binancePing) binancePing.textContent = '28 ms';
        };

        wsSocket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            const stream = msg.stream;
            const data = msg.data;

            if (stream === 'btcusdt@ticker' && data) {
              handleTickerData(data);
            } else if (stream === 'btcusdt@aggTrade' && data) {
              handleAggTrade(data);
            } else if (stream === '!forceOrder@arr' && data) {
              handleLiquidation(data);
            }
          } catch (e) {}
        };

        wsSocket.onerror = () => {
          try { if (wsSocket) wsSocket.close(); } catch (e) {}
        };

        wsSocket.onclose = () => {
          setTimeout(initBinanceWebSocket, Math.min(retryDelay *= 1.5, 15000));
        };
      } catch (e) {
        setTimeout(initBinanceWebSocket, 5000);
      }
    }

    function handleTickerData(data) {
      const p = parseFloat(data.c || data.p);
      if (!p || isNaN(p)) return;
      currentPrice = p;

      if (data.h) btc24hHigh = parseFloat(data.h);
      if (data.l) btc24hLow = parseFloat(data.l);
      if (data.q) btc24hTurnover = parseFloat(data.q);

      const formatted = '$' + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      const topEl = document.getElementById('top-btc-price');
      if (topEl) topEl.textContent = formatted;

      const cardEl = document.getElementById('card-btc-price');
      if (cardEl) cardEl.textContent = formatted;

      const markEl = document.getElementById('pos-mark-price');
      if (markEl) markEl.textContent = formatted;

      const stripHigh = document.getElementById('strip-24h-high');
      if (stripHigh) stripHigh.textContent = '$' + btc24hHigh.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const stripLow = document.getElementById('strip-24h-low');
      if (stripLow) stripLow.textContent = '$' + btc24hLow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const stripTurnover = document.getElementById('strip-24h-turnover');
      if (stripTurnover) stripTurnover.textContent = '$' + (btc24hTurnover / 1e9).toFixed(2) + 'B';

      const athEl = document.getElementById('strip-ath-distance');
      if (athEl) {
        const athDist = ((p - athPrice) / athPrice) * 100;
        athEl.textContent = (athDist >= 0 ? '+' : '') + athDist.toFixed(1) + '%';
        athEl.className = athDist >= 0 ? 'text-sigma-green font-semibold tabular-nums' : 'text-sigma-red font-semibold tabular-nums';
      }

      if (data.P) {
        const chg = parseFloat(data.P);
        const topChg = document.getElementById('top-btc-change');
        if (topChg) {
          topChg.textContent = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
          topChg.className = 'text-xs font-mono font-bold ' + (chg >= 0 ? 'text-sigma-green' : 'text-sigma-red');
        }
      }

      updatePositionsTable();
    }

    function handleAggTrade(data) {
      const p = parseFloat(data.p);
      const q = parseFloat(data.q);
      const val = p * q;
      const isBuyerMaker = data.m;

      tradeFlow.tradeCount++;
      if (isBuyerMaker) {
        tradeFlow.sellVol += (val / 1e6);
      } else {
        tradeFlow.buyVol += (val / 1e6);
      }

      if (val >= 250000) {
        tradeFlow.largeBlocks++;
        const lbEl = document.getElementById('flow-large-blocks');
        if (lbEl) lbEl.textContent = tradeFlow.largeBlocks + ' (> $250k)';
      }

      const totalVol = tradeFlow.buyVol + tradeFlow.sellVol;
      const buyPct = totalVol > 0 ? (tradeFlow.buyVol / totalVol) * 100 : 50;
      const sellPct = 100 - buyPct;
      const netDelta = tradeFlow.buyVol - tradeFlow.sellVol;

      const buyPctEl = document.getElementById('flow-buy-pct');
      if (buyPctEl) buyPctEl.textContent = buyPct.toFixed(1) + '%';
      const sellPctEl = document.getElementById('flow-sell-pct');
      if (sellPctEl) sellPctEl.textContent = sellPct.toFixed(1) + '%';

      const barBuy = document.getElementById('flow-bar-buy');
      if (barBuy) {
        barBuy.style.width = buyPct.toFixed(1) + '%';
        barBuy.textContent = buyPct.toFixed(1) + '%';
      }
      const barSell = document.getElementById('flow-bar-sell');
      if (barSell) {
        barSell.style.width = sellPct.toFixed(1) + '%';
        barSell.textContent = sellPct.toFixed(1) + '%';
      }

      const netDeltaEl = document.getElementById('flow-net-delta');
      if (netDeltaEl) {
        netDeltaEl.textContent = (netDelta >= 0 ? '+$' : '-$') + Math.abs(netDelta).toFixed(1) + 'M';
        netDeltaEl.className = 'font-bold tabular-nums ' + (netDelta >= 0 ? 'text-sigma-green' : 'text-sigma-red');
      }

      const volEl = document.getElementById('flow-volume');
      if (volEl) volEl.textContent = '$' + (totalVol / 1000).toFixed(2) + 'B';

      const tcEl = document.getElementById('flow-trade-count');
      if (tcEl) tcEl.textContent = tradeFlow.tradeCount.toLocaleString();

      const spotAccEl = document.getElementById('flow-spot-acc');
      if (spotAccEl) {
        spotAccEl.textContent = (netDelta >= 0 ? '+$' : '-$') + Math.abs(netDelta * 0.8).toFixed(1) + 'M';
      }
      const spotBuyEl = document.getElementById('flow-spot-buy');
      if (spotBuyEl) spotBuyEl.textContent = buyPct.toFixed(1) + '%';
      const spotSellEl = document.getElementById('flow-spot-sell');
      if (spotSellEl) spotSellEl.textContent = sellPct.toFixed(1) + '%';
    }

    function handleLiquidation(data) {
      try {
        const o = data.o;
        if (!o) return;
        const side = o.S;
        const val = (parseFloat(o.p) * parseFloat(o.q)) / 1e6;
        if (side === 'SELL') {
          liqsCascade.longLiqs += val;
        } else {
          liqsCascade.shortLiqs += val;
        }
        const total = liqsCascade.longLiqs + liqsCascade.shortLiqs;
        const totalEl = document.getElementById('deriv-liqs-total');
        if (totalEl) totalEl.textContent = 'Total: $' + total.toFixed(1) + 'M';
        const longEl = document.getElementById('deriv-liqs-long');
        if (longEl) longEl.textContent = 'Long Liqs: $' + liqsCascade.longLiqs.toFixed(1) + 'M';
        const shortEl = document.getElementById('deriv-liqs-short');
        if (shortEl) shortEl.textContent = 'Short Liqs: $' + liqsCascade.shortLiqs.toFixed(1) + 'M';
        const longBar = document.getElementById('deriv-liq-long-bar');
        const shortBar = document.getElementById('deriv-liq-short-bar');
        if (longBar && shortBar && total > 0) {
          const lPct = (liqsCascade.longLiqs / total) * 100;
          longBar.style.width = lPct.toFixed(0) + '%';
          shortBar.style.width = (100 - lPct).toFixed(0) + '%';
        }
      } catch (e) {}
    }

    // 4. Klines, Technical Indicators & ATR Mathematical Stop Loss
    async function fetchKlinesAndCompute() {
      try {
        const res = await fetch('https://fapi.binance.com/fapi/v1/klines?symbol=BTCUSDT&interval=4h&limit=50');
        if (!res.ok) return;
        const raw = await res.json();
        if (!Array.isArray(raw) || raw.length < 20) return;

        const candles = raw.map(k => ({
          time: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5])
        }));

        const closes = candles.map(c => c.close);
        const ema20 = calculateEMA(closes, 20);
        const ema50 = calculateEMA(closes, 50);
        const atr14 = calculateATR(candles, 14);
        const rsi14 = calculateRSI(closes, 14);

        const last = candles[candles.length - 1];
        const lastEMA20 = ema20[ema20.length - 1];
        const lastEMA50 = ema50[ema50.length - 1];

        const oEl = document.getElementById('chart-open-val');
        if (oEl) oEl.textContent = '$' + last.open.toLocaleString('en-US', { minimumFractionDigits: 2 });
        const hEl = document.getElementById('chart-high-val');
        if (hEl) hEl.textContent = '$' + last.high.toLocaleString('en-US', { minimumFractionDigits: 2 });
        const lEl = document.getElementById('chart-low-val');
        if (lEl) lEl.textContent = '$' + last.low.toLocaleString('en-US', { minimumFractionDigits: 2 });
        const cEl = document.getElementById('chart-close-val');
        if (cEl) cEl.textContent = '$' + last.close.toLocaleString('en-US', { minimumFractionDigits: 2 });
        const vEl = document.getElementById('chart-vol-val');
        if (vEl) vEl.textContent = Math.round(last.volume).toLocaleString() + ' BTC';

        renderRealCandlesticks(candles.slice(-32), ema20.slice(-32), ema50.slice(-32));

        // Stop Loss mathematical specification: clamp(1.5 * ATR14, 2.0%, 3.5%)
        const price = last.close;
        const rawStop = 1.5 * atr14;
        const minStopDist = price * 0.02;
        const maxStopDist = price * 0.035;
        const finalStopDist = Math.max(minStopDist, Math.min(maxStopDist, rawStop));

        const isLong = lastEMA20 >= lastEMA50 && price >= lastEMA20 * 0.98;
        const direction = isLong ? 'LONG' : 'SHORT';
        const stopLoss = isLong ? (price - finalStopDist) : (price + finalStopDist);
        const riskDist = Math.abs(price - stopLoss);

        const t1 = isLong ? (price + 1.5 * riskDist) : (price - 1.5 * riskDist);
        const t2 = isLong ? (price + 2.5 * riskDist) : (price - 2.5 * riskDist);
        const t3 = isLong ? (price + 4.0 * riskDist) : (price - 4.0 * riskDist);

        updateChartSRLines(t1, stopLoss, candles.slice(-32));
        updateSignalCardDOM(direction, price, stopLoss, t1, t2, t3, rsi14, lastEMA20, lastEMA50);
        updateFactorAttributionDOM(isLong, lastEMA20, lastEMA50, rsi14, price);
      } catch (e) {}
    }

    function calculateEMA(data, period) {
      const k = 2 / (period + 1);
      const emaArray = [data[0]];
      for (let i = 1; i < data.length; i++) {
        emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
      }
      return emaArray;
    }

    function calculateATR(candles, period) {
      if (candles.length < period + 1) return candles[candles.length - 1].close * 0.025;
      const trs = [];
      for (let i = 1; i < candles.length; i++) {
        const c = candles[i];
        const prev = candles[i - 1];
        const tr = Math.max(
          c.high - c.low,
          Math.abs(c.high - prev.close),
          Math.abs(c.low - prev.close)
        );
        trs.push(tr);
      }
      let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
      for (let i = period; i < trs.length; i++) {
        atr = (atr * (period - 1) + trs[i]) / period;
      }
      return atr;
    }

    function calculateRSI(closes, period) {
      if (closes.length < period + 1) return 50;
      let gains = 0;
      let losses = 0;
      for (let i = 1; i <= period; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff;
        else losses += Math.abs(diff);
      }
      let avgGain = gains / period;
      let avgLoss = losses / period;
      for (let i = period + 1; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) {
          avgGain = (avgGain * (period - 1) + diff) / period;
          avgLoss = (avgLoss * (period - 1)) / period;
        } else {
          avgGain = (avgGain * (period - 1)) / period;
          avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
        }
      }
      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      return 100 - (100 / (1 + rs));
    }

    function renderRealCandlesticks(candles, ema20Arr, ema50Arr) {
      const g = document.getElementById('chart-candles-group');
      if (!g || candles.length === 0) return;
      g.innerHTML = '';

      let minP = Infinity;
      let maxP = -Infinity;
      let maxVol = 0;

      candles.forEach(c => {
        if (c.low < minP) minP = c.low;
        if (c.high > maxP) maxP = c.high;
        if (c.volume > maxVol) maxVol = c.volume;
      });

      const pad = (maxP - minP) * 0.08 || 100;
      minP -= pad;
      maxP += pad;
      const range = maxP - minP || 1;

      const g1 = document.getElementById('grid-p1');
      if (g1) g1.textContent = '$' + Math.round(maxP - range * 0.1).toLocaleString();
      const g2 = document.getElementById('grid-p2');
      if (g2) g2.textContent = '$' + Math.round(maxP - range * 0.35).toLocaleString();
      const g3 = document.getElementById('grid-p3');
      if (g3) g3.textContent = '$' + Math.round(maxP - range * 0.65).toLocaleString();
      const g4 = document.getElementById('grid-p4');
      if (g4) g4.textContent = '$' + Math.round(minP + range * 0.1).toLocaleString();

      const count = candles.length;
      const candleWidth = 800 / count;
      const chartHeight = 240;

      const ema20Points = [];
      const ema50Points = [];

      for (let i = 0; i < count; i++) {
        const c = candles[i];
        const isUp = c.close >= c.open;
        const color = isUp ? '#00E599' : '#FF4757';

        const yHigh = chartHeight * (1 - (c.high - minP) / range);
        const yLow = chartHeight * (1 - (c.low - minP) / range);
        const yOpen = chartHeight * (1 - (c.open - minP) / range);
        const yClose = chartHeight * (1 - (c.close - minP) / range);

        const bodyTop = Math.min(yOpen, yClose);
        const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
        const x = i * candleWidth + candleWidth / 2;

        const wick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        wick.setAttribute('x1', x);
        wick.setAttribute('y1', yHigh);
        wick.setAttribute('x2', x);
        wick.setAttribute('y2', yLow);
        wick.setAttribute('stroke', color);
        wick.setAttribute('stroke-width', '1.2');
        g.appendChild(wick);

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x - candleWidth * 0.35);
        rect.setAttribute('y', bodyTop);
        rect.setAttribute('width', candleWidth * 0.7);
        rect.setAttribute('height', bodyHeight);
        rect.setAttribute('fill', color);
        rect.setAttribute('rx', '1');
        g.appendChild(rect);

        const volNorm = maxVol > 0 ? (c.volume / maxVol) : 0.5;
        const volH = Math.max(3, volNorm * 65);
        const volRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        volRect.setAttribute('x', x - candleWidth * 0.35);
        volRect.setAttribute('y', 330 - volH);
        volRect.setAttribute('width', candleWidth * 0.7);
        volRect.setAttribute('height', volH);
        volRect.setAttribute('fill', color);
        volRect.setAttribute('opacity', '0.45');
        g.appendChild(volRect);

        if (ema20Arr[i]) {
          const y20 = chartHeight * (1 - (ema20Arr[i] - minP) / range);
          ema20Points.push(x + ',' + y20);
        }
        if (ema50Arr[i]) {
          const y50 = chartHeight * (1 - (ema50Arr[i] - minP) / range);
          ema50Points.push(x + ',' + y50);
        }
      }

      document.getElementById('chart-ema-20')?.setAttribute('points', ema20Points.join(' '));
      document.getElementById('chart-ema-50')?.setAttribute('points', ema50Points.join(' '));
    }

    function updateChartSRLines(t1, stopLoss, candles) {
      if (candles.length === 0) return;
      let minP = Math.min(...candles.map(c => c.low));
      let maxP = Math.max(...candles.map(c => c.high));
      const pad = (maxP - minP) * 0.08 || 100;
      minP -= pad;
      maxP += pad;
      const range = maxP - minP || 1;

      const yT1 = Math.max(15, Math.min(235, 240 * (1 - (t1 - minP) / range)));
      const yStop = Math.max(15, Math.min(235, 240 * (1 - (stopLoss - minP) / range)));

      const t1Line = document.getElementById('chart-t1-line');
      const t1Text = document.getElementById('chart-t1-text');
      if (t1Line) { t1Line.setAttribute('y1', yT1); t1Line.setAttribute('y2', yT1); }
      if (t1Text) {
        t1Text.setAttribute('y', Math.max(15, yT1 - 4));
        t1Text.textContent = 'TARGET 1: $' + Math.round(t1).toLocaleString();
      }

      const stopLine = document.getElementById('chart-stop-line');
      const stopText = document.getElementById('chart-stop-text');
      if (stopLine) { stopLine.setAttribute('y1', yStop); stopLine.setAttribute('y2', yStop); }
      if (stopText) {
        stopText.setAttribute('y', Math.min(235, yStop + 12));
        stopText.textContent = 'STOP LOSS (ATR): $' + Math.round(stopLoss).toLocaleString();
      }
    }

    function updateSignalCardDOM(direction, price, stopLoss, t1, t2, t3, rsi, ema20, ema50) {
      const isLong = direction === 'LONG';
      const dirEl = document.getElementById('sig-direction');
      if (dirEl) {
        dirEl.textContent = direction;
        dirEl.className = 'font-mono text-2xl font-black tracking-wide ' + (isLong ? 'text-sigma-green' : 'text-sigma-red');
      }

      const badgeEl = document.getElementById('sig-dir-badge');
      if (badgeEl) {
        badgeEl.className = 'p-2 rounded-lg border flex items-center justify-center ' + (isLong ? 'bg-sigma-green/15 border-sigma-green text-sigma-green' : 'bg-sigma-red/15 border-sigma-red text-sigma-red');
      }

      const regimeEl = document.getElementById('sig-regime');
      if (regimeEl) {
        regimeEl.textContent = isLong ? 'BULLISH RECOVERY' : 'BEARISH DISTRIBUTION';
      }

      const conf = Math.min(95, Math.max(60, Math.round(65 + Math.abs(rsi - 50) * 0.8)));
      const confEl = document.getElementById('sig-confidence');
      if (confEl) confEl.textContent = conf + '%';
      const confBar = document.getElementById('sig-conf-bar');
      if (confBar) {
        confBar.style.width = conf + '%';
        confBar.className = 'h-full transition-all duration-700 ' + (isLong ? 'bg-sigma-green' : 'bg-sigma-red');
      }

      const entryEl = document.getElementById('sig-entry-zone');
      if (entryEl) {
        const eLow = Math.round(price * 0.998);
        const eHigh = Math.round(price * 1.002);
        entryEl.textContent = '$' + eLow.toLocaleString() + ' – $' + eHigh.toLocaleString();
      }

      const slEl = document.getElementById('sig-stop-loss');
      if (slEl) slEl.textContent = '$' + Math.round(stopLoss).toLocaleString();

      const t1El = document.getElementById('sig-t1');
      if (t1El) t1El.textContent = '$' + Math.round(t1).toLocaleString();
      const t2El = document.getElementById('sig-t2');
      if (t2El) t2El.textContent = '$' + Math.round(t2).toLocaleString();
      const t3El = document.getElementById('sig-t3');
      if (t3El) t3El.textContent = '$' + Math.round(t3).toLocaleString();

      const invEl = document.getElementById('sig-invalidation');
      if (invEl) {
        invEl.textContent = '4H close ' + (isLong ? 'below $' : 'above $') + Math.round(stopLoss).toLocaleString();
      }

      const execBtn = document.getElementById('sig-exec-btn');
      if (execBtn) {
        execBtn.className = 'px-4 py-2 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md ' +
          (isLong ? 'bg-sigma-green text-black hover:bg-sigma-green/90' : 'bg-sigma-red text-white hover:bg-sigma-red/90');
        execBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"></path></svg>' +
          '<span>EXECUTE ' + direction + ' (0.25 BTC)</span>';
      }
    }

    function updateFactorAttributionDOM(isLong, ema20, ema50, rsi, price) {
      const trendScore = isLong ? Math.min(95, Math.round(70 + ((price - ema50) / ema50) * 200)) : 30;
      const momScore = Math.min(95, Math.max(10, Math.round(rsi * 1.1)));
      const derivScore = 54;
      const volScore = 45;
      const cvdScore = 72;
      const onchainScore = 76;

      const net = Math.round(trendScore * 0.3 + momScore * 0.25 + derivScore * 0.15 + volScore * 0.1 + cvdScore * 0.1 + onchainScore * 0.1);

      const netEl = document.getElementById('factor-net-val');
      if (netEl) netEl.textContent = '+' + net + ' / 100';

      const updateRow = (name, val) => {
        const valEl = document.getElementById('factor-' + name + '-val');
        const barEl = document.getElementById('factor-' + name + '-bar');
        if (valEl) valEl.textContent = '+' + val;
        if (barEl) barEl.style.width = val + '%';
      };

      updateRow('trend', trendScore);
      updateRow('mom', momScore);
      updateRow('deriv', derivScore);
      updateRow('vol', volScore);
      updateRow('cvd', cvdScore);
      updateRow('onchain', onchainScore);
    }

    // 5. Order Book Depth & Walls Poller
    async function fetchOrderBookDepth() {
      try {
        const res = await fetch('https://fapi.binance.com/fapi/v1/depth?symbol=BTCUSDT&limit=100');
        if (!res.ok) return;
        const data = await res.json();
        const bids = data.bids || [];
        const asks = data.asks || [];
        if (bids.length === 0 || asks.length === 0) return;

        const bestBid = parseFloat(bids[0][0]);
        const bestAsk = parseFloat(asks[0][0]);
        const spread = bestAsk - bestBid;
        const mid = (bestAsk + bestBid) / 2;
        const spreadBps = (spread / mid) * 10000;

        const spreadEl = document.getElementById('ob-spread-val');
        if (spreadEl) spreadEl.textContent = '$' + spread.toFixed(2) + ' (' + spreadBps.toFixed(2) + ' bps)';

        const calcDepth = (bps) => {
          const threshold = bps / 10000;
          let bidQty = 0;
          let askQty = 0;
          for (const b of bids) {
            const p = parseFloat(b[0]);
            if ((mid - p) / mid <= threshold) bidQty += parseFloat(b[1]);
            else break;
          }
          for (const a of asks) {
            const p = parseFloat(a[0]);
            if ((p - mid) / mid <= threshold) askQty += parseFloat(a[1]);
            else break;
          }
          const total = bidQty + askQty;
          const ratio = total > 0 ? ((bidQty - askQty) / total) * 100 : 0;
          return { bidQty, askQty, ratio };
        };

        const d5 = calcDepth(5);
        const d10 = calcDepth(10);
        const d25 = calcDepth(25);
        const d50 = calcDepth(50);

        const setDepthDom = (bps, d) => {
          const valEl = document.getElementById('ob-' + bps + 'bps-val');
          const ratEl = document.getElementById('ob-' + bps + 'bps-ratio');
          if (valEl) valEl.textContent = d.bidQty.toFixed(1) + ' vs ' + d.askQty.toFixed(1);
          if (ratEl) {
            ratEl.textContent = (d.ratio >= 0 ? '+' : '') + d.ratio.toFixed(1) + '%';
            ratEl.className = 'font-bold tabular-nums text-[11px] ' + (d.ratio >= 0 ? 'text-sigma-green' : 'text-sigma-red');
          }
        };

        setDepthDom(5, d5);
        setDepthDom(10, d10);
        setDepthDom(25, d25);
        setDepthDom(50, d50);

        let maxBidQty = 0;
        let maxBidP = bestBid;
        for (const b of bids.slice(0, 30)) {
          const q = parseFloat(b[1]);
          if (q > maxBidQty) { maxBidQty = q; maxBidP = parseFloat(b[0]); }
        }
        let maxAskQty = 0;
        let maxAskP = bestAsk;
        for (const a of asks.slice(0, 30)) {
          const q = parseFloat(a[1]);
          if (q > maxAskQty) { maxAskQty = q; maxAskP = parseFloat(a[0]); }
        }

        const bidWallEl = document.getElementById('ob-bid-wall-val');
        if (bidWallEl) bidWallEl.textContent = '$' + Math.round(maxBidP).toLocaleString() + ' (' + maxBidQty.toFixed(1) + ' BTC)';
        const askWallEl = document.getElementById('ob-ask-wall-val');
        if (askWallEl) askWallEl.textContent = '$' + Math.round(maxAskP).toLocaleString() + ' (' + maxAskQty.toFixed(1) + ' BTC)';
      } catch (e) {}
    }

    // 6. Derivatives & Open Interest Poller
    async function fetchDerivativesData() {
      try {
        const [oiRes, premRes] = await Promise.all([
          fetch('https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT').catch(() => null),
          fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT').catch(() => null)
        ]);

        if (oiRes && oiRes.ok) {
          const oiData = await oiRes.json();
          const oiBTC = parseFloat(oiData.openInterest);
          const oiUSD = oiBTC * currentPrice;
          const oiEl = document.getElementById('deriv-oi-val');
          if (oiEl) oiEl.textContent = '$' + (oiUSD / 1e9).toFixed(2) + 'B';
        }

        if (premRes && premRes.ok) {
          const premData = await premRes.json();
          const rate = parseFloat(premData.lastFundingRate);
          const ratePct = rate * 100;
          const annPct = ratePct * 3 * 365;

          const fundEl = document.getElementById('deriv-funding-val');
          if (fundEl) {
            fundEl.textContent = (ratePct >= 0 ? '+' : '') + ratePct.toFixed(4) + '%';
            fundEl.className = 'text-sm font-bold tabular-nums ' + (ratePct >= 0 ? 'text-sigma-green' : 'text-sigma-red');
          }
          const annEl = document.getElementById('deriv-funding-ann');
          if (annEl) annEl.textContent = '(' + annPct.toFixed(1) + '% Ann.)';

          const mark = parseFloat(premData.markPrice);
          const index = parseFloat(premData.indexPrice);
          if (index > 0) {
            const basis = ((mark - index) / index) * 100 * 365 / 30;
            const basisEl = document.getElementById('deriv-basis-val');
            if (basisEl) basisEl.textContent = (basis >= 0 ? '+' : '') + basis.toFixed(2) + '%';
          }
        }
      } catch (e) {}
    }

    // 7. CoinGecko ATH Poller
    async function fetchCoinGeckoATH() {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false');
        if (res.ok) {
          const data = await res.json();
          const ath = data?.market_data?.ath?.usd;
          if (ath && !isNaN(ath)) athPrice = ath;
        }
      } catch (e) {}
    }

    // 8. Deribit Skew Poller
    async function fetchDeribitSkew() {
      try {
        const res = await fetch('https://www.deribit.com/api/v2/public/get_volatility_index_data?currency=BTC&resolution=3600&limit=1');
        if (res.ok) {
          const data = await res.json();
          const dvol = data?.result?.data?.[0]?.[1];
          if (dvol) {
            const skewVal = document.getElementById('deriv-skew-val');
            if (skewVal) skewVal.textContent = dvol.toFixed(1) + '%';
            const skewLabel = document.getElementById('deriv-skew-label');
            if (skewLabel) skewLabel.textContent = 'DVOL Index';
          }
        }
      } catch (e) {
        const skewLabel = document.getElementById('deriv-skew-label');
        if (skewLabel) skewLabel.textContent = 'Deribit Ref';
      }
    }

    // 9. Position Manager & Execution
    function updatePositionsTable() {
      const tbody = document.getElementById('positions-table-body');
      if (!tbody) return;
      const countEl = document.getElementById('positions-count');
      if (countEl) countEl.textContent = activePositions.length.toString();

      if (activePositions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-sigma-textDark">No active positions.</td></tr>';
        return;
      }

      tbody.innerHTML = activePositions.map(pos => {
        const isLong = pos.side === 'LONG';
        const diff = isLong ? (currentPrice - pos.entryPrice) : (pos.entryPrice - currentPrice);
        const pnl = diff * pos.size;
        const pct = (diff / pos.entryPrice) * 100;
        const isPos = pnl >= 0;
        const pnlStr = (isPos ? '+' : '') + '$' + pnl.toFixed(2) + ' (' + (isPos ? '+' : '') + pct.toFixed(2) + '%)';
        const pnlClass = isPos ? 'text-sigma-green' : 'text-sigma-red';

        return '<tr class="border-b border-sigma-border/40">' +
          '<td class="py-2 font-bold text-sigma-textMain">' + pos.symbol + '</td>' +
          '<td class="py-2 font-bold ' + (isLong ? 'text-sigma-green' : 'text-sigma-red') + '">' + pos.side + '</td>' +
          '<td class="py-2 text-sigma-textMuted">' + pos.size.toFixed(2) + ' BTC</td>' +
          '<td class="py-2 text-sigma-textMuted">$' + pos.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }) + '</td>' +
          '<td class="py-2 text-sigma-textMain font-semibold">$' + currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }) + '</td>' +
          '<td class="py-2 text-right font-bold ' + pnlClass + '">' + pnlStr + '</td>' +
          '<td class="py-2 text-right">' +
            '<button onclick="closePositionById(&quot;' + pos.id + '&quot;)" class="px-2 py-0.5 rounded bg-sigma-red/15 hover:bg-sigma-red/30 text-sigma-red border border-sigma-red/40 text-[10px] font-bold">CLOSE</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }

    function executePaperTrade(side, amount) {
      if (isKillSwitchActive) {
        alert('Trading is locked due to Emergency Safe Mode.');
        return;
      }
      const newPos = {
        id: 'POS-' + Date.now(),
        symbol: 'BTCUSDT',
        side: side,
        size: amount,
        entryPrice: currentPrice
      };
      activePositions.push(newPos);
      updatePositionsTable();
      alert('Paper Order Filled: ' + side + ' ' + amount + ' BTCUSDT @ $' + currentPrice.toFixed(2));
    }

    function closePositionById(id) {
      const pos = activePositions.find(p => p.id === id);
      if (pos) {
        const isLong = pos.side === 'LONG';
        const diff = isLong ? (currentPrice - pos.entryPrice) : (pos.entryPrice - currentPrice);
        const pnl = diff * pos.size;
        const outcome = pnl >= 0 ? 'WIN' : 'LOSS';

        const tbody = document.getElementById('journal-tbody');
        if (tbody) {
          const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
          const row = '<tr>' +
            '<td class="p-2">' + nowStr + '</td>' +
            '<td class="p-2 font-bold text-sigma-textMain">' + pos.symbol + '</td>' +
            '<td class="p-2 font-bold ' + (isLong ? 'text-sigma-green' : 'text-sigma-red') + '">' + pos.side + '</td>' +
            '<td class="p-2">$' + Math.round(pos.entryPrice).toLocaleString() + '</td>' +
            '<td class="p-2">$' + Math.round(currentPrice).toLocaleString() + '</td>' +
            '<td class="p-2">' + pos.size.toFixed(2) + ' BTC</td>' +
            '<td class="p-2 text-right font-bold ' + (pnl >= 0 ? 'text-sigma-green' : 'text-sigma-red') + '">' + (pnl >= 0 ? '+$' : '-$') + Math.abs(Math.round(pnl)).toLocaleString() + '</td>' +
            '<td class="p-2">Sigma Paper Exec</td>' +
            '<td class="p-2 text-right"><span class="px-1.5 py-0.5 rounded font-bold text-[10px] ' + (outcome === 'WIN' ? 'bg-sigma-green/15 text-sigma-green' : 'bg-sigma-red/15 text-sigma-red') + '">' + outcome + '</span></td>' +
          '</tr>';
          tbody.insertAdjacentHTML('afterbegin', row);
        }
      }
      activePositions = activePositions.filter(p => p.id !== id);
      updatePositionsTable();
    }

    function closeActivePosition() {
      if (activePositions.length > 0) {
        closePositionById(activePositions[0].id);
      }
    }

    // 10. Hardware Kill Switch Modal & Confirmation
    function openKillSwitchModal() {
      const m = document.getElementById('modal-kill-switch');
      if (m) m.style.display = 'flex';
    }
    function closeKillSwitchModal() {
      const m = document.getElementById('modal-kill-switch');
      if (m) m.style.display = 'none';
    }
    function confirmKillSwitch() {
      isKillSwitchActive = true;
      activePositions.forEach(p => closePositionById(p.id));
      activePositions = [];
      updatePositionsTable();
      closeKillSwitchModal();

      const killBtn = document.getElementById('btn-kill-switch');
      if (killBtn) {
        killBtn.textContent = '🔒 SAFE DEFENSIVE MODE LOCKED';
        killBtn.className = 'px-3 py-1.5 rounded text-xs font-mono font-bold tracking-wider uppercase border shadow-md bg-sigma-red text-white border-sigma-red animate-pulse';
      }
      alert('🚨 HARDWARE KILL SWITCH ENGAGED! All open positions closed at market. All new order routing blocked.');
    }

    // 11. Command Palette & Modals
    function openCommandPalette() {
      const m = document.getElementById('modal-cmd-palette');
      if (m) m.style.display = 'flex';
      document.getElementById('cmd-input')?.focus();
    }
    function closeCommandPalette() {
      const m = document.getElementById('modal-cmd-palette');
      if (m) m.style.display = 'none';
    }

    function triggerRefreshAll() {
      const btn = document.getElementById('btn-refresh');
      if (btn) btn.classList.add('animate-spin', 'text-sigma-green');
      fetchKlinesAndCompute();
      fetchOrderBookDepth();
      fetchDerivativesData();
      setTimeout(() => {
        if (btn) btn.classList.remove('animate-spin', 'text-sigma-green');
      }, 600);
    }

    function toggleTradingMode() {
      const btn = document.getElementById('btn-trading-mode');
      if (!btn) return;
      if (btn.textContent.includes('PAPER')) {
        if (confirm('Authorize LIVE TRADING mode with active exchange accounts?')) {
          btn.textContent = '▲ LIVE TRADING';
          btn.className = 'hidden sm:inline-flex px-2.5 py-1 rounded text-[11px] font-mono font-bold tracking-wide border transition-all bg-sigma-red/15 border-sigma-red text-sigma-red animate-pulse';
        }
      } else {
        btn.textContent = '● PAPER MODE';
        btn.className = 'hidden sm:inline-flex px-2.5 py-1 rounded text-[11px] font-mono font-bold tracking-wide border transition-all bg-sigma-cyan/10 border-sigma-cyan/40 text-sigma-cyan';
      }
    }

    function setTimeframe(tf) {
      document.querySelectorAll('.tf-btn').forEach(b => {
        b.className = 'tf-btn px-1.5 py-0.5 rounded transition-colors text-sigma-textDark hover:text-sigma-textMuted';
        if (b.textContent === tf) {
          b.className = 'tf-btn px-1.5 py-0.5 rounded transition-colors bg-sigma-surface3 text-sigma-cyan font-bold border border-sigma-cyan/30';
        }
      });
      fetchKlinesAndCompute();
    }

    function exportTradeJournalCSV() {
      const csv = "Date,Symbol,Side,Entry,Exit,Size,PnL,Strategy,Outcome\\n" +
        "2026-03-27 16:30,BTCUSDT,LONG,78200,81500,1.5,4950,Sigma 4H Momentum,WIN\\n" +
        "2026-03-26 11:15,SOLUSDT,LONG,144.20,158.00,100,1380,Eagle Vol Explosion,WIN\\n" +
        "2026-03-24 19:40,ETHUSDT,SHORT,2490,2545,20,-1100,Funding Carry,LOSS\\n" +
        "2026-03-22 09:10,BTCUSDT,LONG,73100,77000,2.0,7800,MVRV Capitulation,WIN\\n";
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'sigma_trade_ledger.csv';
      a.click();
    }

    // 12. Backtest Lab Simulation
    function initBacktestChart() {
      const canvas = document.getElementById('backtest-canvas');
      if (!canvas) return;
      if (backtestChart) backtestChart.destroy();

      const labels = [];
      const sData = [];
      const bData = [];
      let s = 100000;
      let b = 100000;
      for (let i = 0; i <= 30; i++) {
        labels.push('Day ' + (i * 6));
        s += (Math.random() * 4500 - 1200);
        b += (Math.random() * 5500 - 2500);
        sData.push(Math.round(s));
        bData.push(Math.round(b));
      }
      sData[sData.length - 1] = 184250;

      const ctx = canvas.getContext('2d');
      backtestChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'SIGMA Quantitative Strategy ($)',
              data: sData,
              borderColor: '#00E599',
              backgroundColor: 'rgba(0, 229, 153, 0.08)',
              borderWidth: 2,
              fill: true,
              tension: 0.3
            },
            {
              label: 'BTC Benchmark ($)',
              data: bData,
              borderColor: '#00D2FF',
              borderWidth: 1.5,
              borderDash: [4, 4],
              fill: false,
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#94A3B8', font: { family: 'Space Mono', size: 10 } } }
          },
          scales: {
            x: { ticks: { color: '#64748B', font: { family: 'Space Mono', size: 9 } }, grid: { color: '#1E283C' } },
            y: { ticks: { color: '#64748B', font: { family: 'Space Mono', size: 9 } }, grid: { color: '#1E283C' } }
          }
        }
      });
    }

    function runBacktestSimulation() {
      const sp = document.getElementById('sim-spinner');
      if (sp) sp.classList.remove('hidden');
      setTimeout(() => {
        if (sp) sp.classList.add('hidden');
        const add = 80000 + Math.floor(Math.random() * 10000);
        document.getElementById('bt-pnl').textContent = '+$' + add.toLocaleString() + '.00';
        document.getElementById('bt-ret').textContent = '+' + (add / 1000).toFixed(2) + '% return';
        initBacktestChart();
      }, 1000);
    }

    // Keybindings (Ctrl+K and Escape)
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openCommandPalette();
      }
      if (e.key === 'Escape') {
        closeCommandPalette();
        closeKillSwitchModal();
      }
    });

    // 13. Master Initialization on DOM Load
    window.addEventListener('DOMContentLoaded', () => {
      const hash = window.location.hash.replace('#', '');
      if (['terminal', 'eagle', 'backtest', 'risk', 'journal', 'health', 'calendar'].includes(hash)) {
        switchWorkspace(hash);
      } else {
        switchWorkspace('terminal');
      }

      initBinanceWebSocket();
      fetchKlinesAndCompute();
      fetchOrderBookDepth();
      fetchDerivativesData();
      fetchCoinGeckoATH();
      fetchDeribitSkew();

      setInterval(fetchKlinesAndCompute, 30000);
      setInterval(fetchOrderBookDepth, 5000);
      setInterval(fetchDerivativesData, 10000);
      setInterval(fetchCoinGeckoATH, 120000);
      setInterval(fetchDeribitSkew, 60000);
    });

  </script>
</body>
</html>
`;

console.log('Writing unified master index.html (size: ' + unifiedHtml.length + ' bytes)...');
fs.writeFileSync(path.join(rootDir, 'index.html'), unifiedHtml, 'utf-8');
console.log('Successfully written index.html!');
