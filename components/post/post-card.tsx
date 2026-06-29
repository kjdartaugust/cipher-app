'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bookmark,
  Heart,
  MessageCircle,
  Send,
  Share2,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useApp } from '@/lib/store';
import type { Post } from '@/lib/types';
import { cn, compactNumber, timeAgo } from '@/lib/utils';

export function PostCard({ post, trending }: { post: Post; trending?: boolean }) {
  const { userById, me, toggleLike, toggleSave, sharePost, addComment } = useApp();
  const author = userById(post.authorId);
  const liked = post.likes.includes(me.id);
  const saved = post.saves.includes(me.id);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [burst, setBurst] = useState(false);

  function like() {
    if (!liked) {
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
    }
    toggleLike(post.id);
  }

  function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment(post.id, commentText.trim());
    setCommentText('');
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="border-b border-white/10 py-8 first:pt-2"
    >
      {/* byline */}
      <div className="mb-3 flex items-center gap-3">
        <Link href={`/u/${author.username}`}>
          <Avatar src={author.avatar} alt={author.name} size={38} online={author.online} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/u/${author.username}`} className="flex items-center gap-1.5">
            <span className="headline truncate text-[17px] leading-tight hover:text-cipher-200">{author.name}</span>
            {author.verified && <VerifiedBadge />}
          </Link>
          <p className="kicker mt-0.5">
            @{author.username} · {timeAgo(post.createdAt)}
            {trending && <span className="ml-2 text-cipher-300">· Trending</span>}
          </p>
        </div>
      </div>

      {/* body copy as editorial lede */}
      {post.text && (
        <p className="mb-4 max-w-2xl font-display text-[22px] leading-snug tracking-tight text-soft/95 sm:text-[26px]">
          {post.text}
        </p>
      )}

      {/* media — wide, no rounded card chrome */}
      {post.media?.[0] && (
        <figure className="relative mb-4 overflow-hidden" onDoubleClick={like}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.media[0].url}
            alt=""
            className="max-h-[560px] w-full object-cover"
          />
          <AnimatePresence>
            {burst && (
              <motion.div
                className="pointer-events-none absolute inset-0 grid place-items-center"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1.1 }}
                exit={{ opacity: 0, scale: 1.4 }}
              >
                <Heart className="h-24 w-24 fill-white text-white drop-shadow-lg" />
              </motion.div>
            )}
          </AnimatePresence>
        </figure>
      )}

      {/* editorial action line */}
      <div className="flex items-center gap-6 text-sm text-white/55">
        <button onClick={like} className={cn('group flex items-center gap-1.5 transition hover:text-rose-400', liked && 'text-rose-500')}>
          <Heart className={cn('h-[18px] w-[18px]', liked && 'fill-rose-500')} />
          <span className="tabular-nums">{compactNumber(post.likes.length)}</span>
        </button>
        <button onClick={() => setShowComments((s) => !s)} className={cn('flex items-center gap-1.5 transition hover:text-soft', showComments && 'text-soft')}>
          <MessageCircle className="h-[18px] w-[18px]" />
          <span className="tabular-nums">{post.comments.length}</span>
        </button>
        <button onClick={() => sharePost(post.id)} className="flex items-center gap-1.5 transition hover:text-soft">
          <Share2 className="h-[18px] w-[18px]" />
          <span className="tabular-nums">{compactNumber(post.shares)}</span>
        </button>
        <button
          onClick={() => toggleSave(post.id)}
          className={cn('ml-auto transition hover:text-cipher-300', saved && 'text-cipher-400')}
        >
          <Bookmark className={cn('h-[18px] w-[18px]', saved && 'fill-cipher-400')} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-5 space-y-4 border-l border-white/10 pl-4">
              {post.comments.map((c) => {
                const cu = userById(c.authorId);
                return (
                  <div key={c.id} className="flex gap-2.5">
                    <Avatar src={cu.avatar} alt={cu.name} size={28} />
                    <div>
                      <p className="text-xs">
                        <span className="font-semibold">{cu.name}</span>{' '}
                        <span className="text-white/35">· {timeAgo(c.createdAt)}</span>
                      </p>
                      <p className="text-sm text-white/80">{c.text}</p>
                    </div>
                  </div>
                );
              })}
              {post.comments.length === 0 && (
                <p className="text-xs text-white/35">No responses yet — start the conversation.</p>
              )}
              <form onSubmit={submitComment} className="flex items-center gap-2 pt-1">
                <Avatar src={me.avatar} alt={me.name} size={28} />
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a response…"
                  className="flex-1 border-b border-white/10 bg-transparent py-1.5 text-sm outline-none placeholder:text-white/30 focus:border-cipher-500"
                />
                <button type="submit" className="text-cipher-300 disabled:opacity-40" disabled={!commentText.trim()}>
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

export function VerifiedBadge() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-cipher-400" fill="currentColor">
      <path d="M12 2l2.39 1.72 2.94-.17 1.02 2.76 2.45 1.63-.9 2.8.9 2.8-2.45 1.63-1.02 2.76-2.94-.17L12 22l-2.39-1.72-2.94.17-1.02-2.76-2.45-1.63.9-2.8-.9-2.8 2.45-1.63 1.02-2.76 2.94.17L12 2z" />
      <path d="M10.6 14.6l-2.2-2.2 1.1-1.1 1.1 1.1 3-3 1.1 1.1-4.1 4.1z" fill="#0A0A0A" />
    </svg>
  );
}
