/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        dock: {
          950: '#060E1C',
          900: '#0A1628',
          850: '#0F2744',
          800: '#142844',
          700: '#1B2E51',
          600: '#233A66',
          500: '#2E4D85',
        },
        safety: {
          orange: '#FF8A3D',
          red: '#FF4757',
          green: '#2ED573',
          yellow: '#FFA502',
          blue: '#5352ED',
        }
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(255,138,61,0.4), 0 0 10px rgba(255,138,61,0.2)' },
          '100%': { boxShadow: '0 0 15px rgba(255,138,61,0.8), 0 0 30px rgba(255,138,61,0.4)' }
        }
      },
      boxShadow: {
        'panel': '0 2px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)',
        'inset-deep': 'inset 0 2px 8px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        'grid-faint': 'linear-gradient(rgba(126,200,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(126,200,255,0.04) 1px, transparent 1px)',
      }
    },
  },
  plugins: [],
};
