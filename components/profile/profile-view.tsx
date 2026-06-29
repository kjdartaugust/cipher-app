'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bookmark, Grid3x3, LogOut, MessageCircle, Settings, UserCheck, UserPlus } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { VerifiedBadge } from '@/components/post/post-card';
import { EditProfileModal } from './edit-profile-modal';
import { useApp } from '@/lib/store';
import { IS_DEMO } from '@/lib/config';
import type { User } from '@/lib/types';
import { compactNumber } from '@/lib/utils';

export function ProfileView({ user }: { user: User }) {
  const { me, posts, stories, toggleFollow, createConversation, userById, signOut } = useApp();
  const router = useRouter();
  const isMe = user.id === me.id;
  const following = me.following.includes(user.id);
  const [tab, setTab] = useState<'posts' | 'saved'>('posts');
  const [editing, setEditing] = useState(false);

  const userPosts = posts.filter((p) => p.authorId === user.id).sort((a, b) => b.createdAt - a.createdAt);
  const savedPosts = posts.filter((p) => p.saves.includes(me.id));
  const grid = tab === 'posts' ? userPosts : savedPosts;
  const highlights = stories.filter((s) => s.authorId === user.id && s.highlighted);

  const mutuals = useMemo(
    () => user.followers.filter((id) => me.following.includes(id) && id !== me.id).map(userById),
    [user.followers, me.following, userById]
  );

  async function message() {
    const id = await createConversation([user.id]);
    router.push(`/messages/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl border-x border-white/5">
      {/* banner */}
      <div className="h-1 bg-cipher-gradient" />

      <div className="px-5 pb-4 pt-7 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="headline text-4xl leading-none">{user.name}</h1>
              {user.verified && <VerifiedBadge />}
            </div>
            <p className="kicker mt-2">@{user.username}</p>
          </div>
          <Avatar src={user.avatar} alt={user.name} size={84} online={user.online} className="shrink-0" />
        </div>

        <div className="mt-4">
          <p className="max-w-prose font-display text-lg italic leading-snug text-white/80">{user.bio}</p>

          <div className="mt-5 flex gap-8 border-y border-white/10 py-3">
            <Stat label="Posts" value={userPosts.length} />
            <Stat label="Followers" value={compactNumber(user.followers.length)} />
            <Stat label="Following" value={compactNumber(user.following.length)} />
          </div>

          <div className="mt-4 flex gap-2">
            {isMe ? (
              <>
                <button onClick={() => setEditing(true)} className="btn-ghost text-sm"><Settings className="h-4 w-4" /> Edit profile</button>
                {!IS_DEMO && (
                  <button onClick={signOut} className="btn-ghost text-sm text-rose-300 hover:text-rose-200"><LogOut className="h-4 w-4" /> Log out</button>
                )}
              </>
            ) : (
              <>
                <button onClick={message} className="btn-ghost text-sm"><MessageCircle className="h-4 w-4" /> Message</button>
                <button
                  onClick={() => toggleFollow(user.id)}
                  className={following ? 'btn-ghost text-sm' : 'btn-primary text-sm'}
                >
                  {following ? <><UserCheck className="h-4 w-4" /> Following</> : <><UserPlus className="h-4 w-4" /> Follow</>}
                </button>
              </>
            )}
          </div>

          {!isMe && mutuals.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex -space-x-2">
                {mutuals.slice(0, 3).map((m) => (
                  <span key={m.id} className="rounded-full border-2 border-ink">
                    <Avatar src={m.avatar} alt={m.name} size={24} />
                  </span>
                ))}
              </div>
              <p className="text-xs text-white/45">
                Followed by {mutuals.slice(0, 2).map((m) => m.name).join(', ')}
                {mutuals.length > 2 && ` + ${mutuals.length - 2} more`}
              </p>
            </div>
          )}
        </div>

        {/* highlights */}
        {highlights.length > 0 && (
          <div className="mt-5 flex gap-4">
            {highlights.map((h) => (
              <div key={h.id} className="flex flex-col items-center gap-1">
                <Avatar src={h.media.url} alt="Highlight" size={62} ring />
                <span className="text-xs text-white/60">Highlights</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* tabs */}
      <div className="flex gap-6 border-y border-white/10 px-5 sm:px-8">
        <Tab active={tab === 'posts'} onClick={() => setTab('posts')} icon={Grid3x3} label="Posts" />
        {isMe && <Tab active={tab === 'saved'} onClick={() => setTab('saved')} icon={Bookmark} label="Saved" />}
      </div>

      {/* grid */}
      <div className="grid grid-cols-2 gap-2 p-5 sm:px-8">
        {grid.filter((p) => p.media?.[0]).map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-white/5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.media![0].url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
            <div className="absolute inset-0 hidden items-end bg-gradient-to-t from-black/70 to-transparent p-3 text-sm font-semibold text-white group-hover:flex">
              <span className="flex gap-4"><span>♥ {p.likes.length}</span><span>💬 {p.comments.length}</span></span>
            </div>
          </motion.div>
        ))}
      </div>
      {grid.filter((p) => p.media?.[0]).length === 0 && (
        <p className="py-16 text-center text-sm text-white/40">
          {tab === 'saved' ? 'No saved posts yet.' : 'No posts yet.'}
        </p>
      )}

      {isMe && <EditProfileModal open={editing} onClose={() => setEditing(false)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="headline text-2xl leading-none">{value}</p>
      <p className="kicker mt-1">{label}</p>
    </div>
  );
}

function Tab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Grid3x3;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 py-3 transition ${
        active ? 'text-white' : 'text-white/40 hover:text-white/70'
      }`}
    >
      <Icon className="h-4 w-4" /> <span className="kicker !text-xs">{label}</span>
      {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-cipher-gradient" />}
    </button>
  );
}
