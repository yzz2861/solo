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
          50: "#f0f5fb",
          100: "#dde9f5",
          200: "#b7d1e8",
          300: "#86b0d6",
          400: "#5589bf",
          500: "#396ba3",
          600: "#2d5586",
          700: "#26456c",
          800: "#1e3a5f",
          900: "#162c47",
          950: "#0d1b2d",
        },
        evidence: {
          light: "#d1fae5",
          DEFAULT: "#10b981",
          dark: "#059669",
        },
        noevidence: {
          light: "#fef3c7",
          DEFAULT: "#f59e0b",
          dark: "#d97706",
        },
        bias: {
          light: "#fee2e2",
          DEFAULT: "#ef4444",
          dark: "#dc2626",
        },
        followup: {
          light: "#e0e7ff",
          DEFAULT: "#6366f1",
          dark: "#4f46e5",
        },
        neutral: {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "serif"],
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.4s ease-out forwards",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgba(30, 58, 95, 0.08), 0 1px 3px -1px rgba(30, 58, 95, 0.05)",
        card: "0 8px 24px -8px rgba(30, 58, 95, 0.12), 0 2px 6px -2px rgba(30, 58, 95, 0.06)",
        elevated: "0 16px 40px -12px rgba(30, 58, 95, 0.18), 0 4px 12px -4px rgba(30, 58, 95, 0.08)",
      },
    },
  },
  plugins: [],
};
