'use client';

import { createContext, useContext, useState } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { ComposeModal } from '@/components/post/compose-modal';
import { UnlockModal } from '@/components/unlock-modal';
import { Logo } from '@/components/ui/logo';
import { FeedSkeleton } from '@/components/ui/skeleton';
import { useApp } from '@/lib/store';

const ComposeCtx = createContext<() => void>(() => {});
export const useCompose = () => useContext(ComposeCtx);

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, needsUnlock } = useApp();
  const [composeOpen, setComposeOpen] = useState(false);

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
    <ComposeCtx.Provider value={() => setComposeOpen(true)}>
      <div className="mx-auto flex w-full max-w-7xl">
        <Sidebar onCompose={() => setComposeOpen(true)} />
        <main className="min-h-screen flex-1 pb-28 lg:pb-0">{children}</main>
      </div>
      <BottomNav />
      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} />
      {needsUnlock && <UnlockModal />}
    </ComposeCtx.Provider>
  );
}
