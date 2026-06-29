'use client';

import { IS_DEMO } from '@/lib/config';
import { DemoProvider } from '@/lib/store';
import { SupabaseProvider } from '@/lib/store-supabase';

export function Providers({ children }: { children: React.ReactNode }) {
  // Demo mode = seeded localStorage store; otherwise the live Supabase-backed store.
  const Provider = IS_DEMO ? DemoProvider : SupabaseProvider;
  return <Provider>{children}</Provider>;
}
