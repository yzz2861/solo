/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-card': 'var(--bg-card)',
        'bg-card-hover': 'var(--bg-card-hover)',
        'accent-primary': 'var(--accent-primary)',
        'accent-secondary': 'var(--accent-secondary)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'success': 'var(--success)',
        'warning': 'var(--warning)',
        'danger': 'var(--danger)',
        'info': 'var(--info)',
        'border-custom': 'var(--border)',
        'border-strong': 'var(--border-strong)',
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'glow': 'var(--shadow-glow)',
      },
      borderRadius: {
        'lg-custom': 'var(--radius-lg)',
        'md-custom': 'var(--radius-md)',
        'sm-custom': 'var(--radius-sm)',
      },
      fontFamily: {
        'mono': ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        'sans': ['"PingFang SC"', '"Noto Sans SC"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
        'gradient-bg': 'radial-gradient(ellipse at top left, rgba(0, 212, 170, 0.08) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(59, 130, 246, 0.08) 0%, transparent 50%)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        'shake': 'shake 0.4s ease-in-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0, 212, 170, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 212, 170, 0.6)' },
        },
      },
    },
  },
  plugins: [],
}
