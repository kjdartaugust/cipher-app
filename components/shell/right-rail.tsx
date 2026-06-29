'use client';

import Link from 'next/link';
import { Search, ShieldCheck, TrendingUp } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { VerifiedBadge } from '@/components/post/post-card';
import { useApp } from '@/lib/store';
import { compactNumber } from '@/lib/utils';

export function RightRail() {
  const { users, posts, me, toggleFollow } = useApp();

  const suggestions = users
    .filter((u) => u.id !== me.id && !me.following.includes(u.id))
    .slice(0, 3);

  const trending = [...posts]
    .sort((a, b) => (b.trendingScore ?? 0) - (a.trendingScore ?? 0))
    .slice(0, 3);

  return (
    <aside className="sticky top-0 hidden h-screen w-[320px] shrink-0 flex-col gap-4 overflow-y-auto px-4 py-6 xl:flex">
      <Link href="/discover" className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <div className="input pl-11 text-white/40">Search Cipher</div>
      </Link>

      <div className="card">
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <TrendingUp className="h-4 w-4 text-cipher-400" /> Trending now
        </h3>
        <div className="space-y-3">
          {trending.map((p, i) => {
            const author = users.find((u) => u.id === p.authorId)!;
            return (
              <Link key={p.id} href="/discover" className="block">
                <p className="text-xs text-white/40">#{i + 1} · {compactNumber(p.likes.length)} likes</p>
                <p className="line-clamp-2 text-sm text-white/80">{p.text || `Post by @${author.username}`}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 className="mb-3 font-semibold">Suggested for you</h3>
        <div className="space-y-3">
          {suggestions.map((u) => (
            <div key={u.id} className="flex items-center gap-3">
              <Link href={`/u/${u.username}`}>
                <Avatar src={u.avatar} alt={u.name} size={40} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/u/${u.username}`} className="flex items-center gap-1">
                  <span className="truncate text-sm font-medium hover:underline">{u.name}</span>
                  {u.verified && <VerifiedBadge />}
                </Link>
                <p className="truncate text-xs text-white/40">@{u.username}</p>
              </div>
              <button
                onClick={() => toggleFollow(u.id)}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-cipher-600"
              >
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 px-2 text-xs text-white/30">
        <ShieldCheck className="h-3.5 w-3.5" /> Messages are end-to-end encrypted.
      </div>
    </aside>
  );
}
