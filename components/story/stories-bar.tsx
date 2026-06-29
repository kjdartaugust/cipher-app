'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { StoryViewer } from './story-viewer';
import { useApp } from '@/lib/store';

export function StoriesBar() {
  const { stories, users, me, userById } = useApp();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // group active (non-expired) stories by author, "you" first
  const grouped = useMemo(() => {
    const live = stories.filter((s) => s.expiresAt > Date.now());
    const byAuthor = new Map<string, typeof live>();
    for (const s of live) {
      byAuthor.set(s.authorId, [...(byAuthor.get(s.authorId) ?? []), s]);
    }
    const authors = Array.from(byAuthor.keys());
    authors.sort((a, b) => (a === me.id ? -1 : b === me.id ? 1 : 0));
    return authors.map((id) => ({ author: userById(id), items: byAuthor.get(id)! }));
  }, [stories, me.id, userById, users]);

  const flat = grouped.flatMap((g) => g.items);

  const myStory = grouped.find((g) => g.author.id === me.id);

  return (
    <>
      <div className="border-b border-white/10 px-5 py-5 sm:px-8">
        <p className="kicker mb-3">Stories</p>
        <div className="no-scrollbar flex gap-3 overflow-x-auto">
          {/* your story / add */}
          <button
            onClick={() => {
              const idx = flat.findIndex((s) => s.authorId === me.id);
              if (idx >= 0) setActiveIndex(idx);
            }}
            className="group relative h-24 w-[68px] shrink-0 overflow-hidden rounded-xl border border-white/15"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={myStory?.items[0].media.url ?? me.avatar} alt="Your story" className="h-full w-full object-cover opacity-80" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <span className="absolute left-1/2 top-1.5 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full bg-cipher-600 ring-2 ring-ink">
              <Plus className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="absolute inset-x-1 bottom-1 truncate text-[10px] font-medium text-white">You</span>
          </button>

          {grouped
            .filter((g) => g.author.id !== me.id)
            .map((g) => {
              const startIdx = flat.findIndex((s) => s.id === g.items[0].id);
              const seen = g.items.every((s) => s.viewers.some((v) => v.userId === me.id));
              return (
                <button
                  key={g.author.id}
                  onClick={() => setActiveIndex(startIdx)}
                  className={`relative h-24 w-[68px] shrink-0 overflow-hidden rounded-xl border transition ${
                    seen ? 'border-white/10 opacity-60' : 'border-cipher-500'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.items[0].media.url} alt={g.author.name} className="h-full w-full object-cover" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                  <span className="absolute inset-x-1 bottom-1 truncate text-[10px] font-medium text-white">{g.author.username}</span>
                </button>
              );
            })}
        </div>
      </div>

      {activeIndex !== null && (
        <StoryViewer
          stories={flat}
          startIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
        />
      )}
    </>
  );
}
