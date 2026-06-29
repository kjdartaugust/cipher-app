import type { Config } from 'tailwindcss';

// Cipher identity: pure black/white + a single electric-violet accent.
// Both the legacy `cipher` scale and the `blue` alias map to violet so every
// existing class name (text-cipher-300, bg-blue, bg-cipher-gradient, …)
// inherits the accent without touching each component.
const BLUE = '#6D28D9';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#000000',
        soft: '#FFFFFF',
        blue: {
          DEFAULT: BLUE,
          50: '#F5F3FF',
          100: '#EDE9FE',
          300: '#A78BFA',
          400: '#8B5CF6',
          500: '#7C3AED',
          600: BLUE,
          700: '#5B21B6',
        },
        violet: {
          DEFAULT: BLUE,
          300: '#A78BFA',
          400: '#8B5CF6',
          500: '#7C3AED',
          600: BLUE,
        },
        // Apple dark elevated surfaces
        surface: '#1C1C1E',
        surface2: '#2C2C2E',
        hairline: 'rgba(255,255,255,0.10)',
        // legacy alias -> blue, so all existing cipher-* classes become blue
        cipher: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#A78BFA',
          400: '#8B5CF6',
          500: '#7C3AED',
          600: BLUE,
          700: '#5B21B6',
          800: '#4C1D95',
          900: '#4C1D95',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        // display now uses Inter too (no serif) for the SF Pro Display feel
        display: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.03em',
      },
      backgroundImage: {
        // gradients flattened to solid blue / nothing
        'cipher-gradient': `linear-gradient(${BLUE}, ${BLUE})`,
        'cipher-radial': 'none',
      },
      boxShadow: {
        apple: '0 1px 3px rgba(0,0,0,0.08)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
