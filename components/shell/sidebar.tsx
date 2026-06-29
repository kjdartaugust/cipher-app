'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { PenSquare } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Avatar } from '@/components/ui/avatar';
import { NAV_ITEMS } from '@/lib/nav';
import { useApp } from '@/lib/store';
import { cn } from '@/lib/utils';

export function Sidebar({ onCompose }: { onCompose: () => void }) {
  const pathname = usePathname();
  const { me, badges } = useBadges();

  return (
    <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-white/5 px-4 py-6 lg:flex">
      <div className="px-2">
        <Logo size="md" />
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const badge = item.badgeKey ? badges[item.badgeKey] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-4 rounded-xl px-4 py-3 text-[15px] font-medium transition',
                active ? 'text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 -z-10 rounded-xl bg-white/[0.07] ring-1 ring-white/10"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative">
                <item.icon className={cn('h-6 w-6', active && 'text-cipher-300')} strokeWidth={active ? 2.4 : 2} />
                {badge > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-cipher-600 px-1 text-[10px] font-bold text-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}

        <button onClick={onCompose} className="btn-primary mt-4 w-full">
          <PenSquare className="h-4 w-4" /> Create post
        </button>
      </nav>

      <Link
        href="/profile"
        className="mt-4 flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/5"
      >
        <Avatar src={me.avatar} alt={me.name} size={40} online />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{me.name}</p>
          <p className="truncate text-xs text-white/45">@{me.username}</p>
        </div>
      </Link>
    </aside>
  );
}

export function useBadges() {
  const app = useApp();
  const unreadMessages = app.conversations.filter((c) =>
    app.messages.some(
      (m) => m.conversationId === c.id && m.senderId !== app.me.id && !m.readBy.includes(app.me.id)
    )
  ).length;
  const unreadNotifications = app.notifications.filter((n) => !n.read).length;
  return {
    me: app.me,
    badges: { messages: unreadMessages, notifications: unreadNotifications },
  };
}
