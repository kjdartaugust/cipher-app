'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  EyeOff,
  Layers,
  Lock,
  Mic,
  Radio,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { AppPreview } from '@/components/marketing/app-preview';
import { Showcase } from '@/components/marketing/showcase';

const features = [
  { icon: Lock, title: 'Messages only you can read', body: 'Every DM and group chat is encrypted on your device with libsodium. The server only ever holds ciphertext.' },
  { icon: EyeOff, title: 'Private by default', body: 'No public directory. You’re invisible until someone who knows your username searches for you.' },
  { icon: Radio, title: 'Pulse', body: 'See your circle in real time — who’s online, who’s in a Cipher, who’s away. Live presence, no refresh.' },
  { icon: Zap, title: 'Moments', body: 'Drop an encrypted text or voice mood that pulses around your avatar and vanishes in six hours.' },
  { icon: Layers, title: 'Today Board', body: 'Swipe through your circle’s posts one card at a time — right to like, left to skip.' },
  { icon: Mic, title: 'Real voice notes', body: 'Record straight from the mic, encrypted end-to-end, with true waveform playback.' },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function Landing() {
  return (
    <main className="relative overflow-hidden">
      {/* nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo size="md" />
        <nav className="flex items-center gap-4">
          <Link href="/login" className="hidden text-sm text-white/60 hover:text-white sm:block">Sign in</Link>
          <Link href="/feed" className="btn-primary text-sm">Enter <ArrowRight className="h-4 w-4" /></Link>
        </nav>
      </header>

      {/* hero */}
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-16 text-center sm:pt-24">
        <motion.div initial="hidden" animate="show" variants={container}>
          <motion.div variants={item} className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-600/30 bg-violet-600/10 px-4 py-1.5 text-xs font-medium text-violet-200">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            Invitation-only · end-to-end encrypted
          </motion.div>

          <motion.h1 variants={item} className="headline text-balance text-6xl leading-[0.95] sm:text-8xl">
            A private club for the<br className="hidden sm:block" /> people you{' '}
            <span className="text-violet-500">actually trust</span>.
          </motion.h1>

          <motion.p variants={item} className="mx-auto mt-7 max-w-xl text-balance text-lg text-white/55">
            Cipher is a social network where nothing is public and nothing is readable by the
            server. Encrypted messages, live presence, disappearing moments — for your circle only.
          </motion.p>

          <motion.div variants={item} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/feed" className="btn-primary w-full px-7 py-3 text-base sm:w-auto">Enter the demo <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/login" className="btn-ghost w-full px-7 py-3 text-base sm:w-auto">Create account</Link>
          </motion.div>
          <motion.p variants={item} className="mt-4 text-xs text-white/35">
            No signup required — the demo runs entirely in your browser with live encryption.
          </motion.p>
        </motion.div>
      </section>

      {/* animated app preview */}
      <AppPreview />

      {/* features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={container}
          className="grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={item} className="group bg-black p-7 transition hover:bg-surface">
              <div className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-violet-600/15 text-violet-300 transition group-hover:bg-violet-600/25">
                <f.icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{f.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* scrolling screen showcase */}
      <Showcase />

      {/* encryption explainer */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid items-center gap-10 rounded-3xl border border-white/10 bg-surface p-8 sm:grid-cols-2 sm:p-12">
          <div>
            <p className="kicker mb-3">Zero-knowledge</p>
            <h2 className="headline text-4xl leading-tight">
              Your keys.<br /><span className="text-violet-500">Your messages.</span>
            </h2>
            <p className="mt-4 text-white/55">
              Each conversation gets a unique key, sealed to every member’s public key. Messages are
              encrypted before they leave your device — so Cipher’s servers only ever see noise.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {['Curve25519 sealed key exchange', 'XSalsa20-Poly1305 messages', 'Password-portable keys across devices', 'Safety-number verification'].map((t) => (
                <li key={t} className="flex items-center gap-3 text-white/75"><ShieldCheck className="h-4 w-4 shrink-0 text-violet-400" /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black p-5 font-mono text-xs leading-relaxed">
            <div className="text-violet-400">// what the server stores</div>
            <pre className="mt-2 whitespace-pre-wrap break-all text-white/45">
{`{
  "sender": "u_aria",
  "ciphertext": "iD8m+Lq9...e3Vd2A==",
  "nonce": "9bX1pQ7r...kK2w==",
  "sealed_key": "tT4f...0pZ="
}`}
            </pre>
            <div className="mt-4 text-violet-400">// what your circle reads</div>
            <div className="mt-2 rounded-lg border border-violet-600/30 bg-violet-600/10 px-3 py-2 text-soft">
              “Pushed the crypto module, please review 🙏”
            </div>
          </div>
        </div>
      </section>

      {/* closing CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="flex flex-col items-center gap-6 rounded-3xl border border-violet-600/30 bg-violet-600/[0.06] px-6 py-16 text-center">
          <Lock className="h-8 w-8 text-violet-400" strokeWidth={1.75} />
          <h2 className="headline text-balance text-4xl sm:text-5xl">Step inside the club.</h2>
          <p className="max-w-md text-white/55">Spin up a sample account in one tap — full encryption, live, in your browser.</p>
          <Link href="/feed" className="btn-primary px-7 py-3 text-base">Enter Cipher <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10 text-center text-sm text-white/40">
        <Logo size="sm" />
        <p className="mt-3">Cipher — Private. Encrypted. Yours.</p>
      </footer>
    </main>
  );
}
