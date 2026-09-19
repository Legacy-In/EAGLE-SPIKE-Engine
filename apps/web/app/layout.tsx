import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SIGMA — Institutional BTC Quantitative Intelligence & Trading Platform',
  description:
    'Institutional-grade Bitcoin market intelligence, multi-factor signals, order flow analytics, derivatives positioning, risk management, and execution workstation.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">Σ</text></svg>',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-sigma-bg text-sigma-textMain min-h-screen antialiased selection:bg-sigma-green/20">
        {children}
      </body>
    </html>
  );
}
