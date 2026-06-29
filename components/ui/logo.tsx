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
          'grid place-items-center rounded-[22%] bg-blue transition',
          box
        )}
      >
        <Lock className="h-1/2 w-1/2 text-white" strokeWidth={2.25} />
      </span>
      {showText && (
        <span className={cn('headline tracking-tight', text)}>
          Cipher
        </span>
      )}
    </Link>
  );
}
