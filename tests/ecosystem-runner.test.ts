import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { SERVICES, getActiveServices, validateServices } from '../scripts/start_all.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

describe('Ecosystem Runner & Multi-Worker Orchestrator', () => {
  test('ecosystem.config.cjs defines exactly 10 production apps with valid scripts', async () => {
    const configPath = path.join(ROOT_DIR, 'ecosystem.config.cjs');
    assert.ok(fs.existsSync(configPath), 'ecosystem.config.cjs must exist');

    // Dynamic import of CommonJS config
    const ecosystem = (await import(`file://${configPath}`)).default;
    assert.ok(Array.isArray(ecosystem.apps), 'ecosystem.apps must be an array');
    assert.strictEqual(ecosystem.apps.length, 10, 'Must contain 10 supervised apps');

    const appNames = new Set();
    const ports = new Set();

    for (const app of ecosystem.apps) {
      assert.ok(app.name, 'App must have a name');
      assert.ok(!appNames.has(app.name), `Duplicate app name detected: ${app.name}`);
      appNames.add(app.name);

      if (app.env && app.env.PORT) {
        assert.ok(!ports.has(app.env.PORT), `Port conflict detected on port ${app.env.PORT}`);
        ports.add(app.env.PORT);
      }

      // Check script existence
      if (app.name === 'eagle-flash-web') {
        const webPkg = path.join(ROOT_DIR, 'apps', 'web', 'package.json');
        assert.ok(fs.existsSync(webPkg), 'Web app package.json must exist');
      } else {
        const scriptFile = path.join(ROOT_DIR, app.script);
        assert.ok(fs.existsSync(scriptFile), `Script file does not exist: ${app.script}`);
      }
    }
  });

  test('start_all.mjs service definitions and validation', () => {
    assert.strictEqual(SERVICES.length, 10, 'Must define 10 services');

    const allActive = getActiveServices();
    assert.strictEqual(allActive.length, 10, 'Default active services must be 10');

    const workersOnly = getActiveServices({ workersOnly: true });
    assert.strictEqual(workersOnly.length, 9, 'Workers-only must be 9');
    const webService = SERVICES.find((s) => s.id === 'web');
    assert.ok(webService, 'Web service must exist');
    assert.strictEqual(webService.command, process.execPath, 'Web must use process.execPath to prevent Windows spawn EINVAL');
    assert.ok(webService.scriptPath && fs.existsSync(path.join(ROOT_DIR, webService.scriptPath)), 'Next CLI binary must exist on disk');

    const issues = validateServices();
    assert.deepStrictEqual(issues, [], 'validateServices must return 0 issues');
  });

  test('start_all.mjs --dry-run CLI execution exits with code 0', () => {
    const scriptPath = path.join(ROOT_DIR, 'scripts', 'start_all.mjs');
    const stdout = execFileSync(process.execPath, [scriptPath, '--dry-run'], {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    });

    assert.ok(
      stdout.includes('All 10 services and scripts verified'),
      'Dry-run must verify all 10 services'
    );
    assert.ok(
      stdout.includes('Configured to launch 10 processes'),
      'Dry-run must indicate 10 processes'
    );
  });

  test('start_all.mjs --workers-only --dry-run CLI execution exits with code 0', () => {
    const scriptPath = path.join(ROOT_DIR, 'scripts', 'start_all.mjs');
    const stdout = execFileSync(
      process.execPath,
      [scriptPath, '--workers-only', '--dry-run'],
      {
        cwd: ROOT_DIR,
        encoding: 'utf8',
      }
    );

    assert.ok(
      stdout.includes('Configured to launch 9 processes'),
      'Workers-only dry-run must indicate 9 processes'
    );
    assert.ok(
      !stdout.includes('[EAGLE-WEB]'),
      'Workers-only dry-run must omit EAGLE-WEB'
    );
  });
});
