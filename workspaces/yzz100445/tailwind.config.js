/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'vintage': {
          50: '#fdf8f3',
          100: '#f9ede0',
          200: '#f2d7b9',
          300: '#e9bc8a',
          400: '#de9a5a',
          500: '#d6803c',
          600: '#c86931',
          700: '#a6512b',
          800: '#85422a',
          900: '#6c3725',
        }
      }
    },
  },
  plugins: [],
}
