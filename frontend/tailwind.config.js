/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        card: '0 8px 24px rgba(15, 23, 42, 0.06)',
      },
      keyframes: {
        'scan-laser': {
          '0%':   { top: '0%',   opacity: '1' },
          '50%':  { top: '100%', opacity: '0.8' },
          '100%': { top: '0%',   opacity: '1' },
        },
      },
      animation: {
        'scan-laser': 'scan-laser 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
