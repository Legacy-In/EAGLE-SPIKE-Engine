'use client';

import React from 'react';
import { TradingModeProvider } from '../../context/TradingModeContext';
import { MobileControlDashboard } from '../../components/mobile/MobileControlDashboard';

export default function MobileAppPage() {
  return (
    <TradingModeProvider>
      <main className="w-full min-h-screen bg-[#0B0E11] text-[#EAECEF]">
        <MobileControlDashboard />
      </main>
    </TradingModeProvider>
  );
}
