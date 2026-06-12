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
        warm: {
          50: '#FAF8F5',
          100: '#F5F0E8',
          200: '#E8DFD0',
          300: '#D4C4A8',
          400: '#B8A07A',
          500: '#8B6F47',
          600: '#6B5535',
          700: '#4A3A24',
          800: '#332618',
          900: '#1E1610',
        },
        mint: {
          50: '#EDFAF2',
          100: '#D0F0DC',
          200: '#A3E1BA',
          300: '#6DCD93',
          400: '#4CAF7D',
          500: '#389465',
          600: '#2B7A52',
          700: '#1F5F3E',
          800: '#14442C',
          900: '#0A291A',
        },
        amber: {
          400: '#F5C842',
          500: '#E8A838',
          600: '#D08F20',
        },
        danger: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          400: '#F87171',
          500: '#D9534F',
          600: '#B91C1C',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
