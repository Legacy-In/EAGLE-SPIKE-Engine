import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateCanonicalPayload,
  hashCanonicalPayload,
  generateCommitmentMetadata,
  commitSignalToBlockchain,
  verifySignal,
} from '../backend/services/blockchain-proof.mjs';
import {
  viemClient,
  RpcTelemetry,
  pollLatestBlockHeader,
  getLiveOnchainTelemetry,
} from '../backend/services/viem-rpc-scanner.mjs';
import { config as wagmiConfig } from '../apps/web/config/wagmi';

describe('🛡️ EAGLE FLASH — Web3 Blockchain Platform Integration Test Suite', () => {
  // 1. Canonical Deterministic Serialization & Hashing
  test('1. Canonical Deterministic Hashing: Produces Identical SHA-256 Hash Regardless of Field Order', () => {
    const rawSignalA = {
      signal_id: 'EGL-20260928-BYBIT-BTCUSDT-0001',
      exchange: 'BYBIT',
      symbol: 'BTCUSDT',
      direction: 'LONG',
      entry_price: 83520.50,
      stop_loss_price: 81850.00,
      tp1_price: 84620.00,
      tp2_price: 85710.00,
      tp3_price: 87900.00,
      risk_r: 1670.50,
      primary_strategy: 'BREAKOUT',
      secondary_strategies: ['LEVERAGE_EXPANSION', 'QUICK_PUMP'],
      detected_at: '2026-09-28T12:00:00.000Z',
    };

    // Shuffled properties
    const rawSignalB = {
      detected_at: '2026-09-28T12:00:00.000Z',
      direction: 'LONG',
      symbol: 'BTCUSDT',
      stop_loss_price: 81850.00,
      secondary_strategies: ['QUICK_PUMP', 'LEVERAGE_EXPANSION'], // reversed order
      entry_price: 83520.50,
      primary_strategy: 'BREAKOUT',
      risk_r: 1670.50,
      tp3_price: 87900.00,
      tp2_price: 85710.00,
      tp1_price: 84620.00,
      exchange: 'BYBIT',
      signal_id: 'EGL-20260928-BYBIT-BTCUSDT-0001',
    };

    const payloadA = generateCanonicalPayload(rawSignalA, 'SIGNAL_CREATED');
    const payloadB = generateCanonicalPayload(rawSignalB, 'SIGNAL_CREATED');

    assert.equal(payloadA, payloadB, 'Deterministic canonical JSON must match byte-for-byte');

    const hashA = hashCanonicalPayload(payloadA);
    const hashB = hashCanonicalPayload(payloadB);

    assert.equal(hashA, hashB, 'SHA-256 hashes must match identically');
    assert.ok(hashA.startsWith('0x'), 'Hash must have 0x prefix for EVM compatibility');
    assert.equal(hashA.length, 66, 'Hash must be a standard 32-byte (64 hex + 0x) string');
  });

  // 2. Cryptographic Tamper Detection
  test('2. Anti-Tamper Invariant: Modified Entry or Stop Triggers DATA INTEGRITY MISMATCH', async () => {
    const originalSignal = {
      signal_id: 'EGL-20260928-BYBIT-ETHUSDT-TAMPER-TEST',
      exchange: 'BYBIT',
      symbol: 'ETHUSDT',
      direction: 'LONG',
      entry_price: 2650.00,
      stop_loss_price: 2590.00,
      tp1_price: 2710.00,
      tp2_price: 2770.00,
      tp3_price: 2830.00,
      risk_r: 60.00,
      primary_strategy: 'BREAKOUT',
      secondary_strategies: [],
      detected_at: '2026-09-28T12:15:00.000Z',
    };

    // 1. Commit authentic signal
    const commitRes = await commitSignalToBlockchain(originalSignal, 'SIGNAL_CREATED');
    assert.ok(commitRes.success, 'Commitment must succeed');

    // 2. Verify authentic signal -> Must be VERIFIED
    const verifyValid = await verifySignal(originalSignal.signal_id, 'SIGNAL_CREATED', originalSignal);
    assert.equal(verifyValid.status, 'VERIFIED');
    assert.equal(verifyValid.event_hash, commitRes.event_hash);
    assert.ok(verifyValid.transaction_hash.startsWith('0x'));

    // 3. Simulating database tampering: Entry modified from 2650.00 to 2640.00
    const tamperedSignal = {
      ...originalSignal,
      entry_price: 2640.00, // Fabricated entry to falsely inflate ROI
    };

    const verifyTampered = await verifySignal(originalSignal.signal_id, 'SIGNAL_CREATED', tamperedSignal);
    assert.equal(verifyTampered.status, 'MISMATCH', 'Cryptographic engine must flag tampered data as MISMATCH');
    assert.ok(verifyTampered.reason.includes('DATA INTEGRITY MISMATCH'), 'Must report explicit data integrity breach');
  });

  // 3. Zero-Mock On-Chain Telemetry Invariant
  test('3. Zero-Mock Invariant: On-chain Telemetry Returns Real RPC State without Synthetic Fallbacks', () => {
    const telemetry = getLiveOnchainTelemetry();

    assert.equal(telemetry.source, 'ETHEREUM_MAINNET_RPC');
    assert.equal(telemetry.chainId, 1);
    assert.equal(telemetry.network, 'Ethereum Mainnet');
    assert.ok(telemetry.trackedWalletsCount >= 6, 'Must track at least 6 institutional seed wallets');
    assert.ok(telemetry.verifiedRegistryCount >= 10, 'Verified exchange registry must contain known gateways');

    // Telemetry must have a valid block number representation
    assert.ok(telemetry.blockNumber, 'Must have active block number');
    assert.ok(telemetry.baseFeeGwei, 'Must have base fee Gwei string');
    assert.ok(['LIVE', 'FRESH'].includes(telemetry.dataFreshness), 'Data freshness must be LIVE or FRESH');
  });

  // 4. Wagmi Multi-Chain Configuration Coverage
  test('4. Wagmi Configuration: Supports all 6 mandated EVM chains', () => {
    assert.ok(wagmiConfig, 'Wagmi config must be defined');
    const chainIds = wagmiConfig.chains.map(c => c.id);

    // Ethereum (1), Optimism (10), BSC (56), Polygon (137), Base (8453), Arbitrum (42161)
    assert.ok(chainIds.includes(1), 'Must support Ethereum Mainnet');
    assert.ok(chainIds.includes(8453), 'Must support Base');
    assert.ok(chainIds.includes(42161), 'Must support Arbitrum One');
    assert.ok(chainIds.includes(10), 'Must support Optimism');
    assert.ok(chainIds.includes(137), 'Must support Polygon');
    assert.ok(chainIds.includes(56), 'Must support Binance Smart Chain');
  });

  // 5. Viem Public Client Connection
  test('5. Viem Multi-RPC Client: Resilient connection and transport configuration', () => {
    assert.ok(viemClient, 'Viem client must be instantiated');
    assert.equal(viemClient.chain.id, 1, 'Client chain must be Ethereum Mainnet');
  });
});
