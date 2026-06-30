import type { Config } from 'tailwindcss';

// Cipher · Quasar identity — deep space + a blazing accretion-disk accent that
// sweeps cyan → violet → magenta. Legacy `cipher`/`blue` aliases map onto the
// palette so existing class names inherit the new look.
const CYAN = '#22D3EE';
const VIOLET = '#7C3AED';
const MAGENTA = '#D946EF';
const COREBLUE = '#4F8BFF';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#05060F',        // deep space
        soft: '#FFFFFF',
        core: '#DCE8FF',       // blue-white quasar core
        cyan: { DEFAULT: CYAN, 300: '#67E8F9', 400: '#22D3EE', 500: '#06B6D4' },
        magenta: { DEFAULT: MAGENTA, 300: '#F0ABFC', 400: '#E879F9', 500: '#D946EF' },
        // accent alias → violet anchor (kept for continuity)
        blue: { DEFAULT: VIOLET, 50: '#F5F3FF', 100: '#EDE9FE', 300: '#A78BFA', 400: '#8B5CF6', 500: '#7C3AED', 600: VIOLET, 700: '#5B21B6' },
        violet: { DEFAULT: VIOLET, 300: '#A78BFA', 400: '#8B5CF6', 500: '#7C3AED', 600: VIOLET },
        // deep-space panels (indigo-tinted, not flat grey)
        surface: '#0B0E1C',
        surface2: '#141A30',
        hairline: 'rgba(255,255,255,0.10)',
        cipher: { 50: '#F5F3FF', 100: '#EDE9FE', 200: '#DDD6FE', 300: '#A78BFA', 400: '#8B5CF6', 500: '#7C3AED', 600: VIOLET, 700: '#5B21B6', 800: '#4C1D95', 900: '#4C1D95' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      letterSpacing: { tightest: '-0.03em' },
      backgroundImage: {
        // accretion-disk sweep used for buttons, rings, gradient text
        'cipher-gradient': `linear-gradient(120deg, ${CYAN}, ${VIOLET} 55%, ${MAGENTA})`,
        'quasar-disk': `conic-gradient(from 0deg, ${CYAN}, ${COREBLUE}, ${VIOLET}, ${MAGENTA}, ${CYAN})`,
        'cipher-radial': 'none',
      },
      boxShadow: {
        apple: '0 1px 3px rgba(0,0,0,0.08)',
        quasar: '0 0 40px rgba(79,139,255,0.45), 0 0 90px rgba(217,70,239,0.25)',
      },
      transitionDuration: { DEFAULT: '150ms' },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s linear infinite',
        'spin-slow': 'spin 14s linear infinite',
        twinkle: 'twinkle 4s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.2' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
