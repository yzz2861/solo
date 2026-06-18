/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        brand: {
          50: '#f0f4fa',
          100: '#dce6f5',
          200: '#b8cdeb',
          300: '#8aacd9',
          400: '#5a85c1',
          500: '#3a63a6',
          600: '#1e3a5f',
          700: '#1a3352',
          800: '#172b44',
          900: '#122336',
          950: '#0d1a28',
        },
        amber: {
          50: '#fff8ec',
          100: '#ffefc9',
          200: '#ffdc8f',
          300: '#f59e0b',
          400: '#d97706',
          500: '#b45309',
        },
        severity: {
          critical: '#ef4444',
          important: '#f59e0b',
          normal: '#6b7280',
          rare: '#8b5cf6',
        },
        paper: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(30, 58, 95, 0.06), 0 1px 4px -2px rgba(30, 58, 95, 0.04)',
        'card': '0 4px 20px -4px rgba(30, 58, 95, 0.08), 0 2px 8px -4px rgba(30, 58, 95, 0.04)',
        'hover': '0 12px 32px -8px rgba(30, 58, 95, 0.15), 0 4px 12px -4px rgba(30, 58, 95, 0.08)',
      },
      borderRadius: {
        'xl2': '14px',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};
