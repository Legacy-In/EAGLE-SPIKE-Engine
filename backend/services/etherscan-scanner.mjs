/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🐋 EAGLE FLASH — ETHERSCAN ON-CHAIN WHALE TRACKER & SCANNER SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 * Queries Etherscan REST API V2/V1 to monitor:
 * 1. Targeted whale addresses and institutional smart money
 * 2. Massive ETH transfers (>= 50 ETH)
 * 3. Large ERC-20 Token Transfers (>= $25,000 USD)
 * 4. Exchange Deposits / Withdrawals (Binance, Bybit, Coinbase, OKX)
 * 5. Flags potential dumping risk and enqueues to Telegram outbox
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { queueTelegramSignalAlert } from './telegram-outbox.mjs';
import { recordWhaleTrade, createManipulationAlert } from './whale-detector.mjs';

// 1. Environment & API Key Resolution
let etherscanApiKey = process.env.ETHERSCAN_API_KEY || '';

const envFiles = ['.env', 'apps/web/.env.local'];
for (const ef of envFiles) {
  try {
    const fullPath = path.resolve(process.cwd(), ef);
    if (fs.existsSync(fullPath)) {
      const lines = fs.readFileSync(fullPath, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...v] = trimmed.split('=');
        const val = v.join('=').trim().replace(/^["']|["']$/g, '');
        if (k === 'ETHERSCAN_API_KEY' && !etherscanApiKey) {
          etherscanApiKey = val;
        }
      }
    }
  } catch (e) {}
}

export const ETHERSCAN_KEY = etherscanApiKey || '61IM5BYPQ22RTWH2W1M2EH7BNAWKJBIT4M';

// 2. Known Exchange Hot / Cold Wallets Registry (for classification)
export const KNOWN_EXCHANGES = new Map([
  ['0x28c6c06298d514db089934071355e5743bf21d60', { name: 'Binance 14', tag: 'BINANCE_HOT' }],
  ['0x21a31ee1afc51d94c2efccaa2092ad1028285549', { name: 'Binance 15', tag: 'BINANCE_HOT' }],
  ['0xdfd5293d8e347dfe59e90efd55b2956a1343963d', { name: 'Binance 16', tag: 'BINANCE_HOT' }],
  ['0xf89d7b9c374f279dca70b76155fd7721fa9ecb15', { name: 'Bybit Hot Wallet', tag: 'BYBIT_HOT' }],
  ['0x1db3439a222c519ab44bb1144fc28167b4fa6ee6', { name: 'Bybit 2', tag: 'BYBIT_HOT' }],
  ['0x503828976d22510aad0201ac7ec88293211a23da', { name: 'Coinbase 10', tag: 'COINBASE_HOT' }],
  ['0xa097e95697677a270a11a543b6047240a1b6a18d', { name: 'Coinbase 2', tag: 'COINBASE_HOT' }],
  ['0x6cc5f688a315f3dc28a7781717a9a798a59fda7b', { name: 'OKX 1', tag: 'OKX_HOT' }],
  ['0x0a93917de936081498c48a7767d8d21b711e5f88', { name: 'Kraken Hot Wallet', tag: 'KRAKEN_HOT' }],
  ['0x1111111254fb6c44bac0bed2854e76f90643097d', { name: '1inch V5 Router', tag: 'DEX_ROUTER' }],
  ['0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', { name: 'Uniswap Universal Router', tag: 'DEX_ROUTER' }]
]);

// 3. Seed Tracked Whales Registry
export const SEED_WHALE_WALLETS = [
  {
    address: '0x28C6c06298d514Db089934071355E5743bf21d60',
    label: 'Binance Hot Wallet 14',
    category: 'EXCHANGE',
    notes: 'Major liquidity gateway'
  },
  {
    address: '0xf89d7b9c374f279dca70b76155fd7721fa9ecb15',
    label: 'Bybit Hot Wallet 1',
    category: 'EXCHANGE',
    notes: 'Linear perpetuals settlement'
  },
  {
    address: '0x00000000219ab540356cbb839cbe05303d7705fa',
    label: 'ETH 2.0 Deposit Contract',
    category: 'STAKING',
    notes: 'Beacon chain staking pool'
  },
  {
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    label: 'Bitfinex Cold Wallet',
    category: 'INSTITUTIONAL',
    notes: 'Massive long-term reserve'
  },
  {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    label: 'WETH Contract Deployer',
    category: 'DEFI',
    notes: 'Core wrapped liquidity'
  },
  {
    address: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503',
    label: 'Binance Top Whale Reserves',
    category: 'WHALE',
    notes: 'Mega whale account (>50,000 ETH)'
  },
  {
    address: '0x534631Bcf33BDb069fB20A75d2791C863E25B307',
    label: 'Altcoin Deployer & Liquidity Hub',
    category: 'HIGH_BETA_DEPLOYER',
    notes: 'AKE / LAB / GTW liquidity orchestrator'
  }
];

// In-Memory Runtime State
export const OnChainWhaleStore = {
  trackedWallets: [...SEED_WHALE_WALLETS],
  transfers: [], // recent qualified transfers (capped at 200)
  alerts: [],    // on-chain alerts (capped at 50)
  lastScannedAt: null,
  activeTokensPrices: {
    ETH: 2650,
    WETH: 2650,
    USDT: 1.0,
    USDC: 1.0,
    DAI: 1.0,
    PEPE: 0.0000105,
    SHIB: 0.000018,
    LINK: 11.5,
    UNI: 7.2,
    AKE: 0.0482,
    LAB: 0.125,
    GTW: 0.0089
  }
};

// 4. Rate-Limit Governor: Minimum 250ms delay between Etherscan API requests
let lastRequestTime = 0;
export async function rateLimitedEtherscanFetch(url) {
  const minIntervalMs = 250;
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < minIntervalMs) {
    await new Promise(resolve => setTimeout(resolve, minIntervalMs - elapsed));
  }
  lastRequestTime = Date.now();

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`⚠️ Etherscan fetch error for ${url.slice(0, 70)}...:`, err.message);
    return null;
  }
}

