/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0f5ec',
          100: '#d9e6ce',
          200: '#b5cc9e',
          300: '#8db06a',
          400: '#6B8F3C',
          500: '#2D5016',
          600: '#264413',
          700: '#1f350f',
          800: '#18260b',
          900: '#111808',
        },
        sand: {
          50: '#FDFBF7',
          100: '#F5F0E8',
          200: '#EDE5D5',
          300: '#D4A574',
          400: '#C4914F',
          500: '#8B6914',
          600: '#735510',
          700: '#5A420D',
          800: '#422F09',
          900: '#2A1D06',
        },
        amber: {
          500: '#D97706',
          600: '#B45309',
        },
        rust: {
          500: '#B91C1C',
          600: '#991B1B',
        },
      },
      fontFamily: {
        serif: ['Noto Serif SC', 'serif'],
        sans: ['Noto Sans SC', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
