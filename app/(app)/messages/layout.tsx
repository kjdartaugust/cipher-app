'use client';

import { usePathname } from 'next/navigation';
import { ConversationList } from '@/components/chat/conversation-list';
import { cn } from '@/lib/utils';

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const inThread = pathname !== '/messages';

  return (
    <div className="flex">
      {/* conversation list: hidden on mobile when a thread is open */}
      <div className={cn('w-full md:w-[360px] md:shrink-0', inThread && 'hidden md:block')}>
        <ConversationList />
      </div>
      {/* thread / placeholder */}
      <div className={cn('min-w-0 flex-1', !inThread && 'hidden md:block')}>{children}</div>
    </div>
  );
}