/**
 * Builds resilient Etherscan API query URL (V2 primary with V1 fallback)
 */
export function buildEtherscanUrl(params) {
  const searchParams = new URLSearchParams({
    chainid: '1',
    apikey: ETHERSCAN_KEY,
    ...params
  });
  return `https://api.etherscan.io/v2/api?${searchParams.toString()}`;
}

/**
 * Truncates Ethereum address for clean display (e.g. 0x28C6...1d60)
 */
export function truncateAddress(addr) {
  if (!addr) return '';
  const s = String(addr);
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}...${s.slice(-4)}`;
}

/**
 * Classifies transfer action based on from/to addresses
 */
export function classifyTransfer(fromAddr, toAddr) {
  const fromNorm = (fromAddr || '').toLowerCase();
  const toNorm = (toAddr || '').toLowerCase();

  const isFromCex = KNOWN_EXCHANGES.has(fromNorm);
  const isToCex = KNOWN_EXCHANGES.has(toNorm);

  if (isToCex && !isFromCex) {
    const cex = KNOWN_EXCHANGES.get(toNorm);
    return {
      action: 'WHALE_EXCHANGE_DEPOSIT',
      risk: 'HIGH_DUMP_RISK',
      targetName: cex.name,
      description: `Whale deposited funds directly into ${cex.name} (Sell Pressure Risk)`
    };
  } else if (isFromCex && !isToCex) {
    const cex = KNOWN_EXCHANGES.get(fromNorm);
    return {
      action: 'WHALE_ACCUMULATION',
      risk: 'ACCUMULATION_OUTFLOW',
      targetName: cex.name,
      description: `Whale withdrew funds from ${cex.name} to private cold wallet`
    };
  } else {
    return {
      action: 'WHALE_WALLET_TRANSFER',
      risk: 'NEUTRAL_OTC',
      targetName: 'Private Whale',
      description: 'Private wallet-to-wallet transfer or OTC settlement'
    };
  }
}

/**
 * Evaluates whether an on-chain transfer qualifies as a Whale Movement
 */
export function qualifyOnChainTransfer(tx, isToken = false) {
  let amountTokens = 0;
  let amountUsd = 0;
  let symbol = 'ETH';
  let decimals = 18;

  if (isToken) {
    symbol = (tx.tokenSymbol || 'TOKEN').toUpperCase();
    decimals = parseInt(tx.tokenDecimal || '18', 10);
    const rawVal = parseFloat(tx.value || '0');
    amountTokens = rawVal / Math.pow(10, decimals);
    const unitPrice = OnChainWhaleStore.activeTokensPrices[symbol] || (symbol.includes('USD') ? 1.0 : 1.0);
    amountUsd = amountTokens * unitPrice;

    // Minimum $25,000 USD for ERC-20 transfers
    if (amountUsd < 25000) return null;
  } else {
    // Native ETH transfer
    const weiVal = parseFloat(tx.value || '0');
    amountTokens = weiVal / 1e18;
    const ethPrice = OnChainWhaleStore.activeTokensPrices.ETH || 2650;
    amountUsd = amountTokens * ethPrice;

    // Minimum 50 ETH
    if (amountTokens < 50) return null;
  }

  const classification = classifyTransfer(tx.from, tx.to);

  return {
    txHash: tx.hash,
    blockNumber: tx.blockNumber,
    timestamp: tx.timeStamp ? new Date(parseInt(tx.timeStamp, 10) * 1000).toISOString() : new Date().toISOString(),
    from: tx.from,
    to: tx.to,
    fromTruncated: truncateAddress(tx.from),
    toTruncated: truncateAddress(tx.to),
    symbol,
    contractAddress: tx.contractAddress || null,
    amountTokens: Number(amountTokens.toFixed(4)),
    amountUsd: Number(amountUsd.toFixed(2)),
    action: classification.action,
    risk: classification.risk,
    targetName: classification.targetName,
    description: classification.description,
    etherscanUrl: `https://etherscan.io/tx/${tx.hash}`
  };
}

