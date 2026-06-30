'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// A quasar: blazing blue-white core, a rotating cyan→violet→magenta accretion
// disk, and bright polar jets. Pure CSS/motion, no assets.
export function QuasarCore({ className, size = 360 }: { className?: string; size?: number }) {
  const donut = 'radial-gradient(closest-side, transparent 40%, black 44%, black 70%, transparent 78%)';
  return (
    <div aria-hidden className={cn('pointer-events-none relative', className)} style={{ width: size, height: size }}>
      {/* polar jets */}
      <div className="absolute left-1/2 top-1/2 -z-10 h-[230%] w-[3px] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-cyan-300/60 to-transparent blur-[2px]" />
      <div className="absolute left-1/2 top-1/2 -z-10 h-[200%] w-[10px] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-cyan-400/15 to-transparent blur-md" />

      {/* outer halo */}
      <div className="absolute inset-0 rounded-full bg-quasar-disk opacity-30 blur-3xl" />

      {/* rotating accretion disk */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 rounded-full bg-quasar-disk blur-[6px]"
        style={{ maskImage: donut, WebkitMaskImage: donut }}
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-[12%] rounded-full bg-quasar-disk opacity-60 blur-[3px]"
        style={{ maskImage: donut, WebkitMaskImage: donut }}
      />

      {/* core glow + blazing center */}
      <motion.div
        animate={{ scale: [1, 1.12, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-core blur-2xl"
        style={{ width: size * 0.34, height: size * 0.34 }}
      />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-quasar"
        style={{ width: size * 0.14, height: size * 0.14 }}
      />
    </div>
  );
}
