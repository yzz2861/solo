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
        mine: {
          blue: "#0a1628",
          "blue-light": "#1a2d4a",
          "blue-dark": "#050c16",
        },
        warning: {
          orange: "#ff6b35",
          "orange-light": "#ff8a5c",
          "orange-dark": "#e55a2b",
        },
        safety: {
          green: "#2ecc71",
          "green-light": "#58d68d",
          "green-dark": "#27ae60",
        },
        alert: {
          red: "#e74c3c",
          "red-light": "#ec7063",
          "red-dark": "#c0392b",
        },
        tech: {
          cyan: "#00d4ff",
          "cyan-light": "#4de2ff",
          "cyan-dark": "#00a8cc",
        },
        metal: {
          gray: "#34495e",
          "gray-light": "#5d6d7e",
          "gray-dark": "#2c3e50",
        },
      },
      fontFamily: {
        orbitron: ["Orbitron", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "industrial": "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        "industrial-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        "glow-cyan": "0 0 20px rgba(0, 212, 255, 0.5), 0 0 40px rgba(0, 212, 255, 0.3)",
        "glow-orange": "0 0 20px rgba(255, 107, 53, 0.5), 0 0 40px rgba(255, 107, 53, 0.3)",
        "glow-green": "0 0 20px rgba(46, 204, 113, 0.5), 0 0 40px rgba(46, 204, 113, 0.3)",
        "glow-red": "0 0 20px rgba(231, 76, 60, 0.5), 0 0 40px rgba(231, 76, 60, 0.3)",
        "inner-glow": "inset 0 0 20px rgba(0, 212, 255, 0.1)",
      },
      animation: {
        "scanline": "scanline 2s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "flow": "flow 1.5s ease-in-out infinite",
        "shake": "shake 0.5s ease-in-out",
      },
      keyframes: {
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 20px rgba(0, 212, 255, 0.5)" },
          "50%": { opacity: "0.7", boxShadow: "0 0 40px rgba(0, 212, 255, 0.8)" },
        },
        flow: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-5px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(5px)" },
        },
      },
    },
  },
  plugins: [],
};
