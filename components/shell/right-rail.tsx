'use client';

import Link from 'next/link';
import { Search, ShieldCheck, TrendingUp } from 'lucide-react';
import { useApp } from '@/lib/store';
import { compactNumber } from '@/lib/utils';

export function RightRail() {
  const { users, posts, me, blocked } = useApp();

  // Only your network — Cipher never suggests strangers.
  const networkIds = new Set([
    me.id,
    ...users.filter((u) => me.following.includes(u.id) || u.followers.includes(me.id)).map((u) => u.id),
  ]);

  const trending = [...posts]
    .filter((p) => networkIds.has(p.authorId) && !blocked.includes(p.authorId))
    .sort((a, b) => (b.trendingScore ?? 0) - (a.trendingScore ?? 0))
    .slice(0, 3);

  return (
    <aside className="sticky top-0 hidden h-screen w-[320px] shrink-0 flex-col gap-4 overflow-y-auto px-4 py-6 xl:flex">
      <Link href="/discover" className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <div className="input pl-11 text-white/40">Search Cipher</div>
      </Link>

      {trending.length > 0 && (
        <div className="card">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <TrendingUp className="h-4 w-4 text-cipher-400" /> Trending in your circle
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
      )}

      <div className="card">
        <h3 className="mb-1 font-semibold">Private by default</h3>
        <p className="text-xs text-white/50">
          People can&apos;t browse you on Cipher. You&apos;re only discoverable to someone who knows your username.
        </p>
        <Link href="/discover" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-cipher-300">
          <Search className="h-3.5 w-3.5" /> Find someone by username
        </Link>
      </div>

      <div className="flex items-center gap-2 px-2 text-xs text-white/30">
        <ShieldCheck className="h-3.5 w-3.5" /> Messages are end-to-end encrypted.
      </div>
    </aside>
  );
}
