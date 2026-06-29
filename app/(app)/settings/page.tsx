'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, KeyRound, Lock, ShieldCheck, Trash2, UserX } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { Avatar } from '@/components/ui/avatar';
import { useApp } from '@/lib/store';
import { IS_DEMO } from '@/lib/config';

export default function SettingsPage() {
  const { me, blocked, userById, toggleBlock, setPrivacy, changePassword, deleteAccount, myFingerprint } = useApp();
  const [fingerprint, setFingerprint] = useState('');
  const [isPrivate, setIsPrivate] = useState(!!me.private);

  // change password
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // delete
  const [confirming, setConfirming] = useState(false);
  const [delBusy, setDelBusy] = useState(false);

  useEffect(() => {
    myFingerprint().then(setFingerprint).catch(() => {});
  }, [myFingerprint]);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pw.length < 6) return setPwMsg({ ok: false, text: 'Password must be at least 6 characters.' });
    if (pw !== pw2) return setPwMsg({ ok: false, text: 'Passwords do not match.' });
    setPwBusy(true);
    try {
      await changePassword(pw);
      setPw(''); setPw2('');
      setPwMsg({ ok: true, text: IS_DEMO ? 'Demo mode — password unchanged.' : 'Password updated. Your key was re-secured.' });
    } catch (err) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not change password.' });
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl border-x border-white/10">
      <PageHeader kicker="Account" title="Settings" />

      <div className="space-y-8 p-5 sm:p-8">
        {/* Security */}
        <Section title="Security" icon={ShieldCheck}>
          <Row label="Safety number" hint="Share this with a contact to verify no one is intercepting your messages.">
            <code className="block rounded-lg bg-black/40 px-3 py-2 font-mono text-xs text-cipher-200">{fingerprint || 'calculating…'}</code>
          </Row>

          <form onSubmit={submitPassword} className="space-y-3 pt-2">
            <p className="text-sm font-medium">Change password</p>
            <Field icon={Lock} type="password" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <Field icon={Lock} type="password" placeholder="Confirm new password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            {pwMsg && <p className={`rounded-lg px-3 py-2 text-xs ${pwMsg.ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>{pwMsg.text}</p>}
            <button type="submit" disabled={pwBusy} className="btn-primary text-sm"><KeyRound className="h-4 w-4" /> {pwBusy ? 'Updating…' : 'Update password'}</button>
          </form>
        </Section>

        {/* Privacy */}
        <Section title="Privacy" icon={Lock}>
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium">Private account</span>
              <span className="block text-xs text-white/50">Only approved followers can see your posts and stories.</span>
            </span>
            <Toggle on={isPrivate} onChange={(v) => { setIsPrivate(v); setPrivacy(v); }} />
          </label>

          <Row label={`Blocked accounts (${blocked.length})`} hint="Blocked people can't message you or see your profile.">
            {blocked.length === 0 ? (
              <p className="text-sm text-white/40">You haven&apos;t blocked anyone.</p>
            ) : (
              <div className="space-y-2">
                {blocked.map((id) => {
                  const u = userById(id);
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <Avatar src={u.avatar} alt={u.name} size={36} />
                      <Link href={`/u/${u.username}`} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        <p className="truncate text-xs text-white/40">@{u.username}</p>
                      </Link>
                      <button onClick={() => toggleBlock(id)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20">Unblock</button>
                    </div>
                  );
                })}
              </div>
            )}
          </Row>
        </Section>

        {/* Danger zone */}
        <Section title="Danger zone" icon={AlertTriangle} danger>
          <Row label="Delete account" hint="Permanently removes your profile, posts, and messages. This cannot be undone.">
            {!confirming ? (
              <button onClick={() => setConfirming(true)} className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/20">
                <Trash2 className="h-4 w-4" /> Delete my account
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-rose-300">Are you sure?</span>
                <button
                  onClick={async () => { setDelBusy(true); await deleteAccount(); }}
                  disabled={delBusy}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
                >
                  {delBusy ? 'Deleting…' : 'Yes, delete everything'}
                </button>
                <button onClick={() => setConfirming(false)} className="btn-ghost text-sm">Cancel</button>
              </div>
            )}
          </Row>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, danger, children }: { title: string; icon: typeof Lock; danger?: boolean; children: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border p-5 ${danger ? 'border-rose-500/20 bg-rose-500/[0.03]' : 'border-white/10 bg-white/[0.02]'}`}>
      <h2 className={`mb-4 flex items-center gap-2 font-display text-lg font-semibold ${danger ? 'text-rose-300' : ''}`}><Icon className="h-5 w-5" /> {title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="mb-2 text-xs text-white/50">{hint}</p>}
      {children}
    </div>
  );
}

function Field({ icon: Icon, ...props }: { icon: typeof Lock } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
      <input className="input pl-11" {...props} />
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-cipher-600' : 'bg-white/15'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}
