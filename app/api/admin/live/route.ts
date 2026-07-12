import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/live — system health, a tail of recent activity, and the
// client error log. The "is it broken right now" view.
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { svc } = session;

  // Config checks. These report what the *server* believes is configured; they
  // don't prove a call will connect, only that we'd have credentials to try.
  const health = {
    turn: !!process.env.CLOUDFLARE_TURN_KEY_ID && !!process.env.CLOUDFLARE_TURN_API_TOKEN,
    push: !!process.env.VAPID_PRIVATE_KEY && !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    serviceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const [{ data: errors }, { data: signups }, { data: posts }, { data: calls }, { data: convos }] =
    await Promise.all([
      svc.from('client_errors').select('*').order('created_at', { ascending: false }).limit(30),
      svc.from('profiles').select('id, username, name, avatar, created_at').order('created_at', { ascending: false }).limit(8),
      svc.from('posts').select('id, text, author_id, created_at').order('created_at', { ascending: false }).limit(8),
      // Calls are messages with kind='call'. We can see that a call happened and
      // between whom — the summary itself is ciphertext, so no duration here.
      svc.from('messages').select('id, sender_id, conversation_id, created_at').eq('kind', 'call').order('created_at', { ascending: false }).limit(8),
      svc.from('conversations').select('id, is_group, name, last_message_at').order('last_message_at', { ascending: false }).limit(8),
    ]);

  // Resolve the names behind the ids in one shot.
  const ids = new Set<string>();
  for (const e of errors ?? []) if (e.user_id) ids.add(e.user_id);
  for (const p of posts ?? []) if (p.author_id) ids.add(p.author_id);
  for (const c of calls ?? []) if (c.sender_id) ids.add(c.sender_id);

  const { data: people } = ids.size
    ? await svc.from('profiles').select('id, username, name, avatar').in('id', Array.from(ids))
    : { data: [] as any[] };
  const P = Object.fromEntries((people ?? []).map((p) => [p.id, p]));

  return NextResponse.json({
    health,
    errors: (errors ?? []).map((e) => ({
      id: e.id,
      message: e.message,
      stack: e.stack,
      url: e.url,
      userAgent: e.user_agent,
      createdAt: Date.parse(e.created_at),
      user: e.user_id ? P[e.user_id] ?? null : null,
    })),
    recent: {
      signups: (signups ?? []).map((s) => ({ ...s, createdAt: Date.parse(s.created_at) })),
      posts: (posts ?? []).map((p) => ({
        id: p.id,
        text: p.text,
        createdAt: Date.parse(p.created_at),
        author: P[p.author_id] ?? null,
      })),
      calls: (calls ?? []).map((c) => ({
        id: c.id,
        createdAt: Date.parse(c.created_at),
        caller: P[c.sender_id] ?? null,
      })),
      conversations: (convos ?? []).map((c) => ({
        id: c.id,
        isGroup: c.is_group,
        name: c.name,
        lastMessageAt: c.last_message_at ? Date.parse(c.last_message_at) : null,
      })),
    },
    generatedAt: Date.now(),
  });
}
