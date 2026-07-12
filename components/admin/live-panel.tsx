'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Bell, CircleDot, PhoneCall, Radio, Server, UserPlus } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useApp } from '@/lib/store';
import { dotClass, statusLabel } from '@/lib/presence';
import { cn, timeAgo } from '@/lib/utils';

type Person = { id: string; username: string; name: string; avatar: string | null };
type Live = {
  health: { turn: boolean; push: boolean; serviceRole: boolean };
  errors: {
    id: string; message: string; stack: string | null; url: string | null;
    userAgent: string | null; createdAt: number; user: Person | null;
  }[];
  recent: {
    signups: (Person & { createdAt: number })[];
    posts: { id: string; text: string; createdAt: number; author: Person | null }[];
    calls: { id: string; createdAt: number; caller: Person | null }[];
    conversations: { id: string; isGroup: boolean; name: string | null; lastMessageAt: number | null }[];
  };
  generatedAt: number;
};

export function LivePanel() {
  // Who's online comes from the presence channel the admin is already joined to
  // — the same source every other user sees. There's no server-side record of
  // who is connected; presence is ephemeral by nature.
  const { presence, userById } = useApp();
  const [data, setData] = useState<Live | null>(null);
  const [error, setError] = useState('');
  const [openErr, setOpenErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/live', { cache: 'no-store' });
      if (!res.ok) throw new Error('Could not load.');
      setData(await res.json());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load.');
    }
  }, []);

  // Poll — this is the "is it on fire right now" tab, so it should keep up.
  useEffect(() => {
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [load]);

  const online = Object.entries(presence);

  return (
    <div className="space-y-8">
      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}

      {/* who is actually connected, right now */}
      <section>
        <H icon={Radio}>
          Online now
          <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/70">
            {online.length}
          </span>
        </H>
        {!online.length ? (
          <Empty>Nobody is connected.</Empty>
        ) : (
          <div className="space-y-2">
            {online.map(([id, p]) => {
              const u = userById(id);
              return (
                <Row key={id}>
                  <Avatar src={u.avatar} alt={u.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{u.name}</p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-white/40">
                      <span className={cn('h-1.5 w-1.5 rounded-full', dotClass(p.status))} />
                      {statusLabel(p.status)}
                    </p>
                  </div>
                </Row>
              );
            })}
          </div>
        )}
        <Note>
          Presence is ephemeral — there is no server-side record of who is connected, so this is the
          same live channel every other user reads. Anyone set to Invisible will not appear.
        </Note>
      </section>

      {/* config health */}
      <section>
        <H icon={Server}>Configuration</H>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Check ok={!!data?.health.turn} label="TURN relay" hint="calls behind NAT" />
          <Check ok={!!data?.health.push} label="Web Push" hint="background notifications" />
          <Check ok={!!data?.health.serviceRole} label="Service role" hint="this dashboard" />
        </div>
        <Note>
          These say the server holds the credentials, not that a call will connect. A red TURN light
          means calls between phones on mobile data will fail.
        </Note>
      </section>

      {/* client errors */}
      <section>
        <H icon={AlertTriangle}>
          Errors
          {!!data?.errors.length && (
            <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] font-semibold text-red-300">
              {data.errors.length}
            </span>
          )}
        </H>
        {!data?.errors.length ? (
          <Empty>No errors reported.</Empty>
        ) : (
          <div className="space-y-2">
            {data.errors.map((e) => (
              <button
                key={e.id}
                onClick={() => setOpenErr(openErr === e.id ? null : e.id)}
                className="w-full rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-3 text-left transition hover:bg-red-500/10"
              >
                <p className="break-words text-sm font-medium text-red-200">{e.message}</p>
                <p className="mt-1 truncate text-[11px] text-white/40">
                  {e.user ? `@${e.user.username}` : 'signed out'} · {e.url} · {timeAgo(e.createdAt)}
                </p>
                {openErr === e.id && (
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/50 p-2 text-[10px] leading-relaxed text-white/50">
                    {e.stack ?? 'no stack'}
                    {'\n\n'}
                    {e.userAgent}
                  </pre>
                )}
              </button>
            ))}
          </div>
        )}
        <Note>
          Uncaught errors from users&apos; devices. Never contains message content — these come from the
          global handlers, which never see plaintext.
        </Note>
      </section>

      {/* activity tail */}
      <section>
        <H icon={CircleDot}>Recent activity</H>
        <div className="space-y-2">
          {data?.recent.signups.map((s) => (
            <Row key={'s' + s.id}>
              <UserPlus className="h-4 w-4 shrink-0 text-cipher-300" />
              <p className="min-w-0 flex-1 truncate text-sm">
                <span className="font-semibold">{s.name}</span>
                <span className="text-white/40"> joined</span>
              </p>
              <Time t={s.createdAt} />
            </Row>
          ))}
          {data?.recent.calls.map((c) => (
            <Row key={'c' + c.id}>
              <PhoneCall className="h-4 w-4 shrink-0 text-blue" />
              <p className="min-w-0 flex-1 truncate text-sm">
                <span className="font-semibold">{c.caller?.name ?? 'someone'}</span>
                <span className="text-white/40"> placed a call</span>
              </p>
              <Time t={c.createdAt} />
            </Row>
          ))}
          {data?.recent.posts.map((p) => (
            <Row key={'p' + p.id}>
              <Bell className="h-4 w-4 shrink-0 text-white/40" />
              <p className="min-w-0 flex-1 truncate text-sm">
                <span className="font-semibold">{p.author?.name ?? 'someone'}</span>
                <span className="text-white/40"> posted </span>
                <span className="text-white/50">{p.text ? `“${p.text.slice(0, 40)}”` : 'media'}</span>
              </p>
              <Time t={p.createdAt} />
            </Row>
          ))}
          {!data?.recent.signups.length && !data?.recent.posts.length && !data?.recent.calls.length && (
            <Empty>Nothing yet.</Empty>
          )}
        </div>
      </section>

      {data && (
        <p className="text-center text-[11px] text-white/25">
          Refreshes every 15s · updated {new Date(data.generatedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

const H = ({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) => (
  <h2 className="mb-3 flex items-center text-sm font-semibold text-white/80">
    <Icon className="mr-2 h-4 w-4 text-cipher-300" />
    {children}
  </h2>
);

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-white/10 p-3">{children}</div>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-2xl border border-white/[0.07] py-6 text-center text-sm text-white/35">{children}</p>
);

const Note = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-3 text-[11px] leading-relaxed text-white/35">{children}</p>
);

const Time = ({ t }: { t: number }) => (
  <span className="shrink-0 text-[11px] text-white/30">{timeAgo(t)}</span>
);

function Check({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <div className={cn('rounded-2xl border p-3.5', ok ? 'border-white/10' : 'border-red-500/30 bg-red-500/[0.06]')}>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', ok ? 'bg-green-400' : 'bg-red-400')} />
        {label}
      </p>
      <p className="mt-0.5 text-[11px] text-white/35">{ok ? hint : `not configured — ${hint}`}</p>
    </div>
  );
}
