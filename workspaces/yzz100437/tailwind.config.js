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
        burgundy: {
          50: '#fdf7f7',
          100: '#fbe8e8',
          200: '#f5d1d1',
          300: '#ebaeae',
          400: '#de7d7d',
          500: '#cd5555',
          600: '#b73a3a',
          700: '#992e2e',
          800: '#7f2a2a',
          900: '#722F37',
          950: '#3f1619',
        },
        gold: {
          50: '#fbf8ec',
          100: '#f5ecc9',
          200: '#ebd88d',
          300: '#e2c15a',
          400: '#d9a734',
          500: '#D4AF37',
          600: '#b6882a',
          700: '#946625',
          800: '#7a5225',
          900: '#684523',
          950: '#3a2310',
        },
        ivory: '#FFFFF0',
        charcoal: '#36454F',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'bounce-in': 'bounceIn 0.5s ease-out',
        'stagger-1': 'fadeIn 0.5s ease-out 0.1s both',
        'stagger-2': 'fadeIn 0.5s ease-out 0.2s both',
        'stagger-3': 'fadeIn 0.5s ease-out 0.3s both',
        'stagger-4': 'fadeIn 0.5s ease-out 0.4s both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
