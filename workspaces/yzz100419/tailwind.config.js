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
        rose: {
          gold: '#B76E79',
        },
        warm: {
          50: '#F5F0EB',
          100: '#EDE5DC',
          200: '#DDD2C6',
          300: '#C9BAA9',
          400: '#A89888',
          500: '#8A7A6A',
          600: '#6B5D50',
          700: '#4D4239',
          800: '#2D2A26',
          900: '#1A1815',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Noto Sans SC', 'serif'],
        body: ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
