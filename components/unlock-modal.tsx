'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Lock } from 'lucide-react';
import { useApp } from '@/lib/store';

// Shown when this device's key can't decrypt the account's messages (e.g. a new
// device, or a session restored without a local key). Recovers the key pair from
// the password-wrapped copy stored server-side.
export function UnlockModal() {
  const { unlock, signOut } = useApp();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError(null);
    const ok = await unlock(password);
    if (!ok) {
      setError('Incorrect password, or no recoverable key for this account.');
      setBusy(false);
    }
    // On success the modal disappears as needsUnlock flips to false.
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/90 px-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl glass-strong p-6 text-center"
      >
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-cipher-gradient">
          <Lock className="h-7 w-7 text-white" />
        </div>
        <h2 className="headline text-2xl">Unlock your messages</h2>
        <p className="mt-2 text-sm text-white/55">
          Enter your password to recover your encryption key on this device. Your
          key is decrypted locally — the server never sees it.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3 text-left">
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="input pl-11"
            />
          </div>
          {error && <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300">{error}</p>}
          <button type="submit" disabled={busy || !password} className="btn-primary w-full">
            {busy ? 'Unlocking…' : 'Unlock'}
          </button>
        </form>

        <button onClick={signOut} className="mt-4 text-xs text-white/40 hover:text-white/70">
          Sign out instead
        </button>
      </motion.div>
    </div>
  );
}
