'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, KeyRound, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { IS_DEMO } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { generateKeyPair, randomSalt, unwrapPrivateKey, wrapPrivateKey } from '@/lib/crypto';
import { ensureKeyPair, loadKeyPair, storeKeyPair } from '@/lib/keys';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
  });

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    // Demo mode authenticates instantly into the seeded "you" account.
    if (IS_DEMO) {
      setTimeout(() => router.push('/feed'), 650);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
          redirectTo: `${location.origin}/auth/callback?next=/auth/reset`,
        });
        if (error) throw error;
        setInfo('If that email has an account, a reset link is on its way. Check your inbox.');
        setLoading(false);
        return;
      }
      if (mode === 'signup') {
        const pair = await generateKeyPair();
        const salt = await randomSalt();
        const encPrivate = await wrapPrivateKey(pair.privateKey, form.password, salt);
        const username = (form.username || form.email.split('@')[0]).toLowerCase().replace(/[^a-z0-9_.]/g, '');
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { username, name: form.name || username, public_key: pair.publicKey },
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (data.user) storeKeyPair(data.user.id, pair);
        // Persist the password-wrapped private key so other devices can recover it.
        if (data.session && data.user) {
          await supabase.from('profiles').update({ enc_private_key: encPrivate, key_salt: salt }).eq('id', data.user.id);
        }
        if (!data.session) {
          setInfo('Check your email to confirm your account, then sign in.');
          setMode('signin');
          setLoading(false);
          return;
        }
        // Hard navigation so the data provider re-boots with the freshly stored key.
        window.location.assign('/feed');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        if (data.user) await recoverKeys(supabase, data.user.id, form.password);
        window.location.assign('/feed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setLoading(false);
    }
  }

  // Recover the user's key pair on this device after sign-in:
  //  1. If a wrapped key is stored, decrypt it with the password (portable — works on any device).
  //  2. Else migrate this device's existing local key by wrapping + uploading it.
  //  3. Else (new device, no stored key) generate a fresh pair and publish it.
  async function recoverKeys(supabase: NonNullable<ReturnType<typeof createClient>>, userId: string, password: string) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('public_key, enc_private_key, key_salt')
      .eq('id', userId)
      .single();

    if (prof?.enc_private_key && prof?.key_salt) {
      try {
        const privateKey = await unwrapPrivateKey(prof.enc_private_key, password, prof.key_salt);
        storeKeyPair(userId, { publicKey: prof.public_key, privateKey });
        return;
      } catch {
        // wrong password or corrupt blob — fall through to local/fresh handling
      }
    }

    const local = loadKeyPair(userId);
    if (local) {
      const salt = await randomSalt();
      const encPrivate = await wrapPrivateKey(local.privateKey, password, salt);
      await supabase.from('profiles').update({ enc_private_key: encPrivate, key_salt: salt, public_key: local.publicKey }).eq('id', userId);
      return;
    }

    const { pair } = await ensureKeyPair(userId);
    const salt = await randomSalt();
    const encPrivate = await wrapPrivateKey(pair.privateKey, password, salt);
    await supabase.from('profiles').update({ public_key: pair.publicKey, enc_private_key: encPrivate, key_salt: salt }).eq('id', userId);
  }

  return (
    <main className="relative grid min-h-screen place-items-center px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" showText={false} />
          <h1 className="mt-4 text-2xl font-bold">
            {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {mode === 'signin'
              ? 'Sign in to your encrypted social space.'
              : mode === 'signup'
              ? 'Join Cipher — privacy is the default.'
              : 'Enter your email and we’ll send you a reset link.'}
          </p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          {mode === 'signup' && (
            <>
              <Field icon={User} placeholder="Username" value={form.username} onChange={set('username')} />
              <Field icon={User} placeholder="Display name" value={form.name} onChange={set('name')} />
            </>
          )}
          <Field icon={Mail} type="email" placeholder="Email" required value={form.email} onChange={set('email')} />
          {mode !== 'reset' && (
            <Field icon={Lock} type="password" placeholder="Password" required minLength={6} value={form.password} onChange={set('password')} />
          )}

          {mode === 'signin' && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => { setMode('reset'); setError(null); setInfo(null); }}
                className="text-xs font-medium text-cipher-300 hover:text-cipher-200"
              >
                Forgot password?
              </button>
            </div>
          )}

          {error && <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300">{error}</p>}
          {info && <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs text-emerald-300">{info}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (mode === 'reset' ? 'Sending…' : 'Generating keys…') : (
              <>
                {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          {mode !== 'reset' && (
            <div className="flex items-center gap-2 rounded-lg bg-cipher-600/10 px-3 py-2 text-xs text-cipher-200">
              <KeyRound className="h-3.5 w-3.5 shrink-0" />
              A unique encryption key pair is generated on your device at sign-up.
            </div>
          )}
        </form>

        <p className="mt-5 text-center text-sm text-white/50">
          {mode === 'reset' ? (
            <button
              onClick={() => { setMode('signin'); setError(null); setInfo(null); }}
              className="font-semibold text-cipher-300 hover:text-cipher-200"
            >
              ← Back to sign in
            </button>
          ) : (
            <>
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setInfo(null); }}
                className="font-semibold text-cipher-300 hover:text-cipher-200"
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </>
          )}
        </p>

        {IS_DEMO && (
          <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-white/35">
            <ShieldCheck className="h-3.5 w-3.5" />
            Demo mode — any details sign you into the sample account.
          </div>
        )}
        <p className="mt-4 text-center">
          <Link href="/" className="text-xs text-white/40 hover:text-white/70">← Back to home</Link>
        </p>
      </motion.div>
    </main>
  );
}

function Field({
  icon: Icon,
  ...props
}: { icon: typeof Mail } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
      <input className="input pl-11" {...props} />
    </div>
  );
}
