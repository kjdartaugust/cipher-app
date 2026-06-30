'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

const GLYPHS = '01<>-_/\\{}[]#$%&*=+?ABCDEF0123456789';
const rand = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

// Scrambles, then "decrypts" to the real text when scrolled into view.
export function DecryptText({ text, className, speed = 1 }: { text: string; className?: string; speed?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [out, setOut] = useState(text); // SSR/first paint = real text (no hydration mismatch)

  useEffect(() => {
    if (!inView) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOut(text);
      return;
    }
    let frame = 0;
    const id = setInterval(() => {
      frame += speed;
      const revealed = Math.floor(frame / 2);
      setOut(
        text
          .split('')
          .map((ch, i) => (ch === ' ' ? ' ' : i < revealed ? ch : rand()))
          .join('')
      );
      if (revealed >= text.length) {
        clearInterval(id);
        setOut(text);
      }
    }, 35);
    return () => clearInterval(id);
  }, [inView, text, speed]);

  return <span ref={ref} className={className}>{out}</span>;
}
