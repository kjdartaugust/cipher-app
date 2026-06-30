'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

const BARS = [6, 12, 8, 16, 20, 14, 9, 18, 22, 12, 7, 15, 19, 10, 14, 8, 16, 11];

// Plays a real recording when `src` is given; otherwise animates a placeholder.
export function VoiceNote({ duration, mine, src }: { duration: number; mine: boolean; src?: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [len, setLen] = useState(duration);
  const raf = useRef<number>();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ---- real audio playback ----
  useEffect(() => {
    if (!src) return;
    const audio = new Audio(src);
    audioRef.current = audio;
    const onMeta = () => { if (isFinite(audio.duration) && audio.duration > 0) setLen(audio.duration); };
    const onTime = () => setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    const onEnd = () => { setPlaying(false); setProgress(0); };
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
      audioRef.current = null;
    };
  }, [src]);

  // ---- placeholder animation (no src) ----
  useEffect(() => {
    if (src || !playing) return;
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / (duration * 1000));
      setProgress(p);
      if (p >= 1) { setPlaying(false); setProgress(0); }
      else raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current!);
  }, [playing, duration, src]);

  function toggle() {
    if (src && audioRef.current) {
      if (playing) audioRef.current.pause();
      else audioRef.current.play().catch(() => {});
      setPlaying((p) => !p);
    } else {
      setPlaying((p) => !p);
    }
  }

  return (
    <div className="flex items-center gap-2.5 py-0.5">
      <button
        onClick={toggle}
        className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full', mine ? 'bg-white/25' : 'bg-blue')}
      >
        {playing ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 translate-x-px text-white" />}
      </button>
      <div className="flex h-7 items-center gap-[2px]">
        {BARS.map((h, i) => (
          <span
            key={i}
            className={cn('w-[3px] rounded-full transition-colors', i / BARS.length <= progress ? (mine ? 'bg-white' : 'bg-blue') : 'bg-white/30')}
            style={{ height: h }}
          />
        ))}
      </div>
      <span className={cn('text-[11px]', mine ? 'text-white/70' : 'text-white/40')}>
        {Math.max(0, Math.ceil(len * (1 - progress)))}s
      </span>
    </div>
  );
}
