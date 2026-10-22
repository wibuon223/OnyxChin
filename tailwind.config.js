/** @type {import('tailwindcss').Config} */
export default {
  content: ['./web/index.html', './web/src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07090f',
          900: '#0b0e17',
          850: '#0f1320',
          800: '#141926',
          700: '#1c2233',
          600: '#272e42',
        },
        accent: {
          DEFAULT: '#6ee7f0',
          soft: '#a5f3fc',
          deep: '#0891b2',
        },
        ember: '#fb7185',
      },
      fontFamily: {
        sans: ['"Inter var"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(110,231,240,.14), 0 18px 50px -22px rgba(110,231,240,.35)',
        card: '0 24px 60px -32px rgba(0,0,0,.85)',
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(circle at 20% 0%, rgba(110,231,240,.10), transparent 45%), radial-gradient(circle at 85% 10%, rgba(251,113,133,.08), transparent 40%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .5s cubic-bezier(.22,1,.36,1) both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
}
