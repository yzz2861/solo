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
          50: '#FFF8F0',
          100: '#FFEFD6',
          200: '#FFDFAA',
          300: '#FFC973',
          400: '#E8A830',
          500: '#8B6914',
          600: '#725510',
          700: '#5A430D',
          800: '#433209',
          900: '#2D2206',
        },
        coral: {
          50: '#FFF1EE',
          100: '#FFE0DA',
          200: '#FFC1B5',
          300: '#FF9B86',
          400: '#FF6B4A',
          500: '#E5502E',
          600: '#BF3A1D',
        },
        mint: {
          50: '#EDFCFB',
          100: '#D1F7F4',
          200: '#A7EEE9',
          300: '#6FE2DA',
          400: '#4ECDC4',
          500: '#38B2A9',
          600: '#2D8E87',
        },
        paw: {
          50: '#FAF7F2',
          100: '#F3EDE0',
          200: '#E5D9C3',
          300: '#D4C1A0',
          400: '#C4AA7E',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
