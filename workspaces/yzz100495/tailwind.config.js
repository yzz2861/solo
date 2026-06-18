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
        bread: {
          50: '#FFF8E1',
          100: '#FFECB3',
          200: '#FFE082',
          300: '#FFD54F',
          400: '#FFCA28',
          500: '#D4A574',
          600: '#C4956A',
          700: '#A67C52',
          800: '#5D4037',
          900: '#3E2723',
        },
        wheat: {
          50: '#FDFCF8',
          100: '#FBF7ED',
          200: '#F7EFD9',
          300: '#F2E4C1',
          400: '#EAD49A',
          500: '#E0C06E',
        },
        oven: {
          50: '#FFF3E0',
          100: '#FFE0B2',
          200: '#FFCC80',
          300: '#FFB74D',
          400: '#FFA726',
          500: '#FF8A65',
          600: '#F4511E',
        },
      },
      fontFamily: {
        sans: ['Noto Sans SC', 'sans-serif'],
        serif: ['Noto Serif SC', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'bounce-soft': 'bounceSoft 2s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flame': 'flame 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        flame: {
          '0%, 100%': { transform: 'scaleY(1)', opacity: '1' },
          '50%': { transform: 'scaleY(1.1)', opacity: '0.8' },
        },
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(212, 165, 116, 0.15)',
        'warm': '0 10px 40px -10px rgba(255, 138, 101, 0.3)',
        'bread': '0 4px 20px -2px rgba(93, 64, 55, 0.15)',
      },
    },
  },
  plugins: [],
};
