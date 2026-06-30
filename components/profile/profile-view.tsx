'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Bookmark, Grid3x3, LogOut, MessageCircle, Settings, SlidersHorizontal, UserCheck, UserPlus, UserX } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { VerifiedBadge } from '@/components/post/post-card';
import { EditProfileModal } from './edit-profile-modal';
import { useApp } from '@/lib/store';
import { IS_DEMO } from '@/lib/config';
import type { User } from '@/lib/types';
import { compactNumber } from '@/lib/utils';

export function ProfileView({ user }: { user: User }) {
  const { me, posts, stories, messages, toggleFollow, createConversation, userById, signOut, blocked, toggleBlock } = useApp();
  const router = useRouter();
  const isMe = user.id === me.id;
  const following = me.following.includes(user.id);
  const [tab, setTab] = useState<'posts' | 'saved'>('posts');
  const [editing, setEditing] = useState(false);

  const userPosts = posts.filter((p) => p.authorId === user.id).sort((a, b) => b.createdAt - a.createdAt);
  const savedPosts = posts.filter((p) => p.saves.includes(me.id));
  const grid = tab === 'posts' ? userPosts : savedPosts;
  const highlights = stories.filter((s) => s.authorId === user.id && s.highlighted);
  // "Ciphers sent" = encrypted messages this user has sent (that we can see).
  const ciphersSent = messages.filter((m) => m.senderId === user.id).length;

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
      <div className="flex flex-col items-center px-5 pb-4 pt-9 text-center sm:px-8">
        <Avatar src={user.avatar} alt={user.name} size={104} online={user.online} ring />
        <h1 className="headline mt-4 flex items-center gap-2 text-3xl leading-none">
          {user.name}
          {user.verified && <VerifiedBadge />}
        </h1>
        <p className="kicker mt-2">@{user.username}</p>
        {user.bio && <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-white/75">{user.bio}</p>}

        {/* three stats */}
        <div className="mt-6 grid w-full max-w-sm grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 py-3">
          <Stat label="Posts" value={userPosts.length} />
          <Stat label="Ciphers sent" value={compactNumber(ciphersSent)} />
          <Stat label="Mutuals" value={mutuals.length} />
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {isMe ? (
            <>
              <button onClick={() => setEditing(true)} className="btn-ghost text-sm"><Settings className="h-4 w-4" /> Edit profile</button>
              <Link href="/settings" className="btn-ghost text-sm" aria-label="Settings"><SlidersHorizontal className="h-4 w-4" /></Link>
              {!IS_DEMO && (
                <button onClick={signOut} className="btn-ghost text-sm text-rose-300 hover:text-rose-200" aria-label="Log out"><LogOut className="h-4 w-4" /></button>
              )}
            </>
          ) : (
            <>
              <button onClick={message} className="btn-primary text-sm"><MessageCircle className="h-4 w-4" /> Message</button>
              <button
                onClick={() => toggleFollow(user.id)}
                className={following ? 'btn-ghost text-sm' : 'btn-ghost text-sm'}
              >
                {following ? <><UserCheck className="h-4 w-4" /> Following</> : <><UserPlus className="h-4 w-4" /> Follow</>}
              </button>
              <button
                onClick={() => toggleBlock(user.id)}
                className={`btn-ghost text-sm ${blocked.includes(user.id) ? 'text-rose-300' : 'text-white/50'}`}
                aria-label={blocked.includes(user.id) ? 'Unblock' : 'Block'}
                title={blocked.includes(user.id) ? 'Unblock' : 'Block'}
              >
                <UserX className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* highlights */}
        {highlights.length > 0 && (
          <div className="mt-5 flex gap-4">
            {highlights.map((h) => (
              <div key={h.id} className="flex flex-col items-center gap-1">
                <Avatar src={h.media?.url ?? user.avatar} alt="Highlight" size={62} ring />
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

      {/* masonry grid */}
      <div className="columns-3 gap-2 p-5 sm:px-8 [&>*]:mb-2">
        {grid.filter((p) => p.media?.[0]).map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="group relative break-inside-avoid overflow-hidden rounded-lg bg-white/5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.media![0].url} alt="" className="w-full object-cover transition group-hover:scale-[1.03]" />
            <div className="absolute inset-0 hidden items-end bg-gradient-to-t from-black/70 to-transparent p-2 text-xs font-semibold text-white group-hover:flex">
              <span className="flex gap-3"><span>♥ {p.likes.length}</span><span>💬 {p.comments.length}</span></span>
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
    <div className="px-2 text-center">
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
