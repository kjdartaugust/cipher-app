'use client';

import { useMemo, useState } from 'react';
import { PenSquare } from 'lucide-react';
import { LayoutGrid, Rows3 } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { StoriesBar } from '@/components/story/stories-bar';
import { PostCard } from '@/components/post/post-card';
import { TodayBoard } from '@/components/feed/today-board';
import { RightRail } from '@/components/shell/right-rail';
import { useCompose } from '@/components/shell/app-shell';
import { useApp } from '@/lib/store';

type Tab = 'for-you' | 'following';

export default function FeedPage() {
  const { posts, me, blocked } = useApp();
  const compose = useCompose();
  const [view, setView] = useState<'board' | 'list'>('board');
  const [tab, setTab] = useState<Tab>('for-you');

  const sorted = useMemo(() => {
    const list = posts.filter((p) => !blocked.includes(p.authorId));
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
  }, [posts, tab, me.following, blocked]);

  return (
    <div className="flex">
      <div className="mx-auto w-full max-w-[640px] border-x border-white/10">
        <PageHeader
          kicker="The Cipher"
          title="Today"
          action={
            <div className="flex items-center gap-1">
              <button
                onClick={() => setView(view === 'board' ? 'list' : 'board')}
                aria-label="Toggle layout"
                className="rounded-full p-2 text-white/60 hover:bg-white/10"
              >
                {view === 'board' ? <Rows3 className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
              </button>
              <button onClick={compose} className="rounded-full p-2 text-violet-300 hover:bg-white/10">
                <PenSquare className="h-5 w-5" />
              </button>
            </div>
          }
        >
          <div className="flex items-center gap-6 px-5 pb-3 sm:px-8">
            {(['for-you', 'following'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`kicker !text-xs transition ${
                  tab === t ? '!text-cipher-300' : 'hover:!text-white/70'
                }`}
              >
                {t === 'for-you' ? 'For you' : 'Following'}
              </button>
            ))}
          </div>
        </PageHeader>

        <StoriesBar />

        {view === 'board' ? (
          <TodayBoard posts={sorted} />
        ) : (
          <div className="px-5 sm:px-8">
            {sorted.map((p) => (
              <PostCard key={p.id} post={p} trending={tab === 'for-you' && (p.trendingScore ?? 0) >= 90} />
            ))}
            {sorted.length === 0 && (
              <p className="py-16 text-center text-sm text-white/40">
                Follow people to see their posts here.
              </p>
            )}
          </div>
        )}
      </div>

      <RightRail />
    </div>
  );
}
