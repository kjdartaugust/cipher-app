'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

const BARS = [6, 12, 8, 16, 20, 14, 9, 18, 22, 12, 7, 15, 19, 10, 14, 8, 16, 11];

export function VoiceNote({ duration, mine }: { duration: number; mine: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const raf = useRef<number>();

  useEffect(() => {
    if (!playing) return;
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / (duration * 1000));
      setProgress(p);
      if (p >= 1) {
        setPlaying(false);
        setProgress(0);
      } else {
        raf.current = requestAnimationFrame(tick);
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current!);
  }, [playing, duration]);

  return (
    <div className="flex items-center gap-2.5 py-0.5">
      <button
        onClick={() => setPlaying((p) => !p)}
        className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full', mine ? 'bg-white/25' : 'bg-cipher-600')}
      >
        {playing ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 translate-x-px text-white" />}
      </button>
      <div className="flex h-7 items-center gap-[2px]">
        {BARS.map((h, i) => (
          <span
            key={i}
            className={cn('w-[3px] rounded-full transition-colors', i / BARS.length <= progress ? (mine ? 'bg-white' : 'bg-cipher-300') : 'bg-white/30')}
            style={{ height: h }}
          />
        ))}
      </div>
      <span className={cn('text-[11px]', mine ? 'text-white/70' : 'text-white/40')}>
        {Math.ceil(duration * (1 - progress))}s
      </span>
    </div>
  );
}
