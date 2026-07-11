'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Check, Loader2, LogOut, Pencil, Plus, UserMinus, X } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useApp } from '@/lib/store';
import { resolveStatus } from '@/lib/presence';
import { uploadPublic } from '@/lib/supabase/storage';
import type { Conversation } from '@/lib/types';

// Group info + management sheet: rename, avatar, add/remove members, leave.
export function GroupPanel({ conv, open, onClose }: { conv: Conversation; open: boolean; onClose: () => void }) {
  const { me, users, userById, blocked, renameGroup, setGroupAvatar, addGroupMembers, removeGroupMember, leaveGroup, presence } = useApp();
  const router = useRouter();
  const [name, setName] = useState(conv.name ?? '');
  const [editingName, setEditingName] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const members = conv.memberIds.map(userById);
  const candidates = users.filter(
    (u) => u.id !== me.id && !conv.memberIds.includes(u.id) && !blocked.includes(u.id)
  );

  async function guard(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setBusy(false); }
  }

  async function saveName() {
    if (name.trim() && name.trim() !== conv.name) await guard(() => renameGroup(conv.id, name.trim()));
    setEditingName(false);
  }

  async function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    const url = (await uploadPublic('avatars', f)) ?? URL.createObjectURL(f);
    await guard(() => setGroupAvatar(conv.id, url));
  }

  async function leave() {
    await guard(() => leaveGroup(conv.id));
    onClose();
    router.push('/messages');
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70" onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            className="relative ml-auto flex h-full w-full max-w-sm flex-col border-l border-white/10 bg-black"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="headline text-lg">Group info</h2>
              <button onClick={onClose} className="rounded-full p-1.5 text-white/50 hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* avatar + name */}
              <div className="flex flex-col items-center text-center">
                <button onClick={() => fileRef.current?.click()} className="group relative">
                  <Avatar src={conv.avatar ?? members.find((m) => m.id !== me.id)?.avatar ?? ''} alt={name} size={88} ring />
                  <span className="absolute inset-[2px] grid place-items-center rounded-full bg-black/50 opacity-0 transition group-hover:opacity-100">
                    {busy ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <Camera className="h-6 w-6 text-white" />}
                  </span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickAvatar} />

                {editingName ? (
                  <div className="mt-3 flex items-center gap-2">
                    <input value={name} onChange={(e) => setName(e.target.value)} autoFocus className="input py-1.5 text-center" />
                    <button onClick={saveName} className="rounded-lg bg-violet-600 p-2 text-white"><Check className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => setEditingName(true)} className="mt-3 flex items-center gap-1.5">
                    <span className="headline text-xl">{conv.name ?? 'Group'}</span>
                    <Pencil className="h-3.5 w-3.5 text-white/40" />
                  </button>
                )}
                <p className="kicker mt-1">{conv.memberIds.length} members</p>
              </div>

              {error && <p className="mt-4 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300">{error}</p>}

              {/* members */}
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <p className="kicker">Members</p>
                  <button onClick={() => setAdding((a) => !a)} className="flex items-center gap-1 text-xs font-semibold text-violet-300">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>

                <AnimatePresence>
                  {adding && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-3 overflow-hidden rounded-xl border border-white/10">
                      {candidates.length === 0 && <p className="p-3 text-xs text-white/40">No one left to add.</p>}
                      {candidates.map((u) => (
                        <button key={u.id} disabled={busy} onClick={() => guard(() => addGroupMembers(conv.id, [u.id]))} className="flex w-full items-center gap-3 px-3 py-2 hover:bg-white/5">
                          <Avatar src={u.avatar} alt={u.name} size={32} />
                          <span className="flex-1 truncate text-left text-sm">{u.name}</span>
                          <Plus className="h-4 w-4 text-violet-300" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-1">
                  {members.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.03]">
                      <Avatar src={u.avatar} alt={u.name} size={40} status={resolveStatus(presence[u.id], u.online)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{u.id === me.id ? 'You' : u.name}</p>
                        <p className="truncate text-xs text-white/40">@{u.username}</p>
                      </div>
                      {u.id !== me.id && (
                        <button onClick={() => guard(() => removeGroupMember(conv.id, u.id))} disabled={busy} className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-rose-300" title="Remove">
                          <UserMinus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 p-4">
              <button onClick={leave} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 py-2.5 text-sm font-semibold text-rose-300 hover:bg-rose-500/20">
                <LogOut className="h-4 w-4" /> Leave group
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
