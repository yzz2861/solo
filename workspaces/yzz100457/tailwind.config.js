/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        display: ['"ZCOOL QingKe HuangYou"', 'sans-serif'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
      },
      colors: {
        ocean: {
          deep: '#0A2540',
          mid: '#0d2137',
          light: '#0f2a46',
          cyan: '#00D4AA',
          coral: '#FF6B35',
          sand: '#E8D5B7',
          foam: '#F0F4F8',
        },
      },
    },
  },
  plugins: [],
};
