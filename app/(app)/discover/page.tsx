'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, TrendingUp, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { Avatar } from '@/components/ui/avatar';
import { VerifiedBadge } from '@/components/post/post-card';
import { useApp } from '@/lib/store';
import { cn, compactNumber } from '@/lib/utils';
import type { User } from '@/lib/types';

const MOODS = ['🔥', '✨', '🌙', '🎧', '💜', '☕', '🛰️', '📡', '🧠', '🫧'];
const moodFor = (id: string) => MOODS[id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % MOODS.length];

type Presence = 'online' | 'chatting' | 'away';
const RING: Record<Presence, string> = {
  online: 'shadow-[0_0_0_2px_#000,0_0_0_4px_#22c55e]',
  chatting: 'shadow-[0_0_0_2px_#000,0_0_0_4px_#6D28D9]',
  away: 'shadow-[0_0_0_2px_#000,0_0_0_4px_#3f3f46]',
};
const PRESENCE_LABEL: Record<Presence, string> = { online: 'online now', chatting: 'in a Cipher', away: 'away' };

export default function PulsePage() {
  const { users, posts, me, blocked, toggleFollow, messages, presence } = useApp();
  const [query, setQuery] = useState('');
  const liveMode = Object.keys(presence).length > 0;

  function presenceOf(u: User): Presence {
    // Prefer real Supabase Realtime presence; fall back to a heuristic in demo mode.
    const live = presence[u.id];
    if (live) return live.status;
    if (liveMode) return 'away';
    const recentlyMessaged = messages.some((m) => m.senderId === u.id && Date.now() - m.createdAt < 4 * 60_000);
    if (u.online && recentlyMessaged) return 'chatting';
    if (u.online) return 'online';
    return 'away';
  }

  const people = useMemo(
    () => users.filter((u) => u.id !== me.id && !blocked.includes(u.id)),
    [users, me.id, blocked]
  );

  // Your connections = people you follow, or who follow you. Only these are
  // browsable; everyone else is reachable solely by searching their username.
  const connections = useMemo(
    () => people.filter((u) => me.following.includes(u.id) || u.followers.includes(me.id)),
    [people, me.following, me.id]
  );

  // Search is the only way to discover new people — match by username (or name).
  const q = query.trim().toLowerCase();
  const results = q.length >= 2
    ? people.filter((u) => u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))
    : [];

  const rank = (u: User) => (presence[u.id] ? 2 : liveMode ? 0 : u.online ? 1 : 0);
  const live = useMemo(
    () => [...connections].sort((a, b) => rank(b) - rank(a)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connections, presence]
  );

  // Trending is limited to your network so Pulse never surfaces strangers.
  const networkIds = useMemo(() => new Set([me.id, ...connections.map((u) => u.id)]), [me.id, connections]);
  const trending = useMemo(
    () => posts.filter((p) => networkIds.has(p.authorId)).sort((a, b) => (b.trendingScore ?? 0) - (a.trendingScore ?? 0)).slice(0, 4),
    [posts, networkIds]
  );

  const latestPost = (id: string) => posts.filter((p) => p.authorId === id).sort((a, b) => b.createdAt - a.createdAt)[0];

  return (
    <div className="mx-auto max-w-2xl border-x border-white/10">
      <PageHeader kicker="Live" title="Pulse" />

      <div className="p-5 sm:p-8">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a username to connect" className="input pl-11" />
        </div>
        <p className="mb-7 px-1 text-xs text-white/35">People aren&apos;t public on Cipher — you can only find someone by their username.</p>

        {query.trim() ? (
          <div className="space-y-1">
            <p className="kicker mb-2">{q.length < 2 ? 'Keep typing a username…' : `${results.length} result${results.length !== 1 ? 's' : ''}`}</p>
            {results.map((u) => (
              <PersonRow key={u.id} u={u} following={me.following.includes(u.id)} onFollow={() => toggleFollow(u.id)} presence={presenceOf(u)} />
            ))}
            {q.length >= 2 && results.length === 0 && <p className="py-8 text-center text-sm text-white/40">No one matches that username.</p>}
          </div>
        ) : (
          <>
            {/* live presence grid — your connections only */}
            <section className="mb-9">
              <p className="kicker mb-4">Your circle · right now</p>
              {live.length === 0 && (
                <p className="rounded-2xl border border-white/10 bg-surface/40 px-4 py-8 text-center text-sm text-white/40">
                  No connections yet. Search a username above to add someone.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {live.map((u) => {
                  const presence = presenceOf(u);
                  const post = latestPost(u.id);
                  return (
                    <motion.div
                      key={u.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center rounded-2xl border border-white/10 bg-surface/60 p-4 text-center"
                    >
                      <Link href={`/u/${u.username}`} className="relative">
                        <span className={cn('block rounded-full', RING[presence])}>
                          <Avatar src={u.avatar} alt={u.name} size={62} />
                        </span>
                        <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-black text-base">
                          {moodFor(u.id)}
                        </span>
                      </Link>
                      <Link href={`/u/${u.username}`} className="mt-3 flex items-center gap-1">
                        <span className="truncate text-sm font-semibold">{u.name}</span>
                        {u.verified && <VerifiedBadge />}
                      </Link>
                      <p className={cn('text-[11px] font-medium uppercase tracking-wide', presence === 'online' ? 'text-green-400' : presence === 'chatting' ? 'text-violet-300' : 'text-white/35')}>
                        {PRESENCE_LABEL[presence]}
                      </p>
                      {post && <p className="mt-1.5 line-clamp-2 text-xs text-white/45">{post.text || '📷 shared a moment'}</p>}
                    </motion.div>
                  );
                })}
              </div>
            </section>

            {/* trending — limited to your network */}
            {trending.length > 0 && (
              <section>
                <p className="kicker mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-violet-400" /> Trending in your circle</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {trending.map((p, i) => {
                    const a = users.find((u) => u.id === p.authorId)!;
                    return (
                      <Link key={p.id} href={`/u/${a.username}`} className="group relative aspect-square overflow-hidden rounded-xl bg-surface">
                        {p.media?.[0]
                          ? // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.media[0].url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                          : <div className="flex h-full items-center p-2 text-xs text-white/70">{p.text}</div>}
                        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-violet-300">#{i + 1}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PersonRow({ u, following, onFollow, presence }: { u: User; following: boolean; onFollow: () => void; presence: Presence }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.04]">
      <Link href={`/u/${u.username}`}>
        <span className={cn('block rounded-full', RING[presence])}>
          <Avatar src={u.avatar} alt={u.name} size={46} />
        </span>
      </Link>
      <Link href={`/u/${u.username}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate text-sm font-semibold">{u.name}</span>
          {u.verified && <VerifiedBadge />}
        </div>
        <p className="truncate text-xs text-white/40">@{u.username} · {compactNumber(u.followers.length)} followers</p>
      </Link>
      {!following && (
        <button onClick={onFollow} className="btn-primary px-3 py-1.5 text-xs"><UserPlus className="h-3.5 w-3.5" /> Add</button>
      )}
    </div>
  );
}
