'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AtSign, Bell, Heart, MessageCircle, Sparkles, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { Avatar } from '@/components/ui/avatar';
import { useApp } from '@/lib/store';
import type { AppNotification, NotificationType } from '@/lib/types';
import { cn, timeAgo } from '@/lib/utils';

const ICON: Record<NotificationType, { icon: typeof Heart; color: string }> = {
  like: { icon: Heart, color: 'text-rose-500 bg-rose-500/15' },
  comment: { icon: MessageCircle, color: 'text-sky-400 bg-sky-400/15' },
  follow: { icon: UserPlus, color: 'text-cipher-300 bg-cipher-600/20' },
  message: { icon: MessageCircle, color: 'text-emerald-400 bg-emerald-400/15' },
  reaction: { icon: Sparkles, color: 'text-amber-400 bg-amber-400/15' },
  mention: { icon: AtSign, color: 'text-cipher-300 bg-cipher-600/20' },
  story: { icon: Sparkles, color: 'text-purple-400 bg-purple-400/15' },
};

export default function NotificationsPage() {
  const { notifications, markAllNotificationsRead, userById } = useApp();

  useEffect(() => {
    const t = setTimeout(markAllNotificationsRead, 1200);
    return () => clearTimeout(t);
  }, [markAllNotificationsRead]);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-2xl border-x border-white/5">
      <PageHeader
        kicker="Activity"
        title="Notifications"
        action={
          unread > 0 ? (
            <button onClick={markAllNotificationsRead} className="text-xs font-medium text-cipher-300 hover:text-cipher-200">
              Mark all read
            </button>
          ) : null
        }
      />

      <div className="divide-y divide-white/5">
        {notifications.map((n) => (
          <Row key={n.id} n={n} actorName={userById(n.actorId).name} actorAvatar={userById(n.actorId).avatar} actorUsername={userById(n.actorId).username} />
        ))}
        {notifications.length === 0 && (
          <div className="grid place-items-center py-20 text-center text-white/40">
            <Bell className="mb-3 h-10 w-10" />
            <p>No notifications yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  n,
  actorName,
  actorAvatar,
  actorUsername,
}: {
  n: AppNotification;
  actorName: string;
  actorAvatar: string;
  actorUsername: string;
}) {
  const { icon: Icon, color } = ICON[n.type];
  const href = n.type === 'message' ? `/messages/${n.targetId}` : `/u/${actorUsername}`;
  const text =
    n.type === 'follow'
      ? 'started following you'
      : n.preview ?? 'interacted with you';

  return (
    <Link href={href}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.03]', !n.read && 'bg-cipher-600/[0.06]')}
      >
        <div className="relative">
          <Avatar src={actorAvatar} alt={actorName} size={46} />
          <span className={cn('absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-2 border-ink', color)}>
            <Icon className="h-3 w-3" />
          </span>
        </div>
        <p className="flex-1 text-sm">
          <span className="font-semibold">{actorName}</span>{' '}
          <span className="text-white/60">{text}</span>{' '}
          <span className="text-white/35">· {timeAgo(n.createdAt)}</span>
        </p>
        {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-cipher-500" />}
      </motion.div>
    </Link>
  );
}
