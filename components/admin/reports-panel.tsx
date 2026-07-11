'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Trash2, X } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type Person = { id: string; username?: string; name?: string; avatar?: string | null; suspended?: boolean };
type Target =
  | ({ kind: 'user' } & Person)
  | { kind: 'post'; text: string; media: { type: string; url: string }[]; author: Person }
  | { kind: 'comment'; text: string; author: Person }
  | { kind: 'story'; media: { type: string; url: string }; author: Person };

type Report = {
  id: string;
  targetType: 'user' | 'post' | 'comment' | 'story';
  targetId: string;
  reason: string;
  note: string;
  createdAt: number;
  reporter: Person | null;
  target: Target | null;
};

const STATUSES = [
  { id: 'open', label: 'Open' },
  { id: 'actioned', label: 'Actioned' },
  { id: 'dismissed', label: 'Dismissed' },
] as const;

export function ReportsPanel() {
  const [status, setStatus] = useState<'open' | 'actioned' | 'dismissed'>('open');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (s: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/reports?status=${s}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Could not load reports.');
      setReports((await res.json()).reports);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(status); }, [status, load]);

  async function resolve(id: string, next: 'actioned' | 'dismissed') {
    await fetch('/api/admin/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: next }),
    });
    load(status);
  }

  // Take the content down and mark the report actioned in one go — the two
  // always happen together, so making them two clicks just invites half-done
  // moderation.
  async function takeDown(r: Report) {
    if (r.targetType === 'user') return;
    await fetch('/api/admin/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: r.targetType, id: r.targetId }),
    });
    await resolve(r.id, 'actioned');
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {STATUSES.map((s) => (
          <button
            key={s.id}
            onClick={() => setStatus(s.id)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition',
              status === s.id ? 'bg-white/10 text-white' : 'text-white/45 hover:bg-white/5'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}
      {loading && <p className="py-8 text-center text-sm text-white/40">Loading…</p>}
      {!loading && !reports.length && (
        <p className="py-10 text-center text-sm text-white/40">
          {status === 'open' ? 'Nothing to review.' : `No ${status} reports.`}
        </p>
      )}

      {reports.map((r) => (
        <div key={r.id} className="rounded-2xl border border-white/10 p-4">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className="rounded-full bg-white/10 px-2 py-0.5 font-medium uppercase tracking-wide text-white/60">
              {r.targetType}
            </span>
            <span className="truncate">{r.reason}</span>
            <span className="ml-auto shrink-0">{new Date(r.createdAt).toLocaleDateString()}</span>
          </div>

          {r.note && <p className="mt-2 text-sm leading-relaxed text-white/70">“{r.note}”</p>}

          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            {!r.target ? (
              <p className="text-xs italic text-white/35">Content no longer exists — deleted since it was reported.</p>
            ) : (
              <TargetPreview target={r.target} />
            )}
          </div>

          <p className="mt-2 text-[11px] text-white/30">
            Reported by {r.reporter ? `@${r.reporter.username}` : 'a deleted account'}
          </p>

          {status === 'open' && (
            <div className="mt-3 flex gap-2">
              {r.targetType !== 'user' && r.target && (
                <button
                  onClick={() => takeDown(r)}
                  className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-red-500/40 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Take down
                </button>
              )}
              <button
                onClick={() => resolve(r.id, 'actioned')}
                className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium transition hover:bg-white/10"
              >
                <Check className="h-3.5 w-3.5" /> Mark actioned
              </button>
              <button
                onClick={() => resolve(r.id, 'dismissed')}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white/45 transition hover:bg-white/5"
              >
                <X className="h-3.5 w-3.5" /> Dismiss
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TargetPreview({ target }: { target: Target }) {
  if (target.kind === 'user') {
    return (
      <div className="flex items-center gap-2.5">
        <Avatar src={target.avatar ?? ''} alt={target.name ?? ''} size={32} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{target.name}</p>
          <p className="truncate text-xs text-white/40">@{target.username}{target.suspended && ' · suspended'}</p>
        </div>
      </div>
    );
  }

  const media = target.kind === 'story' ? [target.media] : target.kind === 'post' ? target.media ?? [] : [];
  const text = 'text' in target ? target.text : '';

  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-white/40">
        <Avatar src={target.author.avatar ?? ''} alt={target.author.name ?? ''} size={20} />
        @{target.author.username ?? 'unknown'}
      </div>
      {text && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-white/80">{text}</p>}
      {media.length > 0 && (
        <div className="mt-2 flex gap-1.5">
          {media.slice(0, 3).map((m, i) =>
            m.type === 'video' ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video key={i} src={m.url} className="h-20 w-20 rounded-lg object-cover" muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={m.url} alt="" className="h-20 w-20 rounded-lg object-cover" />
            )
          )}
        </div>
      )}
    </div>
  );
}
