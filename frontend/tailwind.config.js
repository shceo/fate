/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'media',
  content: ['./index.html','./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        paper: 'var(--paper)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        accent: 'var(--accent)',
        gold: 'var(--gold)',
        blush: 'var(--blush)',
        sage: 'var(--sage)',
        sky: 'var(--sky)',
        lav: 'var(--lav)',
      },
      boxShadow: { soft: 'var(--shadow-soft)', tiny: 'var(--shadow-tiny)' },
      borderRadius: { lgx: 'var(--radius-lg)', mdx: 'var(--radius-md)', smx: 'var(--radius-sm)' },
      fontFamily: { serif: ['"Cormorant Garamond"','serif'], sans: ['Inter','system-ui','sans-serif'] }
    },
  },
  plugins: [],
}
