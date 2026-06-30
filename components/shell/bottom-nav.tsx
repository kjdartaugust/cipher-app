'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { NAV_ITEMS } from '@/lib/nav';
import { useBadges } from './sidebar';
import { cn } from '@/lib/utils';

// Floating pill command bar — the active tab expands to show its label.
export function CommandBar() {
  const pathname = usePathname();
  const { badges } = useBadges();

  // Immersive chat: hide the bar inside a conversation so it never covers the composer.
  if (/^\/messages\/[^/]+$/.test(pathname)) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="frost flex max-w-full items-center gap-1 overflow-hidden rounded-full border border-white/10 p-1.5 shadow-2xl shadow-black/60">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const badge = item.badgeKey ? badges[item.badgeKey] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={cn(
                'relative flex h-11 items-center justify-center rounded-full transition-all',
                active ? 'gap-2 px-4 text-violet-200' : 'w-11 text-white/55'
              )}
            >
              {active && (
                <motion.span
                  layoutId="cmd-active"
                  className="glow-violet absolute inset-0 rounded-full bg-violet-600/20"
                  transition={{ type: 'spring', stiffness: 500, damping: 38, mass: 0.6 }}
                />
              )}
              <span className="relative">
                <item.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                {badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </span>
              {active && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  className="relative whitespace-nowrap text-sm font-semibold"
                >
                  {item.label}
                </motion.span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export const BottomNav = CommandBar;
