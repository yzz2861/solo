/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        wood: {
          50: "#FBF7F0",
          100: "#F5F0E8",
          200: "#E8DFD0",
          300: "#D4C4A8",
          400: "#B8956A",
          500: "#A67C52",
          600: "#8B4513",
          700: "#6B3410",
          800: "#4A3728",
          900: "#2D1F15",
        },
        gold: {
          50: "#FDF8E8",
          100: "#F9EFC9",
          200: "#F2DE94",
          300: "#E9C95E",
          400: "#D4A853",
          500: "#C4863F",
          600: "#A66830",
          700: "#854D26",
          800: "#6B3D20",
          900: "#57321B",
        },
        ivory: "#F5F0E8",
        parchment: "#FAF6EE",
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      boxShadow: {
        'wood': '0 4px 14px rgba(74, 55, 40, 0.15)',
        'wood-lg': '0 10px 30px rgba(74, 55, 40, 0.2)',
        'inner-wood': 'inset 0 2px 4px rgba(74, 55, 40, 0.1)',
      },
      backgroundImage: {
        'wood-grain': "url('data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 100 100\"%3E%3Crect fill=\"%23F5F0E8\" width=\"100\" height=\"100\"/%3E%3Cpath d=\"M0 50 Q25 48 50 50 T100 50\" stroke=\"%23E8DFD0\" stroke-width=\"0.5\" fill=\"none\"/%3E%3Cpath d=\"M0 30 Q25 28 50 30 T100 30\" stroke=\"%23E8DFD0\" stroke-width=\"0.3\" fill=\"none\"/%3E%3Cpath d=\"M0 70 Q25 68 50 70 T100 70\" stroke=\"%23E8DFD0\" stroke-width=\"0.3\" fill=\"none\"/%3E%3C/svg%3E')",
        'parchment-texture': "url('data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"200\" viewBox=\"0 0 200 200\"%3E%3Crect fill=\"%23FAF6EE\" width=\"200\" height=\"200\"/%3E%3Cfilter id=\"noise\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.65\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"200\" height=\"200\" filter=\"url(%23noise)\" opacity=\"0.04\"/%3E%3C/svg%3E')",
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
};
