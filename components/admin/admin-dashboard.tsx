'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Flag, Image as ImageIcon, Lock, MessageSquare, Phone,
  RefreshCw, ShieldCheck, Users,
} from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { UsersPanel } from './users-panel';
import { ReportsPanel } from './reports-panel';
import { LivePanel } from './live-panel';
import { cn, compactNumber } from '@/lib/utils';

type Tab = 'overview' | 'live' | 'users' | 'reports';

type Stats = {
  users: { total: number; new7: number; new30: number; suspended: number; admins: number };
  activity: { active24h: number; active7d: number };
  messaging: { conversations: number; groups: number; messages: number; messages7: number; calls: number };
  content: { posts: number; posts7: number; comments: number; storiesLive: number };
  moderation: { reportsOpen: number };
  push: { subscriptions: number };
  series: { signups: { date: string; n: number }[]; messages: { date: string; n: number }[] };
  generatedAt: number;
};

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/stats', { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status === 403 ? 'Not an administrator.' : 'Could not load stats.');
      setStats(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load stats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-3xl border-x border-white/10">
      <PageHeader
        kicker="Internal"
        title="Admin"
        action={
          <button
            onClick={load}
            disabled={loading}
            className="rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      >
        <div className="flex gap-1 px-5 sm:px-8">
          {(['overview', 'live', 'users', 'reports'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'relative px-3 pb-2.5 text-sm font-medium capitalize transition',
                tab === t ? 'text-white' : 'text-white/40 hover:text-white/70'
              )}
            >
              {t}
              {t === 'reports' && !!stats?.moderation.reportsOpen && (
                <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-black">
                  {stats.moderation.reportsOpen}
                </span>
              )}
              {tab === t && (
                <motion.span layoutId="admin-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-cipher-400" />
              )}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* pb-32: the floating bottom nav is an overlay and will sit on top of the
          last row otherwise */}
      {tab === 'live' && <div className="p-5 pb-32 sm:p-8 sm:pb-32"><LivePanel /></div>}
      {tab === 'users' && <div className="p-5 pb-32 sm:p-8 sm:pb-32"><UsersPanel /></div>}
      {tab === 'reports' && <div className="p-5 pb-32 sm:p-8 sm:pb-32"><ReportsPanel /></div>}

      <div className={cn('space-y-8 p-5 pb-32 sm:p-8 sm:pb-32', tab !== 'overview' && 'hidden')}>
        {/* The thing anyone opening an admin panel for a messaging app assumes
            they can do — read messages — is the one thing that cannot exist. */}
        <div className="flex items-start gap-3 rounded-2xl border border-cipher-500/25 bg-cipher-600/10 p-4">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-cipher-300" />
          <p className="text-xs leading-relaxed text-white/70">
            <span className="font-semibold text-cipher-200">Messages are not readable here.</span>{' '}
            They&apos;re encrypted with a key derived from each user&apos;s password, which the server never
            receives. Everything below is metadata — counts and timestamps — plus the content that
            genuinely is stored in the clear: profiles, posts, comments and moments.
          </p>
        </div>

        {error && (
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>
        )}

        {stats && (
          <>
            <Section title="People" icon={Users}>
              <Grid>
                <Stat label="Users" value={stats.users.total} />
                <Stat label="Active today" value={stats.activity.active24h} hint="from last seen" />
                <Stat label="Active this week" value={stats.activity.active7d} />
                <Stat label="New this week" value={stats.users.new7} delta />
                <Stat label="New this month" value={stats.users.new30} delta />
                <Stat label="Suspended" value={stats.users.suspended} tone={stats.users.suspended ? 'warn' : undefined} />
              </Grid>
              <p className="mt-3 text-[11px] leading-relaxed text-white/35">
                Active counts read <span className="text-white/55">last seen</span>, so they undercount on
                purpose: users set to Invisible stop reporting and never appear here.
              </p>
            </Section>

            <Section title="Signups" icon={Activity}>
              <Spark series={stats.series.signups} />
            </Section>

            <Section title="Messaging" icon={MessageSquare}>
              <Grid>
                <Stat label="Messages" value={stats.messaging.messages} />
                <Stat label="Sent this week" value={stats.messaging.messages7} delta />
                <Stat label="Conversations" value={stats.messaging.conversations} />
                <Stat label="Groups" value={stats.messaging.groups} />
                <Stat label="Calls placed" value={stats.messaging.calls} icon={Phone} />
                <Stat label="Push devices" value={stats.push.subscriptions} />
              </Grid>
              <div className="mt-4">
                <Spark series={stats.series.messages} />
              </div>
            </Section>

            <Section title="Content" icon={ImageIcon}>
              <Grid>
                <Stat label="Posts" value={stats.content.posts} />
                <Stat label="Posted this week" value={stats.content.posts7} delta />
                <Stat label="Comments" value={stats.content.comments} />
                <Stat label="Live moments" value={stats.content.storiesLive} />
              </Grid>
            </Section>

            <Section title="Moderation" icon={Flag}>
              <Grid>
                <Stat
                  label="Open reports"
                  value={stats.moderation.reportsOpen}
                  tone={stats.moderation.reportsOpen ? 'warn' : undefined}
                />
                <Stat label="Admins" value={stats.users.admins} icon={ShieldCheck} />
              </Grid>
              <button
                onClick={() => setTab('reports')}
                className="mt-3 text-[11px] text-cipher-300/80 underline-offset-2 hover:underline"
              >
                Review the queue →
              </button>
            </Section>

            <p className="pt-2 text-center text-[11px] text-white/25">
              Updated {new Date(stats.generatedAt).toLocaleTimeString()}
            </p>
          </>
        )}

        {loading && !stats && <p className="py-16 text-center text-sm text-white/40">Loading…</p>}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
        <Icon className="h-4 w-4 text-cipher-300" /> {title}
      </h2>
      {children}
    </section>
  );
}

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{children}</div>
);

function Stat({
  label, value, hint, delta, tone, icon: Icon,
}: {
  label: string;
  value: number;
  hint?: string;
  delta?: boolean;
  tone?: 'warn';
  icon?: React.ElementType;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 p-3.5">
      <p className="flex items-center gap-1.5 truncate text-[11px] uppercase tracking-wide text-white/40">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone === 'warn' ? 'text-amber-400' : ''}`}>
        {delta && value > 0 && <span className="text-white/40">+</span>}
        {compactNumber(value)}
      </p>
      {hint && <p className="mt-0.5 truncate text-[10px] text-white/30">{hint}</p>}
    </div>
  );
}

// 30-day bar chart. Deliberately unlabelled per-bar — it's for spotting the
// shape (a spike, a flatline), not for reading exact values off.
function Spark({ series }: { series: { date: string; n: number }[] }) {
  const max = Math.max(1, ...series.map((d) => d.n));
  const total = series.reduce((a, d) => a + d.n, 0);
  return (
    <div className="rounded-2xl border border-white/10 p-4">
      <div className="flex h-24 items-end gap-[3px]">
        {series.map((d) => (
          <motion.div
            key={d.date}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(2, (d.n / max) * 100)}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            title={`${d.date}: ${d.n}`}
            className={`min-w-0 flex-1 rounded-sm ${d.n ? 'bg-cipher-500' : 'bg-white/[0.07]'}`}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-white/30">
        <span>30 days ago</span>
        <span className="text-white/50">{compactNumber(total)} total · peak {max}/day</span>
        <span>today</span>
      </div>
    </div>
  );
}
