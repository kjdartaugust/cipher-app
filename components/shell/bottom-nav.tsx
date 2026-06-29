'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { NAV_ITEMS } from '@/lib/nav';
import { useBadges } from './sidebar';
import { cn } from '@/lib/utils';

// Floating pill command bar — frosted glass, icon-only, violet active glow.
export function CommandBar() {
  const pathname = usePathname();
  const { badges } = useBadges();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="frost flex items-center gap-1 rounded-full border border-white/10 px-2 py-2 shadow-2xl shadow-black/60">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const badge = item.badgeKey ? badges[item.badgeKey] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className="relative grid h-12 w-12 place-items-center rounded-full"
            >
              {active && (
                <motion.span
                  layoutId="cmd-active"
                  className="glow-violet absolute inset-0 rounded-full bg-violet-600/20"
                  transition={{ type: 'spring', stiffness: 500, damping: 38, mass: 0.6 }}
                />
              )}
              <span className="relative">
                <item.icon
                  className={cn('h-[22px] w-[22px] transition', active ? 'text-violet-300' : 'text-white/55')}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Keep the old name as an alias so existing imports keep working.
export const BottomNav = CommandBar;
