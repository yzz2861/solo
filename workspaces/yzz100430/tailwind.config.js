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
        primary: {
          50: "#F0F7F9",
          100: "#D9EAF0",
          200: "#A9D0DC",
          300: "#6AAEC2",
          400: "#3C8AA3",
          500: "#1E4E5F",
          600: "#1A4351",
          700: "#153743",
          800: "#0F2831",
          900: "#08171C",
        },
        safe: {
          400: "#6EC697",
          500: "#4CAF82",
          600: "#3D8F68",
        },
        warn: {
          400: "#F6B87D",
          500: "#F4A259",
          600: "#D1863F",
        },
        danger: {
          400: "#ED7982",
          500: "#E8505B",
          600: "#C83643",
        },
        paper: "#FAF7F2",
        ink: "#1F2933",
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Source Han Serif SC', 'SimSun', 'serif'],
        sans: ['"Noto Sans SC"', 'Source Han Sans CN', 'PingFang SC', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(30, 78, 95, 0.08), 0 0 0 1px rgba(30, 78, 95, 0.06)',
        cardHover: '0 8px 24px rgba(30, 78, 95, 0.12), 0 0 0 1px rgba(30, 78, 95, 0.08)',
      },
    },
  },
  plugins: [],
};
