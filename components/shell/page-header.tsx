'use client';

import { CipherBadge } from '@/components/ui/cipher-badge';

export function PageHeader({
  title,
  kicker,
  action,
  children,
}: {
  title: string;
  kicker?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black">
      <div className="flex items-center justify-between px-5 pt-3 sm:px-8">
        <CipherBadge />
        {action}
      </div>
      <div className="px-5 pb-3 sm:px-8">
        {kicker && <p className="kicker mb-1">{kicker}</p>}
        <h1 className="headline text-3xl leading-none sm:text-4xl">{title}</h1>
      </div>
      {children}
    </header>
  );
}
