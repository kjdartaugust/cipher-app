'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Search, Users, X } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useApp } from '@/lib/store';

export function NewChatModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { users, me, createConversation, blocked } = useApp();
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default to your connections; reveal anyone else only by searching a username.
  const q = query.trim().toLowerCase();
  const candidates = users.filter((u) => {
    if (u.id === me.id || blocked.includes(u.id)) return false;
    if (q.length >= 2) return u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q);
    return me.following.includes(u.id) || u.followers.includes(me.id);
  });

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((i) => i !== id) : [...s, id]));
  }

  async function start() {
    if (selected.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const isGroup = selected.length > 1;
      const id = await createConversation(selected, isGroup ? groupName || 'New group' : undefined);
      reset();
      onClose();
      router.push(`/messages/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the chat.');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setSelected([]);
    setQuery('');
    setGroupName('');
    setError(null);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl glass-strong p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">New message</h2>
              <button onClick={onClose} className="rounded-full p-1.5 text-white/50 hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>

            {selected.length > 1 && (
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name (optional)"
                className="input mb-3"
              />
            )}

            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Your circle, or search a username" className="input pl-11" />
            </div>

            <div className="-mx-1 flex-1 overflow-y-auto">
              {candidates.length === 0 && (
                <p className="px-1 py-6 text-center text-xs text-white/40">
                  {q.length >= 2 ? 'No one matches that username.' : 'Search a username to start a chat with someone new.'}
                </p>
              )}
              {candidates.map((u) => {
                const on = selected.includes(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => toggle(u.id)}
                    className="flex w-full items-center gap-3 rounded-xl px-1 py-2 transition hover:bg-white/5"
                  >
                    <Avatar src={u.avatar} alt={u.name} size={42} online={u.online} />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-medium">{u.name}</p>
                      <p className="truncate text-xs text-white/40">@{u.username}</p>
                    </div>
                    <span className={`grid h-6 w-6 place-items-center rounded-full border ${on ? 'border-cipher-500 bg-cipher-600' : 'border-white/20'}`}>
                      {on && <Check className="h-4 w-4 text-white" />}
                    </span>
                  </button>
                );
              })}
            </div>

            {error && <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300">{error}</p>}

            <button onClick={start} disabled={selected.length === 0 || busy} className="btn-primary mt-4 w-full">
              {selected.length > 1 ? <Users className="h-4 w-4" /> : null}
              {busy ? 'Starting…' : selected.length > 1 ? `Start group (${selected.length})` : 'Start chat'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
