import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TargetType = 'user' | 'post' | 'comment' | 'story';

// GET /api/admin/reports?status=open — the queue, with each report's target
// resolved so the reviewer can see what they're actually looking at.
export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { svc } = session;

  const status = request.nextUrl.searchParams.get('status') ?? 'open';

  const { data: rows, error } = await svc
    .from('reports')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const reports = rows ?? [];

  // Resolve reporters and targets in bulk rather than per row.
  const profileIds = new Set<string>();
  for (const r of reports) {
    if (r.reporter_id) profileIds.add(r.reporter_id);
    if (r.target_type === 'user') profileIds.add(r.target_id);
  }
  const postIds = reports.filter((r) => r.target_type === 'post').map((r) => r.target_id);
  const commentIds = reports.filter((r) => r.target_type === 'comment').map((r) => r.target_id);
  const storyIds = reports.filter((r) => r.target_type === 'story').map((r) => r.target_id);

  const [{ data: profiles }, { data: posts }, { data: comments }, { data: stories }] = await Promise.all([
    profileIds.size
      ? svc.from('profiles').select('id, username, name, avatar, suspended').in('id', Array.from(profileIds))
      : Promise.resolve({ data: [] as any[] }),
    postIds.length
      ? svc.from('posts').select('id, text, media, author_id').in('id', postIds)
      : Promise.resolve({ data: [] as any[] }),
    commentIds.length
      ? svc.from('comments').select('id, text, author_id').in('id', commentIds)
      : Promise.resolve({ data: [] as any[] }),
    storyIds.length
      ? svc.from('stories').select('id, media, author_id').in('id', storyIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const byId = <T extends { id: string }>(rows: T[] | null) =>
    Object.fromEntries((rows ?? []).map((r) => [r.id, r]));
  const P = byId(profiles), Po = byId(posts), C = byId(comments), S = byId(stories);

  const describe = (type: TargetType, id: string) => {
    if (type === 'user') { const u = P[id]; return u && { kind: 'user', ...u }; }
    if (type === 'post') { const p = Po[id]; return p && { kind: 'post', text: p.text, media: p.media, author: P[p.author_id] ?? { id: p.author_id } }; }
    if (type === 'comment') { const c = C[id]; return c && { kind: 'comment', text: c.text, author: P[c.author_id] ?? { id: c.author_id } }; }
    const s = S[id];
    return s && { kind: 'story', media: s.media, author: P[s.author_id] ?? { id: s.author_id } };
  };

  return NextResponse.json({
    reports: reports.map((r) => ({
      id: r.id,
      targetType: r.target_type as TargetType,
      targetId: r.target_id,
      reason: r.reason,
      note: r.note ?? '',
      status: r.status,
      createdAt: Date.parse(r.created_at),
      reporter: r.reporter_id ? P[r.reporter_id] ?? null : null,
      // null when the content is already gone — deleted between report and review
      target: describe(r.target_type, r.target_id) ?? null,
    })),
  });
}

// POST /api/admin/reports  { id, status: 'actioned' | 'dismissed' }
export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id, status } = await request.json();
  if (typeof id !== 'string' || (status !== 'actioned' && status !== 'dismissed')) {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  const { error } = await session.svc
    .from('reports')
    .update({ status, resolved_by: session.userId, resolved_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
