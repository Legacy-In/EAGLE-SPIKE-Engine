/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🐋 EAGLE FLASH — ETHERSCAN ON-CHAIN WHALE INGESTION WORKER DAEMON
 * ═══════════════════════════════════════════════════════════════════════════
 * Continuously polls Etherscan REST API V2 for targeted whale addresses.
 * Identifies:
 *   - Major ETH movements (>= 50 ETH)
 *   - Massive ERC-20 token movements (>= $25,000 USD)
 *   - Exchange deposits / dump risks (>= $100,000 USD)
 * Persists to Supabase `whale_trades` and `manipulation_alerts`.
 * Enqueues critical exchange dump alerts to Telegram outbox for @eaglespike_bot.
 */

import {
  OnChainWhaleStore,
  scanWhaleAddress,
  processOnChainWhaleTransfer,
  SEED_WHALE_WALLETS,
  ETHERSCAN_KEY
} from '../backend/services/etherscan-scanner.mjs';

const ARGS = process.argv.slice(2);
const IS_SIMULATION = ARGS.includes('--simulate');
const SCAN_INTERVAL_MS = 60000; // 60s cycle per address set

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🐋 EAGLE FLASH — ETHERSCAN ON-CHAIN WHALE SCANNER DAEMON');
console.log(`🔑 Etherscan API Key: ${ETHERSCAN_KEY.slice(0, 6)}...${ETHERSCAN_KEY.slice(-4)}`);
console.log(`📋 Monitored Whales: ${SEED_WHALE_WALLETS.length} institutional addresses`);
console.log(`⚙️ Mode: ${IS_SIMULATION ? 'SIMULATION / TEST HARNESS' : 'PRODUCTION LIVE ETHERSCAN API'}`);
console.log('═══════════════════════════════════════════════════════════════════');

/**
 * Synthetic Simulation Generator
 */
async function runSimulationStep() {
  const isDeposit = Math.random() < 0.6;
  const isBigEth = Math.random() < 0.5;
  const dummyHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  if (isBigEth) {
    const ethAmt = Math.round(150 + Math.random() * 850); // 150 - 1000 ETH
    const usdVal = ethAmt * 2650;
    const simTx = {
      txHash: dummyHash,
      blockNumber: '20839124',
      timestamp: new Date().toISOString(),
      from: isDeposit ? '0x71C8360f3E2823071355E5743bf21d89' : '0x28C6c06298d514Db089934071355E5743bf21d60',
      to: isDeposit ? '0x28C6c06298d514Db089934071355E5743bf21d60' : '0x71C8360f3E2823071355E5743bf21d89',
      fromTruncated: isDeposit ? '0x71C8...21d89' : '0x28C6...21d60',
      toTruncated: isDeposit ? '0x28C6...21d60' : '0x71C8...21d89',
      symbol: 'ETH',
      contractAddress: null,
      amountTokens: ethAmt,
      amountUsd: usdVal,
      action: isDeposit ? 'WHALE_EXCHANGE_DEPOSIT' : 'WHALE_ACCUMULATION',
      risk: isDeposit ? 'HIGH_DUMP_RISK' : 'ACCUMULATION_OUTFLOW',
      targetName: 'Binance 14',
      description: isDeposit ? 'Whale deposited funds directly into Binance 14 (Sell Pressure Risk)' : 'Whale withdrew funds from Binance 14',
      etherscanUrl: `https://etherscan.io/tx/${dummyHash}`
    };
    await processOnChainWhaleTransfer(simTx);
  } else {
    const tokens = ['USDT', 'PEPE', 'AKE', 'LAB', 'GTW'];
    const sym = tokens[Math.floor(Math.random() * tokens.length)];
    const usdVal = Math.round(45000 + Math.random() * 250000);
    const tokenAmt = sym === 'PEPE' ? usdVal / 0.0000105 : sym === 'AKE' ? usdVal / 0.048 : usdVal;

    const simTx = {
      txHash: dummyHash,
      blockNumber: '20839125',
      timestamp: new Date().toISOString(),
      from: isDeposit ? '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503' : '0xf89d7b9c374f279dca70b76155fd7721fa9ecb15',
      to: isDeposit ? '0xf89d7b9c374f279dca70b76155fd7721fa9ecb15' : '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503',
      fromTruncated: isDeposit ? '0x47ac...6D503' : '0xf89d...9ecb15',
      toTruncated: isDeposit ? '0xf89d...9ecb15' : '0x47ac...6D503',
      symbol: sym,
      contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      amountTokens: Math.round(tokenAmt),
      amountUsd: usdVal,
      action: isDeposit ? 'WHALE_EXCHANGE_DEPOSIT' : 'WHALE_ACCUMULATION',
      risk: isDeposit ? 'HIGH_DUMP_RISK' : 'ACCUMULATION_OUTFLOW',
      targetName: 'Bybit Hot Wallet',
      description: isDeposit ? 'Whale deposited funds directly into Bybit Hot Wallet' : 'Whale accumulation outflow',
      etherscanUrl: `https://etherscan.io/tx/${dummyHash}`
    };
    await processOnChainWhaleTransfer(simTx);
  }
}

/**
 * Scan All Registered Whale Addresses sequentially
 */
async function scanAllWhales() {
  console.log(`🔍 [SCAN STARTED] Checking ${OnChainWhaleStore.trackedWallets.length} target whale accounts on Etherscan...`);
  let qualifiedCount = 0;

  for (const wallet of OnChainWhaleStore.trackedWallets) {
    try {
      const transfers = await scanWhaleAddress(wallet.address);
      if (transfers && transfers.length > 0) {
        for (const t of transfers) {
          const res = await processOnChainWhaleTransfer(t);
          if (res) {
            qualifiedCount++;
            console.log(`🚨 [WHALE ON-CHAIN] ${t.action} | ${t.symbol} $${Math.round(t.amountUsd).toLocaleString()} (${t.amountTokens} tokens) -> ${t.targetName}`);
          }
        }
      }
      // Stagger requests across wallets by 500ms
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.warn(`⚠️ Scan error for wallet ${wallet.label} (${wallet.address.slice(0, 10)}):`, err.message);
    }
  }

  OnChainWhaleStore.lastScannedAt = new Date().toISOString();
  console.log(`✅ [SCAN COMPLETE] Cycle finished. Qualified new whale prints: ${qualifiedCount}. Total stored: ${OnChainWhaleStore.transfers.length}`);
}

async function startWorker() {
  console.log('🚀 Etherscan Whale Account Scanner Worker starting...');

  // 1. Initial Live Scan
  if (!IS_SIMULATION) {
    await scanAllWhales();
  } else {
    await runSimulationStep();
  }

  // 2. Loop Schedule
  setInterval(async () => {
    try {
      if (!IS_SIMULATION) {
        await scanAllWhales();
      } else {
        await runSimulationStep();
      }
    } catch (e) {
      console.warn('⚠️ Loop scan error:', e.message);
    }
  }, IS_SIMULATION ? 6000 : SCAN_INTERVAL_MS);

  console.log('✅ Etherscan Whale Worker is active and monitoring.');
}

startWorker().catch(err => {
  console.error('❌ Fatal Etherscan worker error:', err);
  process.exit(1);
});
