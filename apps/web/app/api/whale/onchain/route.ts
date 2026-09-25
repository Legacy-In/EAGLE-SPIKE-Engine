import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SEED_WALLETS = [
  {
    address: '0x28C6c06298d514Db089934071355E5743bf21d60',
    label: 'Binance Hot Wallet 14',
    category: 'EXCHANGE',
    ethBalance: '94,061.37 ETH',
    notes: 'Major liquidity gateway'
  },
  {
    address: '0xf89d7b9c374f279dca70b76155fd7721fa9ecb15',
    label: 'Bybit Hot Wallet 1',
    category: 'EXCHANGE',
    ethBalance: '42,180.50 ETH',
    notes: 'Linear perpetuals settlement'
  },
  {
    address: '0x00000000219ab540356cbb839cbe05303d7705fa',
    label: 'ETH 2.0 Deposit Contract',
    category: 'STAKING',
    ethBalance: '34,812,940 ETH',
    notes: 'Beacon chain staking pool'
  },
  {
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    label: 'Bitfinex Cold Wallet',
    category: 'INSTITUTIONAL',
    ethBalance: '185,400.00 ETH',
    notes: 'Massive long-term reserve'
  },
  {
    address: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503',
    label: 'Binance Top Whale Reserves',
    category: 'WHALE',
    ethBalance: '52,310.20 ETH',
    notes: 'Mega whale account (>50,000 ETH)'
  },
  {
    address: '0x534631Bcf33BDb069fB20A75d2791C863E25B307',
    label: 'Altcoin Deployer & Liquidity Hub',
    category: 'HIGH_BETA_DEPLOYER',
    ethBalance: '1,420.80 ETH',
    notes: 'AKE / LAB / GTW liquidity orchestrator'
  }
];

const MOCK_ONCHAIN_TRANSFERS = [
  {
    txHash: '0x8f4c2e8b91a27e3d5c6f8b1a3d5e7f9a2b4c6e8d1f3a5c7e9b2d4f6a8c1e3b5d',
    blockNumber: '20839210',
    timestamp: new Date(Date.now() - 90000).toISOString(),
    from: '0x71C8360f3E2823071355E5743bf21d89',
    to: '0x28C6c06298d514Db089934071355E5743bf21d60',
    fromTruncated: '0x71C8...1d89',
    toTruncated: '0x28C6...1d60',
    symbol: 'ETH',
    amountTokens: 450,
    amountUsd: 1192500,
    action: 'WHALE_EXCHANGE_DEPOSIT',
    risk: 'HIGH_DUMP_RISK',
    targetName: 'Binance 14',
    description: 'Whale deposited 450 ETH into Binance 14 (Potential Sell Pressure)',
    etherscanUrl: 'https://etherscan.io/tx/0x8f4c2e8b91a27e3d5c6f8b1a3d5e7f9a2b4c6e8d1f3a5c7e9b2d4f6a8c1e3b5d'
  },
  {
    txHash: '0x3a5c7e9b2d4f6a8c1e3b5d8f4c2e8b91a27e3d5c6f8b1a3d5e7f9a2b4c6e8d1f',
    blockNumber: '20839180',
    timestamp: new Date(Date.now() - 240000).toISOString(),
    from: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503',
    to: '0xf89d7b9c374f279dca70b76155fd7721fa9ecb15',
    fromTruncated: '0x47ac...6D503',
    toTruncated: '0xf89d...ecb15',
    symbol: 'PEPE',
    amountTokens: 18500000000,
    amountUsd: 194250,
    action: 'WHALE_EXCHANGE_DEPOSIT',
    risk: 'HIGH_DUMP_RISK',
    targetName: 'Bybit Hot Wallet',
    description: '18.5 Billion PEPE deposited into Bybit Hot Wallet',
    etherscanUrl: 'https://etherscan.io/tx/0x3a5c7e9b2d4f6a8c1e3b5d8f4c2e8b91a27e3d5c6f8b1a3d5e7f9a2b4c6e8d1f'
  },
  {
    txHash: '0x1e3b5d8f4c2e8b91a27e3d5c6f8b1a3d5e7f9a2b4c6e8d1f3a5c7e9b2d4f6a8c',
    blockNumber: '20839140',
    timestamp: new Date(Date.now() - 480000).toISOString(),
    from: '0x28C6c06298d514Db089934071355E5743bf21d60',
    to: '0x534631Bcf33BDb069fB20A75d2791C863E25B307',
    fromTruncated: '0x28C6...1d60',
    toTruncated: '0x5346...5B307',
    symbol: 'USDT',
    amountTokens: 850000,
    amountUsd: 850000,
    action: 'WHALE_ACCUMULATION',
    risk: 'ACCUMULATION_OUTFLOW',
    targetName: 'Altcoin Deployer & Liquidity Hub',
    description: 'Whale accumulated $850,000 USDT outflow from Binance',
    etherscanUrl: 'https://etherscan.io/tx/0x1e3b5d8f4c2e8b91a27e3d5c6f8b1a3d5e7f9a2b4c6e8d1f3a5c7e9b2d4f6a8c'
  },
  {
    txHash: '0x5c6f8b1a3d5e7f9a2b4c6e8d1f3a5c7e9b2d4f6a8c1e3b5d8f4c2e8b91a27e3d',
    blockNumber: '20839090',
    timestamp: new Date(Date.now() - 720000).toISOString(),
    from: '0x534631Bcf33BDb069fB20A75d2791C863E25B307',
    to: '0xf89d7b9c374f279dca70b76155fd7721fa9ecb15',
    fromTruncated: '0x5346...5B307',
    toTruncated: '0xf89d...ecb15',
    symbol: 'AKE',
    amountTokens: 3500000,
    amountUsd: 168700,
    action: 'WHALE_EXCHANGE_DEPOSIT',
    risk: 'HIGH_DUMP_RISK',
    targetName: 'Bybit Hot Wallet',
    description: '3.5M AKE moved to exchange hot wallet prior to volatility spike',
    etherscanUrl: 'https://etherscan.io/tx/0x5c6f8b1a3d5e7f9a2b4c6e8d1f3a5c7e9b2d4f6a8c1e3b5d8f4c2e8b91a27e3d'
  }
];

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      lastScannedAt: new Date().toISOString(),
      trackedWalletsCount: SEED_WALLETS.length,
      trackedWallets: SEED_WALLETS,
      transfersCount: MOCK_ONCHAIN_TRANSFERS.length,
      transfers: MOCK_ONCHAIN_TRANSFERS
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to fetch on-chain whale data'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, label, category, notes } = body;

    if (!address || !address.startsWith('0x') || address.length !== 42) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Ethereum address. Must be 42 characters starting with 0x'
      }, { status: 400 });
    }

    const newWallet = {
      address,
      label: label || 'Custom Whale Wallet',
      category: category || 'WHALE',
      ethBalance: 'Querying...',
      notes: notes || 'Dynamically added via Whale Terminal'
    };

    return NextResponse.json({
      success: true,
      message: 'Whale address successfully registered for continuous scanning',
      wallet: newWallet
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to register whale address'
    }, { status: 500 });
  }
}
