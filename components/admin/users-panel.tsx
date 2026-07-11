'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, ShieldCheck, UserX } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { lastSeenLabel } from '@/lib/presence';
import { cn } from '@/lib/utils';

type AdminUser = {
  id: string; username: string; name: string; avatar: string | null;
  verified: boolean; isAdmin: boolean;
  suspended: boolean; suspendedAt: number | null; suspendedReason: string;
  lastSeenAt: number | null; createdAt: number;
};

export function UsersPanel() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<AdminUser | null>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Could not load users.');
      setUsers((await res.json()).users);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  // debounce so typing doesn't fire a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q, load]);

  async function setSuspended(user: AdminUser, suspended: boolean, reason: string) {
    setError('');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, suspended, reason }),
    });
    const body = await res.json();
    if (!res.ok) { setError(body.error ?? 'Could not update user.'); return; }
    setConfirming(null);
    load(q);
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 rounded-2xl border border-white/10 px-3.5 py-2.5 focus-within:border-cipher-500/50">
        <Search className="h-4 w-4 shrink-0 text-white/35" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or @username"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/30"
        />
      </label>

      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}
      {loading && <p className="py-8 text-center text-sm text-white/40">Loading…</p>}
      {!loading && !users.length && <p className="py-8 text-center text-sm text-white/40">No users found.</p>}

      {users.map((u) => (
        <div
          key={u.id}
          className={cn(
            'flex items-center gap-3 rounded-2xl border p-3',
            u.suspended ? 'border-amber-500/30 bg-amber-500/[0.06]' : 'border-white/10'
          )}
        >
          <Avatar src={u.avatar ?? ''} alt={u.name} size={40} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
              {u.name}
              {u.isAdmin && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-cipher-300" aria-label="Admin" />}
            </p>
            <p className="truncate text-xs text-white/40">
              @{u.username} · {u.lastSeenAt ? lastSeenLabel(u.lastSeenAt).replace('Active ', 'seen ') : 'never seen'}
            </p>
            {u.suspended && (
              <p className="mt-0.5 truncate text-xs text-amber-400">
                Suspended{u.suspendedReason ? ` — ${u.suspendedReason}` : ''}
              </p>
            )}
          </div>

          {u.isAdmin ? (
            <span className="shrink-0 text-[11px] text-white/25">admin</span>
          ) : u.suspended ? (
            <button
              onClick={() => setSuspended(u, false, '')}
              className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium transition hover:bg-white/10"
            >
              Reinstate
            </button>
          ) : (
            <button
              onClick={() => setConfirming(u)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-amber-500/40 hover:text-amber-300"
            >
              <UserX className="h-3.5 w-3.5" /> Suspend
            </button>
          )}
        </div>
      ))}

      {confirming && <SuspendDialog user={confirming} onCancel={() => setConfirming(null)} onConfirm={(reason) => setSuspended(confirming, true, reason)} />}
    </div>
  );
}

function SuspendDialog({
  user, onCancel, onConfirm,
}: {
  user: AdminUser;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-black p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">Suspend @{user.username}?</h3>
        <p className="mt-2 text-xs leading-relaxed text-white/55">
          They&apos;ll still be able to sign in and see that they&apos;ve been suspended, but they will not be
          able to send messages, post, comment or drop moments. This is enforced in the database, not
          just hidden in the app.
        </p>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-cipher-500/50"
        />
        <div className="mt-4 flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-full border border-white/15 py-2.5 text-sm font-medium transition hover:bg-white/10">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="flex-1 rounded-full bg-amber-500 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400"
          >
            Suspend
          </button>
        </div>
      </div>
    </div>
  );
}
