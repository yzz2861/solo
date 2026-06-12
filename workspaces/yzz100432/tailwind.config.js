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
        forest: {
          50: "#f0f7f4",
          100: "#cce9dd",
          200: "#99d3bc",
          300: "#66bd9a",
          400: "#33a778",
          500: "#1B4D3E",
          600: "#163e32",
          700: "#102e25",
          800: "#0b1f19",
          900: "#050f0c",
        },
        sky: {
          500: "#3A86FF",
          600: "#2d6bcc",
        },
        warning: {
          500: "#FF9F1C",
          600: "#cc7f16",
        },
        danger: {
          500: "#E63946",
          600: "#b82e38",
        },
      },
      fontFamily: {
        sans: ["PingFang SC", "Noto Sans SC", "sans-serif"],
        display: ["Noto Sans SC", "sans-serif"],
        mono: ["SF Mono", "Monaco", "monospace"],
      },
      boxShadow: {
        card: "0 4px 20px rgba(0, 0, 0, 0.08)",
        cardHover: "0 8px 30px rgba(0, 0, 0, 0.12)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
