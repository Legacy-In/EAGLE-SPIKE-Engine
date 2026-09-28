import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  viemClient,
  RpcTelemetry,
  pollLatestBlockHeader,
  getLiveOnchainTelemetry,
} from '@sigma/backend/services/viem-rpc-scanner.mjs';
import {
  OnChainWhaleStore,
  SEED_WHALE_WALLETS,
} from '@sigma/backend/services/etherscan-scanner.mjs';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
  : null;

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch live Ethereum block header from Viem client
    await pollLatestBlockHeader().catch(() => null);

    // 2. Query real on-chain whale trades from Supabase
    let dbTransfers: any[] = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('whale_trades')
          .select('*')
          .order('detected_at', { ascending: false })
          .limit(50);
        if (!error && Array.isArray(data)) {
          dbTransfers = data.map((t) => ({
            txHash: t.tx_hash || t.id,
            blockNumber: t.block_number ? String(t.block_number) : 'CONFIRMED',
            timestamp: t.detected_at,
            from: t.from_address || '0xWhaleWallet',
            to: t.to_address || t.exchange || 'EXCHANGE',
            fromTruncated: t.from_address ? `${t.from_address.slice(0, 6)}...${t.from_address.slice(-4)}` : 'Whale',
            toTruncated: t.to_address ? `${t.to_address.slice(0, 6)}...${t.to_address.slice(-4)}` : (t.exchange || 'Exchange'),
            symbol: t.symbol,
            amountTokens: t.amount_tokens || (t.amount_usdt / (t.execution_price || 1)),
            amountUsd: t.amount_usdt,
            action: t.side === 'BUY' ? 'WHALE_ACCUMULATION' : 'WHALE_EXCHANGE_DEPOSIT',
            risk: t.amount_usdt >= 500000 ? 'HIGH_DUMP_RISK' : 'MODERATE_DUMP_RISK',
            targetName: t.exchange || 'Exchange Hot Wallet',
            description: `${t.symbol} Whale trade executed on ${t.exchange}`,
            etherscanUrl: t.tx_hash ? `https://etherscan.io/tx/${t.tx_hash}` : undefined,
          }));
        }
      } catch (err: any) {
        console.warn('[WHALE_ONCHAIN_API] Supabase query notice:', err.message);
      }
    }

    // 3. Fallback to real memory-scanned transfers
    const liveTelemetry = getLiveOnchainTelemetry();
    const activeTransfers = dbTransfers.length > 0 ? dbTransfers : liveTelemetry.recentTransfers;

    return NextResponse.json({
      success: true,
      data_source: 'ETHEREUM_MAINNET_RPC',
      freshness: liveTelemetry.dataFreshness,
      block_number: liveTelemetry.blockNumber,
      base_fee_gwei: liveTelemetry.baseFeeGwei,
      rpc_latency_ms: liveTelemetry.rpcLatencyMs,
      rpc_health: liveTelemetry.rpcHealth,
      lastScannedAt: new Date().toISOString(),
      trackedWalletsCount: liveTelemetry.trackedWalletsCount,
      trackedWallets: liveTelemetry.trackedWallets,
      transfersCount: activeTransfers.length,
      transfers: activeTransfers,
      alertsCount: liveTelemetry.recentAlertsCount,
      alerts: liveTelemetry.recentAlerts,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to fetch real on-chain whale data',
        status: 'UNAVAILABLE',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, label, category, notes } = body;

    if (!address || !address.startsWith('0x') || address.length !== 42) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Ethereum address. Must be 42 characters starting with 0x',
        },
        { status: 400 }
      );
    }

    const newWallet = {
      address,
      label: label || 'Custom Whale Wallet',
      category: category || 'WHALE',
      ethBalance: 'Querying...',
      notes: notes || 'Dynamically added via Whale Terminal',
    };

    SEED_WHALE_WALLETS.push(newWallet as any);

    return NextResponse.json({
      success: true,
      message: 'Whale address successfully registered for continuous scanning',
      wallet: newWallet,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to register whale address',
      },
      { status: 500 }
    );
  }
}