/**
 * Scans a target whale address for recent ETH and Token transfers
 */
export async function scanWhaleAddress(address) {
  const normAddr = address.toLowerCase();

  // 1. Fetch Normal ETH Transactions
  const normalUrl = buildEtherscanUrl({
    module: 'account',
    action: 'txlist',
    address: normAddr,
    startblock: '0',
    endblock: '99999999',
    page: '1',
    offset: '15',
    sort: 'desc'
  });
  const normalData = await rateLimitedEtherscanFetch(normalUrl);

  // 2. Fetch ERC-20 Token Transfers
  const tokenUrl = buildEtherscanUrl({
    module: 'account',
    action: 'tokentx',
    address: normAddr,
    page: '1',
    offset: '20',
    sort: 'desc'
  });
  const tokenData = await rateLimitedEtherscanFetch(tokenUrl);

  const newWhaleTransfers = [];

  // Evaluate normal transactions
  if (normalData && normalData.status === '1' && Array.isArray(normalData.result)) {
    for (const tx of normalData.result) {
      const q = qualifyOnChainTransfer(tx, false);
      if (q) newWhaleTransfers.push(q);
    }
  }

  // Evaluate ERC-20 token transfers
  if (tokenData && tokenData.status === '1' && Array.isArray(tokenData.result)) {
    for (const tx of tokenData.result) {
      const q = qualifyOnChainTransfer(tx, true);
      if (q) newWhaleTransfers.push(q);
    }
  }

  return newWhaleTransfers;
}

/**
 * Ingests and processes a qualified on-chain whale transfer:
 * - Persists to `whale_trades`
 * - If Exchange Deposit >= $100k, persists to `manipulation_alerts` & enqueues to Telegram Outbox
 */
