/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'wheat-green': '#4CAF50',
        'soil-brown': '#8B4513',
        'warning-red': '#f44336',
        'caution-orange': '#FF9800',
        'success-green': '#4CAF50',
        'cream': '#FFF8E7',
        'field': '#F5F2E8',
      },
      fontFamily: {
        'display': ['"Noto Sans SC"', 'sans-serif'],
        'body': ['"Noto Serif SC"', 'serif'],
        'mono': ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'slide-in': 'slide-in 0.3s ease-out',
        'fill-progress': 'fill-progress 1s ease-out forwards',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'slide-in': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fill-progress': {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress-width)' },
        },
      },
    },
  },
  plugins: [],
}
