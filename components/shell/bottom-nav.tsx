'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { NAV_ITEMS } from '@/lib/nav';
import { useBadges } from './sidebar';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();
  const { badges } = useBadges();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const badge = item.badgeKey ? badges[item.badgeKey] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5"
            >
              <span className="relative">
                <item.icon
                  className={cn('h-[26px] w-[26px] transition', active ? 'text-blue' : 'text-white/45')}
                  strokeWidth={active ? 2 : 1.6}
                />
                {badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-cipher-600 px-1 text-[10px] font-bold text-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </span>
              {active && (
                <motion.span
                  layoutId="bottom-active"
                  className="h-1 w-1 rounded-full bg-blue"
                  transition={{ duration: 0.15 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
