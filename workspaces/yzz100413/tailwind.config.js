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
        felt: {
          50: '#E8F1EF',
          100: '#CBDCD7',
          200: '#A6C5BD',
          300: '#6E9A91',
          400: '#3D6A62',
          500: '#0D3B34',
          600: '#0A2F2A',
          700: '#082420',
          800: '#051815',
          900: '#03100E',
        },
        gold: {
          100: '#F4E7C3',
          300: '#E3CB80',
          500: '#D4AF37',
          600: '#B8942A',
          700: '#8C701E',
        },
        cream: {
          50: '#FAF7F1',
          100: '#F5F0E8',
          200: '#EAE2D0',
        },
        warn: {
          500: '#C17817',
          600: '#A36512',
        },
        danger: {
          500: '#8B2635',
          600: '#6E1D29',
        }
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'table-card': '0 6px 20px -6px rgba(13,59,52,0.25), 0 2px 6px -2px rgba(13,59,52,0.1)',
        'modal': '0 24px 60px -12px rgba(3,16,14,0.5), 0 0 0 1px rgba(212,175,55,0.2)',
      },
      keyframes: {
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%,60%': { transform: 'translateX(-4px)' },
          '40%,80%': { transform: 'translateX(4px)' },
        },
        slideDown: {
          '0%':   { transform: 'translateY(-20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        pulseWarn: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(139,38,53,0.45)' },
          '50%':     { boxShadow: '0 0 0 8px rgba(139,38,53,0)' },
        },
      },
      animation: {
        shake: 'shake 0.5s ease-in-out',
        slideDown: 'slideDown 0.25s ease-out',
        pulseWarn: 'pulseWarn 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
