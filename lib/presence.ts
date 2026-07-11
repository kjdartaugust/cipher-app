import { IS_DEMO } from './config';

// What others see about you on the live presence channel.
export type PresenceStatus = 'online' | 'away' | 'chatting'; // chatting = in a call

// What you choose for yourself.
export type Visibility = 'active' | 'away' | 'invisible';

// Resolve a user's shown status: live presence wins; in demo mode fall back to
// the seeded `online` flag so the sample data still shows dots.
export function resolveStatus(
  live: { status: PresenceStatus } | undefined,
  staticOnline?: boolean
): PresenceStatus | undefined {
  if (live) return live.status;
  if (IS_DEMO && staticOnline) return 'online';
  return undefined;
}

export const dotClass = (s?: PresenceStatus | null) =>
  s === 'online' ? 'bg-green-400' : s === 'away' ? 'bg-amber-400' : s === 'chatting' ? 'bg-blue' : '';

export const statusLabel = (s?: PresenceStatus | null) =>
  s === 'online' ? 'Active now' : s === 'away' ? 'Away' : s === 'chatting' ? 'In a call' : '';

// "Active 5m ago" — what we show once someone drops off the presence channel.
// Returns '' when we have nothing to say, so callers can fall back cleanly.
export function lastSeenLabel(ts?: number): string {
  if (!ts) return '';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'Active just now';
  if (mins < 60) return `Active ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Active yesterday';
  if (days < 7) return `Active ${days}d ago`;
  return `Active ${new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

// The line under someone's name: live status if they're here, else last seen.
export const presenceLine = (s: PresenceStatus | undefined, lastSeenAt?: number) =>
  s ? statusLabel(s) : lastSeenLabel(lastSeenAt);

// The status picker options.
export const VISIBILITY_OPTIONS: { value: Visibility; label: string; dot: string; desc: string }[] = [
  { value: 'active', label: 'Active', dot: 'bg-green-400', desc: 'Show that you’re online' },
  { value: 'away', label: 'Away', dot: 'bg-amber-400', desc: 'Show that you’re away' },
  { value: 'invisible', label: 'Invisible', dot: 'bg-white/40', desc: 'Appear offline — you can still see everyone' },
];

// Dot for your own avatar based on the visibility you picked.
export const myVisibilityDot = (v: Visibility) =>
  v === 'active' ? 'bg-green-400' : v === 'away' ? 'bg-amber-400' : 'bg-white/40';
