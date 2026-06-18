/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1200px',
      },
    },
    extend: {
      colors: {
        cream: {
          50: '#FFFBF5',
          100: '#FFF8F0',
          200: '#FFEAD5',
          300: '#FFDBB8',
        },
        icecream: {
          pink: '#FFB6C1',
          pinkLight: '#FFD1DC',
          pinkDark: '#FF91A4',
        },
        chocolate: {
          50: '#EFEBE9',
          100: '#D7CCC8',
          500: '#795548',
          700: '#5D4037',
          900: '#3E2723',
        },
        mint: {
          100: '#C8F0E6',
          300: '#98D8C8',
          500: '#6BC4AE',
        },
        warning: {
          orange: '#FFA94D',
          red: '#FF6B6B',
        },
      },
      fontFamily: {
        display: ['"Fredoka One"', 'cursive'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'slide-in': 'slideIn 0.4s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.9' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(93, 64, 55, 0.1)',
        'hover': '0 8px 30px rgba(93, 64, 55, 0.15)',
      },
    },
  },
  plugins: [],
};
