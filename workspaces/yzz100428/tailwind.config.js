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
        farm: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#2D6A4F',
          700: '#1B4332',
          800: '#14532d',
          900: '#052e16',
        },
        wheat: {
          100: '#FEFAE0',
          200: '#F3E9A8',
          300: '#E9D88A',
          400: '#DDA15E',
          500: '#D4A373',
          600: '#BC6C25',
        },
        earth: {
          100: '#FAF3E0',
          200: '#E8DCC8',
          300: '#A98467',
          400: '#8B6F47',
          500: '#6C584C',
          600: '#4A3728',
        },
      },
      fontFamily: {
        sans: ['"Source Han Sans SC"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        serif: ['"Source Han Serif SC"', '"Noto Serif SC"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'farm': '0 4px 14px -2px rgba(45, 106, 79, 0.25)',
        'soft': '0 2px 8px -1px rgba(108, 88, 76, 0.15)',
      },
      backgroundImage: {
        'stripes-red': 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(220,38,38,0.12) 6px, rgba(220,38,38,0.12) 12px)',
      },
    },
  },
  plugins: [],
};
