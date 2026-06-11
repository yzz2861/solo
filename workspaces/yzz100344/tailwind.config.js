/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4f9',
          100: '#dce6f0',
          200: '#b9cde1',
          300: '#8eaecf',
          400: '#5e8ab8',
          500: '#3d6ca0',
          600: '#2d5584',
          700: '#1e3a5f',
          800: '#1a3150',
          900: '#172a44',
        },
        accent: {
          50: '#fff1f1',
          100: '#ffdfdf',
          200: '#ffc5c5',
          300: '#ff9d9d',
          400: '#ff6b6b',
          500: '#f84545',
          600: '#e52626',
          700: '#c11b1b',
          800: '#9f1b1b',
          900: '#831d1d',
        },
        warm: {
          50: '#faf8f6',
          100: '#f5f1ec',
          200: '#e8dfd4',
          300: '#d6c6b2',
          400: '#c1a78c',
          500: '#ae8d6e',
          600: '#a07a60',
          700: '#856351',
          800: '#6d5347',
          900: '#5a463c',
        }
      },
      fontFamily: {
        serif: ['"Source Han Serif CN"', '"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Source Han Sans CN"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-left': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-4px)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
      },
    },
  },
  plugins: [],
}
