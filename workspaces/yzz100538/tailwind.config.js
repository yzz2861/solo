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
        tea: {
          50: '#faf8f5',
          100: '#f5f1e8',
          200: '#e8dfcf',
          300: '#d4c4a8',
          400: '#c9a86c',
          500: '#a68b5b',
          600: '#8b7347',
          700: '#6f5a37',
          800: '#5D4E37',
          900: '#4a3e2c',
          950: '#332a1d',
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
    },
  },
  plugins: [],
};
