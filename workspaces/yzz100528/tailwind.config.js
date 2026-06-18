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
        brand: {
          50: "#FFF4EE",
          100: "#FFE4D6",
          200: "#FFC5A8",
          300: "#FFA070",
          400: "#FF7A3D",
          500: "#E8652B",
          600: "#CC4F18",
          700: "#A33D10",
          800: "#7A2E0C",
          900: "#521F08",
        },
        surface: {
          50: "#FAFAF8",
          100: "#F5F3EF",
          200: "#EDE9E3",
          300: "#DDD7CD",
          400: "#C4BBAD",
        },
        dark: {
          50: "#3A3A52",
          100: "#2D2D45",
          200: "#1A1A2E",
          300: "#131325",
          400: "#0D0D1C",
        },
        success: {
          50: "#E8FBF4",
          100: "#D1F7E9",
          200: "#A3EFD3",
          300: "#5BDFB3",
          400: "#2ECDA7",
          500: "#1AAF8C",
          600: "#148F73",
        },
        warning: {
          50: "#FFF8EB",
          100: "#FFEDC6",
          200: "#FFDB8D",
          300: "#FFC94D",
          400: "#F0A819",
          500: "#D4920E",
        },
        danger: {
          50: "#FFF0EE",
          100: "#FFD9D4",
          200: "#FFB3AA",
          300: "#FF8C7F",
          400: "#E8564A",
          500: "#CC3B2F",
          600: "#A32B21",
        },
      },
      fontFamily: {
        serif: ["Noto Serif SC", "serif"],
        sans: ["Noto Sans SC", "sans-serif"],
      },
    },
  },
  plugins: [],
};
