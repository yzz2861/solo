import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#FF7A45',
          'orange-dark': '#E56A35',
          navy: '#1E3A5F',
          'navy-light': '#2D4F7A',
        },
        status: {
          pending: '#F59E0B',
          confirmed: '#10B981',
          rejected: '#EF4444',
          cancelled: '#6B7280',
          merged: '#8B5CF6',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(30, 58, 95, 0.08)',
        'card-hover': '0 8px 24px rgba(30, 58, 95, 0.12)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.4s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
