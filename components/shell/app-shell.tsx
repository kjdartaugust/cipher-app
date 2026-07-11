'use client';

import { createContext, useContext, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { ComposeModal } from '@/components/post/compose-modal';
import { UnlockModal } from '@/components/unlock-modal';
import { CallProvider } from '@/components/call/call-provider';
import { CallOverlay } from '@/components/call/call-overlay';
import { Logo } from '@/components/ui/logo';
import { FeedSkeleton } from '@/components/ui/skeleton';
import { useApp } from '@/lib/store';
import { cn } from '@/lib/utils';

const ComposeCtx = createContext<() => void>(() => {});
export const useCompose = () => useContext(ComposeCtx);

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, needsUnlock, me } = useApp();
  const [composeOpen, setComposeOpen] = useState(false);
  const pathname = usePathname();
  const inThread = /^\/messages\/[^/]+$/.test(pathname);

  if (!ready) {
    return (
      <div className="mx-auto flex w-full max-w-7xl">
        <div className="hidden w-[260px] shrink-0 border-r border-white/5 px-4 py-6 lg:block">
          <Logo size="md" />
        </div>
        <main className="min-h-screen flex-1">
          <div className="flex items-center justify-center gap-2 py-3 text-xs text-white/40">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500" /> Decrypting your Cipher…
          </div>
          <FeedSkeleton />
        </main>
      </div>
    );
  }

  return (
    <CallProvider>
      <ComposeCtx.Provider value={() => setComposeOpen(true)}>
        {/* A suspended user's writes are refused by the database, so without
            this their posts would just silently fail. Say what happened. */}
        {me.suspended && (
          <div className="sticky top-0 z-40 flex items-center gap-2 bg-amber-500 px-4 py-2 text-center text-xs font-semibold text-black">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="flex-1">
              Your account is suspended. You can read and browse, but not send messages, post or comment.
            </span>
          </div>
        )}
        <div className="mx-auto flex w-full max-w-7xl">
          <Sidebar onCompose={() => setComposeOpen(true)} />
          <main className={cn('flex-1', inThread ? 'h-[100dvh] overflow-hidden lg:h-screen' : 'min-h-screen pb-28 lg:pb-0')}>{children}</main>
        </div>
        <BottomNav />
        <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} />
        {needsUnlock && <UnlockModal />}
        <CallOverlay />
      </ComposeCtx.Provider>
    </CallProvider>
  );
}
