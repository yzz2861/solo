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
        sandalwood: {
          50: '#faf6f2',
          100: '#f0e6d8',
          200: '#e0ccaf',
          300: '#d0ad82',
          400: '#a89880',
          500: '#8a7560',
          600: '#6e5a47',
          700: '#5c3a21',
          800: '#3d2614',
          900: '#2a1a0d',
        },
        cinnabar: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#f5a8a6',
          300: '#e8706d',
          400: '#d94a47',
          500: '#c73e3a',
          600: '#a83230',
          700: '#8a2826',
          800: '#6c1e1d',
          900: '#4e1515',
        },
        celadon: {
          50: '#f0f7f4',
          100: '#d4ebe0',
          200: '#a8d7c1',
          300: '#7dbfa2',
          400: '#4a7c6f',
          500: '#3a6358',
          600: '#2d4e45',
          700: '#213a33',
          800: '#162622',
          900: '#0b1311',
        },
        ink: {
          50: '#f5f5f6',
          100: '#e5e5e7',
          200: '#cacad0',
          300: '#a0a0aa',
          400: '#757582',
          500: '#4e4e5c',
          600: '#3a3a47',
          700: '#282832',
          800: '#1a1a22',
          900: '#0d0d12',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 12px 2px rgba(199, 62, 58, 0.4)',
        'glow-green': '0 0 12px 2px rgba(74, 124, 111, 0.4)',
        'lift': '0 4px 12px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)',
        'glass': '0 8px 32px rgba(0,0,0,0.3)',
      },
      backdropBlur: {
        'glass': '16px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 4px 1px rgba(199, 62, 58, 0.3)' },
          '100%': { boxShadow: '0 0 12px 3px rgba(199, 62, 58, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};
