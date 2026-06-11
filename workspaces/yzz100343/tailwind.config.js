/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'safety-orange': '#FF6B35',
        'steel-blue': '#1E3A5F',
        'steel-blue-dark': '#15293F',
        'steel-blue-light': '#2D4F7A',
        'danger-red': '#DC2626',
        'success-green': '#16A34A',
        'warning-yellow': '#CA8A04',
        'pending-blue': '#2563EB',
        'industrial-gray': {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        }
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"Source Han Sans SC"', '"PingFang SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        'industrial': '0 2px 8px rgba(30, 58, 95, 0.08), 0 1px 3px rgba(0, 0, 0, 0.1)',
        'industrial-hover': '0 8px 24px rgba(30, 58, 95, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
        'danger-glow': '0 0 0 4px rgba(220, 38, 38, 0.15), 0 4px 12px rgba(220, 38, 38, 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
      },
    },
  },
  plugins: [],
}
