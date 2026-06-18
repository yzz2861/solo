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
        court: {
          50: "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          300: "#5EEAD4",
          400: "#2DD4BF",
          500: "#14B8A6",
          600: "#0F766E",
          700: "#0D6259",
          800: "#0A4D47",
          900: "#083834",
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', "sans-serif"],
        mono: ['"JetBrains Mono"', '"SF Mono"', "Menlo", "monospace"],
      },
      keyframes: {
        raindrop: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "20%": { opacity: "1" },
          "100%": { transform: "translateY(60px)", opacity: "0" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px)" },
          "75%": { transform: "translateX(4px)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "draw-check": {
          "0%": { strokeDashoffset: "24" },
          "100%": { strokeDashoffset: "0" },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateX(20px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateX(0) scale(1)" },
        },
      },
      animation: {
        raindrop: "raindrop 2s ease-in infinite",
        shake: "shake 0.4s ease-in-out",
        "fade-in-up": "fade-in-up 0.35s ease-out both",
        "slide-in-right": "slide-in-right 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
        "draw-check": "draw-check 0.5s ease-out forwards",
        "toast-in": "toast-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
      boxShadow: {
        soft: "0 2px 10px rgba(15, 118, 110, 0.08), 0 1px 3px rgba(15, 118, 110, 0.05)",
        card: "0 4px 24px -8px rgba(15, 23, 42, 0.12)",
        sticky: "0 2px 16px rgba(15, 23, 42, 0.08)",
        "soft-lg": "0 10px 30px rgba(15, 23, 42, 0.12), 0 4px 10px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};
