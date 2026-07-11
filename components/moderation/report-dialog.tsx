'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flag } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useApp } from '@/lib/store';
import { cn } from '@/lib/utils';

export type ReportTarget = {
  type: 'user' | 'post' | 'comment' | 'story';
  id: string;
  label: string; // what the user sees they're reporting, e.g. "@ada" or "this post"
};

const REASONS = [
  'Spam',
  'Harassment or bullying',
  'Hate speech',
  'Nudity or sexual content',
  'Violence or threats',
  'Impersonation',
  'Something else',
];

export function ReportDialog({ target, onClose }: { target: ReportTarget; onClose: () => void }) {
  const { me } = useApp();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!reason) return;
    setBusy(true);
    setError('');
    const supabase = createClient();
    if (!supabase) { setDone(true); setBusy(false); return; } // demo mode
    const { error: err } = await supabase.from('reports').insert({
      reporter_id: me.id,
      target_type: target.type,
      target_id: target.id,
      reason,
      note: note.slice(0, 500),
    });
    setBusy(false);
    if (err) setError('Could not send the report. Try again.');
    else setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-black p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="py-4 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-cipher-600/20">
              <Flag className="h-5 w-5 text-cipher-300" />
            </div>
            <h3 className="mt-3 text-lg font-semibold">Report sent</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-white/55">
              Thanks — a moderator will take a look. You won&apos;t be told who reviewed it.
            </p>
            <button onClick={onClose} className="mt-4 w-full rounded-full bg-white/10 py-2.5 text-sm font-medium transition hover:bg-white/15">
              Done
            </button>
          </div>
        ) : (
          <>
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Flag className="h-4 w-4 text-white/50" /> Report {target.label}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-white/50">
              Reports are reviewed by a moderator. Note that{' '}
              <span className="text-white/70">private messages cannot be reviewed</span> — they&apos;re
              encrypted and nobody but you and the recipient can read them.
            </p>

            <div className="mt-4 space-y-1.5">
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={cn(
                    'w-full rounded-xl border px-3.5 py-2.5 text-left text-sm transition',
                    reason === r ? 'border-cipher-500/50 bg-cipher-600/10 text-white' : 'border-white/10 text-white/70 hover:bg-white/5'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything else we should know? (optional)"
              rows={2}
              className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-cipher-500/50"
            />

            {error && <p className="mt-2 text-xs text-red-300">{error}</p>}

            <div className="mt-4 flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-full border border-white/15 py-2.5 text-sm font-medium transition hover:bg-white/10">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!reason || busy}
                className="flex-1 rounded-full bg-cipher-600 py-2.5 text-sm font-semibold transition hover:bg-cipher-500 disabled:opacity-40"
              >
                {busy ? 'Sending…' : 'Report'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
