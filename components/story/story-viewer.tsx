'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Eye, Heart, Send, X } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useApp } from '@/lib/store';
import type { Story } from '@/lib/types';
import { timeAgo } from '@/lib/utils';

const REACTIONS = ['❤️', '🔥', '😂', '😮', '👏', '💜'];
const DURATION = 5000;

export function StoryViewer({
  stories,
  startIndex,
  onClose,
}: {
  stories: Story[];
  startIndex: number;
  onClose: () => void;
}) {
  const { userById, me, viewStory } = useApp();
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const story = stories[index];
  const author = userById(story.authorId);
  const isMine = story.authorId === me.id;

  useEffect(() => {
    viewStory(story.id);
    setProgress(0);
  }, [index, story.id, viewStory]);

  useEffect(() => {
    if (paused || showViewers) return;
    const start = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / DURATION);
      setProgress(p);
      if (p >= 1) {
        clearInterval(id);
        if (index < stories.length - 1) setIndex(index + 1);
        else onClose();
      }
    }, 50);
    return () => clearInterval(id);
  }, [index, paused, showViewers, stories.length, onClose]);

  function prev() {
    if (index > 0) setIndex(index - 1);
  }
  function next() {
    if (index < stories.length - 1) setIndex(index + 1);
    else onClose();
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] grid place-items-center bg-black/90 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
          <X className="h-5 w-5" />
        </button>

        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative aspect-[9/16] max-h-[92vh] w-full max-w-[420px] overflow-hidden rounded-2xl bg-black"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
        >
          {/* progress bars */}
          <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-3">
            {stories.map((_, i) => (
              <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full bg-white"
                  style={{ width: i < index ? '100%' : i === index ? `${progress * 100}%` : '0%' }}
                />
              </div>
            ))}
          </div>

          <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2.5 px-3 pt-7">
            <Avatar src={author.avatar} alt={author.name} size={36} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{author.username}</p>
              <p className="text-xs text-white/60">{timeAgo(story.createdAt)}</p>
            </div>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={story.media.url} alt="" className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50" />

          {/* tap zones */}
          <button className="absolute inset-y-0 left-0 z-10 w-1/3" onClick={prev} aria-label="Previous" />
          <button className="absolute inset-y-0 right-0 z-10 w-1/3" onClick={next} aria-label="Next" />

          {/* footer */}
          <div className="absolute inset-x-0 bottom-0 z-20 p-3">
            {isMine ? (
              <button
                onClick={() => setShowViewers((s) => !s)}
                className="flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-sm text-white backdrop-blur"
              >
                <Eye className="h-4 w-4" /> {story.viewers.length} viewers
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-1 rounded-full bg-white/10 px-2 py-1.5 backdrop-blur">
                  {REACTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        viewStory(story.id, r);
                      }}
                      className="rounded-full px-1.5 text-lg transition hover:scale-125"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* reaction confirmation */}
          {!isMine && story.viewers.find((v) => v.userId === me.id)?.reaction && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute bottom-16 right-4 z-20 text-4xl"
            >
              {story.viewers.find((v) => v.userId === me.id)?.reaction}
            </motion.div>
          )}

          {/* viewer list */}
          <AnimatePresence>
            {showViewers && isMine && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute inset-x-0 bottom-0 z-30 max-h-[60%] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-surface p-4"
              >
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
                <p className="mb-3 text-sm font-semibold">Viewed by {story.viewers.length}</p>
                {story.viewers.length === 0 && (
                  <p className="py-6 text-center text-sm text-white/40">No views yet.</p>
                )}
                {story.viewers.map((v) => {
                  const vu = userById(v.userId);
                  return (
                    <div key={v.userId} className="flex items-center gap-3 py-2">
                      <Avatar src={vu.avatar} alt={vu.name} size={36} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{vu.name}</p>
                        <p className="text-xs text-white/40">{timeAgo(v.at)}</p>
                      </div>
                      {v.reaction && <span className="text-xl">{v.reaction}</span>}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* desktop arrows */}
        {index > 0 && (
          <button onClick={prev} className="absolute left-4 hidden rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:block">
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {index < stories.length - 1 && (
          <button onClick={next} className="absolute right-4 hidden rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:block">
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
