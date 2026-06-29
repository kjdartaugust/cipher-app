'use client';

export function PageHeader({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink/70 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-3.5 sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {action}
      </div>
      {children}
    </header>
  );
}
