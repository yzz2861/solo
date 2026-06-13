/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: '#eef7ff',
          100: '#d8ecff',
          200: '#b9deff',
          300: '#8acaff',
          400: '#54adff',
          500: '#2d8eff',
          600: '#1870f5',
          700: '#1459e1',
          800: '#1749b6',
          900: '#0A2540',
          950: '#061729',
        },
        coral: {
          50: '#fff3ee',
          100: '#ffe3d6',
          200: '#ffc2ad',
          300: '#ff9878',
          400: '#ff6b4a',
          500: '#f94a23',
          600: '#e63012',
          700: '#bf2211',
          800: '#981f16',
          900: '#7c1e17',
        },
        aqua: {
          50: '#eefcf9',
          100: '#d6f7ef',
          200: '#b0efdf',
          300: '#7de1c8',
          400: '#44cdab',
          500: '#2DD4BF',
          600: '#14a888',
          700: '#108770',
          800: '#116b5a',
          900: '#12584b',
        },
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
