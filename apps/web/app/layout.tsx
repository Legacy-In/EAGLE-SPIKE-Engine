import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Web3Provider } from '../providers/Web3Provider';

export const viewport: Viewport = {
  themeColor: '#0B0E11',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'EAGLE FLASH — Institutional BTC Quantitative Intelligence & Mobile Trading Terminal',
  description:
    'Institutional-grade Bitcoin market intelligence, multi-factor signals, order flow analytics, derivatives positioning, risk management, and mobile execution workstation.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-sigma-bg text-sigma-textMain min-h-screen antialiased selection:bg-sigma-green/20">
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
