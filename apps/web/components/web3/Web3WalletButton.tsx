'use client';

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Shield, Wallet, ChevronDown, CheckCircle2 } from 'lucide-react';

export const Web3WalletButton: React.FC = () => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!ready) {
          return (
            <button
              disabled
              className="px-3 py-1.5 rounded bg-sigma-surface2 border border-sigma-border text-[11px] font-mono text-sigma-textDark opacity-50 cursor-not-allowed flex items-center gap-1.5"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>INITIALIZING...</span>
            </button>
          );
        }

        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              className="px-3 py-1.5 rounded bg-sigma-surface2 hover:bg-sigma-cyan/20 border border-sigma-cyan/40 hover:border-sigma-cyan text-[11px] font-mono text-sigma-cyan font-bold flex items-center gap-1.5 transition-all shadow-sm group"
            >
              <Wallet className="w-3.5 h-3.5 text-sigma-cyan group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">CONNECT WEB3</span>
              <span className="sm:hidden">CONNECT</span>
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button
              onClick={openChainModal}
              className="px-3 py-1.5 rounded bg-sigma-red/20 border border-sigma-red text-[11px] font-mono text-sigma-red font-bold flex items-center gap-1.5 transition-all animate-pulse"
            >
              <span>WRONG NETWORK</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          );
        }

        return (
          <div className="flex items-center gap-1.5 bg-sigma-surface2 border border-sigma-border rounded p-0.5 text-[11px] font-mono">
            {/* Network Badge */}
            <button
              onClick={openChainModal}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-sigma-surface3 transition-colors text-sigma-textMuted hover:text-sigma-textMain"
              title="Switch Blockchain Network"
            >
              {chain.hasIcon && (
                <div
                  className="w-3.5 h-3.5 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                  style={{ background: chain.iconBackground }}
                >
                  {chain.iconUrl && (
                    <img
                      alt={chain.name ?? 'Chain icon'}
                      src={chain.iconUrl}
                      className="w-3.5 h-3.5"
                    />
                  )}
                </div>
              )}
              <span className="hidden md:inline font-medium">{chain.name}</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>

            {/* Account & Balance Badge */}
            <button
              onClick={openAccountModal}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-sigma-surface1 hover:bg-sigma-surface3 border border-sigma-border text-sigma-textMain font-semibold transition-colors"
              title="Open Wallet Details"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-sigma-green animate-ping" />
              <span className="text-sigma-cyan">
                {account.displayName}
              </span>
              {account.displayBalance && (
                <span className="hidden lg:inline text-sigma-textDark text-[10px]">
                  ({account.displayBalance})
                </span>
              )}
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};
