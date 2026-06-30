'use client';

import { motion } from 'framer-motion';
import {
  Bell,
  Compass,
  Home,
  Lock,
  MessageCircle,
  Play,
  User,
} from 'lucide-react';

const avatar = (seed: string) =>
  `https://api.dicebear.com/9.x/glass/svg?seed=${seed}&backgroundColor=6D28D9,7C3AED,4C1D95`;

const float = (delay: number) => ({
  animate: { y: [0, -10, 0] },
  transition: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay },
});

// A pixel-accurate, animated mock of Cipher — no image assets, pure markup.
export function AppPreview() {
  return (
    <div className="relative mx-auto flex max-w-md justify-center px-6 pb-24">
      {/* soft violet halo */}
      <div className="pointer-events-none absolute inset-x-10 top-10 -z-10 h-72 rounded-full bg-violet-600/20 blur-[90px]" />

      {/* phone */}
      <motion.div
        initial={{ opacity: 0, y: 30, rotate: -1 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-[300px] rounded-[2.4rem] border border-white/15 bg-black p-2 shadow-2xl shadow-violet-900/30"
      >
        <div className="overflow-hidden rounded-[1.9rem] border border-white/10 bg-black">
          {/* chat header */}
          <div className="flex items-center gap-2.5 border-b border-white/10 px-3.5 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatar('aria')} alt="" className="h-9 w-9 rounded-full" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Aria Mensah</p>
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-600/30 bg-violet-600/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-violet-300/80">
                <Lock className="h-2 w-2" /> Cipher Protected
              </span>
            </div>
          </div>

          {/* messages */}
          <div className="space-y-3 px-3.5 py-4">
            <Row name="Aria" text="pushed the crypto module — please review 🙏" time="9:24" />
            <Row mine text="reviewing now 👀" time="9:25" />
            <VoiceRow time="9:26" />
            <Row mine text="sealed-key flow is clean 🔐" time="9:27" />
          </div>

          {/* command bar */}
          <div className="flex justify-center px-3.5 pb-4 pt-1">
            <div className="frost flex items-center gap-1 rounded-full border border-white/10 px-1.5 py-1.5">
              {[Home, Compass, MessageCircle, Bell, User].map((Icon, i) => (
                <span key={i} className="relative grid h-8 w-8 place-items-center rounded-full">
                  {i === 2 && <span className="glow-violet absolute inset-0 rounded-full bg-violet-600/20" />}
                  <Icon className={`relative h-[18px] w-[18px] ${i === 2 ? 'text-violet-300' : 'text-white/50'}`} strokeWidth={i === 2 ? 2.2 : 1.8} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* floating Pulse chip */}
      <motion.div {...float(0.2)} className="absolute -left-2 top-16 hidden rounded-2xl border border-white/10 bg-surface px-3 py-2 shadow-xl sm:flex sm:items-center sm:gap-2">
        <span className="block rounded-full shadow-[0_0_0_2px_#000,0_0_0_4px_#22c55e]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatar('mei')} alt="" className="h-8 w-8 rounded-full" />
        </span>
        <div className="text-left">
          <p className="text-xs font-semibold">Mei</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-green-400">online now</p>
        </div>
      </motion.div>

      {/* floating Moment chip */}
      <motion.div {...float(1.1)} className="absolute -right-3 bottom-28 hidden rounded-2xl border border-white/10 bg-surface px-3 py-2 shadow-xl sm:flex sm:items-center sm:gap-2">
        <span className="orbit-live block rounded-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatar('zane')} alt="" className="h-8 w-8 rounded-full border-2 border-black" />
        </span>
        <div className="text-left">
          <p className="text-xs font-semibold">Moment</p>
          <p className="text-[10px] text-white/45">vanishes in 5h</p>
        </div>
      </motion.div>
    </div>
  );
}

function Row({ name, text, time, mine }: { name?: string; text: string; time: string; mine?: boolean }) {
  return (
    <div className={mine ? 'flex flex-col items-end' : ''}>
      {!mine && name && <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-400">{name}</p>}
      <p className={`max-w-[85%] text-[13px] leading-snug text-white ${mine ? 'text-right' : ''}`}>{text}</p>
      <span className={`mt-0.5 flex items-center gap-1 text-[9px] text-white/30 ${mine ? 'justify-end' : ''}`}>
        <Lock className="h-2 w-2 text-violet-400/50" /> {time}
      </span>
    </div>
  );
}

function VoiceRow({ time }: { time: string }) {
  return (
    <div>
      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-400">Aria</p>
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-600"><Play className="h-3.5 w-3.5 translate-x-px text-white" /></span>
        <div className="flex h-6 items-center gap-[2px]">
          {[6, 11, 8, 14, 18, 12, 9, 15, 20, 11, 7, 13, 16].map((h, i) => (
            <span key={i} className={`w-[2px] rounded-full ${i < 5 ? 'bg-violet-300' : 'bg-white/30'}`} style={{ height: h }} />
          ))}
        </div>
        <span className="text-[10px] text-white/40">0:07</span>
      </div>
      <span className="mt-0.5 flex items-center gap-1 text-[9px] text-white/30"><Lock className="h-2 w-2 text-violet-400/50" /> {time}</span>
    </div>
  );
}
