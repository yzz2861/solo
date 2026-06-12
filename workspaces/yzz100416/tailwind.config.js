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
          50: '#FBF5F4',
          100: '#F5E4E6',
          200: '#ECC8CB',
          300: '#E8B4B8',
          400: '#D98E94',
          500: '#C76A72',
          600: '#A84C54',
        },
        cream: {
          50: '#FDFBF9',
          100: '#FAF5F1',
          200: '#F3E9DE',
          300: '#E8D6C2',
        },
        coffee: {
          50: '#F5F1EE',
          100: '#E6DED7',
          500: '#6B5545',
          600: '#5A4638',
          700: '#4A3728',
          800: '#3A2B20',
        },
        gold: {
          400: '#D4B776',
          500: '#C9A961',
          600: '#B89548',
        },
        sage: {
          500: '#6B9E7D',
          600: '#558A69',
        },
        amber: {
          500: '#E8913A',
          600: '#D17B28',
        },
        danger: {
          500: '#D96060',
          600: '#C04646',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', '"思源宋体"', 'serif'],
        sans: ['"Noto Sans SC"', '"Source Han Sans SC"', '"思源黑体"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(74, 55, 40, 0.08), 0 1px 3px -1px rgba(74, 55, 40, 0.06)',
        'card': '0 4px 16px -4px rgba(74, 55, 40, 0.12), 0 2px 6px -2px rgba(74, 55, 40, 0.08)',
        'hover': '0 8px 24px -6px rgba(74, 55, 40, 0.18), 0 4px 10px -4px rgba(74, 55, 40, 0.12)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-warning': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.08)' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out both',
        'pulse-warning': 'pulse-warning 1.8s ease-in-out infinite',
        'blink': 'blink 1s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.3s ease-out both',
      },
    },
  },
  plugins: [],
};
