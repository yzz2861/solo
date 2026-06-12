/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        brand: {
          900: '#0f1720',
          800: '#1a2332',
          700: '#243044',
          600: '#2d3d55',
          500: '#3a4f6f',
          400: '#4a6590',
          300: '#6b8ab5',
          200: '#94afd4',
          100: '#c2d3e8',
          50: '#e8eef6',
        },
        accent: {
          DEFAULT: '#ff6b35',
          light: '#ff8c5a',
          dark: '#e55a2b',
          50: '#fff3ed',
        },
        pass: {
          DEFAULT: '#10b981',
          light: '#34d399',
          dark: '#059669',
          50: '#ecfdf5',
        },
        warn: {
          DEFAULT: '#eab308',
          light: '#facc15',
          dark: '#ca8a04',
          50: '#fefce8',
        },
        danger: {
          DEFAULT: '#ef4444',
          light: '#f87171',
          dark: '#dc2626',
          50: '#fef2f2',
        },
        surface: {
          DEFAULT: '#1e293b',
          light: '#334155',
          lighter: '#475569',
          card: '#1a2332',
          hover: '#243044',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"Source Han Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'pulse-border': 'pulseBorder 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseBorder: {
          '0%, 100%': { borderColor: 'rgba(255, 107, 53, 0.3)' },
          '50%': { borderColor: 'rgba(255, 107, 53, 0.8)' },
        },
      },
    },
  },
  plugins: [],
};
