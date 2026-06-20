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
          50: '#f2f6fb',
          100: '#e3ecf6',
          200: '#c6d8ed',
          300: '#9ebae0',
          400: '#6e95cf',
          500: '#4d75ba',
          600: '#3a5ca0',
          700: '#1e3a5f',
          800: '#182f4c',
          900: '#12243d',
          950: '#0c1828',
        },
      },
      fontFamily: {
        sans: ['Noto Sans SC', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Noto Serif SC', 'ui-serif', 'Georgia', 'serif'],
        en: ['Lato', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 8px -2px rgba(30, 58, 95, 0.08), 0 1px 3px rgba(30, 58, 95, 0.04)',
        card: '0 8px 30px -12px rgba(30, 58, 95, 0.15)',
      },
      keyframes: {
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        slideIn: 'slideIn 0.25s ease',
      },
    },
  },
  plugins: [],
};
