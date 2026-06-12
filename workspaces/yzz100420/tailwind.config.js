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
        kiln: {
          50: '#FBF6F0',
          100: '#F5EDE0',
          200: '#EBD8C0',
          300: '#DCB98E',
          400: '#C9905A',
          500: '#B97138',
          600: '#A95A2A',
          700: '#8B4322',
          800: '#723822',
          900: '#5F301F',
          950: '#35170E',
        },
        fire: {
          50: '#FFF4EC',
          100: '#FFE4D3',
          200: '#FFC4A5',
          300: '#FF9C6D',
          400: '#FF6633',
          500: '#E84311',
          600: '#C92D0A',
          700: '#A6200D',
          800: '#871D12',
          900: '#701C13',
          950: '#3D0A07',
        },
        clay: {
          50: '#F8F4EE',
          100: '#EFE7D8',
          200: '#DECDAE',
          300: '#CBAE83',
          400: '#B98E5D',
          500: '#AB7645',
          600: '#965E38',
          700: '#7B4730',
          800: '#653B2E',
          900: '#543229',
          950: '#2E1914',
        },
        temp: {
          cool: '#2563EB',
          warm: '#F59E0B',
          hot: '#EF4444',
          peak: '#FBBF24',
        }
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', '"Source Han Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'clay-texture': "radial-gradient(ellipse at 20% 30%, rgba(139,67,34,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(201,45,10,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(251,244,236,1) 0%, rgba(245,237,224,1) 100%)",
        'kiln-gradient': 'linear-gradient(135deg, #FF6633 0%, #C92D0A 50%, #871D12 100%)',
        'temp-gradient': 'linear-gradient(90deg, #3B82F6 0%, #10B981 20%, #F59E0B 50%, #EF4444 80%, #FBBF24 100%)',
      },
      boxShadow: {
        'card': '0 4px 24px -4px rgba(139, 67, 34, 0.12), 0 2px 8px -2px rgba(139, 67, 34, 0.08)',
        'card-hover': '0 12px 40px -8px rgba(201, 45, 10, 0.20), 0 4px 16px -4px rgba(139, 67, 34, 0.12)',
        'warm': '0 0 40px rgba(255, 102, 51, 0.15)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'draw': 'draw 2s ease-out forwards',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
      },
      keyframes: {
        draw: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
