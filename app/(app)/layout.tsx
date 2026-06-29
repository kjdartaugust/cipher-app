import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { IS_DEMO } from '@/lib/config';
import { createClient } from '@/lib/supabase/server';

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  // In production (Supabase) mode, require an authenticated session.
  if (!IS_DEMO) {
    const supabase = createClient();
    const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
    if (!data.user) redirect('/login');
  }
  return <AppShell>{children}</AppShell>;
}
