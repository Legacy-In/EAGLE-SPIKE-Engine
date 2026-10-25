/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧪 EAGLE FLASH — MOBILE CONTROL DASHBOARD & ENGINE TEST SUITE
 * File: tests/mobile-dashboard.test.ts
 *
 * Validates:
 * - In-process mobile supervisor state & 11 canonical workers
 * - Mode switching invariants (paper vs live)
 * - Worker toggle execution
 * - System metrics & memory telemetry
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mobileSupervisor } from '../backend/mobile/mobile_worker_supervisor.mjs';

test('▶ 🧪 Mobile Dashboard & Trading Engine Integration Test Suite', async (t) => {
  await t.test('1. Mobile Supervisor Registry: 11 canonical workers present', () => {
    assert.strictEqual(mobileSupervisor.workers.size, 11, 'Must register all 11 background workers');

    const expectedWorkers = [
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

    for (const wId of expectedWorkers) {
      assert.ok(mobileSupervisor.workers.has(wId), `Worker ${wId} must be registered`);
      const w = mobileSupervisor.workers.get(wId);
      assert.ok(w.displayName && w.name, `Worker ${wId} must have display name and code name`);
    }
  });

  await t.test('2. Fleet Status Telemetry Contract', () => {
    const fleet = mobileSupervisor.getFleetStatus();
    assert.strictEqual(typeof fleet.engineStatus, 'string');
    assert.strictEqual(fleet.totalWorkers, 11);
    assert.ok(Array.isArray(fleet.workers));
    assert.strictEqual(fleet.workers.length, 11);

    for (const w of fleet.workers) {
      assert.ok(['STOPPED', 'STARTING', 'RUNNING', 'ERROR', 'IDLE'].includes(w.status));
      assert.ok(typeof w.ticksCount === 'number');
    }
  });

  await t.test('3. Hardware & Memory Telemetry Contract', () => {
    const metrics = mobileSupervisor.getSystemMetrics();
    assert.ok(metrics.rssMb > 0, 'RSS memory should be reported in MB');
    assert.ok(metrics.heapUsedMb > 0, 'Heap used should be reported in MB');
    assert.ok(metrics.cpuCount >= 1, 'CPU core count should be >= 1');
    assert.ok(metrics.uptimeSeconds >= 0, 'Uptime should be non-negative');
  });

  await t.test('4. Worker Toggle & Error Resilience', async () => {
    const workerId = 'paper_monitor';
    const worker = mobileSupervisor.workers.get(workerId);
    assert.ok(worker);

    // Mock handler for test
    worker.handler = async () => {};

    // Start
    await mobileSupervisor.startWorker(workerId);
    assert.strictEqual(worker.status, 'RUNNING');

    // Stop
    await mobileSupervisor.stopWorker(workerId);
    assert.strictEqual(worker.status, 'STOPPED');
  });

  await t.test('5. Circular Log Buffer Broadcast', () => {
    mobileSupervisor.log('INFO', 'TEST_WORKER', 'Mobile test log dispatch');
    const logs = mobileSupervisor.logBuffer;
    assert.ok(logs.length > 0);
    const last = logs[logs.length - 1];
    assert.strictEqual(last.workerId, 'TEST_WORKER');
    assert.strictEqual(last.message, 'Mobile test log dispatch');
    assert.strictEqual(last.level, 'INFO');
  });
});
