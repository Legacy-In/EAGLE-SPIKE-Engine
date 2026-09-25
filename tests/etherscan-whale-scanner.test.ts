/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧪 ETHERSCAN ON-CHAIN WHALE SCANNER & MANIPULATION DETECTOR TEST SUITE
 * Unit & Integration verification for:
 * 1. Etherscan API URL & Parameter Construction
 * 2. Address Truncation & Normalization
 * 3. Transfer Action Classification (Deposit / Accumulation / Transfer)
 * 4. ETH (>= 50 ETH) and ERC-20 (>= $25k) Qualification Filters
 * 5. Exchange Deposit (>= $100k) High-Severity Manipulation Alerting
 * 6. Telegram Outbox Integration
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ETHERSCAN_KEY,
  KNOWN_EXCHANGES,
  buildEtherscanUrl,
  truncateAddress,
  classifyTransfer,
  qualifyOnChainTransfer,
  processOnChainWhaleTransfer,
  OnChainWhaleStore
} from '../backend/services/etherscan-scanner.mjs';
import { telegramCommandHandler } from '../services/telegram/command-handler';
import { telegramService } from '../services/telegram/telegram-service';

describe('🐋 Etherscan Whale Wallet Scanner & Manipulation Detector', () => {

  test('1. Validates Etherscan API Key configuration and URL builder', () => {
    assert.ok(ETHERSCAN_KEY.length >= 20, 'Etherscan API key must be configured');
    const url = buildEtherscanUrl({ module: 'account', action: 'balance', address: '0x123' });
    assert.ok(url.includes('api.etherscan.io/v2/api'));
    assert.ok(url.includes('chainid=1'));
    assert.ok(url.includes('apikey=' + ETHERSCAN_KEY));
    assert.ok(url.includes('module=account'));
    assert.ok(url.includes('action=balance'));
  });

  test('2. Truncates Ethereum addresses cleanly for mobile display', () => {
    const raw = '0x28C6c06298d514Db089934071355E5743bf21d60';
    const truncated = truncateAddress(raw);
    assert.equal(truncated, '0x28C6...1d60');
    assert.equal(truncateAddress('0x123'), '0x123');
  });

  test('3. Classifies on-chain transfers accurately between CEX and Whales', () => {
    const binanceAddr = '0x28c6c06298d514db089934071355e5743bf21d60';
    const bybitAddr = '0xf89d7b9c374f279dca70b76155fd7721fa9ecb15';
    const privateWhale = '0x71C8360f3E2823071355E5743bf21d89';

    // A: Private Whale -> Binance = WHALE_EXCHANGE_DEPOSIT (Dump risk)
    const dep = classifyTransfer(privateWhale, binanceAddr);
    assert.equal(dep.action, 'WHALE_EXCHANGE_DEPOSIT');
    assert.equal(dep.risk, 'HIGH_DUMP_RISK');
    assert.equal(dep.targetName, 'Binance 14');

    // B: Bybit -> Private Whale = WHALE_ACCUMULATION (Cold storage outflow)
    const accum = classifyTransfer(bybitAddr, privateWhale);
    assert.equal(accum.action, 'WHALE_ACCUMULATION');
    assert.equal(accum.risk, 'ACCUMULATION_OUTFLOW');
    assert.equal(accum.targetName, 'Bybit Hot Wallet');

    // C: Private Whale -> Private Whale = WHALE_WALLET_TRANSFER (OTC / Shuffle)
    const otc = classifyTransfer(privateWhale, '0x8888888888888888888888888888888888888888');
    assert.equal(otc.action, 'WHALE_WALLET_TRANSFER');
    assert.equal(otc.risk, 'NEUTRAL_OTC');
  });

  test('4. Qualifies Native ETH Transfers with >= 50 ETH threshold', () => {
    // 49.9 ETH -> Should be filtered out (< 50 ETH)
    const txSmall = {
      hash: '0xabc1',
      blockNumber: '100',
      timeStamp: '1700000000',
      from: '0x71C8360f3E2823071355E5743bf21d89',
      to: '0x28c6c06298d514db089934071355e5743bf21d60',
      value: (49.9 * 1e18).toString()
    };
    assert.equal(qualifyOnChainTransfer(txSmall, false), null);

    // 50.0 ETH -> Qualifies
    const txQualified = {
      hash: '0xabc2',
      blockNumber: '100',
      timeStamp: '1700000000',
      from: '0x71C8360f3E2823071355E5743bf21d89',
      to: '0x28c6c06298d514db089934071355e5743bf21d60',
      value: (50 * 1e18).toString()
    };
    const res = qualifyOnChainTransfer(txQualified, false);
    assert.ok(res != null);
    assert.equal(res.symbol, 'ETH');
    assert.equal(res.amountTokens, 50);
    assert.ok(res.amountUsd >= 100000);
    assert.equal(res.action, 'WHALE_EXCHANGE_DEPOSIT');
  });

  test('5. Qualifies ERC-20 Token Transfers with >= $25,000 USD threshold', () => {
    // 10,000 USDT ($10k) -> Should be filtered out (< $25k)
    const txSmallToken = {
      hash: '0xtok1',
      blockNumber: '101',
      tokenSymbol: 'USDT',
      tokenDecimal: '6',
      value: (10000 * 1e6).toString(),
      from: '0x28c6c06298d514db089934071355e5743bf21d60',
      to: '0x71C8360f3E2823071355E5743bf21d89'
    };
    assert.equal(qualifyOnChainTransfer(txSmallToken, true), null);

    // 150,000 USDT ($150k) -> Qualifies as WHALE_ACCUMULATION
    const txBigToken = {
      hash: '0xtok2',
      blockNumber: '101',
      tokenSymbol: 'USDT',
      tokenDecimal: '6',
      value: (150000 * 1e6).toString(),
      from: '0x28c6c06298d514db089934071355e5743bf21d60',
      to: '0x71C8360f3E2823071355E5743bf21d89'
    };
    const resToken = qualifyOnChainTransfer(txBigToken, true);
    assert.ok(resToken != null);
    assert.equal(resToken.symbol, 'USDT');
    assert.equal(resToken.amountTokens, 150000);
    assert.equal(resToken.amountUsd, 150000);
    assert.equal(resToken.action, 'WHALE_ACCUMULATION');
  });

  test('6. Ingests high-value exchange deposit (>= $100k) and queues Telegram alert', async () => {
    const depositTx = {
      txHash: '0xdeadbeef1234567890abcdef',
      blockNumber: '20839500',
      timestamp: new Date().toISOString(),
      from: '0x71C8360f3E2823071355E5743bf21d89',
      to: '0x28c6c06298d514db089934071355e5743bf21d60',
      fromTruncated: '0x71C8...1d89',
      toTruncated: '0x28c6...1d60',
      symbol: 'ETH',
      contractAddress: null,
      amountTokens: 200,
      amountUsd: 530000, // $530,000 USD (>= $500k -> CRITICAL)
      action: 'WHALE_EXCHANGE_DEPOSIT',
      risk: 'HIGH_DUMP_RISK',
      targetName: 'Binance 14',
      description: 'Whale deposited 200 ETH into Binance 14',
      etherscanUrl: 'https://etherscan.io/tx/0xdeadbeef1234567890abcdef'
    };

    const processed = await processOnChainWhaleTransfer(depositTx);
    assert.ok(processed != null);
    assert.equal(processed.txHash, depositTx.txHash);

    // Verify added to OnChainWhaleStore
    assert.ok(OnChainWhaleStore.transfers.some(t => t.txHash === depositTx.txHash));

    // Duplicate prevention: Calling again with same hash returns null
    const dup = await processOnChainWhaleTransfer(depositTx);
    assert.equal(dup, null, 'Duplicate on-chain transaction must be skipped');
  });

  test('7. Handles ETHERSCAN WHALE ALERT Telegram bot command and responds', async () => {
    let capturedMsg = '';
    const origSend = telegramService.sendMessage;
    try {
      telegramService.sendMessage = async (chatId, text, opts) => {
        capturedMsg = text;
        return { ok: true, result: { message_id: 9999 } } as any;
      };

      // Test A: Command '/whale'
      await telegramCommandHandler.handleMessage('test_chat', '/whale');
      assert.ok(capturedMsg.includes('ETHERSCAN WHALE ALERTS'), 'Must respond with Etherscan Whale Alerts');
      assert.ok(capturedMsg.includes('Active On-Chain Scanners'), 'Must include active on-chain scanners');

      // Test B: Phrase 'ETHERSCAN WHALE ALERT'
      capturedMsg = '';
      await telegramCommandHandler.handleMessage('test_chat', 'ETHERSCAN WHALE ALERT');
      assert.ok(capturedMsg.includes('ETHERSCAN WHALE ALERTS'), 'Must handle direct phrase "ETHERSCAN WHALE ALERT"');

      // Test C: Command '/etherscan'
      capturedMsg = '';
      await telegramCommandHandler.handleMessage('test_chat', '/etherscan');
      assert.ok(capturedMsg.includes('ETHERSCAN WHALE ALERTS'), 'Must handle /etherscan alias');
    } finally {
      telegramService.sendMessage = origSend;
    }
  });

});
