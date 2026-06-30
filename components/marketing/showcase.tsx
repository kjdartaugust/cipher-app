'use client';

import { motion } from 'framer-motion';
import { Heart, Lock, MessageCircle, X } from 'lucide-react';

const avatar = (seed: string) =>
  `https://api.dicebear.com/9.x/glass/svg?seed=${seed}&backgroundColor=6D28D9,7C3AED,4C1D95`;
const photo = (id: string, w = 600, h = 700) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

const rise = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

export function Showcase() {
  return (
    <section className="mx-auto max-w-6xl space-y-24 px-6 pb-28">
      <Band
        kicker="Today Board"
        title="Swipe through your circle."
        body="One post at a time, full-screen. Swipe right to like, left to skip — or just tap to open. A feed that respects your attention instead of farming it."
        screen={<TodayBoardMock />}
      />
      <Band
        reverse
        kicker="Moments"
        title="Say it, then let it vanish."
        body="Drop an encrypted text or voice mood that pulses around your avatar and disappears in six hours. No camera, no filters — just whatever you’re feeling, for your circle only."
        screen={<MomentMock />}
      />
      <Band
        kicker="Pulse"
        title="See who’s around, live."
        body="Real-time presence for the people you trust — online, in a Cipher, or away — with their latest moment. Powered by live websockets, not guesswork."
        screen={<PulseMock />}
      />
    </section>
  );
}

function Band({ kicker, title, body, screen, reverse }: { kicker: string; title: string; body: string; screen: React.ReactNode; reverse?: boolean }) {
  return (
    <div className={`grid items-center gap-10 sm:grid-cols-2 ${reverse ? 'sm:[&>*:first-child]:order-2' : ''}`}>
      <motion.div variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="flex justify-center">
        {screen}
      </motion.div>
      <motion.div variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
        <p className="kicker mb-3">{kicker}</p>
        <h2 className="headline text-balance text-4xl leading-tight sm:text-5xl">{title}</h2>
        <p className="mt-4 max-w-md text-white/55">{body}</p>
      </motion.div>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-[300px]">
      <div className="pointer-events-none absolute inset-x-10 top-10 -z-10 h-44 rounded-full bg-violet-600/15 blur-[44px]" />
      <div className="overflow-hidden rounded-[2rem] border border-white/15 bg-black p-2 shadow-2xl shadow-violet-900/30">
        <div className="overflow-hidden rounded-[1.5rem] border border-white/10">{children}</div>
      </div>
    </div>
  );
}

function TodayBoardMock() {
  return (
    <Frame>
      <div className="bg-black p-3">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo('1470770841072-f978cf4d019e')} alt="" className="h-44 w-full object-cover" />
          <div className="p-3.5">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatar('mei')} alt="" className="h-8 w-8 rounded-full" />
              <div>
                <p className="text-xs font-bold">Mei Lin</p>
                <p className="text-[10px] uppercase tracking-wide text-white/40">@mei.lin · 5h</p>
              </div>
            </div>
            <p className="mt-2.5 text-[13px] leading-snug text-white/85">Golden hour never misses. Shot on a quiet rooftop last night ✨</p>
            <div className="mt-3 flex items-center gap-4 text-[11px] text-white/45">
              <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" strokeWidth={1.5} /> 128</span>
              <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} /> 12</span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-5">
          <span className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-surface text-white/60"><X className="h-5 w-5" strokeWidth={1.75} /></span>
          <span className="text-[10px] text-white/30">1 / 6</span>
          <span className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-surface text-violet-300"><Heart className="h-5 w-5" strokeWidth={1.75} /></span>
        </div>
      </div>
    </Frame>
  );
}

function MomentMock() {
  return (
    <Frame>
      <div className="relative aspect-[9/16] bg-gradient-to-b from-violet-900/50 via-black to-black">
        <div className="absolute inset-x-0 top-0 flex gap-1 p-3">
          <span className="h-0.5 flex-1 rounded-full bg-white" />
          <span className="h-0.5 flex-1 rounded-full bg-white/30"><span className="block h-full w-1/2 rounded-full bg-white" /></span>
          <span className="h-0.5 flex-1 rounded-full bg-white/30" />
        </div>
        <div className="absolute inset-x-0 top-0 flex items-center gap-2 px-3 pt-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatar('zane')} alt="" className="h-7 w-7 rounded-full" />
          <p className="text-xs font-semibold text-white">zane</p>
          <p className="text-[10px] text-white/50">2h</p>
        </div>
        <div className="grid h-full place-items-center px-7">
          <p className="headline text-center text-2xl leading-snug text-white">studio till sunrise. this one’s different 🎧</p>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1.5 p-3">
          {['❤️', '🔥', '😮', '👏', '💜'].map((e) => <span key={e} className="text-base">{e}</span>)}
        </div>
      </div>
    </Frame>
  );
}

function PulseMock() {
  const people = [
    { seed: 'aria', name: 'Aria', status: 'online now', ring: '#22c55e', color: 'text-green-400', mood: '🔐' },
    { seed: 'kojo', name: 'Kojo', status: 'in a Cipher', ring: '#6D28D9', color: 'text-violet-300', mood: '✷' },
    { seed: 'lena', name: 'Lena', status: 'away', ring: '#3f3f46', color: 'text-white/35', mood: '✈️' },
    { seed: 'dev', name: 'Dev', status: 'online now', ring: '#22c55e', color: 'text-green-400', mood: '☕' },
  ];
  return (
    <Frame>
      <div className="bg-black p-4">
        <p className="kicker mb-3">Your circle · right now</p>
        <div className="grid grid-cols-2 gap-2.5">
          {people.map((p) => (
            <div key={p.seed} className="flex flex-col items-center rounded-2xl border border-white/10 bg-surface/60 p-3 text-center">
              <span className="relative block rounded-full" style={{ boxShadow: `0 0 0 2px #000, 0 0 0 4px ${p.ring}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatar(p.seed)} alt="" className="h-12 w-12 rounded-full" />
                <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border border-white/10 bg-black text-[11px]">{p.mood}</span>
              </span>
              <p className="mt-2 text-xs font-semibold">{p.name}</p>
              <p className={`text-[9px] font-medium uppercase tracking-wide ${p.color}`}>{p.status}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5 rounded-full border border-white/10 py-2 text-[10px] text-white/40">
          <Lock className="h-3 w-3 text-violet-400/60" /> Found only by username
        </div>
      </div>
    </Frame>
  );
}
