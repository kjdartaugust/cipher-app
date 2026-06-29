'use client';

import { createContext, useContext, useState } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { ComposeModal } from '@/components/post/compose-modal';
import { UnlockModal } from '@/components/unlock-modal';
import { Logo } from '@/components/ui/logo';
import { useApp } from '@/lib/store';

const ComposeCtx = createContext<() => void>(() => {});
export const useCompose = () => useContext(ComposeCtx);

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, needsUnlock } = useApp();
  const [composeOpen, setComposeOpen] = useState(false);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Logo size="lg" showText={false} />
          <p className="animate-pulse text-sm text-white/40">Generating your keys…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <ComposeCtx.Provider value={() => setComposeOpen(true)}>
      <div className="mx-auto flex w-full max-w-7xl">
        <Sidebar onCompose={() => setComposeOpen(true)} />
        <main className="min-h-screen flex-1 pb-20 lg:pb-0">{children}</main>
      </div>
      <BottomNav />
      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} />
      {needsUnlock && <UnlockModal />}
    </ComposeCtx.Provider>
  );
}
