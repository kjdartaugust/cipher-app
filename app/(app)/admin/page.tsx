import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase/admin';
import { AdminDashboard } from '@/components/admin/admin-dashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // Gated on the server. A non-admin never receives the page at all, and gets a
  // 404 rather than a 403 — no reason to confirm the route exists.
  const session = await requireAdmin();
  if (!session) notFound();

  return <AdminDashboard />;
}
