'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({
  href = '/',
  size = 'md',
  showText = true,
}: {
  href?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}) {
  const box = size === 'lg' ? 'h-11 w-11' : size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  const text = size === 'lg' ? 'text-2xl' : 'text-xl';
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5">
      <span
        className={cn(
          'grid place-items-center rounded-xl bg-cipher-gradient shadow-lg shadow-cipher-600/30 transition group-hover:shadow-cipher-600/50',
          box
        )}
      >
        <Lock className="h-1/2 w-1/2 text-white" strokeWidth={2.5} />
      </span>
      {showText && (
        <span className={cn('font-bold tracking-tight', text)}>
          Cipher
        </span>
      )}
    </Link>
  );
}
