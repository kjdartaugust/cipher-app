'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Loader2, X } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useApp } from '@/lib/store';
import { uploadPublic } from '@/lib/supabase/storage';

export function EditProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { me, updateProfile } = useApp();
  const [name, setName] = useState(me.name);
  const [bio, setBio] = useState(me.bio);
  const [avatar, setAvatar] = useState(me.avatar);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUploading(true);
    const url = (await uploadPublic('avatars', f)) ?? URL.createObjectURL(f);
    setAvatar(url);
    setUploading(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ name: name.trim() || me.name, bio: bio.trim(), avatar });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
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
            className="relative w-full max-w-md rounded-2xl glass-strong p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit profile</h2>
              <button onClick={onClose} className="rounded-full p-1.5 text-white/50 hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>

            <div className="mb-5 flex justify-center">
              <button onClick={() => fileRef.current?.click()} className="group relative">
                <Avatar src={avatar} alt={name} size={88} ring />
                <span className="absolute inset-[2px] grid place-items-center rounded-full bg-black/50 opacity-0 transition group-hover:opacity-100">
                  {uploading ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <Camera className="h-6 w-6 text-white" />}
                </span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickAvatar} />
            </div>

            <label className="mb-1 block text-xs text-white/50">Display name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="input" placeholder="Your name" />
            <div className="mb-4 mt-2 flex flex-wrap gap-1">
              {['✨', '🔐', '🌙', '🔥', '💜', '🛰️', '⚡', '🎧', '✷', '👾'].map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setName((n) => (n + e).slice(0, 40))}
                  className="rounded-lg px-1.5 py-1 text-lg transition hover:bg-white/10"
                >
                  {e}
                </button>
              ))}
            </div>

            <label className="mb-1 block text-xs text-white/50">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="input resize-none" placeholder="Tell people about yourself" />

            {error && <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300">{error}</p>}

            <button onClick={save} disabled={saving || uploading} className="btn-primary mt-5 w-full">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
