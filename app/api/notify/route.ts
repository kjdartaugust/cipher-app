import { NextResponse, type NextRequest } from 'next/server';
import webpush from 'web-push';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient as createUserClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:hello@cipher.app';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function POST(request: NextRequest) {
  if (!VAPID_PRIVATE || !SERVICE_KEY || !SUPABASE_URL) {
    return NextResponse.json({ ok: false, reason: 'push-not-configured' }, { status: 200 });
  }

  // must be an authenticated user to send notifications
  const userClient = createUserClient();
  const { data: auth } = (await userClient?.auth.getUser()) ?? { data: { user: null } };
  if (!auth?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const { userIds, title, body, url, tag, call } = await request.json();
  const recipients: string[] = Array.isArray(userIds) ? userIds.filter((id) => id !== auth.user!.id) : [];
  if (recipients.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const admin = createServiceClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, subscription')
    .in('user_id', recipients);

  const payload = JSON.stringify({ title, body, url, tag, call });
  let sent = 0;
  await Promise.all(
    (subs ?? []).map(async (row: any) => {
      try {
        await webpush.sendNotification(row.subscription, payload);
        sent++;
      } catch (err: any) {
        // clean up dead subscriptions
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('endpoint', row.endpoint);
        }
      }
    })
  );

  return NextResponse.json({ ok: true, sent });
}
