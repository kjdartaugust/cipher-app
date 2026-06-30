'use client';

import { motion } from 'framer-motion';

// An accretion-disk black hole. Used as a growing backdrop in a conversation —
// the more ciphers exchanged, the more massive it becomes. Spins + cycles color.
const DISK = 'conic-gradient(from 0deg, #FDE68A, #FB923C, #D946EF, #7C3AED, #4F8BFF, #22D3EE, #FDE68A)';

export function BlackHole({ size, count }: { size: number; count: number }) {
  const donut = 'radial-gradient(closest-side, transparent 40%, #000 45%, #000 88%, transparent 97%)';
  return (
    <div className="huecycle relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      {/* outer halo */}
      <div className="absolute inset-0 rounded-full opacity-40 blur-3xl" style={{ background: DISK }} />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 rounded-full blur-[2px]"
        style={{ background: DISK, maskImage: donut, WebkitMaskImage: donut }}
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 34, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-[16%] rounded-full opacity-70 blur-[2px]"
        style={{ background: DISK, maskImage: donut, WebkitMaskImage: donut }}
      />
      {/* event horizon */}
      <div
        className="absolute rounded-full"
        style={{
          width: size * 0.4,
          height: size * 0.4,
          background: '#02030a',
          boxShadow: `0 0 0 1.5px rgba(255,255,255,0.85), 0 0 ${6 + count * 0.3}px 3px rgba(124,58,237,0.55)`,
        }}
      />
    </div>
  );
}
