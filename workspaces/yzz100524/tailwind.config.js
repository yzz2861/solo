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
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#1E3A5F",
          600: "#162b49",
          700: "#0f1e33",
          800: "#0a1526",
          900: "#050c14",
        },
        accent: {
          500: "#F59E0B",
          600: "#D97706",
        },
        success: "#10B981",
        warning: "#F97316",
        danger: "#EF4444",
      },
      fontFamily: {
        sans: ["Noto Sans SC", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
