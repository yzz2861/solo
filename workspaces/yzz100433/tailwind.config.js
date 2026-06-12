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
        lg: '960px',
        xl: '960px',
      },
    },
    extend: {
      colors: {
        primary: {
          50: '#FFF5F7',
          100: '#FFE4EC',
          200: '#FFC9DA',
          300: '#FFA6C2',
          400: '#FF7DA3',
          500: '#FF6B9D',
          600: '#F04A82',
          700: '#D6386C',
          800: '#B02C58',
          900: '#8B2346',
        },
        caramel: {
          50: '#FDF8F3',
          100: '#F9EFE4',
          200: '#F2DBC4',
          300: '#E9C39F',
          400: '#DDA675',
          500: '#8B5A2B',
          600: '#7A4D24',
          700: '#65401E',
          800: '#523318',
          900: '#3D2612',
        },
        matcha: {
          50: '#F0F8F4',
          100: '#DBF0E3',
          200: '#B8E1CA',
          300: '#88C9A1',
          400: '#5FB17E',
          500: '#3E9661',
          600: '#2E774B',
          700: '#255E3C',
          800: '#1E4A30',
          900: '#183B26',
        },
        peach: {
          50: '#FFF7F2',
          100: '#FFEBE0',
          200: '#FFD4BC',
          300: '#FFB794',
          400: '#FFA07A',
          500: '#FF8566',
          600: '#EC6B4D',
          700: '#C5533A',
          800: '#9E422E',
          900: '#7F3626',
        },
        cream: {
          50: '#FFFBF5',
          100: '#FFF5E9',
          200: '#FFE8CC',
          300: '#FFD9A8',
          400: '#FFC785',
          500: '#FFB562',
        },
      },
      fontFamily: {
        display: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        body: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'slide-in-up': 'slideInUp 0.4s ease-out',
        'bounce-soft': 'bounceSoft 0.6s ease-out',
        'shake': 'shake 0.5s ease-in-out',
        'celebrate': 'celebrate 0.8s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        celebrate: {
          '0%': { transform: 'scale(0.5) rotate(-180deg)', opacity: '0' },
          '50%': { transform: 'scale(1.2) rotate(10deg)' },
          '100%': { transform: 'scale(1) rotate(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
