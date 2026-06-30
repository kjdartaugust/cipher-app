'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bookmark,
  Check,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Send,
  Share2,
  Trash2,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useApp } from '@/lib/store';
import type { Post } from '@/lib/types';
import { cn, compactNumber, timeAgo } from '@/lib/utils';

export function PostCard({ post, trending }: { post: Post; trending?: boolean }) {
  const { userById, me, toggleLike, toggleSave, sharePost, addComment, deletePost, editPost } = useApp();
  const author = userById(post.authorId);
  const liked = post.likes.includes(me.id);
  const saved = post.saves.includes(me.id);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [burst, setBurst] = useState(false);
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.text);
  const mine = post.authorId === me.id;

  function saveEdit() {
    const v = draft.trim();
    if (v && v !== post.text) editPost(post.id, v);
    setEditing(false);
  }

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
        {mine && (
          <div className="relative">
            <button onClick={() => setMenu((m) => !m)} className="rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white">
              <MoreHorizontal className="h-5 w-5" />
            </button>
            <AnimatePresence>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-white/10 bg-surface shadow-xl"
                  >
                    <button
                      onClick={() => { setMenu(false); setDraft(post.text); setEditing(true); }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-white hover:bg-white/5"
                    >
                      <Pencil className="h-4 w-4" /> Edit post
                    </button>
                    <button
                      onClick={() => { setMenu(false); deletePost(post.id); }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-rose-300 hover:bg-white/5"
                    >
                      <Trash2 className="h-4 w-4" /> Delete post
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* body copy */}
      {editing ? (
        <div className="mb-4">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="input resize-none text-[17px]"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className="btn-ghost px-3 py-1.5 text-xs">Cancel</button>
            <button onClick={saveEdit} className="btn-primary px-3 py-1.5 text-xs"><Check className="h-3.5 w-3.5" /> Save</button>
          </div>
        </div>
      ) : (
        post.text && (
          <p className="mb-4 max-w-2xl text-[17px] leading-relaxed text-white/90">{post.text}</p>
        )
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

      {/* action line — razor-thin line icons */}
      <div className="flex items-center gap-7 text-sm text-white/50">
        <button onClick={like} className={cn('flex items-center gap-2 transition hover:text-white', liked && 'text-blue')}>
          <Heart className={cn('h-5 w-5', liked && 'fill-blue text-blue')} strokeWidth={1.5} />
          <span className="tabular-nums">{compactNumber(post.likes.length)}</span>
        </button>
        <button onClick={() => setShowComments((s) => !s)} className={cn('flex items-center gap-2 transition hover:text-white', showComments && 'text-white')}>
          <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
          <span className="tabular-nums">{post.comments.length}</span>
        </button>
        <button onClick={() => sharePost(post.id)} className="flex items-center gap-2 transition hover:text-white">
          <Share2 className="h-5 w-5" strokeWidth={1.5} />
          <span className="tabular-nums">{compactNumber(post.shares)}</span>
        </button>
        <button
          onClick={() => toggleSave(post.id)}
          className={cn('ml-auto transition hover:text-white', saved && 'text-blue')}
        >
          <Bookmark className={cn('h-5 w-5', saved && 'fill-blue text-blue')} strokeWidth={1.5} />
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
