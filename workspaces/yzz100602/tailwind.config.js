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
        primary: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        warm: {
          50: '#FAF5F0',
          100: '#F5EBE0',
          200: '#E8D5C2',
          300: '#D4B896',
          400: '#BF9466',
          500: '#A67B47',
          600: '#8B5E34',
          700: '#6B4423',
          800: '#4A2E18',
          900: '#2E1C0E',
        },
        success: {
          500: '#22C55E',
          600: '#16A34A',
        },
        warning: {
          500: '#F59E0B',
          600: '#D97706',
        },
        danger: {
          500: '#EF4444',
          600: '#DC2626',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'warm': '0 4px 20px -2px rgba(194, 65, 12, 0.15)',
        'warm-lg': '0 10px 40px -5px rgba(194, 65, 12, 0.2)',
      },
    },
  },
  plugins: [],
};
