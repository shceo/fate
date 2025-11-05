/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html','./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F5EFE6', paper: '#FAF7F2', ink: '#2B2A27', muted: '#8C8072', line: '#E8E1D8',
        accent: '#D0B8A8', gold: '#E8D5B5', blush: '#F1DAD4', sage: '#DCE6D5', sky: '#DDEAF3', lav: '#EAE4F2',
      },
      boxShadow: { soft: '0 10px 30px rgba(126,108,87,0.15)', tiny: '0 2px 12px rgba(110,92,74,0.10)' },
      borderRadius: { lgx: '20px', mdx: '14px', smx: '10px' },
      fontFamily: { serif: ['"Cormorant Garamond"','serif'], sans: ['Inter','system-ui','sans-serif'] }
    },
  },
  plugins: [],
}
