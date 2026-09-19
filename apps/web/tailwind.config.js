/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sigma: {
          bg: '#05070B',
          surface1: '#0B0F17',
          surface2: '#111724',
          surface3: '#182030',
          border: '#1C2538',
          borderSubtle: '#141B2B',
          borderFocus: '#283754',
          textMain: '#F8FAFC',
          textMuted: '#94A3B8',
          textDark: '#64748B',
          green: '#00E599',
          greenMuted: 'rgba(0, 229, 153, 0.12)',
          red: '#FF4757',
          redMuted: 'rgba(255, 71, 87, 0.12)',
          amber: '#FFAA00',
          amberMuted: 'rgba(255, 170, 0, 0.12)',
          cyan: '#00D2FF',
          cyanMuted: 'rgba(0, 210, 255, 0.12)',
          purple: '#8B5CF6',
          purpleMuted: 'rgba(139, 92, 246, 0.14)',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
