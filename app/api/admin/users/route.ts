import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/users?q=  — search / list
export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const q = (request.nextUrl.searchParams.get('q') ?? '').trim();

  let query = session.svc
    .from('profiles')
    .select('id, username, name, avatar, verified, is_admin, suspended, suspended_at, suspended_reason, last_seen_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (q) query = query.or(`username.ilike.%${q}%,name.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    users: (data ?? []).map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      avatar: u.avatar,
      verified: u.verified,
      isAdmin: u.is_admin,
      suspended: u.suspended,
      suspendedAt: u.suspended_at ? Date.parse(u.suspended_at) : null,
      suspendedReason: u.suspended_reason ?? '',
      lastSeenAt: u.last_seen_at ? Date.parse(u.last_seen_at) : null,
      createdAt: Date.parse(u.created_at),
    })),
  });
}

// POST /api/admin/users  { userId, suspended, reason? }  — suspend / reinstate
export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { svc, userId: adminId } = session;

  const { userId, suspended, reason } = await request.json();
  if (typeof userId !== 'string' || typeof suspended !== 'boolean') {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  // Two guards that exist so a single compromised or careless admin account
  // can't take the whole thing down: you cannot suspend yourself, and you
  // cannot suspend another admin. Demoting an admin is a deliberate act that
  // happens in the SQL editor, not a button.
  if (userId === adminId) {
    return NextResponse.json({ error: 'You cannot suspend yourself.' }, { status: 400 });
  }

  const { data: target } = await svc.from('profiles').select('is_admin').eq('id', userId).single();
  if (!target) return NextResponse.json({ error: 'No such user.' }, { status: 404 });
  if (target.is_admin) {
    return NextResponse.json({ error: 'Admins cannot be suspended from here.' }, { status: 400 });
  }

  const { error } = await svc
    .from('profiles')
    .update({
      suspended,
      suspended_at: suspended ? new Date().toISOString() : null,
      suspended_reason: suspended ? (typeof reason === 'string' ? reason.slice(0, 500) : '') : null,
    })
    .eq('id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
