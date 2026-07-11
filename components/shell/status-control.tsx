'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useApp } from '@/lib/store';
import { VISIBILITY_OPTIONS, myVisibilityDot } from '@/lib/presence';
import { cn } from '@/lib/utils';

// A labelled status button + popover — used on the profile screen (mobile-friendly).
export function StatusButton() {
  const { myStatus } = useApp();
  const [open, setOpen] = useState(false);
  const cur = VISIBILITY_OPTIONS.find((o) => o.value === myStatus) ?? VISIBILITY_OPTIONS[0];
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="btn-ghost text-sm">
        {myStatus === 'invisible' ? (
          <span className="h-2.5 w-2.5 rounded-full border border-white/45" />
        ) : (
          <span className={cn('h-2.5 w-2.5 rounded-full', cur.dot)} />
        )}
        {cur.label}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute left-1/2 top-11 z-50 w-60 -translate-x-1/2 rounded-2xl border border-white/10 bg-ink/95 p-2 text-left shadow-2xl backdrop-blur"
            >
              <p className="px-3 pb-1 pt-1 text-xs font-semibold text-white/40">Your status</p>
              <div onClick={() => setOpen(false)}>
                <StatusOptions />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// The three visibility options — reused in the sidebar popover and Settings.
export function StatusOptions({ className }: { className?: string }) {
  const { myStatus, setStatus } = useApp();
  return (
    <div className={cn('grid grid-cols-1 gap-2', className)}>
      {VISIBILITY_OPTIONS.map((o) => {
        const active = myStatus === o.value;
        return (
          <button
            key={o.value}
            onClick={() => setStatus(o.value)}
            aria-pressed={active}
            className={cn(
              'group flex w-full min-w-0 items-center gap-3 rounded-2xl border p-3 text-left transition',
              active
                ? 'border-cipher-500/50 bg-cipher-600/10'
                : 'border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
            )}
          >
            {/* status indicator — colored dot + halo, or a hollow ring for Invisible */}
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/5">
              {o.value === 'invisible' ? (
                <span className="h-3 w-3 rounded-full border border-white/45" />
              ) : (
                <>
                  <span className={cn('absolute h-6 w-6 rounded-full opacity-25 blur-[2px]', o.dot)} />
                  <span className={cn('relative h-3 w-3 rounded-full', o.dot)} />
                </>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{o.label}</span>
              <span className="block truncate text-xs text-white/45">{o.desc}</span>
            </span>
            {/* radio-style selected indicator */}
            <span
              className={cn(
                'grid h-5 w-5 shrink-0 place-items-center rounded-full border transition',
                active ? 'border-cipher-400 bg-cipher-500' : 'border-white/25 group-hover:border-white/40'
              )}
            >
              {active && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Sidebar avatar that opens the status popover on tap.
export function StatusAvatar() {
  const { me, myStatus } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Set your status" className="relative block rounded-full">
        <Avatar src={me.avatar} alt={me.name} size={40} />
        {myStatus === 'invisible' ? (
          // hollow ring — you're hidden, no colored presence
          <span className="absolute bottom-0 right-0 grid h-3 w-3 place-items-center rounded-full border-2 border-ink bg-ink">
            <span className="h-2 w-2 rounded-full border border-white/45" />
          </span>
        ) : (
          <span className={cn('absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-ink', myVisibilityDot(myStatus))} />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-12 left-0 z-50 w-60 rounded-2xl border border-white/10 bg-ink/95 p-2 shadow-2xl backdrop-blur"
            >
              <p className="px-3 pb-1 pt-1 text-xs font-semibold text-white/40">Your status</p>
              <div onClick={() => setOpen(false)}>
                <StatusOptions />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
