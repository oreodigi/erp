const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: c('bg'), surface: c('surface'), surface2: c('surface-2'), line: c('line'), ink: c('ink'), muted: c('muted'), faint: c('faint'),
        brand: c('brand'), brandstrong: c('brand-strong'), violet: c('violet'), violetsoft: c('violet-soft'),
        side: c('side'), side2: c('side-2'), sidetext: c('side-text'),
        ok: c('ok'), warn: c('warn'), bad: c('bad'), info: c('info'),
      },
      fontFamily: { sans: ['Onest', '"Noto Sans Devanagari"', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'], display: ['"Bricolage Grotesque"', 'Onest', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'], mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'] },
      boxShadow: { card: '0 1px 2px rgb(var(--shadow) / .06), 0 1px 1px rgb(var(--shadow) / .03)', pop: '0 12px 40px -8px rgb(var(--shadow) / .28), 0 2px 6px rgb(var(--shadow) / .08)' },
      borderRadius: { xl: '14px', lg: '10px', md: '8px' },
      keyframes: { in: { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'none' } }, slide: { from: { transform: 'translateX(24px)', opacity: .4 }, to: { transform: 'none', opacity: 1 } }, up: { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } }, shimmer: { '100%': { transform: 'translateX(100%)' } } },
      animation: { in: 'in .22s ease-out both', slide: 'slide .22s cubic-bezier(.2,.8,.2,1) both', up: 'up .25s cubic-bezier(.2,.8,.2,1) both' },
    },
  },
  plugins: [],
};
