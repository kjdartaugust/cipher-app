'use client';

import { motion } from 'framer-motion';

// An inclined, spinning accretion-disk black hole — used as a growing backdrop
// in a conversation. The more ciphers exchanged, the more massive it becomes.
// (No animated CSS filter — that breaks page compositing on pinch-zoom.)
const DISK = 'conic-gradient(from 0deg, #FDE68A, #FB923C, #D946EF, #7C3AED, #4F8BFF, #22D3EE, #FDE68A)';
const DONUT = 'radial-gradient(closest-side, transparent 38%, #000 43%, #000 88%, transparent 97%)';

export function BlackHole({ size, count }: { size: number; count: number }) {
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size, contain: 'layout paint' }}>
      {/* inclined, spinning disk (flat scaleY squash — zoom-stable) */}
      <div className="absolute inset-0 grid place-items-center" style={{ transform: 'scaleY(0.34)' }}>
        <div className="absolute inset-0 rounded-full opacity-40 blur-2xl" style={{ background: DISK }} />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full blur-[2px]"
          style={{ background: DISK, maskImage: DONUT, WebkitMaskImage: DONUT }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-[16%] rounded-full opacity-70 blur-[2px]"
          style={{ background: DISK, maskImage: DONUT, WebkitMaskImage: DONUT }}
        />
      </div>
      {/* event horizon, facing the viewer */}
      <div
        className="absolute rounded-full"
        style={{
          width: size * 0.22,
          height: size * 0.22,
          background: '#02030a',
          boxShadow: `0 0 0 1.5px rgba(255,255,255,0.85), 0 0 ${8 + count * 0.3}px 3px rgba(124,58,237,0.55)`,
        }}
      />
    </div>
  );
}
