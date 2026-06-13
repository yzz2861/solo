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
          50: '#EFF4FB',
          100: '#D9E5F4',
          200: '#B3CAE7',
          300: '#7DA4D1',
          400: '#4A7AB4',
          500: '#2E5A91',
          600: '#1E3A5F',
          700: '#172F4E',
          800: '#112540',
          900: '#0B1A2D',
        },
        accent: {
          50: '#FEF1EA',
          100: '#FDD9C6',
          200: '#FBB08B',
          300: '#F78750',
          400: '#F26B3A',
          500: '#E0552A',
          600: '#B83F20',
        },
        success: {
          500: '#22C55E',
          600: '#16A34A',
        },
        danger: {
          500: '#EF4444',
          600: '#DC2626',
        },
        warning: {
          500: '#F59E0B',
          600: '#D97706',
        },
        info: {
          500: '#0EA5E9',
          600: '#0284C7',
        },
        surface: {
          DEFAULT: '#F8FAFC',
          2: '#F1F5F9',
          3: '#E2E8F0',
          4: '#CBD5E1',
          muted: '#94A3B8',
          text: '#334155',
          strong: '#0F172A',
        },
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.06)',
        'card-lg': '0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -4px rgba(15, 23, 42, 0.08)',
        glow: '0 0 0 3px rgba(46, 90, 145, 0.15)',
      },
      borderRadius: {
        xl2: '14px',
      },
      backgroundImage: {
        'grid-floor': "linear-gradient(rgba(148,163,184,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.15) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
