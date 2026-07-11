import { NextResponse } from 'next/server';

// Mints short-lived ICE server credentials for WebRTC calls.
// Uses Cloudflare Realtime TURN when configured; otherwise falls back to
// STUN-only so calls still work (just without relay for strict NATs).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // credentials are ephemeral — never cache

const KEY_ID = process.env.CLOUDFLARE_TURN_KEY_ID ?? '';
const API_TOKEN = process.env.CLOUDFLARE_TURN_API_TOKEN ?? '';

const STUN: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export async function GET() {
  if (!KEY_ID || !API_TOKEN) {
    return NextResponse.json({ iceServers: STUN, turn: false, reason: 'not-configured' });
  }
  try {
    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${KEY_ID}/credentials/generate`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
        // 24h TTL — the client refreshes well within this window.
        body: JSON.stringify({ ttl: 86400 }),
      }
    );
    if (!res.ok) {
      return NextResponse.json({ iceServers: STUN, turn: false, reason: `cloudflare-${res.status}` });
    }
    const data = await res.json();
    // Cloudflare returns { iceServers: { urls: [...], username, credential } }.
    const cf = data?.iceServers;
    const iceServers = cf ? [...STUN, cf] : STUN;
    return NextResponse.json({ iceServers, turn: !!cf });
  } catch (err) {
    return NextResponse.json({
      iceServers: STUN,
      turn: false,
      reason: err instanceof Error ? err.message : 'unknown',
    });
  }
}
