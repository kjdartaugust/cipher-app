'use client';

import { useMemo, useState } from 'react';
import { PenSquare } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { StoriesBar } from '@/components/story/stories-bar';
import { PostCard } from '@/components/post/post-card';
import { RightRail } from '@/components/shell/right-rail';
import { useCompose } from '@/components/shell/app-shell';
import { useApp } from '@/lib/store';

type Tab = 'for-you' | 'following';

export default function FeedPage() {
  const { posts, me } = useApp();
  const compose = useCompose();
  const [tab, setTab] = useState<Tab>('for-you');

  const sorted = useMemo(() => {
    const list = [...posts];
    if (tab === 'following') {
      return list
        .filter((p) => me.following.includes(p.authorId) || p.authorId === me.id)
        .sort((a, b) => b.createdAt - a.createdAt);
    }
    // "algorithmic" For You: blend recency, engagement and follow affinity
    return list.sort((a, b) => score(b) - score(a));

    function score(p: (typeof list)[number]) {
      const ageHours = (Date.now() - p.createdAt) / 3_600_000;
      const engagement = p.likes.length * 3 + p.comments.length * 4 + p.shares * 2;
      const affinity = me.following.includes(p.authorId) ? 25 : 0;
      return engagement + affinity + (p.trendingScore ?? 0) * 0.5 - ageHours * 1.5;
    }
  }, [posts, tab, me.following]);

  return (
    <div className="flex">
      <div className="mx-auto w-full max-w-[600px] border-x border-white/5">
        <PageHeader
          title="Home"
          action={
            <button onClick={compose} className="rounded-full p-2 text-cipher-300 hover:bg-white/10 lg:hidden">
              <PenSquare className="h-5 w-5" />
            </button>
          }
        >
          <div className="flex">
            {(['for-you', 'following'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative flex-1 py-3 text-sm font-medium transition ${
                  tab === t ? 'text-white' : 'text-white/45 hover:text-white/70'
                }`}
              >
                {t === 'for-you' ? 'For you' : 'Following'}
                {tab === t && <span className="absolute inset-x-0 bottom-0 mx-auto h-0.5 w-12 rounded-full bg-cipher-gradient" />}
              </button>
            ))}
          </div>
        </PageHeader>

        <StoriesBar />

        <div className="space-y-4 p-4">
          {sorted.map((p) => (
            <PostCard key={p.id} post={p} trending={tab === 'for-you' && (p.trendingScore ?? 0) >= 90} />
          ))}
          {sorted.length === 0 && (
            <p className="py-16 text-center text-sm text-white/40">
              Follow people to see their posts here.
            </p>
          )}
        </div>
      </div>

      <RightRail />
    </div>
  );
}
