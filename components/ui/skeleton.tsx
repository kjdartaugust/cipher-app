'use client';

import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer animate-shimmer rounded-lg', className)} />;
}

// A premium app-shell placeholder shown while keys generate / data loads.
export function FeedSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[640px] border-x border-white/10">
      <div className="border-b border-white/10 px-5 pb-3 pt-5 sm:px-8">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-8 w-40" />
      </div>
      {/* moments row */}
      <div className="flex gap-5 border-b border-white/10 px-5 py-5 sm:px-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-2.5 w-10" />
          </div>
        ))}
      </div>
      {/* cards */}
      <div className="space-y-8 p-5 sm:px-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
            <Skeleton className="h-[clamp(280px,40vh,360px)] w-full rounded-2xl" />
            <div className="flex gap-6">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
