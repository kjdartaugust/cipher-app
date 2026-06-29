'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
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

  return (
    <>
      <div className="no-scrollbar flex gap-4 overflow-x-auto border-b border-white/5 px-4 py-4 sm:px-6">
        {/* your story / add */}
        <button
          onClick={() => {
            const idx = flat.findIndex((s) => s.authorId === me.id);
            if (idx >= 0) setActiveIndex(idx);
          }}
          className="flex w-16 shrink-0 flex-col items-center gap-1.5"
        >
          <span className="relative">
            <Avatar src={me.avatar} alt="Your story" size={62} ring={grouped[0]?.author.id === me.id} />
            <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-ink bg-cipher-600">
              <Plus className="h-3 w-3 text-white" />
            </span>
          </span>
          <span className="truncate text-xs text-white/60">Your story</span>
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
                className="flex w-16 shrink-0 flex-col items-center gap-1.5"
              >
                <span className={seen ? 'rounded-full p-[2px] opacity-60' : ''}>
                  <Avatar src={g.author.avatar} alt={g.author.name} size={62} ring={!seen} />
                </span>
                <span className="truncate text-xs text-white/60">{g.author.username}</span>
              </button>
            );
          })}
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
