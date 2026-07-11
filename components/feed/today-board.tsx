'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from 'framer-motion';
import { Check, Heart, MessageCircle, RotateCcw, X } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { VerifiedBadge } from '@/components/post/post-card';
import { PostCard } from '@/components/post/post-card';
import { useApp } from '@/lib/store';
import { resolveStatus } from '@/lib/presence';
import type { Post } from '@/lib/types';
import { compactNumber, timeAgo } from '@/lib/utils';

// Today Board — one card centered; swipe right to like, left to skip, tap to expand.
export function TodayBoard({ posts }: { posts: Post[] }) {
  const { toggleLike, me } = useApp();
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState<Post | null>(null);

  const remaining = posts.slice(index, index + 3);

  function advance(like: boolean, post: Post) {
    if (like && !post.likes.includes(me.id)) toggleLike(post.id);
    setIndex((i) => Math.min(i + 1, posts.length));
  }

  // Keyboard: ← skip, → like the current card.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (expanded || index >= posts.length) return;
      if (e.key === 'ArrowRight') advance(true, posts[index]);
      else if (e.key === 'ArrowLeft') advance(false, posts[index]);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, posts, expanded]);

  if (posts.length === 0) {
    return <Empty text="No posts yet — follow people to fill your board." />;
  }
  if (index >= posts.length) {
    return (
      <Empty text="You're all caught up.">
        <button onClick={() => setIndex(0)} className="btn-ghost mt-4 text-sm"><RotateCcw className="h-4 w-4" /> Replay board</button>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col items-center px-5 py-6">
      <div className="relative h-[clamp(420px,62vh,560px)] w-full max-w-md">
        <AnimatePresence>
          {remaining
            .map((post, i) => ({ post, depth: i }))
            .reverse()
            .map(({ post, depth }) =>
              depth === 0 ? (
                <SwipeCard
                  key={post.id}
                  post={post}
                  onLike={() => advance(true, post)}
                  onSkip={() => advance(false, post)}
                  onExpand={() => setExpanded(post)}
                />
              ) : (
                <motion.div
                  key={post.id}
                  className="absolute inset-0"
                  initial={false}
                  animate={{ scale: 1 - depth * 0.05, y: depth * 14, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                >
                  <CardShell post={post} dim />
                </motion.div>
              )
            )}
        </AnimatePresence>
      </div>

      {/* action controls */}
      <div className="mt-6 flex items-center gap-5">
        <Ctrl label="Skip" onClick={() => advance(false, posts[index])} className="text-white/60 hover:text-white">
          <X className="h-6 w-6" strokeWidth={1.75} />
        </Ctrl>
        <p className="w-16 text-center text-xs text-white/35">{index + 1} / {posts.length}</p>
        <Ctrl label="Like" onClick={() => advance(true, posts[index])} className="text-violet-300 hover:text-violet-200">
          <Heart className="h-6 w-6" strokeWidth={1.75} />
        </Ctrl>
      </div>
      <p className="mt-3 text-[11px] text-white/30">Swipe the card · or use ← →</p>

      {/* expanded post + comments */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/95"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black px-5 py-3">
              <span className="kicker">Cipher · Post</span>
              <button onClick={() => setExpanded(null)} className="rounded-full p-2 text-white/60 hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>
            <div className="mx-auto max-w-xl px-5">
              <PostCard post={expanded} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SwipeCard({ post, onLike, onSkip, onExpand }: { post: Post; onLike: () => void; onSkip: () => void; onExpand: () => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-12, 12]);
  const likeOpacity = useTransform(x, [40, 150], [0, 1]);
  const skipOpacity = useTransform(x, [-150, -40], [1, 0]);

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={(_, info) => {
        if (info.offset.x > 130) onLike();
        else if (info.offset.x < -130) onSkip();
      }}
      whileTap={{ scale: 0.985 }}
      exit={{ x: x.get() > 0 ? 600 : -600, opacity: 0, transition: { duration: 0.2 } }}
      onClick={() => Math.abs(x.get()) < 6 && onExpand()}
    >
      <CardShell post={post}>
        <motion.span style={{ opacity: likeOpacity }} className="absolute left-4 top-4 rounded-lg border-2 border-violet-500 px-3 py-1 text-sm font-black uppercase tracking-widest text-violet-300">Like</motion.span>
        <motion.span style={{ opacity: skipOpacity }} className="absolute right-4 top-4 rounded-lg border-2 border-white/40 px-3 py-1 text-sm font-black uppercase tracking-widest text-white/70">Skip</motion.span>
      </CardShell>
    </motion.div>
  );
}

function CardShell({ post, dim, children }: { post: Post; dim?: boolean; children?: React.ReactNode }) {
  const { userById, presence } = useApp();
  const author = userById(post.authorId);
  return (
    <div className={`relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/12 bg-surface ${dim ? 'opacity-70' : ''}`}>
      {post.media?.[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.media[0].url} alt="" className="h-1/2 w-full object-cover" draggable={false} />
      ) : (
        <div className="grid h-1/2 w-full place-items-center bg-violet-600/15 px-6 text-center">
          <p className="headline text-2xl text-white">{post.text.slice(0, 80)}</p>
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-3">
          <Avatar src={author.avatar} alt={author.name} size={40} status={resolveStatus(presence[author.id], author.online)} />
          <div className="min-w-0">
            <span className="flex items-center gap-1">
              <span className="truncate font-bold">{author.name}</span>
              {author.verified && <VerifiedBadge />}
            </span>
            <p className="kicker">@{author.username} · {timeAgo(post.createdAt)}</p>
          </div>
        </div>
        {post.media?.[0] && post.text && (
          <p className="mt-3 line-clamp-4 text-[15px] leading-relaxed text-white/85">{post.text}</p>
        )}
        <div className="mt-auto flex items-center gap-5 pt-4 text-sm text-white/50">
          <span className="flex items-center gap-1.5"><Heart className="h-4 w-4" strokeWidth={1.5} /> {compactNumber(post.likes.length)}</span>
          <span className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4" strokeWidth={1.5} /> {post.comments.length}</span>
          <Link href={`/u/${author.username}`} onClick={(e) => e.stopPropagation()} className="ml-auto text-violet-300 hover:text-violet-200">View profile</Link>
        </div>
      </div>
      {children}
    </div>
  );
}

function Ctrl({ children, label, onClick, className }: { children: React.ReactNode; label: string; onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick} aria-label={label} className={`grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-surface transition active:scale-90 ${className}`}>
      {children}
    </button>
  );
}

function Empty({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="grid place-items-center px-6 py-24 text-center">
      <Check className="mb-3 h-10 w-10 text-violet-400" strokeWidth={1.5} />
      <p className="text-white/50">{text}</p>
      {children}
    </div>
  );
}
