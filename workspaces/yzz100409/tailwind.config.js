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
        greenhouse: {
          50: '#F1F8F0',
          100: '#DDEEDB',
          200: '#BBDDB7',
          300: '#8EC589',
          400: '#5EA857',
          500: '#3D8B37',
          600: '#2D5A27',
          700: '#24491F',
          800: '#1C3A18',
          900: '#132710',
        },
        soil: {
          50: '#FAF6F2',
          100: '#F0E6DA',
          200: '#DECCB5',
          300: '#C7A888',
          400: '#AD8259',
          500: '#8B5E34',
          600: '#744C28',
          700: '#5E3C20',
          800: '#4A2E19',
          900: '#332011',
        },
        warning: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          300: '#FDBA74',
          500: '#E67E22',
          600: '#D35400',
        },
        water: {
          50: '#EBF5FB',
          100: '#D4E6F1',
          300: '#85C1E9',
          500: '#2980B9',
          600: '#1F618D',
        },
        paper: '#FAF8F5',
        ink: '#2C3E50',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', '"Source Han Sans SC"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 12px -2px rgba(45, 90, 39, 0.08), 0 1px 4px -1px rgba(45, 90, 39, 0.04)',
        'card': '0 4px 20px -4px rgba(45, 90, 39, 0.12), 0 2px 8px -2px rgba(45, 90, 39, 0.06)',
        'lift': '0 8px 28px -8px rgba(45, 90, 39, 0.20)',
      },
      backgroundImage: {
        'greenhouse-gradient': 'linear-gradient(135deg, #2D5A27 0%, #3D8B37 100%)',
        'water-gradient': 'linear-gradient(135deg, #85C1E9 0%, #2980B9 100%)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-4px)' },
          '40%, 80%': { transform: 'translateX(4px)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(230, 126, 34, 0.4)' },
          '100%': { boxShadow: '0 0 0 12px rgba(230, 126, 34, 0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'shake': 'shake 0.4s ease-in-out',
        'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
      },
    },
  },
  plugins: [],
};
