'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, TrendingUp, UserCheck, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { Avatar } from '@/components/ui/avatar';
import { VerifiedBadge } from '@/components/post/post-card';
import { useApp } from '@/lib/store';
import { compactNumber } from '@/lib/utils';

export default function DiscoverPage() {
  const { users, posts, me, toggleFollow } = useApp();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return users.filter(
      (u) => u.id !== me.id && (u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
    );
  }, [query, users, me.id]);

  const trending = useMemo(
    () => [...posts].sort((a, b) => (b.trendingScore ?? 0) - (a.trendingScore ?? 0)).slice(0, 6),
    [posts]
  );

  const suggested = users.filter((u) => u.id !== me.id && !me.following.includes(u.id));

  return (
    <div className="mx-auto max-w-2xl border-x border-white/5">
      <PageHeader kicker="Explore" title="Discover" />

      <div className="p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people and @usernames"
            className="input pl-11"
          />
        </div>
      </div>

      {query.trim() ? (
        <div className="px-4 pb-4">
          <h2 className="mb-2 text-sm font-semibold text-white/50">
            {results.length} result{results.length !== 1 && 's'}
          </h2>
          <div className="space-y-1">
            {results.map((u) => (
              <PersonRow key={u.id} user={u} following={me.following.includes(u.id)} onFollow={() => toggleFollow(u.id)} />
            ))}
            {results.length === 0 && <p className="py-8 text-center text-sm text-white/40">No people found.</p>}
          </div>
        </div>
      ) : (
        <>
          {/* trending */}
          <section className="px-4 pb-6">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <TrendingUp className="h-5 w-5 text-cipher-400" /> Trending posts
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {trending.map((p, i) => {
                const author = users.find((u) => u.id === p.authorId)!;
                return (
                  <Link
                    key={p.id}
                    href={`/u/${author.username}`}
                    className="group relative aspect-square overflow-hidden rounded-xl bg-white/5"
                  >
                    {p.media?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.media[0].url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center p-3 text-sm text-white/70">{p.text}</div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="flex items-center gap-1 text-xs font-semibold text-white">
                        <span className="grid h-4 w-4 place-items-center rounded-full bg-cipher-600 text-[9px]">{i + 1}</span>
                        ♥ {compactNumber(p.likes.length)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* suggested */}
          <section className="px-4 pb-8">
            <h2 className="mb-3 font-semibold">Suggested friends</h2>
            <div className="space-y-1">
              {suggested.map((u) => (
                <PersonRow key={u.id} user={u} following={me.following.includes(u.id)} onFollow={() => toggleFollow(u.id)} />
              ))}
              {suggested.length === 0 && <p className="py-6 text-center text-sm text-white/40">You follow everyone already 🎉</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function PersonRow({
  user,
  following,
  onFollow,
}: {
  user: ReturnType<typeof useApp>['users'][number];
  following: boolean;
  onFollow: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5">
      <Link href={`/u/${user.username}`}>
        <Avatar src={user.avatar} alt={user.name} size={48} online={user.online} />
      </Link>
      <Link href={`/u/${user.username}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate font-medium hover:underline">{user.name}</span>
          {user.verified && <VerifiedBadge />}
        </div>
        <p className="truncate text-xs text-white/40">@{user.username} · {compactNumber(user.followers.length)} followers</p>
      </Link>
      <button onClick={onFollow} className={following ? 'btn-ghost px-3 py-1.5 text-xs' : 'btn-primary px-3 py-1.5 text-xs'}>
        {following ? <><UserCheck className="h-3.5 w-3.5" /> Following</> : <><UserPlus className="h-3.5 w-3.5" /> Follow</>}
      </button>
    </motion.div>
  );
}
