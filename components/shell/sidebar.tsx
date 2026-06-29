'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogOut, PenSquare, SlidersHorizontal } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Avatar } from '@/components/ui/avatar';
import { NAV_ITEMS } from '@/lib/nav';
import { useApp } from '@/lib/store';
import { IS_DEMO } from '@/lib/config';
import { cn } from '@/lib/utils';

export function Sidebar({ onCompose }: { onCompose: () => void }) {
  const pathname = usePathname();
  const { me, badges } = useBadges();
  const { signOut } = useApp();

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
                'group relative flex items-center gap-4 py-2.5 pl-5 text-[15px] transition',
                active ? 'text-white' : 'text-white/50 hover:text-white'
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-cipher-gradient"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative">
                <item.icon className={cn('h-[22px] w-[22px]', active && 'text-cipher-300')} strokeWidth={active ? 2.2 : 1.8} />
                {badge > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-cipher-600 px-1 text-[10px] font-bold text-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </span>
              <span className={cn('font-display text-base', active ? 'font-semibold' : 'font-normal')}>{item.label}</span>
            </Link>
          );
        })}

        <button onClick={onCompose} className="btn-primary mt-4 w-full">
          <PenSquare className="h-4 w-4" /> Create post
        </button>
      </nav>

      <div className="mt-4 flex items-center gap-2">
        <Link
          href="/profile"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/5"
        >
          <Avatar src={me.avatar} alt={me.name} size={40} online />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{me.name}</p>
            <p className="truncate text-xs text-white/45">@{me.username}</p>
          </div>
        </Link>
        <Link href="/settings" title="Settings" className="rounded-xl p-2.5 text-white/40 transition hover:bg-white/5 hover:text-white">
          <SlidersHorizontal className="h-5 w-5" />
        </Link>
        {!IS_DEMO && (
          <button
            onClick={signOut}
            title="Sign out"
            className="rounded-xl p-2.5 text-white/40 transition hover:bg-white/5 hover:text-rose-300"
          >
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </div>
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
