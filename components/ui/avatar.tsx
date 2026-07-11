'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { dotClass, type PresenceStatus } from '@/lib/presence';

export function Avatar({
  src,
  alt,
  size = 40,
  ring,
  online,
  status,
  className,
}: {
  src: string;
  alt: string;
  size?: number;
  ring?: boolean;
  online?: boolean;
  status?: PresenceStatus | null; // live presence — takes precedence over `online`
  className?: string;
}) {
  // `status` (live presence) wins; fall back to the legacy `online` bool.
  const dot = status ? dotClass(status) : online ? 'bg-green-400' : '';
  return (
    <span
      className={cn('relative inline-block shrink-0', ring && 'story-ring rounded-full p-[2px]', className)}
      style={{ width: size, height: size }}
    >
      <span className={cn('block h-full w-full overflow-hidden rounded-full', ring && 'border-2 border-ink')}>
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized
        />
      </span>
      {dot && (
        <span className={cn('absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-ink', dot)} />
      )}
    </span>
  );
}
