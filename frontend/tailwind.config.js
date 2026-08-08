/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          0: '#040710',
          1: '#080D18',
          2: '#0D1422',
          3: '#12192C',
          4: '#172035',
        },
        border: {
          dim: '#182133',
          base: '#1E2B42',
          bright: '#263650',
        },
        text: {
          primary: '#E4ECF7',
          secondary: '#7D8FA8',
          muted: '#475A72',
        },
        accent: {
          DEFAULT: '#17CDD8',
          dim: '#0E9BA4',
          glow: 'rgba(23, 205, 216, 0.15)',
        },
        theory: {
          bg: 'rgba(59, 130, 246, 0.12)',
          border: 'rgba(59, 130, 246, 0.35)',
          text: '#93C5FD',
        },
        lab: {
          bg: 'rgba(139, 92, 246, 0.14)',
          border: 'rgba(139, 92, 246, 0.40)',
          text: '#C4B5FD',
        },
      },
      fontFamily: {
        display: ['var(--font-syne)', 'sans-serif'],
        body: ['var(--font-dm-sans)', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': `
          linear-gradient(rgba(23, 205, 216, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(23, 205, 216, 0.03) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'grid-sm': '24px 24px',
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(23, 205, 216, 0.12)',
        'glow-md': '0 0 24px rgba(23, 205, 216, 0.18)',
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(23,205,216,0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'spin-slow': 'spin 1.5s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
