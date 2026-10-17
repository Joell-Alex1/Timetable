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
        // Light surface scale. 0 is the page, 1–2 are cards (white, lifted by
        // a border and a soft shadow rather than a fill), 3–4 are recessed
        // areas such as inputs and table headers.
        bg: {
          0: '#F9FAFB',
          1: '#FFFFFF',
          2: '#FFFFFF',
          3: '#F3F4F6',
          4: '#E9EDF2',
        },
        // Borders carry the structure on a light page, where there is no dark
        // ground to separate surfaces. These are deliberately a step darker
        // than the reference's values: at #F1F5F9 on a #F9FAFB page a hairline
        // measures 1.05:1 and is simply not there.
        border: {
          dim: '#E5E7EB',     // row dividers, hairlines
          base: '#D8DFE8',    // card + input borders, empty slots
          bright: '#B6C1D1',  // hover, emphasis
        },
        // Three-step hierarchy, each clearing WCAG AA (4.5:1) on every light
        // surface. Note `muted` is one step darker than the #6B7280 this
        // palette is modelled on: that value measures 4.39:1 on #F9FAFB and
        // fails AA, so matching it exactly would mean copying an
        // accessibility defect.
        text: {
          primary: '#0F1729',   // worst case 16.24:1
          secondary: '#475569', // worst case  6.89:1
          muted: '#646C7A',     // worst case  4.81:1
        },
        // Semantic status colours — red error/destructive, green success,
        // amber warning, blue info. Re-picked for light surfaces: the previous
        // pastels were tuned for a near-black background and measured below
        // 1.8:1 here.
        status: {
          danger:  '#CC1F1F',   // 5.04:1
          success: '#15803D',   // 4.56:1
          warning: '#B45309',   // 4.56:1
          info:    '#1D4ED8',   // 6.09:1
        },
        accent: {
          DEFAULT: '#2461DB',
          dim: '#1D4ED8',
          glow: 'rgba(36, 97, 219, 0.12)',
        },
        theory: {
          bg: '#D6E2F3',
          border: '#B8CDEA',
          text: '#1E3A8A',
        },
        lab: {
          bg: '#E2D7EF',
          border: '#CBB9E2',
          text: '#5B21B6',
        },
      },
      fontSize: {
        // Named, rem-based step for the smallest text in the app. Fixed px
        // sizes ignore the browser's font-size setting entirely, so anyone
        // who scales text up gets no benefit; rem respects it.
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],   // 11px at default root
      },
      fontFamily: {
        display: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': `
          linear-gradient(rgba(15, 23, 41, 0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(15, 23, 41, 0.04) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'grid-sm': '24px 24px',
      },
      boxShadow: {
        'glow-sm': '0 4px 12px -4px rgba(36, 97, 219, 0.35)',
        'glow-md': '0 9px 16px -7px rgba(36, 97, 219, 0.40)',
        'card': '0 1px 2px rgba(15, 23, 41, 0.04), 0 4px 24px -4px rgba(15, 23, 41, 0.06)',
        'card-hover': '0 18px 34px -18px rgba(15, 23, 41, 0.22)',
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
