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
          orange: '#FF6B35',
          'orange-light': '#FF8F65',
          teal: '#4ECDC4',
          dark: '#0D0D1A',
          panel: '#12122A',
        }
      },
      fontFamily: {
        sans: ['Noto Sans SC', 'sans-serif'],
        serif: ['Noto Serif SC', 'serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      }
    },
  },
  plugins: [],
};
