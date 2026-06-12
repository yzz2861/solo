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
          50: "#FFF8E6",
          100: "#FFEFB8",
          200: "#FFE58A",
          300: "#FFDB5C",
          400: "#FAD02E",
          500: "#F5A623",
          600: "#E08E0B",
          700: "#B36E07",
          800: "#804F04",
          900: "#4D2F02",
        },
        secondary: {
          50: "#E8F1F3",
          100: "#C3D9DF",
          200: "#9EC1CB",
          300: "#79A9B7",
          400: "#5491A3",
          500: "#2C5F6B",
          600: "#234D56",
          700: "#1A3A41",
          800: "#12282C",
          900: "#091417",
        },
        success: "#4CAF50",
        danger: "#E53935",
        warning: "#FF9800",
        info: "#2196F3",
      },
      fontFamily: {
        sans: [
          '"Noto Sans SC"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bounce-subtle": "bounce-subtle 2s ease-in-out infinite",
        "ripple": "ripple 1s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        "shake": "shake 0.5s ease-in-out",
        "flow": "flow 3s linear infinite",
      },
      keyframes: {
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "ripple": {
          "0%": { transform: "scale(0)", opacity: "1" },
          "100%": { transform: "scale(2)", opacity: "0" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-5px)" },
          "75%": { transform: "translateX(5px)" },
        },
        "flow": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "40px 0" },
        },
      },
    },
  },
  plugins: [],
};
