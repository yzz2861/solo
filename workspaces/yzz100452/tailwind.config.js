/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "16px",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        space: {
          950: "#0f1115",
          900: "#1a1d23",
          800: "#22262f",
          700: "#2a2e37",
          600: "#363b46",
          500: "#4a5060",
          400: "#6b7280",
        },
        brass: {
          50: "#fbf7ee",
          100: "#f5ead3",
          200: "#ecd4a4",
          300: "#e0b96e",
          400: "#d6a44a",
          500: "#c9a96e",
          600: "#b08a4a",
          700: "#93703d",
          800: "#785b36",
          900: "#634b2f",
        },
        signal: {
          green: "#4ade80",
          orange: "#fb923c",
          red: "#f87171",
          blue: "#60a5fa",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ['"Noto Sans SC"', "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "brass-gradient":
          "linear-gradient(135deg, #e0b96e 0%, #c9a96e 50%, #93703d 100%)",
        "brass-gradient-subtle":
          "linear-gradient(135deg, rgba(224,185,110,0.15) 0%, rgba(147,112,61,0.15) 100%)",
        "noise-texture":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        "brass-glow": "0 0 16px rgba(201,169,110,0.25)",
        "brass-glow-lg": "0 0 32px rgba(201,169,110,0.35)",
        "inset-soft": "inset 0 1px 2px rgba(255,255,255,0.04)",
        "press-3d":
          "inset 0 2px 4px rgba(0,0,0,0.4), inset 0 -1px 0 rgba(255,255,255,0.04)",
      },
      borderImage: {
        "brass-gradient":
          "linear-gradient(135deg, #e0b96e, #93703d) 1",
      },
      animation: {
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "slide-in": "slide-in 300ms ease-out",
        "fade-in": "fade-in 200ms ease-out",
        "fade-up": "fade-up 400ms ease-out",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "slide-in": {
          "0%": { transform: "translateX(-8px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [
    function ({ addUtilities, addComponents, theme }) {
      addUtilities({
        ".border-brass": {
          "border-image":
            "linear-gradient(135deg, #e0b96e, #c9a96e, #93703d) 1",
          "border-style": "solid",
        },
        ".text-brass-gradient": {
          "background-image":
            "linear-gradient(135deg, #e0b96e 0%, #c9a96e 50%, #93703d 100%)",
          "-webkit-background-clip": "text",
          "background-clip": "text",
          "-webkit-text-fill-color": "transparent",
          color: "transparent",
        },
        ".scrollbar-thin": {
          "scrollbar-width": "thin",
          "scrollbar-color": "#4a5060 transparent",
        },
        ".scrollbar-thin::-webkit-scrollbar": {
          width: "6px",
          height: "6px",
        },
        ".scrollbar-thin::-webkit-scrollbar-track": {
          background: "transparent",
        },
        ".scrollbar-thin::-webkit-scrollbar-thumb": {
          background: "#4a5060",
          "border-radius": "3px",
        },
        ".scrollbar-thin::-webkit-scrollbar-thumb:hover": {
          background: "#6b7280",
        },
      });
      addComponents({
        ".btn-industrial": {
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: theme("spacing.2"),
          padding: `${theme("spacing.2")} ${theme("spacing.4")}`,
          "border-radius": "4px",
          "font-size": theme("fontSize.sm"),
          "font-weight": "500",
          transition: "all 150ms ease",
          "user-select": "none",
          outline: "none",
          "&:active": {
            transform: "translateY(1px)",
          },
        },
        ".btn-primary": {
          background:
            "linear-gradient(135deg, #e0b96e 0%, #c9a96e 50%, #93703d 100%)",
          color: "#1a1d23",
          "box-shadow":
            "inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 2px rgba(0,0,0,0.3)",
          "&:hover": {
            filter: "brightness(1.08)",
            "box-shadow":
              "inset 0 1px 0 rgba(255,255,255,0.25), 0 0 16px rgba(201,169,110,0.35)",
          },
          "&:active": {
            boxShadow:
              "inset 0 2px 4px rgba(0,0,0,0.4), inset 0 -1px 0 rgba(255,255,255,0.04)",
          },
        },
        ".btn-ghost": {
          background: "transparent",
          color: "#c9a96e",
          border: "1px solid rgba(201,169,110,0.35)",
          "&:hover": {
            background: "rgba(201,169,110,0.08)",
            "border-color": "rgba(201,169,110,0.6)",
          },
        },
        ".btn-danger": {
          background: "rgba(248,113,113,0.15)",
          color: "#f87171",
          border: "1px solid rgba(248,113,113,0.35)",
          "&:hover": {
            background: "rgba(248,113,113,0.25)",
          },
        },
        ".card-panel": {
          background: "#22262f",
          border: "1px solid rgba(201,169,110,0.12)",
          "border-radius": "6px",
          "box-shadow":
            "0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)",
        },
        ".input-field": {
          width: "100%",
          padding: `${theme("spacing.2")} ${theme("spacing.3")}`,
          background: "#1a1d23",
          border: "1px solid #363b46",
          "border-radius": "4px",
          color: "#f5f5f5",
          "font-size": theme("fontSize.sm"),
          transition: "all 150ms ease",
          outline: "none",
          "&:focus": {
            "border-color": "#c9a96e",
            "box-shadow": "0 0 0 2px rgba(201,169,110,0.18)",
          },
          "&::placeholder": {
            color: "#6b7280",
          },
        },
        ".label-field": {
          display: "block",
          "font-size": theme("fontSize.xs"),
          "font-weight": "500",
          color: "#b8bcc4",
          "margin-bottom": theme("spacing.1.5"),
          "letter-spacing": "0.02em",
        },
        ".divider-brass": {
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(201,169,110,0.35) 50%, transparent 100%)",
        },
        ".grade-badge": {
          display: "inline-flex",
          "align-items": "center",
          "justify-content": "center",
          width: "28px",
          height: "28px",
          "border-radius": "4px",
          "font-family": theme("fontFamily.mono"),
          "font-weight": "700",
          "font-size": theme("fontSize.sm"),
        },
      });
    },
  ],
};
