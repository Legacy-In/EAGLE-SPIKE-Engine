import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import { mainnet, base, arbitrum, optimism, polygon, bsc } from 'viem/chains';

// Public & Resilient RPC Transports
export const config = getDefaultConfig({
  appName: 'SIGMA — Institutional Crypto & Web3 Quantitative Intelligence',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '3a8170812b534d0ff9d794f19a901d64',
  chains: [mainnet, base, arbitrum, optimism, polygon, bsc],
  transports: {
    [mainnet.id]: http('https://cloudflare-eth.com'),
    [base.id]: http('https://mainnet.base.org'),
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
    [optimism.id]: http('https://mainnet.optimism.io'),
    [polygon.id]: http('https://polygon-rpc.com'),
    [bsc.id]: http('https://bsc-dataseed.binance.org'),
  },
  ssr: true,
});
