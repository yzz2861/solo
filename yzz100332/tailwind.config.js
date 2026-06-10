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
          50: "#E8F2EE",
          100: "#C4DED5",
          200: "#9CCAB8",
          300: "#6FB598",
          400: "#469F7A",
          500: "#0F2A24",
          600: "#0C221D",
          700: "#091A16",
          800: "#06110F",
          900: "#030908",
        },
        warn: {
          DEFAULT: "#FF7A45",
          light: "#FFB390",
          dark: "#CC5A2E",
        },
        danger: {
          DEFAULT: "#EF4444",
          light: "#FCA5A5",
          dark: "#B91C1C",
        },
        success: {
          DEFAULT: "#22C55E",
          light: "#86EFAC",
          dark: "#15803D",
        },
        paper: {
          DEFAULT: "#FFF8E7",
          light: "#FFFCF2",
          dark: "#F5E6C8",
        },
        ink: {
          DEFAULT: "#374151",
          light: "#6B7280",
          dark: "#1F2937",
        },
      },
      fontFamily: {
        display: ['"ZCOOL XiaoWei"', "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ['"Noto Sans SC"', "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        tag: "0 2px 8px rgba(15, 42, 36, 0.12), 0 1px 3px rgba(15, 42, 36, 0.08)",
        "tag-hover": "0 8px 24px rgba(15, 42, 36, 0.18), 0 2px 6px rgba(15, 42, 36, 0.1)",
        press: "inset 0 2px 4px rgba(0, 0, 0, 0.12)",
      },
      keyframes: {
        "save-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(1.3)" },
        },
        "tag-in": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "issue-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        "stamp-in": {
          "0%": { opacity: "0", transform: "scale(0.8) rotate(-12deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(-12deg)" },
        },
        "flash-green": {
          "0%": { boxShadow: "0 0 0 0 rgba(34, 197, 94, 0.0)" },
          "50%": { boxShadow: "0 0 60px 20px rgba(34, 197, 94, 0.25)" },
          "100%": { boxShadow: "0 0 0 0 rgba(34, 197, 94, 0.0)" },
        },
      },
      animation: {
        "save-pulse": "save-pulse 0.6s ease-out",
        "tag-in": "tag-in 0.35s ease-out both",
        "issue-blink": "issue-blink 1s ease-in-out 2",
        "stamp-in": "stamp-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "flash-green": "flash-green 0.4s ease-out",
      },
    },
  },
  plugins: [],
};
