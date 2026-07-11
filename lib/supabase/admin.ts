import 'server-only';
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js';
import { createClient as createUserClient } from './server';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

// Bypasses RLS. Server-only, never hand this to the browser.
export function serviceClient(): SupabaseClient | null {
  if (!SERVICE_KEY || !URL) return null;
  return createServiceClient(URL, SERVICE_KEY, { auth: { persistSession: false } });
}

export type AdminSession = { svc: SupabaseClient; userId: string };

// The single gate for everything under /admin and /api/admin.
//
// The admin check reads is_admin from the database on every request rather than
// trusting anything on the client or in the JWT: the flag can be revoked, and a
// stale token should not outlive that.
export async function requireAdmin(): Promise<AdminSession | null> {
  const svc = serviceClient();
  if (!svc) return null;

  const userClient = createUserClient();
  const { data } = (await userClient?.auth.getUser()) ?? { data: { user: null } };
  const user = data?.user;
  if (!user) return null;

  const { data: profile } = await svc
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return null;
  return { svc, userId: user.id };
}
