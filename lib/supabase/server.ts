import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { IS_DEMO, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/config';

export function createClient() {
  if (IS_DEMO) return null;
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // called from a Server Component — safe to ignore when middleware refreshes sessions
        }
      },
    },
  });
}
