'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * A cinematic quasar: an inclined, rotating accretion disk (hot white-gold core
 * bleeding into violet / magenta / cyan), the black-hole silhouette ringed by a
 * blazing photon ring, and bright collimated polar jets. Pure CSS + motion.
 */
export function QuasarCore({ className, size = 560 }: { className?: string; size?: number }) {
  const donut = 'radial-gradient(closest-side, transparent 30%, #000 36%, #000 92%, transparent 100%)';
  // hot core → cool rim, swept around the disk
  const disk =
    'conic-gradient(from 0deg, #FDE68A, #FB923C, #D946EF, #7C3AED, #4F8BFF, #22D3EE, #FDE68A)';

  return (
    <div
      aria-hidden
      className={cn('huecycle pointer-events-none relative grid place-items-center', className)}
      style={{ width: size, height: size, perspective: 1100 }}
    >
      {/* ── polar jets (perpendicular to the disk) ── */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-full bg-gradient-to-t from-white via-cyan-300/80 to-transparent blur-[1px]" style={{ width: 4, height: size * 0.95 }} />
        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-full bg-gradient-to-t from-cyan-300/50 to-transparent blur-md" style={{ width: 22, height: size * 0.9 }} />
        <div className="absolute left-1/2 -translate-x-1/2 bg-gradient-to-b from-white/70 via-magenta-300/40 to-transparent blur-[1px]" style={{ width: 3, height: size * 0.7 }} />
      </div>

      {/* ── inclined accretion disk ── */}
      <div className="absolute inset-0 grid place-items-center" style={{ transform: 'rotateX(74deg)', transformStyle: 'preserve-3d' }}>
        {/* soft outer halo */}
        <div className="absolute rounded-full opacity-40 blur-3xl" style={{ width: size, height: size, background: disk }} />
        {/* main rotating disk */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          className="absolute rounded-full blur-[3px]"
          style={{ width: size, height: size, background: disk, maskImage: donut, WebkitMaskImage: donut }}
        />
        {/* brighter inner band, counter-rotating */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
          className="absolute rounded-full opacity-80 blur-[2px]"
          style={{ width: size * 0.62, height: size * 0.62, background: disk, maskImage: donut, WebkitMaskImage: donut }}
        />
      </div>

      {/* ── core: faces the viewer ── */}
      {/* bloom */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute rounded-full blur-2xl"
        style={{ width: size * 0.4, height: size * 0.4, background: 'radial-gradient(circle, #FFFFFF, #FDE68A 35%, rgba(217,70,239,0.5) 65%, transparent 75%)' }}
      />
      {/* fast-spinning photon ring just outside the event horizon */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        className="absolute rounded-full blur-[1px]"
        style={{
          width: size * 0.3,
          height: size * 0.3,
          background: disk,
          maskImage: 'radial-gradient(closest-side, transparent 58%, #000 62%, #000 84%, transparent 92%)',
          WebkitMaskImage: 'radial-gradient(closest-side, transparent 58%, #000 62%, #000 84%, transparent 92%)',
        }}
      />
      {/* black hole + photon ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: size * 0.2,
          height: size * 0.2,
          background: '#02030a',
          boxShadow: '0 0 0 2px rgba(255,255,255,0.95), 0 0 22px 6px rgba(255,224,138,0.8), 0 0 60px 16px rgba(217,70,239,0.45)',
        }}
      />
    </div>
  );
}
