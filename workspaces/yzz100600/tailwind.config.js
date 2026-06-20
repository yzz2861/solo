/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
    },
    extend: {
      colors: {
        // 深蓝工业风主色
        industrial: {
          50: "#E6EEF8",
          100: "#C7D6EC",
          200: "#94B1DA",
          300: "#5F86C3",
          400: "#345FA8",
          500: "#1E4087",
          600: "#16336B",
          700: "#0F2550",
          800: "#0A1B3C",
          900: "#0A2540",
          950: "#050E1F",
        },
        // 水蓝色点缀
        aqua: {
          50: "#E6F9FD",
          100: "#BFF0FA",
          200: "#80E2F5",
          300: "#40D3EF",
          400: "#00B8D9",
          500: "#0098B8",
          600: "#007A96",
          700: "#005B73",
          800: "#003D4F",
          900: "#001E27",
        },
        // 状态色
        status: {
          danger: "#FF5630",
          warning: "#FFAB00",
          success: "#36B37E",
          info: "#00B8D9",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["Noto Sans SC", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(0, 184, 217, 0.25)",
        "glow-sm": "0 0 10px rgba(0, 184, 217, 0.15)",
        card: "0 4px 24px rgba(10, 37, 64, 0.08)",
        "card-hover": "0 8px 32px rgba(10, 37, 64, 0.15)",
        pulse: "0 0 0 0 rgba(255, 86, 48, 0.7)",
      },
      keyframes: {
        "pulse-danger": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255, 86, 48, 0.7)" },
          "50%": { boxShadow: "0 0 0 10px rgba(255, 86, 48, 0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "drip-down": {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { transform: "translateY(10px)", opacity: "0" },
        },
      },
      animation: {
        "pulse-danger": "pulse-danger 2s infinite",
        float: "float 4s ease-in-out infinite",
        "fade-up": "fade-up 0.5s ease-out forwards",
        shimmer: "shimmer 2s linear infinite",
        "drip-down": "drip-down 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
