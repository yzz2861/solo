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
        gold: {
          50: '#FFF9E6',
          100: '#FFF0BF',
          200: '#FFE080',
          300: '#FFD040',
          400: '#E8BD2A',
          500: '#C9A84C',
          600: '#A8882E',
          700: '#8A6B1E',
          800: '#6B5115',
          900: '#4D3A0E',
        },
        dark: {
          50: '#E8E6E1',
          100: '#C8C5BC',
          200: '#9A978E',
          300: '#6B685F',
          400: '#3D3A32',
          500: '#2A2720',
          600: '#1A1A2E',
          700: '#151525',
          800: '#0F0F1A',
          900: '#0A0A0F',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
