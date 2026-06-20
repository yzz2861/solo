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
        'brand-dark': '#0A0A1A',
        'brand-secondary': '#16213E',
        'brand-tertiary': '#1A1A2E',
        'brand-card': '#16213E',
        'brand-border': '#1E3A5F',
        'brand-amber': '#F59E0B',
        'brand-red': '#EF4444',
        'brand-green': '#10B981',
      },
      fontFamily: {
        sans: ['Noto Sans SC', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
