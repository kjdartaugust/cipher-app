import type { Config } from 'tailwindcss';

// Apple-style system: pure black/white + one electric-blue accent.
// The legacy `cipher` scale is remapped to blue so existing class names
// (text-cipher-300, bg-cipher-600, bg-cipher-gradient, …) inherit the new look
// without touching every component.
const BLUE = '#0A84FF';

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
          50: '#E6F2FF',
          100: '#CCE5FF',
          300: '#5AB0FF',
          400: '#409CFF',
          500: BLUE,
          600: BLUE,
          700: '#0066CC',
        },
        // Apple dark elevated surfaces
        surface: '#1C1C1E',
        surface2: '#2C2C2E',
        hairline: 'rgba(255,255,255,0.10)',
        // legacy alias -> blue, so all existing cipher-* classes become blue
        cipher: {
          50: '#E6F2FF',
          100: '#CCE5FF',
          200: '#99CCFF',
          300: '#5AB0FF',
          400: '#409CFF',
          500: BLUE,
          600: BLUE,
          700: '#0066CC',
          800: '#0A84FF',
          900: '#0066CC',
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
