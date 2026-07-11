'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Play } from 'lucide-react';
import {
  RINGTONE_OPTIONS,
  getRingtone,
  setRingtone,
  getContactRingtone,
  setContactRingtone,
  previewRingtone,
  stopPreview,
} from '@/lib/ringtone';
import { cn } from '@/lib/utils';

// A little "now playing" equalizer — three bouncing bars.
function Equalizer() {
  return (
    <span className="flex h-4 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-white"
          animate={{ height: [4, 14, 4] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

// Ringtone picker. With `contactId` it manages that person's ringtone (with a
// "Default" option that clears it); otherwise it manages the global default.
// Tap ▶ to preview (it turns into ⏸ while playing — tap again to stop), tap the
// row to select. Per-device (localStorage).
export function RingtonePicker({ contactId }: { contactId?: string }) {
  const perContact = !!contactId;
  const options = perContact ? [{ id: 'default', label: 'Default' }, ...RINGTONE_OPTIONS] : RINGTONE_OPTIONS;

  const [sel, setSel] = useState<string>(() => {
    if (typeof window === 'undefined') return perContact ? 'default' : 'chime';
    if (perContact) return getContactRingtone(contactId!) ?? 'default';
    return getRingtone();
  });
  const [playing, setPlaying] = useState<string | null>(null);

  // stop any preview if the picker unmounts
  useEffect(() => () => stopPreview(), []);

  function preview(id: string) {
    if (playing === id) { stopPreview(); setPlaying(null); return; }
    setPlaying(id);
    previewRingtone(id === 'default' ? getRingtone() : id, () => {
      setPlaying((cur) => (cur === id ? null : cur));
    });
  }
  function choose(id: string) {
    if (perContact) setContactRingtone(contactId!, id === 'default' ? null : id);
    else setRingtone(id);
    setSel(id);
    preview(id);
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {options.map((o) => {
        const active = sel === o.id;
        const isPlaying = playing === o.id;
        return (
          <div
            key={o.id}
            className={cn(
              'flex items-center gap-3 rounded-2xl border p-3 transition',
              active ? 'border-cipher-500/50 bg-cipher-600/10' : 'border-white/10'
            )}
          >
            <button
              onClick={() => preview(o.id)}
              aria-label={isPlaying ? `Stop ${o.label}` : `Preview ${o.label}`}
              className={cn(
                'grid h-9 w-9 shrink-0 place-items-center rounded-full transition active:scale-95',
                isPlaying ? 'bg-cipher-600 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'
              )}
            >
              {isPlaying ? <Equalizer /> : <Play className="h-4 w-4" />}
            </button>
            <button onClick={() => choose(o.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <span className={cn('min-w-0 flex-1 text-sm font-semibold', isPlaying && 'text-cipher-200')}>
                {o.label}
                {isPlaying && <span className="ml-2 text-xs font-normal text-cipher-300/80">playing…</span>}
              </span>
              <span
                className={cn(
                  'grid h-5 w-5 shrink-0 place-items-center rounded-full border transition',
                  active ? 'border-cipher-400 bg-cipher-500' : 'border-white/25'
                )}
              >
                {active && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
