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
        garden: {
          green: '#4A7C59',
          'green-light': '#6BA37A',
          orange: '#F4A259',
          brown: '#8B6F47',
          blue: '#87CEEB',
          red: '#E74C3C',
          soil: '#C4A76C',
          sky: '#B8E0F6',
        },
      },
      fontFamily: {
        display: ['ZCOOL KuaiLe', 'Noto Sans SC', 'sans-serif'],
      },
      animation: {
        'water-drop': 'waterDrop 0.7s ease-in forwards',
        'water-splash': 'waterDropSplash 0.5s ease-out forwards',
        'plant-bounce': 'plantBounce 2s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'scale-in': 'scaleIn 0.35s ease-out forwards',
        'wilt': 'wiltCycle 3s ease-in-out infinite',
        'root-pulse': 'rootPulse 2s ease-in-out infinite',
        'root-rot': 'rootRot 2s ease-in-out infinite',
        'sun-glow': 'sunGlow 3s ease-in-out infinite',
        'badge-shine': 'badgeShine 3s ease-in-out infinite',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
        'slide-in-bottom': 'slideInBottom 0.4s ease-out forwards',
        'leaf-sway': 'leafSway 4s ease-in-out infinite',
        'float-cloud': 'floatCloud 20s linear infinite',
      },
    },
  },
  plugins: [],
};
