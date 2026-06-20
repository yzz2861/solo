/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        archive: {
          50: '#f5f7fa',
          100: '#ebeff5',
          200: '#d3dce8',
          300: '#aabbcf',
          400: '#7c96b2',
          500: '#5b7898',
          600: '#48607e',
          700: '#3c4e66',
          800: '#344356',
          900: '#2d394a',
          950: '#1a365d',
        },
        warning: {
          DEFAULT: '#d97706',
          light: '#fbbf24',
          dark: '#92400e'
        },
        success: {
          DEFAULT: '#166534',
          light: '#22c55e',
          dark: '#14532d'
        },
        error: {
          DEFAULT: '#be123c',
          light: '#f43f5e',
          dark: '#881337'
        }
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        hand: ['"Ma Shan Zheng"', 'cursive']
      },
      boxShadow: {
        'stamp': '0 0 0 2px #be123c, 0 0 0 4px #fff, 0 0 0 6px #be123c',
        'card': '0 4px 6px -1px rgba(26, 54, 93, 0.1), 0 2px 4px -1px rgba(26, 54, 93, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(26, 54, 93, 0.1), 0 4px 6px -2px rgba(26, 54, 93, 0.05)',
      },
      animation: {
        'stamp': 'stamp 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        stamp: {
          '0%': { transform: 'scale(1.5) rotate(-5deg)', opacity: '0' },
          '50%': { transform: 'scale(0.9) rotate(2deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
