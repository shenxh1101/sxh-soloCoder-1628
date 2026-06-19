/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
      },
    },
    extend: {
      colors: {
        cream: {
          50: '#FDFAF4',
          100: '#FDF6EC',
          200: '#F9EDD8',
          300: '#F2DFBB',
          400: '#E8CB93',
        },
        sage: {
          50: '#F1F4EF',
          100: '#DCE5D8',
          200: '#BCCEB5',
          300: '#9FB497',
          400: '#8B9D83',
          500: '#6F8368',
          600: '#576A51',
          700: '#475543',
        },
        terracotta: {
          50: '#FBF0EB',
          100: '#F5D9CD',
          200: '#EBB49C',
          300: '#E08D6B',
          400: '#D97757',
          500: '#C26142',
          600: '#A14F34',
        },
        petal: {
          50: '#FDF6F5',
          100: '#F2D7D5',
          200: '#E6B3AF',
          300: '#D98A84',
          400: '#CC6A63',
        },
        sky2: {
          50: '#F0F6FA',
          100: '#DCEAF3',
          200: '#B9D4E4',
          300: '#A8C5DA',
          400: '#8DAFCA',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'soft': '0 2px 12px -2px rgba(87, 106, 81, 0.08), 0 1px 4px -1px rgba(87, 106, 81, 0.04)',
        'soft-lg': '0 8px 30px -8px rgba(87, 106, 81, 0.12), 0 4px 12px -4px rgba(87, 106, 81, 0.06)',
        'card-hover': '0 12px 40px -12px rgba(87, 106, 81, 0.18), 0 6px 16px -6px rgba(87, 106, 81, 0.1)',
      },
      borderRadius: {
        'xl2': '1rem',
        '2xl2': '1.25rem',
        '3xl2': '1.5rem',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.4s ease-out both',
        'fade-in': 'fade-in 0.3s ease-out both',
        'shake': 'shake 0.4s ease-in-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
