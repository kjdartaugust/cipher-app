'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  TrendingUp,
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
      className="card overflow-hidden p-0"
    >
      <div className="flex items-center gap-3 p-4 pb-3">
        <Link href={`/u/${author.username}`}>
          <Avatar src={author.avatar} alt={author.name} size={44} online={author.online} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/u/${author.username}`} className="flex items-center gap-1.5">
            <span className="truncate font-semibold hover:underline">{author.name}</span>
            {author.verified && <VerifiedBadge />}
          </Link>
          <p className="text-xs text-white/40">
            @{author.username} · {timeAgo(post.createdAt)}
          </p>
        </div>
        {trending && (
          <span className="flex items-center gap-1 rounded-full bg-cipher-600/15 px-2.5 py-1 text-xs font-medium text-cipher-300">
            <TrendingUp className="h-3.5 w-3.5" /> Trending
          </span>
        )}
        <button className="rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {post.text && <p className="whitespace-pre-wrap px-4 pb-3 text-[15px] leading-relaxed">{post.text}</p>}

      {post.media?.[0] && (
        <div className="relative aspect-square w-full overflow-hidden bg-black/40" onDoubleClick={like}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.media[0].url} alt="" className="h-full w-full object-cover" />
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
        </div>
      )}

      <div className="flex items-center gap-1 px-2 py-2">
        <Action active={liked} onClick={like} activeClass="text-rose-500">
          <Heart className={cn('h-[22px] w-[22px]', liked && 'fill-rose-500')} />
          {post.likes.length > 0 && <span>{compactNumber(post.likes.length)}</span>}
        </Action>
        <Action active={showComments} onClick={() => setShowComments((s) => !s)}>
          <MessageCircle className="h-[22px] w-[22px]" />
          {post.comments.length > 0 && <span>{post.comments.length}</span>}
        </Action>
        <Action onClick={() => sharePost(post.id)}>
          <Share2 className="h-[22px] w-[22px]" />
          {post.shares > 0 && <span>{compactNumber(post.shares)}</span>}
        </Action>
        <div className="flex-1" />
        <Action active={saved} onClick={() => toggleSave(post.id)} activeClass="text-cipher-400">
          <Bookmark className={cn('h-[22px] w-[22px]', saved && 'fill-cipher-400')} />
        </Action>
      </div>

      <AnimatePresence initial={false}>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/5"
          >
            <div className="space-y-3 px-4 py-3">
              {post.comments.map((c) => {
                const cu = userById(c.authorId);
                return (
                  <div key={c.id} className="flex gap-2.5">
                    <Avatar src={cu.avatar} alt={cu.name} size={32} />
                    <div className="flex-1 rounded-2xl rounded-tl-sm bg-white/5 px-3 py-2">
                      <p className="text-xs">
                        <span className="font-semibold">{cu.name}</span>{' '}
                        <span className="text-white/40">{timeAgo(c.createdAt)}</span>
                      </p>
                      <p className="text-sm text-white/80">{c.text}</p>
                    </div>
                  </div>
                );
              })}
              {post.comments.length === 0 && (
                <p className="py-1 text-center text-xs text-white/35">No comments yet — be the first.</p>
              )}
              <form onSubmit={submitComment} className="flex items-center gap-2 pt-1">
                <Avatar src={me.avatar} alt={me.name} size={32} />
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment…"
                  className="flex-1 rounded-full bg-white/5 px-4 py-2 text-sm outline-none placeholder:text-white/30 focus:bg-white/10"
                />
                <button type="submit" className="rounded-full bg-cipher-gradient p-2 text-white disabled:opacity-40" disabled={!commentText.trim()}>
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

function Action({
  children,
  onClick,
  active,
  activeClass = 'text-cipher-400',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  activeClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-white/60 transition hover:bg-white/5 active:scale-90',
        active && activeClass
      )}
    >
      {children}
    </button>
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
