'use client';

import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

// Subtle "Cipher Protected" end-to-end-encryption badge shown in top bars.
export function CipherBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-violet-600/30 bg-violet-600/10 px-2 py-0.5',
        className
      )}
    >
      <Lock className="h-3 w-3 text-violet-400" strokeWidth={2} />
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-300/80">
        Cipher Protected
      </span>
    </span>
  );
}
