'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Avatar({
  src,
  alt,
  size = 40,
  ring,
  online,
  className,
}: {
  src: string;
  alt: string;
  size?: number;
  ring?: boolean;
  online?: boolean;
  className?: string;
}) {
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
      {online && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-ink bg-green-400" />
      )}
    </span>
  );
}
