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
        steel: {
          50: "#F0F4FA",
          100: "#DCE5F3",
          200: "#B8CAE6",
          300: "#8FA7D2",
          400: "#5C7BB8",
          500: "#3B5A9B",
          600: "#2B4580",
          700: "#1E3A5F",
          800: "#182F4D",
          900: "#0F1F33",
        },
        amber: {
          custom: "#F59E0B",
        },
        confidence: {
          high: "#10B981",
          medium: "#F59E0B",
          low: "#EF4444",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "Georgia", "serif"],
        sans: ['"Noto Sans SC"', "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
      },
      backgroundImage: {
        "glass-gradient":
          "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
        "card-border":
          "linear-gradient(135deg, rgba(30,58,95,0.15) 0%, rgba(245,158,11,0.15) 100%)",
      },
      boxShadow: {
        card: "0 4px 24px -8px rgba(30,58,95,0.12), 0 1px 3px rgba(30,58,95,0.08)",
        "card-hover":
          "0 8px 32px -8px rgba(30,58,95,0.2), 0 2px 6px rgba(30,58,95,0.1)",
        glow: "0 0 0 3px rgba(30,58,95,0.15)",
      },
      animation: {
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
        "flash-green": "flashGreen 0.8s ease-out",
        "fade-in-up": "fadeInUp 0.5s ease-out both",
        "slide-in-right": "slideInRight 0.3s ease-out",
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.02)" },
        },
        flashGreen: {
          "0%": { boxShadow: "0 0 0 0 rgba(16,185,129,0.6)" },
          "100%": { boxShadow: "0 0 0 12px rgba(16,185,129,0)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};
