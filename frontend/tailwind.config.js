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
        // Warm earth surfaces. Page is Warm Cream, cards Soft Ivory, so cards
        // lift off the page without needing a heavy border.
        bg: {
          0: '#F5F0E6',   // Warm Cream — page
          1: '#FFFCF6',   // Soft Ivory — cards and modals
          2: '#FFFCF6',
          3: '#EDE7DA',   // recessed — derived between cream and Warm Stone
          4: '#E5D8C5',   // Oat Beige
        },
        // Warm Stone is the stated divider. At 1.28:1 on cream it reads as a
        // quiet rule but cannot carry structure alone, so `bright` (a deeper
        // stone) exists for borders that must be seen — empty timetable
        // slots, hover states.
        border: {
          dim: '#EDE7DB',     // hairlines, row dividers
          base: '#DDD5C8',    // Warm Stone — cards, inputs, dividers
          bright: '#BCB1A0',  // structural borders, hover, emphasis
        },
        // Dark Espresso carries the main text. Taupe Grey (#797469) measures
        // 4.09:1 on ivory and misses AA, so the muted step keeps its hue but
        // is pulled one stop darker.
        text: {
          primary: '#342F28',   // Dark Espresso — 11.68:1 on cream
          secondary: '#555148', //  6.96:1 — body copy
          muted: '#676357',     //  5.28:1 — labels, hints
        },
        // Semantic status colours, re-struck in the warm family. All clear AA
        // on both cream and ivory while staying recognisably red/green/amber/blue.
        status: {
          danger:  '#96352A',   // 6.51:1
          success: '#35603D',   // 6.39:1
          warning: '#8A5A22',   // 5.18:1
          info:    '#33506B',   // 7.39:1
        },
        accent: {
          DEFAULT: '#34483A',       // Deep Forest Green — white on it is 9.84:1
          // Muted Sage (#87977A) is a mid-tone: nothing readable sits on it
          // (white 3.12, Dark Espresso 4.26), so it is used for borders and
          // decoration rather than as a button fill. Hover lifts the forest
          // instead, keeping the white label.
          hover: '#45604C',         // 6.93:1 with white
          sage: '#87977A',          // Muted Sage — decorative, borders, charts
          soft: '#C4CDB5',          // Pale Sage — tinted panels
          glow: 'rgba(52, 72, 58, 0.18)',
        },
        // Attention/priority fill. Muted Mocha is too mid-tone for a label
        // (2.77:1 on oat), so the badge is an Oat Beige fill with a deeper
        // mocha text.
        priority: {
          DEFAULT: '#E5D8C5',
          text: '#5E4530',          // 6.31:1 on the fill
          mocha: '#9B7B60',         // Muted Mocha — fills and accents only
        },
        theory: {
          bg: '#D9E2CE',
          border: '#C4CDB5',
          text: '#2F4432',          // 7.88:1
        },
        lab: {
          bg: '#EFE0C6',
          border: '#DDC9A6',
          text: '#6B4F23',          // 5.83:1
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
          linear-gradient(rgba(52, 47, 40, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(52, 47, 40, 0.05) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'grid-sm': '24px 24px',
      },
      boxShadow: {
        'glow-sm': '0 4px 12px -4px rgba(52, 72, 58, 0.30)',
        'glow-md': '0 9px 16px -7px rgba(52, 72, 58, 0.35)',
        'card': '0 1px 2px rgba(52, 47, 40, 0.05), 0 4px 24px -4px rgba(52, 47, 40, 0.08)',
        'card-hover': '0 18px 34px -18px rgba(52, 47, 40, 0.24)',
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
