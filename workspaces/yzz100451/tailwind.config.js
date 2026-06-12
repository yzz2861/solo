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
        charcoal: {
          50: '#f5f0eb',
          100: '#e8e0d8',
          200: '#d4c8bb',
          300: '#b8a899',
          400: '#9c8a78',
          500: '#7a6e62',
          600: '#5a524a',
          700: '#3d3832',
          800: '#2a2622',
          900: '#1a1a2e',
          950: '#0f0f1a',
        },
        clay: {
          50: '#fef3f1',
          100: '#fde3de',
          200: '#fcc7bd',
          300: '#f0a090',
          400: '#d97560',
          500: '#c44536',
          600: '#a33528',
          700: '#82291e',
          800: '#611e16',
          900: '#40130e',
        },
        indigo: {
          50: '#eef2f7',
          100: '#dce5f0',
          200: '#b9cbe0',
          300: '#8faecc',
          400: '#628db5',
          500: '#3d5a80',
          600: '#324a68',
          700: '#263b52',
          800: '#1b2b3c',
          900: '#101c28',
        },
        sand: {
          50: '#faf8f5',
          100: '#f5f0eb',
          200: '#ebe3d9',
          300: '#ddd2c4',
          400: '#c9b9a5',
          500: '#b0a08a',
        },
      },
      fontFamily: {
        serif: ['Noto Serif SC', 'Georgia', 'serif'],
        sans: ['Noto Sans SC', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
