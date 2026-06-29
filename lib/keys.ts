'use client';

import { generateKeyPair, type KeyPair } from './crypto';

// On-device private-key storage. In production the private key NEVER leaves the
// device — it lives only in localStorage, namespaced per user id.
const keyName = (userId: string) => `cipher.privkey.${userId}`;

export function loadKeyPair(userId: string): KeyPair | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(keyName(userId));
  return raw ? (JSON.parse(raw) as KeyPair) : null;
}

export function storeKeyPair(userId: string, pair: KeyPair) {
  localStorage.setItem(keyName(userId), JSON.stringify(pair));
}

/**
 * Ensure this device has a key pair for the user.
 * Returns the pair plus a flag indicating a fresh pair was generated (which
 * means the published public key must be updated and prior messages — sealed to
 * the old key — are no longer readable on this device).
 */
export async function ensureKeyPair(
  userId: string
): Promise<{ pair: KeyPair; rotated: boolean }> {
  const existing = loadKeyPair(userId);
  if (existing) return { pair: existing, rotated: false };
  const pair = await generateKeyPair();
  storeKeyPair(userId, pair);
  return { pair, rotated: true };
}
