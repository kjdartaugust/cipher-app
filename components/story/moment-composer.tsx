'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Mic, Square, Type, X } from 'lucide-react';
import { useApp } from '@/lib/store';

// Drop a Moment — an encrypted text or voice mood that expires in 6 hours.
export function MomentComposer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createMoment } = useApp();
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => () => clearInterval(timer.current), []);

  function reset() {
    setText('');
    setSeconds(0);
    setRecording(false);
    clearInterval(timer.current);
  }

  function startRec() {
    setRecording(true);
    setSeconds(0);
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }
  function stopRec() {
    clearInterval(timer.current);
    setRecording(false);
  }

  async function drop() {
    setBusy(true);
    if (mode === 'text') {
      if (!text.trim()) return setBusy(false);
      await createMoment('text', text.trim());
    } else {
      if (seconds < 1) return setBusy(false);
      await createMoment('voice', '', seconds);
    }
    setBusy(false);
    reset();
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/80" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 480, damping: 38 }}
            className="relative w-full max-w-md rounded-3xl border border-white/10 bg-surface p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="headline text-xl">Drop a Moment</h2>
                <p className="flex items-center gap-1 text-[11px] text-violet-300/70"><Lock className="h-3 w-3" /> Encrypted · vanishes in 6 hours</p>
              </div>
              <button onClick={onClose} className="rounded-full p-1.5 text-white/50 hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>

            {/* mode switch */}
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-full border border-white/10 p-1">
              <button onClick={() => setMode('text')} className={`flex items-center justify-center gap-2 rounded-full py-2 text-sm font-medium transition ${mode === 'text' ? 'bg-violet-600 text-white' : 'text-white/55'}`}>
                <Type className="h-4 w-4" /> Text
              </button>
              <button onClick={() => setMode('voice')} className={`flex items-center justify-center gap-2 rounded-full py-2 text-sm font-medium transition ${mode === 'voice' ? 'bg-violet-600 text-white' : 'text-white/55'}`}>
                <Mic className="h-4 w-4" /> Voice
              </button>
            </div>

            {mode === 'text' ? (
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                maxLength={180}
                placeholder="What's the mood right now?"
                className="w-full resize-none rounded-2xl border border-white/10 bg-black px-4 py-3 text-2xl font-bold leading-snug text-white outline-none placeholder:text-white/25 focus:border-violet-600"
              />
            ) : (
              <div className="grid place-items-center rounded-2xl border border-white/10 bg-black py-8">
                {!recording && seconds === 0 ? (
                  <button onClick={startRec} className="grid h-16 w-16 place-items-center rounded-full bg-violet-600 text-white transition active:scale-95">
                    <Mic className="h-7 w-7" />
                  </button>
                ) : recording ? (
                  <button onClick={stopRec} className="flex flex-col items-center gap-3">
                    <span className="grid h-16 w-16 place-items-center rounded-full bg-rose-600 text-white"><Square className="h-6 w-6" /></span>
                    <span className="flex items-center gap-2 text-sm text-white/70"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> {seconds}s</span>
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-end gap-[3px]">
                      {Array.from({ length: 22 }).map((_, i) => (
                        <span key={i} className="w-[3px] rounded-full bg-violet-400" style={{ height: 6 + ((i * 13) % 26) }} />
                      ))}
                    </div>
                    <span className="text-sm text-white/60">{seconds}s recorded</span>
                    <button onClick={() => setSeconds(0)} className="text-xs text-white/40 underline">re-record</button>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={drop}
              disabled={busy || (mode === 'text' ? !text.trim() : seconds < 1)}
              className="btn-primary mt-5 w-full"
            >
              {busy ? 'Dropping…' : 'Drop Moment'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
