/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧪 EAGLE FLASH — MOBILE WORKER SUPERVISOR TEST SUITE
 * File: tests/mobile-supervisor.test.ts
 *
 * Validates the in-process mobile supervisor:
 * - 11 registered workers match canonical specification
 * - Fleet status & system metrics calculation
 * - Log ring-buffer cap and broadcast
 * - Safe lifecycle transitions (start, stop, toggle)
 * - Local HTTP IPC API endpoints (/api/health, /api/fleet, /api/logs)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { MobileWorkerSupervisor } from '../backend/mobile/mobile_worker_supervisor.mjs';

test('▶ 🧪 Mobile Worker Supervisor Test Suite', async (t) => {
  const supervisor = new MobileWorkerSupervisor();

  await t.test('1. Registry Invariant: exactly 11 canonical workers registered', () => {
    assert.strictEqual(supervisor.workers.size, 11, 'Must register exactly 11 workers');

    const expectedWorkerIds = [
      'tpsl_monitor',
      'discord',
      'telegram_outbox',
      'telegram_poll',
      'bigcap',
      'checkpoint',
      'whale',
      'etherscan',
      'listing_worker',
      'performance_worker',
      'paper_monitor',
    ];

    for (const id of expectedWorkerIds) {
      assert.ok(supervisor.workers.has(id), `Expected worker ${id} to be present in registry`);
      const w = supervisor.workers.get(id);
      assert.strictEqual(w.status, 'STOPPED', `Initial status for ${id} must be STOPPED`);
      assert.ok(w.intervalMs > 0, `Interval for ${id} must be positive`);
    }
  });

  await t.test('2. Fleet Status & System Metrics Contract', () => {
    const fleet = supervisor.getFleetStatus();
    assert.strictEqual(fleet.totalWorkers, 11);
    assert.strictEqual(fleet.runningWorkers, 0);
    assert.strictEqual(fleet.errorWorkers, 0);
    assert.strictEqual(fleet.engineStatus, 'STOPPED');
    assert.strictEqual(fleet.workers.length, 11);

    const metrics = supervisor.getSystemMetrics();
    assert.ok(metrics.rssMb > 0, 'RSS memory should be > 0 MB');
    assert.ok(metrics.heapUsedMb > 0, 'Heap used should be > 0 MB');
    assert.ok(metrics.cpuCount >= 1, 'CPU count should be >= 1');
    assert.ok(typeof metrics.nodeVersion === 'string', 'Node version should be a string');
  });

  await t.test('3. Circular Log Buffer: caps at limit and broadcasts to listeners', () => {
    let capturedLog = null;
    const testListener = (entry) => {
      capturedLog = entry;
    };

    supervisor.listeners.add(testListener);
    supervisor.log('info', 'paper_monitor', 'Test virtual trade executed');

    assert.ok(capturedLog !== null, 'Listener should receive emitted log');
    assert.strictEqual(capturedLog.level, 'INFO');
    assert.strictEqual(capturedLog.workerId, 'paper_monitor');
    assert.strictEqual(capturedLog.message, 'Test virtual trade executed');

    // Test buffer overflow retention
    for (let i = 0; i < 550; i++) {
      supervisor.log('warn', 'test', `Spam log ${i}`);
    }

    assert.strictEqual(supervisor.logBuffer.length, 500, 'Buffer should strictly clamp to 500 max entries');
    supervisor.listeners.delete(testListener);
  });

  await t.test('4. Worker Lifecycle: mock handler starts, ticks, and stops cleanly', async () => {
    const worker = supervisor.workers.get('paper_monitor');
    assert.ok(worker);

    // Provide a lightweight mock handler for fast testing
    let ticks = 0;
    worker.handler = async () => {
      ticks++;
    };
    worker.intervalMs = 50; // fast tick for testing

    await supervisor.startWorker('paper_monitor');
    assert.strictEqual(worker.status, 'RUNNING');
    assert.ok(worker.ticksCount >= 1, 'Initial tick executed');

    // Wait for 2 ticks
    await new Promise((r) => setTimeout(r, 120));
    assert.ok(ticks >= 2, 'Scheduled ticks executed');

    await supervisor.stopWorker('paper_monitor');
    assert.strictEqual(worker.status, 'STOPPED');
    assert.strictEqual(worker.timer, null);
  });

  await t.test('5. Embedded HTTP IPC API: /api/health, /api/fleet, /api/logs, /api/worker/:id', async () => {
    const testPort = 4048;
    supervisor.startHttpServer(testPort);

    // Helper fetch wrapper using node http
    const httpGet = (path) =>
      new Promise((resolve, reject) => {
        http
          .get(`http://localhost:${testPort}${path}`, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
          })
          .on('error', reject);
      });

    const httpPost = (path) =>
      new Promise((resolve, reject) => {
        const req = http.request(
          `http://localhost:${testPort}${path}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' } },
          (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
          }
        );
        req.on('error', reject);
        req.end();
      });

    // 1. Health check
    const healthRes = await httpGet('/api/health');
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthRes.data.status, 'ok');

    // 2. Fleet status
    const fleetRes = await httpGet('/api/fleet');
    assert.strictEqual(fleetRes.status, 200);
    assert.strictEqual(fleetRes.data.success, true);
    assert.strictEqual(fleetRes.data.fleet.totalWorkers, 11);

    // 3. Logs query
    const logsRes = await httpGet('/api/logs?limit=5');
    assert.strictEqual(logsRes.status, 200);
    assert.strictEqual(logsRes.data.success, true);
    assert.ok(Array.isArray(logsRes.data.logs));

    // 4. Toggle worker
    const toggleRes = await httpPost('/api/worker/paper_monitor/toggle');
    assert.strictEqual(toggleRes.status, 200);
    assert.strictEqual(toggleRes.data.success, true);

    // Cleanup
    await supervisor.stopWorker('paper_monitor');
    supervisor.stopHttpServer();
  });
});
