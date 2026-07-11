import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TABLES = { post: 'posts', comment: 'comments', story: 'stories' } as const;
type Kind = keyof typeof TABLES;

// POST /api/admin/content  { kind, id }  — take content down.
//
// Only reaches the tables that are actually plaintext. There is no 'message'
// kind and there never will be: an admin cannot read a message, so an admin
// deleting one on the basis of its content is not a thing that can happen.
export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { kind, id } = await request.json();
  if (typeof id !== 'string' || !(kind in TABLES)) {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  const { error } = await session.svc.from(TABLES[kind as Kind]).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
