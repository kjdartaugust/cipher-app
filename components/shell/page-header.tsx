'use client';

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
      <div className="flex items-end justify-between px-5 pb-3 pt-5 sm:px-8">
        <div>
          {kicker && <p className="kicker mb-1">{kicker}</p>}
          <h1 className="headline text-3xl leading-none sm:text-4xl">{title}</h1>
        </div>
        {action}
      </div>
      {children}
    </header>
  );
}
