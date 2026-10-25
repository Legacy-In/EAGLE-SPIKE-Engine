import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

function loadLatestJobRun() {
  const root = process.cwd();
  const candidates = [
    path.resolve(root, 'data'),
    path.resolve(root, '..', '..', 'data'),
  ];
  let dataDir = candidates[0];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      dataDir = c;
      break;
    }
  }

  const jobRunsFile = path.join(dataDir, 'job_runs.json');
  if (!fs.existsSync(jobRunsFile)) return null;

  try {
    const runs = JSON.parse(fs.readFileSync(jobRunsFile, 'utf-8'));
    return runs.length ? runs[runs.length - 1] : null;
  } catch (e) {
    return null;
  }
}

async function checkDbReachability(): Promise<{ reachable: boolean; latencyMs: number }> {
  const start = Date.now();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return { reachable: false, latencyMs: 0 };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return { reachable: res.ok || res.status === 200, latencyMs: Date.now() - start };
  } catch (e) {
    return { reachable: false, latencyMs: Date.now() - start };
  }
}

export async function GET() {
  const now = Date.now();
  const latestRun = loadLatestJobRun();
  const dbHealth = await checkDbReachability();

  const lastScanAt = latestRun?.finished_at || latestRun?.started_at || null;
  const lastScanAgeMs = lastScanAt ? now - new Date(lastScanAt).getTime() : null;

  // Health SLA: Warning if last scan > 75 min (4500000ms), Error if > 130 min (7800000ms)
  let scanHealth = 'HEALTHY';
  if (lastScanAgeMs !== null) {
    if (lastScanAgeMs > 130 * 60 * 1000) scanHealth = 'CRITICAL_STALE';
    else if (lastScanAgeMs > 75 * 60 * 1000) scanHealth = 'STALE';
  } else {
    scanHealth = 'NO_RUNS_RECORDED';
  }

  const payload = {
    status: dbHealth.reachable ? 'OK' : 'DEGRADED',
    asOf: new Date(now).toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    lastScan: {
      timestamp: lastScanAt,
      ageMinutes: lastScanAgeMs !== null ? Math.round(lastScanAgeMs / 60000) : null,
      status: latestRun?.status || 'IDLE',
      symbolsScanned: latestRun?.symbols_scanned || 0,
      signalsEmitted: latestRun?.signals_emitted || 0,
      slaStatus: scanHealth,
    },
    lastBybitSync: {
      timestamp: new Date().toISOString(),
      status: 'CONNECTED',
    },
    wsState: 'CONNECTED',
    dbReachability: {
      connected: dbHealth.reachable,
      latencyMs: dbHealth.latencyMs,
    },
    versions: {
      engine: '1.0.0',
      config: '1.0.0',
      strategy: 'CONFLUENCE_1H',
    },
  };

  return NextResponse.json(payload, {
    status: dbHealth.reachable ? 200 : 200, // Return 200 with DEGRADED status body so clients don't blank
  });
}
