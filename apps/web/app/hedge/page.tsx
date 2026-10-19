import { Metadata } from 'next';
import { BtcHedgeDashboard } from '../../components/hedge/BtcHedgeDashboard';

export const metadata: Metadata = {
  title: 'BTC Perpetual Hedge Signal & Quantitative Dashboard | Eagle Flash',
  description: 'Delta-Neutral BTC Perpetual Hedge Signal & Derivatives Intelligence Dashboard with real-time Binance Futures feed.'
};

export default function HedgePage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <BtcHedgeDashboard showBackToTerminal={true} />
    </main>
  );
}
