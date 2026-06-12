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
        'electric-blue': '#0A2540',
        'electric-blue-light': '#143A5C',
        'electric-green': '#00D4AA',
        'electric-green-dark': '#00A885',
        'warning-orange': '#FF6B35',
        'warning-yellow': '#F4C430',
        'neutral-slate': '#E8ECF0',
        'neutral-slate-dark': '#8A95A5',
        'bg-dark': '#061A2D',
        'bg-card': '#0F2A42',
        'bg-card-hover': '#163550',
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'slide-indicator': 'slideIndicator 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'number-roll': 'numberRoll 0.6s ease-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIndicator: {
          '0%': { transform: 'translateX(var(--from))' },
          '100%': { transform: 'translateX(var(--to))' },
        },
        numberRoll: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
