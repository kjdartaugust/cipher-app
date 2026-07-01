'use client';

import { createClient } from './supabase/client';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerServiceWorker() {
  if (!pushSupported()) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

export function pushPermission(): NotificationPermission {
  return pushSupported() ? Notification.permission : 'denied';
}

// Ask for permission, subscribe, and store the subscription for this user.
export async function enablePush(userId: string): Promise<boolean> {
  if (!pushSupported() || !VAPID_PUBLIC) return false;
  const supabase = createClient();
  if (!supabase) return false;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return false;

  const reg = (await navigator.serviceWorker.getRegistration()) || (await registerServiceWorker());
  if (!reg) return false;
  await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    }));

  const json = sub.toJSON();
  await supabase.from('push_subscriptions').upsert({
    endpoint: json.endpoint,
    user_id: userId,
    subscription: json,
  });
  return true;
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe().catch(() => {});
    const supabase = createClient();
    await supabase?.from('push_subscriptions').delete().eq('endpoint', endpoint);
  }
}

// Fire-and-forget request to the server to deliver a push to other users.
export function sendPush(payload: { userIds: string[]; title: string; body: string; url?: string; tag?: string; call?: boolean }) {
  try {
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* noop */
  }
}
