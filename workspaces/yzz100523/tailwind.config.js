/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F1F5F9',
          100: '#E2E8F0',
          500: '#1E3A5F',
          600: '#172C4A',
          700: '#0F1F34',
        },
        risk: {
          high: '#DC2626',
          medium: '#EF4444',
          low: '#F59E0B',
          info: '#8B5CF6',
          ok: '#10B981',
          exaggeration: '#EAB308',
        }
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"Source Han Sans CN"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
