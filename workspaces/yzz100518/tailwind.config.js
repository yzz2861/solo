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
        ink: {
          50: "#F0F5F2",
          100: "#DBE6DF",
          200: "#B7CDC0",
          300: "#88B09A",
          400: "#5C9178",
          500: "#3D755C",
          600: "#2D5C48",
          700: "#1F4D3C",
          800: "#183D30",
          900: "#0F2A20",
        },
        amber: {
          50: "#FDF6E6",
          100: "#F9E8BF",
          200: "#F3D488",
          300: "#EEBD55",
          400: "#E8A838",
          500: "#C98A22",
          600: "#A36D18",
          700: "#7D5313",
        },
        clay: {
          50: "#FBECEB",
          100: "#F5CDCA",
          200: "#ECA09B",
          300: "#E0706A",
          400: "#C25450",
          500: "#9E3F3C",
          600: "#7A2E2C",
        },
        moss: {
          50: "#EAF6EE",
          100: "#C9E8D2",
          200: "#96D4AA",
          300: "#66BE83",
          400: "#4CA771",
          500: "#358558",
          600: "#266543",
        },
      },
      fontFamily: {
        display: ['"Noto Serif SC"', '"Source Han Serif SC"', '"SimSun"', "serif"],
        sans: ['"Noto Sans SC"', '"Source Han Sans SC"', '"PingFang SC"', "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-ring": "pulseRing 1.8s cubic-bezier(0.24, 0, 0.38, 1) infinite",
        "breath": "breath 1.5s ease-in-out infinite",
        "stagger-in": "staggerIn 0.4s ease-out both",
        "slide-in": "slideIn 0.3s ease-out both",
      },
      keyframes: {
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(194,84,80,0.6)" },
          "70%": { boxShadow: "0 0 0 12px rgba(194,84,80,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(194,84,80,0)" },
        },
        breath: {
          "0%,100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.04)" },
        },
        staggerIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};
