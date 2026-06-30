'use client';

import { motion } from 'framer-motion';

// A tiny accretion-disk black hole whose mass (size + pull) grows with every
// cipher exchanged in the conversation. Spins and slowly cycles color.
const DISK = 'conic-gradient(from 0deg, #FDE68A, #FB923C, #D946EF, #7C3AED, #4F8BFF, #22D3EE, #FDE68A)';

export function BlackHole({ count }: { count: number }) {
  // grows with messages, eased so it never dominates the header
  const size = Math.round(Math.min(56, 24 + Math.sqrt(count) * 4.5));
  const donut = 'radial-gradient(closest-side, transparent 42%, #000 46%, #000 86%, transparent 96%)';

  return (
    <div
      className="huecycle relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      title={`${count} ciphers · gravity rising`}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 rounded-full blur-[1px]"
        style={{ background: DISK, maskImage: donut, WebkitMaskImage: donut }}
      />
      {/* event horizon */}
      <div
        className="absolute rounded-full"
        style={{
          width: size * 0.46,
          height: size * 0.46,
          background: '#02030a',
          boxShadow: `0 0 0 1.5px rgba(255,255,255,0.9), 0 0 ${4 + count * 0.2}px 2px rgba(124,58,237,0.6)`,
        }}
      />
    </div>
  );
}
