'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, KeyRound, Lock, ShieldAlert } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { createClient } from '@/lib/supabase/client';
import { generateKeyPair, randomSalt, wrapPrivateKey } from '@/lib/crypto';
import { loadKeyPair, storeKeyPair } from '@/lib/keys';

// Landing page for the "forgot password" email link. By the time the user gets
// here, /auth/callback has already exchanged the recovery code for a session,
// so we just set a new password and re-key this device.
export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [historyLost, setHistoryLost] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  // Confirm we actually arrived in a recovery session before showing the form.
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      if (!supabase) { setReady(true); return; }
      const { data } = await supabase.auth.getUser();
      setValidSession(!!data.user);
      setReady(true);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    const supabase = createClient();
    if (!supabase) { setError('Supabase is not configured.'); return; }
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('Your reset link has expired. Request a new one.');

      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) throw pwErr;

      // Re-key: the DB copy of the private key was wrapped with the OLD password,
      // which is now unrecoverable. If this device still has the raw key, re-wrap
      // it and everything survives. Otherwise we mint a fresh key — old messages
      // (sealed to the lost key) can no longer be decrypted.
      const local = loadKeyPair(userId);
      const salt = await randomSalt();
      if (local) {
        const encPrivate = await wrapPrivateKey(local.privateKey, password, salt);
        await supabase.from('profiles').update({ enc_private_key: encPrivate, key_salt: salt, public_key: local.publicKey }).eq('id', userId);
      } else {
        const pair = await generateKeyPair();
        storeKeyPair(userId, pair);
        const encPrivate = await wrapPrivateKey(pair.privateKey, password, salt);
        await supabase.from('profiles').update({ enc_private_key: encPrivate, key_salt: salt, public_key: pair.publicKey }).eq('id', userId);
        setHistoryLost(true);
      }

      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" showText={false} />
          <h1 className="mt-4 text-2xl font-bold">Set a new password</h1>
          <p className="mt-1 text-sm text-white/50">Choose a new password for your Cipher account.</p>
        </div>

        {!ready ? (
          <div className="card p-6 text-center text-sm text-white/50">Checking your reset link…</div>
        ) : done ? (
          <div className="card space-y-4 p-6 text-center">
            <p className="text-sm text-emerald-300">Your password has been updated.</p>
            {historyLost && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/15 px-3 py-2 text-left text-xs text-amber-200">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  This device didn&apos;t have your encryption key, so a new one was created.
                  Messages sent before this reset can&apos;t be decrypted here — new messages are fully secured.
                </span>
              </div>
            )}
            <Link href="/feed" className="btn-primary w-full">
              Continue to Cipher <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : !validSession ? (
          <div className="card space-y-4 p-6 text-center">
            <p className="text-sm text-rose-300">This reset link is invalid or has expired.</p>
            <Link href="/login" className="btn-primary w-full">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="card space-y-4 p-6">
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input className="input pl-11" type="password" placeholder="New password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input className="input pl-11" type="password" placeholder="Confirm new password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>

            {error && <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Updating…' : (<>Update password <ArrowRight className="h-4 w-4" /></>)}
            </button>

            <div className="flex items-center gap-2 rounded-lg bg-cipher-600/10 px-3 py-2 text-xs text-cipher-200">
              <KeyRound className="h-3.5 w-3.5 shrink-0" />
              On this device your history is preserved. On a brand-new device, messages from before the reset may not be recoverable.
            </div>
          </form>
        )}
      </motion.div>
    </main>
  );
}
