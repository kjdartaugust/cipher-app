// Central config + demo-mode detection.
// When Supabase env vars are missing or left as the example placeholders,
// Cipher runs in fully-local DEMO MODE: seeded data persisted to localStorage,
// real client-side libsodium encryption, and mocked realtime.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const PLACEHOLDER_URL = 'https://your-project.supabase.co';
const PLACEHOLDER_KEY = 'your-anon-key';

export const IS_DEMO =
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  SUPABASE_URL === PLACEHOLDER_URL ||
  SUPABASE_ANON_KEY === PLACEHOLDER_KEY;

export const BRAND = {
  name: 'Cipher',
  tagline: 'Private. Encrypted. Social.',
  colors: {
    ink: '#0A0A0A',
    purple: '#7C3AED',
    soft: '#F9FAFB',
  },
};
