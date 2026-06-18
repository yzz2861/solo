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
        'ocean': {
          50: '#f0f7fb',
          100: '#dbeaf3',
          200: '#b8d4e6',
          300: '#8bb6d4',
          400: '#5791bc',
          500: '#3673a1',
          600: '#275a85',
          700: '#1e3a5f',
          800: '#1b324f',
          900: '#172a41',
          950: '#0d1a2b',
        },
        'aqua': {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        },
        'danger': {
          500: '#dc2626',
          600: '#b91c1c',
        },
        'warn': {
          500: '#f59e0b',
          600: '#d97706',
        }
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(30,58,95,0.08), 0 1px 2px rgba(30,58,95,0.06)',
        'card-hover': '0 10px 25px rgba(30,58,95,0.12), 0 4px 10px rgba(30,58,95,0.08)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        }
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.4s ease-out both',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      }
    },
  },
  plugins: [],
};
