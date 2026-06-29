'use client';

import { createBrowserClient } from '@supabase/ssr';
import { IS_DEMO, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/config';

export function createClient() {
  if (IS_DEMO) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
