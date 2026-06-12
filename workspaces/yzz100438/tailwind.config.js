/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
    },
    extend: {
      colors: {
        forest: {
          50: "#F3F7EF",
          100: "#E3ECD8",
          200: "#C5D8AE",
          300: "#9FBE7C",
          400: "#78A052",
          500: "#5A8436",
          600: "#446926",
          700: "#35521D",
          800: "#2D5016",
          900: "#1E3610",
        },
        ember: {
          50: "#FFF4EC",
          100: "#FFE5D1",
          200: "#FCC89D",
          300: "#F5A366",
          400: "#EF8239",
          500: "#E87C2B",
          600: "#C9641A",
          700: "#A24D13",
          800: "#7E3C10",
          900: "#5D2C0C",
        },
        cream: {
          50: "#FBF9F4",
          100: "#F5F1E8",
          200: "#EBE3CF",
          300: "#DDCEAC",
          400: "#C8B283",
        },
        bark: {
          50: "#F6F4F2",
          100: "#E8E4DF",
          200: "#CFC7BE",
          300: "#A89D90",
          400: "#7A7066",
          500: "#544B43",
          600: "#3A3530",
          700: "#292521",
          800: "#1A1815",
        },
      },
      fontFamily: {
        display: ['"Lora"', '"Noto Serif SC"', "serif"],
        sans: ['"Source Han Sans"', '"Noto Sans SC"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 8px rgba(42, 40, 36, 0.06), 0 8px 24px rgba(42, 40, 36, 0.04)",
        card: "0 4px 16px rgba(45, 80, 22, 0.08), 0 12px 32px rgba(45, 80, 22, 0.06)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.4s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
