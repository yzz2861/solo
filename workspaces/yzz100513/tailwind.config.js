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
          50: '#fbf8f4',
          100: '#f5ebe0',
          200: '#e9d5bc',
          300: '#d9b78d',
          400: '#ca965d',
          500: '#b8773e',
          600: '#a66132',
          700: '#8a4c2a',
          800: '#703f28',
          900: '#5c3624',
        },
        ink: {
          50: '#f7f7f6',
          100: '#e5e4e1',
          200: '#c9c7c1',
          300: '#a7a49b',
          400: '#858175',
          500: '#6b6657',
          600: '#565247',
          700: '#47443c',
          800: '#3a3833',
          900: '#33312e',
        },
        paper: '#faf8f5',
        scroll: '#f5f0e8',
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        kai: ['"Noto Serif SC"', '"KaiTi"', 'serif'],
      },
      backgroundImage: {
        'paper-texture': 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23noise)\' opacity=\'0.03\'/%3E%3C/svg%3E")',
      },
      boxShadow: {
        'scroll': '0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 2px 8px -2px rgba(0, 0, 0, 0.04)',
        'ink': '0 2px 8px -1px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
}

