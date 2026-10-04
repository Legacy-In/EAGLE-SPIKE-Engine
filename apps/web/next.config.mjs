import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  reactStrictMode: true,
  transpilePackages: ['lucide-react', '@rainbow-me/rainbowkit'],
  experimental: {
    externalDir: true,
  },
  webpack: (config) => {
    config.resolve.modules = [
      'node_modules',
      path.resolve(__dirname, 'node_modules'),
    ];
    config.resolve.alias = {
      ...config.resolve.alias,
      '@supabase/supabase-js': path.resolve(__dirname, 'node_modules/@supabase/supabase-js'),
      'dotenv': path.resolve(__dirname, 'node_modules/dotenv'),
      'dotenv/config': path.resolve(__dirname, 'node_modules/dotenv/config.js'),
      '@react-native-async-storage/async-storage': false,
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default nextConfig;
