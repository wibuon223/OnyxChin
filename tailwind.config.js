/** @type {import('tailwindcss').Config} */
export default {
  content: ['./web/index.html', './web/src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Soft black — bukan hitam pekat. Semua shade punya sedikit biru
        // supaya terasa "hidup" dan elegan, bukan flat #000.
        ink: {
          950: '#0a0b10',
          900: '#0c0e14',
          850: '#101319',
          800: '#151922',
          750: '#1a1f2a',
          700: '#20262f',
          600: '#2b323d',
          500: '#3a4250',
        },
        accent: {
          DEFAULT: '#8ce8f2',
          soft: '#cdf8fc',
          deep: '#39b6c9',
        },
        jade: '#7ee0b9',
        ember: '#ff9b8a',
        sand: '#efe9df',
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
        display: ['"Bricolage Grotesque"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      // Skala opacity tambahan supaya modifier seperti bg-accent/12 valid.
      opacity: {
        8: '0.08',
        12: '0.12',
        15: '0.15',
        18: '0.18',
        22: '0.22',
        35: '0.35',
        45: '0.45',
        55: '0.55',
        65: '0.65',
        85: '0.85',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.75rem',
      },
      boxShadow: {
        glass: '0 1px 0 0 rgba(255,255,255,.06) inset, 0 24px 70px -40px rgba(0,0,0,.9)',
        lift: '0 24px 60px -32px rgba(0,0,0,.85), 0 2px 0 0 rgba(255,255,255,.04) inset',
        glow: '0 0 0 1px rgba(140,232,242,.16), 0 20px 60px -28px rgba(140,232,242,.42)',
        ring: '0 0 0 1px rgba(255,255,255,.08)',
      },
      backgroundImage: {
        aurora:
          'radial-gradient(1100px 620px at 12% -12%, rgba(140,232,242,.16), transparent 60%),' +
          'radial-gradient(900px 520px at 92% -4%, rgba(126,224,185,.11), transparent 62%),' +
          'radial-gradient(760px 520px at 60% 110%, rgba(255,155,138,.07), transparent 62%)',
        'grid-fade':
          'linear-gradient(to bottom, rgba(255,255,255,.045) 1px, transparent 1px),' +
          'linear-gradient(to right, rgba(255,255,255,.045) 1px, transparent 1px)',
        shimmer:
          'linear-gradient(100deg, transparent 20%, rgba(255,255,255,.07) 40%, rgba(255,255,255,.14) 50%, rgba(255,255,255,.07) 60%, transparent 80%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'drawer-in': {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'dialog-in': {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(.985)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse-soft': {
          '0%,100%': { opacity: '.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up .55s cubic-bezier(.22,1,.36,1) both',
        'fade-in': 'fade-in .35s ease both',
        'drawer-in': 'drawer-in .32s cubic-bezier(.22,1,.36,1) both',
        'dialog-in': 'dialog-in .28s cubic-bezier(.22,1,.36,1) both',
        shimmer: 'shimmer 1.8s infinite',
        float: 'float 7s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 3.2s ease-in-out infinite',
      },
      transitionTimingFunction: {
        silk: 'cubic-bezier(.22,1,.36,1)',
      },
    },
  },
  plugins: [],
}
