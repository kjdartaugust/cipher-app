import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DAY = 86_400_000;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { svc } = session;

  // count-only queries: head:true sends no rows over the wire, just the count
  const count = async (
    table: string,
    build?: (q: any) => any
  ): Promise<number> => {
    let q = svc.from(table).select('*', { count: 'exact', head: true });
    if (build) q = build(q);
    const { count: c } = await q;
    return c ?? 0;
  };

  const [
    users, newUsers7, newUsers30, suspended, admins,
    active24h, active7d,
    conversations, groups,
    messages, messages7,
    calls,
    posts, posts7, comments,
    storiesLive,
    reportsOpen,
    pushSubs,
  ] = await Promise.all([
    count('profiles'),
    count('profiles', (q) => q.gte('created_at', iso(7 * DAY))),
    count('profiles', (q) => q.gte('created_at', iso(30 * DAY))),
    count('profiles', (q) => q.eq('suspended', true)),
    count('profiles', (q) => q.eq('is_admin', true)),
    // last_seen_at is what makes DAU/WAU possible at all — before it we had no
    // record of anyone who wasn't connected this instant. Note it undercounts
    // by design: Invisible users stop updating it.
    count('profiles', (q) => q.gte('last_seen_at', iso(DAY))),
    count('profiles', (q) => q.gte('last_seen_at', iso(7 * DAY))),
    count('conversations'),
    count('conversations', (q) => q.eq('is_group', true)),
    // counts only. There is no admin view of message content and cannot be.
    count('messages'),
    count('messages', (q) => q.gte('created_at', iso(7 * DAY))),
    count('messages', (q) => q.eq('kind', 'call')),
    count('posts'),
    count('posts', (q) => q.gte('created_at', iso(7 * DAY))),
    count('comments'),
    count('stories', (q) => q.gt('expires_at', new Date().toISOString())),
    count('reports', (q) => q.eq('status', 'open')),
    count('push_subscriptions'),
  ]);

  // signups + messages per day for the last 30 days, bucketed here rather than
  // in SQL — at this scale it's two small selects and avoids a stored proc.
  const since = iso(30 * DAY);
  const [{ data: signupRows }, { data: msgRows }] = await Promise.all([
    svc.from('profiles').select('created_at').gte('created_at', since),
    svc.from('messages').select('created_at').gte('created_at', since),
  ]);

  const bucket = (rows: { created_at: string }[] | null) => {
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) days[new Date(Date.now() - i * DAY).toISOString().slice(0, 10)] = 0;
    for (const r of rows ?? []) {
      const k = r.created_at.slice(0, 10);
      if (k in days) days[k]++;
    }
    return Object.entries(days).map(([date, n]) => ({ date, n }));
  };

  return NextResponse.json({
    users: { total: users, new7: newUsers7, new30: newUsers30, suspended, admins },
    activity: { active24h, active7d },
    messaging: { conversations, groups, messages, messages7, calls },
    content: { posts, posts7, comments, storiesLive },
    moderation: { reportsOpen },
    push: { subscriptions: pushSubs },
    series: { signups: bucket(signupRows), messages: bucket(msgRows) },
    generatedAt: Date.now(),
  });
}
