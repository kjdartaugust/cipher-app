import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Daily keep-alive: one tiny Supabase read so the free-tier project never
// crosses the 7-day inactivity threshold and gets auto-paused. Triggered by the
// Vercel Cron in vercel.json (runs only on the production deployment).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // never statically cached

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const CRON_SECRET = process.env.CRON_SECRET ?? '';

const PLACEHOLDER_URL = 'https://your-project.supabase.co';

export async function GET(request: NextRequest) {
  // If a CRON_SECRET is set, require it. Vercel Cron sends this header
  // automatically. If it's not set, leave the endpoint open.
  if (CRON_SECRET) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  }

  // Not configured (or demo mode) — succeed and skip, don't error.
  const key = SERVICE_KEY || ANON_KEY;
  if (!SUPABASE_URL || SUPABASE_URL === PLACEHOLDER_URL || !key) {
    return NextResponse.json({ ok: true, skipped: 'supabase-not-configured' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
    // Lightweight head/count read — just enough traffic to count as activity.
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    if (error) {
      // The request still reached Supabase (which is the point); report but 200.
      return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
    }
    return NextResponse.json({ ok: true, pinged: true, count: count ?? 0, at: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 200 }
    );
  }
}
