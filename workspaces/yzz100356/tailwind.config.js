/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'recyclable': '#2196F3',
        'kitchen': '#4CAF50',
        'harmful': '#F44336',
        'other': '#9E9E9E',
        'primary': '#4CAF50',
        'primary-dark': '#388E3C',
      },
      fontFamily: {
        'rounded': ['"Nunito"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'wiggle': 'wiggle 0.5s ease-in-out',
        'pop-in': 'popIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'glow': 'glow 1.5s ease-in-out infinite alternate',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        popIn: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '70%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(76, 175, 80, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(76, 175, 80, 0.8)' },
        },
      },
    },
  },
  plugins: [],
}
