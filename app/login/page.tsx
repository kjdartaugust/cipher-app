'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, KeyRound, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { IS_DEMO } from '@/lib/config';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Demo mode authenticates instantly into the seeded "you" account.
    setTimeout(() => router.push('/feed'), 650);
  }

  return (
    <main className="relative grid min-h-screen place-items-center px-6 py-12">
      <div className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-cipher-600/25 blur-[130px]" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" showText={false} />
          <h1 className="mt-4 text-2xl font-bold">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {mode === 'signin'
              ? 'Sign in to your encrypted social space.'
              : 'Join Cipher — privacy is the default.'}
          </p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          {mode === 'signup' && (
            <Field icon={User} placeholder="Username" defaultValue="you" />
          )}
          <Field icon={Mail} type="email" placeholder="Email" defaultValue="you@cipher.app" />
          <Field icon={Lock} type="password" placeholder="Password" defaultValue="encrypted" />

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              'Generating keys…'
            ) : (
              <>
                {mode === 'signin' ? 'Sign in' : 'Create account'}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="flex items-center gap-2 rounded-lg bg-cipher-600/10 px-3 py-2 text-xs text-cipher-200">
            <KeyRound className="h-3.5 w-3.5 shrink-0" />
            A unique encryption key pair is generated on your device at sign-up.
          </div>
        </form>

        <p className="mt-5 text-center text-sm text-white/50">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="font-semibold text-cipher-300 hover:text-cipher-200"
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        {IS_DEMO && (
          <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-white/35">
            <ShieldCheck className="h-3.5 w-3.5" />
            Demo mode — any details sign you into the sample account.
          </div>
        )}
        <p className="mt-4 text-center">
          <Link href="/" className="text-xs text-white/40 hover:text-white/70">
            ← Back to home
          </Link>
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