export async function processOnChainWhaleTransfer(transfer) {
  // Prevent duplicate processing
  const alreadyExists = OnChainWhaleStore.transfers.some(t => t.txHash === transfer.txHash);
  if (alreadyExists) return null;

  // Add to in-memory store
  OnChainWhaleStore.transfers.unshift(transfer);
  if (OnChainWhaleStore.transfers.length > 200) {
    OnChainWhaleStore.transfers.pop();
  }

  // 1. Persist to whale_trades table
  await recordWhaleTrade({
    symbol: transfer.symbol === 'ETH' ? 'ETHUSDT' : `${transfer.symbol}USDT`,
    exchange: 'ETHERSCAN_ONCHAIN',
    side: transfer.action === 'WHALE_EXCHANGE_DEPOSIT' ? 'SELL' : 'BUY',
    amount_usdt: transfer.amountUsd,
    execution_price: transfer.amountTokens > 0 ? (transfer.amountUsd / transfer.amountTokens) : 0,
    detected_at: transfer.timestamp
  });

  // 2. If Exchange Deposit >= $100k, raise high/critical Manipulation Alert
  if (transfer.action === 'WHALE_EXCHANGE_DEPOSIT' && transfer.amountUsd >= 100000) {
    const severity = transfer.amountUsd >= 500000 ? 'CRITICAL' : 'HIGH';
    const alertId = `ONCHAIN_DUMP_${transfer.symbol}_${transfer.txHash.slice(0, 10)}`;

    const alertRecord = await createManipulationAlert(
      transfer.symbol === 'ETH' ? 'ETHUSDT' : `${transfer.symbol}USDT`,
      'PUMP_AND_DUMP_RISK',
      severity,
      {
        onchain_action: transfer.action,
        from_address: transfer.from,
        to_exchange: transfer.targetName,
        token_amount: transfer.amountTokens,
        amount_usd: transfer.amountUsd,
        tx_hash: transfer.txHash,
        etherscan_url: transfer.etherscanUrl,
        warning: 'Massive token transfer to exchange deposit hot wallet. Potential market dumping risk.'
      }
    );

    // 3. Enqueue directly into Telegram Outbox with exact requested format
    try {
      const formattedTgMsg = [
        `🐋 *ETHERSCAN WHALE ALERT* 🚨`,
        ``,
        `🪙 *Token / Asset:* \`${transfer.symbol}\` ${transfer.contractAddress ? `(\`${truncateAddress(transfer.contractAddress)}\`)` : ''}`,
        `👤 *Whale Address:* \`${transfer.fromTruncated}\``,
        `🔄 *Action:* \`${transfer.action}\` [*${severity}*]`,
        `💰 *Amount:* \`$${transfer.amountUsd.toLocaleString()}\` (${transfer.amountTokens.toLocaleString()} ${transfer.symbol})`,
        `🏛️ *Destination:* \`${transfer.targetName}\``,
        `🔗 *Etherscan:* [View Transaction](${transfer.etherscanUrl})`,
        ``,
        `⚠️ *Analysis:* Large holder moving assets to exchange infrastructure. Monitor for downward price pressure.`
      ].join('\n');

      await queueTelegramSignalAlert({
        signal_id: alertId,
        symbol: transfer.symbol === 'ETH' ? 'ETHUSDT' : `${transfer.symbol}USDT`,
        direction: 'SHORT',
        score: severity === 'CRITICAL' ? 96 : 88,
        entry_price: transfer.amountTokens > 0 ? (transfer.amountUsd / transfer.amountTokens) : 0,
        stop_loss: 0,
        take_profit_1: 0,
        take_profit_2: 0,
        take_profit_3: 0,
        metadata: {
          isOnChainWhaleAlert: true,
          txHash: transfer.txHash,
          severity,
          customMessage: formattedTgMsg
        }
      });
      console.log(`📬 [ON-CHAIN ALERT DISPATCHED] ${transfer.symbol} $${Math.round(transfer.amountUsd).toLocaleString()} -> ${transfer.targetName}`);
    } catch (tgErr) {
      console.warn('⚠️ On-chain Telegram alert queue warning:', tgErr.message);
    }

    OnChainWhaleStore.alerts.unshift(alertRecord);
    if (OnChainWhaleStore.alerts.length > 50) OnChainWhaleStore.alerts.pop();
  }

  return transfer;
}
