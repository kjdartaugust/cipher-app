'use client';

import { createClient } from '@/lib/supabase/client';

// Ship uncaught errors to the server so they're visible in the admin dashboard.
// A PWA's console lives on someone else's phone; without this, a bug report is
// "it didn't work".
//
// Only the global handlers feed this. Do not call reportError() from anywhere
// that has decrypted content in scope — the log must never carry plaintext.

let installed = false;
const seen = new Set<string>(); // don't spam the table when an error loops

export function installErrorLog(userId: string) {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const send = async (message: string, stack?: string) => {
    if (!message) return;
    const key = message.slice(0, 200);
    if (seen.has(key)) return;
    seen.add(key);

    const supabase = createClient();
    if (!supabase) return; // demo mode
    await supabase.from('client_errors').insert({
      user_id: userId,
      message: message.slice(0, 1000),
      stack: stack?.slice(0, 4000) ?? null,
      url: location.pathname,
      user_agent: navigator.userAgent.slice(0, 300),
    });
  };

  window.addEventListener('error', (e) => {
    void send(e.message, e.error instanceof Error ? e.error.stack : undefined);
  });

  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    void send(
      r instanceof Error ? r.message : String(r ?? 'unhandled rejection'),
      r instanceof Error ? r.stack : undefined
    );
  });
}
