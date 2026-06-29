'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bell,
  Compass,
  Image as ImageIcon,
  Lock,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';

const features = [
  {
    icon: Lock,
    title: 'End-to-end encrypted',
    body: 'Every DM and group chat is encrypted on your device with libsodium. The server only ever stores ciphertext.',
  },
  {
    icon: ImageIcon,
    title: 'Social feed & stories',
    body: 'Post photos, videos and updates. Share 24-hour stories with reactions and viewer insights.',
  },
  {
    icon: MessageSquare,
    title: 'Rich messaging',
    body: 'Voice notes, file sharing, reactions, replies, read receipts and live typing indicators.',
  },
  {
    icon: Users,
    title: 'Follow & connect',
    body: 'Followers, following, mutual friends and suggested people — your network, your way.',
  },
  {
    icon: Compass,
    title: 'Discover',
    body: 'Trending posts, suggested friends and powerful search to find your people.',
  },
  {
    icon: Bell,
    title: 'Real-time alerts',
    body: 'Instant notifications for likes, comments, follows and new encrypted messages.',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Landing() {
  return (
    <main className="relative overflow-hidden">
      {/* nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo size="md" />
        <nav className="flex items-center gap-3">
          <Link href="/login" className="hidden text-sm text-white/70 hover:text-white sm:block">
            Sign in
          </Link>
          <Link href="/feed" className="btn-primary text-sm">
            Enter Cipher <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      {/* hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-12 sm:pt-20">
        <motion.div
          initial="hidden"
          animate="show"
          variants={container}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div variants={item} className="mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-white/70">
            <ShieldCheck className="h-3.5 w-3.5 text-cipher-400" />
            Zero-knowledge by design — we never see your messages
          </motion.div>
          <motion.h1
            variants={item}
            className="text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl"
          >
            The social network that{' '}
            <span className="cipher-text-gradient">keeps your secrets</span>.
          </motion.h1>
          <motion.p variants={item} className="mx-auto mt-6 max-w-xl text-balance text-lg text-white/60">
            Cipher blends a beautiful social experience with uncompromising privacy.
            Share your world publicly — and message privately with end-to-end encryption.
          </motion.p>
          <motion.div variants={item} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/feed" className="btn-primary w-full sm:w-auto">
              <Sparkles className="h-4 w-4" /> Launch the demo
            </Link>
            <Link href="/login" className="btn-ghost w-full sm:w-auto">
              Create account
            </Link>
          </motion.div>
          <motion.p variants={item} className="mt-4 text-xs text-white/40">
            No signup required — the demo runs fully in your browser with live encryption.
          </motion.p>
        </motion.div>

      </section>

      {/* features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          variants={container}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={item} className="card group transition hover:bg-white/[0.06]">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-cipher-600/15 text-cipher-300 transition group-hover:bg-cipher-600/25">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-white/55">{f.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* encryption explainer */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="card grid items-center gap-8 p-8 sm:grid-cols-2 sm:p-12">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Your keys. <span className="cipher-text-gradient">Your messages.</span>
            </h2>
            <p className="mt-4 text-white/60">
              Every conversation gets a unique symmetric key, sealed to each member’s
              public key. Messages are encrypted before they ever leave your device —
              so even Cipher’s servers only see scrambled ciphertext.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                'Curve25519 sealed key exchange',
                'XSalsa20-Poly1305 message encryption',
                'Safety-number verification',
                'On-device key storage',
              ].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-cipher-400" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-5 font-mono text-xs leading-relaxed text-white/70">
            <div className="text-cipher-300">// what the server stores</div>
            <pre className="mt-2 whitespace-pre-wrap break-all text-white/50">
{`{
  "sender": "u_aria",
  "ciphertext": "iD8m+Lq9...e3Vd2A==",
  "nonce": "9bX1pQ7r...kK2w==",
  "sealed_key": "tT4f...0pZ="
}`}
            </pre>
            <div className="mt-4 text-cipher-300">// what you read</div>
            <div className="mt-2 rounded-lg bg-cipher-600/15 px-3 py-2 text-soft">
              “Pushed the crypto module, please review 🙏”
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-10 text-center text-sm text-white/40">
        <Logo size="sm" />
        <p className="mt-3">Cipher — Private. Encrypted. Social. · Demo build</p>
      </footer>
    </main>
  );
}
