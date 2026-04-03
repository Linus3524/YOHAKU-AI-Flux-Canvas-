/** @type {import('tailwindcss').Config} */
// NOTE: This project loads Tailwind via CDN (<script src="https://cdn.tailwindcss.com">).
// This file serves as documentation and is mirrored as an inline <script> in index.html
// so the CDN picks up the custom tokens. If you ever migrate to a npm-based Tailwind
// build, this file will be picked up automatically.
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ── YOHAKU Design System Palette ──────────────────────────────────────
      // Use as: text-yohaku-text-main, bg-yohaku-bg-main, etc.
      colors: {
        yohaku: {
          'bg-main':      '#F5F5F7',   // app background / input surfaces
          'text-main':    '#1D1D1F',   // primary text
          'text-muted':   '#A1A1A6',   // labels, secondary text, placeholders
          'accent':       '#007AFF',   // interactive blue (buttons, links, sliders)
          'danger':       '#FF3B30',   // destructive actions, error states
          'border-light': 'rgba(0,0,0,0.05)',  // subtle dividers
        },
      },

      // ── Entrance Animations ───────────────────────────────────────────────
      keyframes: {
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)'    },
        },
        'fade-in-down': {
          '0%':   { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)'     },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-right': {
          '0%':   { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)'     },
        },
      },
      animation: {
        'fade-in-up':    'fade-in-up    0.2s ease-out both',
        'fade-in-down':  'fade-in-down  0.2s ease-out both',
        'fade-in':       'fade-in       0.2s ease-out both',
        'fade-in-right': 'fade-in-right 0.2s ease-out both',
      },
    },
  },
  plugins: [],
};
