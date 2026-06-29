'use client';

import _sodium from 'libsodium-wrappers';
import type { EncryptedPayload } from './types';

/**
 * Cipher end-to-end encryption.
 *
 * Design (true E2EE — the server only ever stores ciphertext + sealed keys):
 *  1. Every user owns a Curve25519 key pair (crypto_box). The PUBLIC key is
 *     published; the SECRET key never leaves the device (kept in localStorage).
 *  2. Every conversation has a random symmetric key (crypto_secretbox / XSalsa20).
 *  3. That conversation key is wrapped for each member with crypto_box_seal
 *     (anonymous sealed box) against the member's PUBLIC key. Only a member's
 *     SECRET key can open it — the server cannot.
 *  4. Each message is encrypted with the conversation key + a fresh nonce.
 *
 * Result: the server (Supabase) stores only `{ciphertext, nonce}` blobs and
 * sealed key envelopes. Plaintext exists only in memory on member devices.
 */

let sodium: typeof _sodium;
let readyPromise: Promise<void> | null = null;

export async function ready(): Promise<typeof _sodium> {
  if (!readyPromise) {
    readyPromise = _sodium.ready.then(() => {
      sodium = _sodium;
    });
  }
  await readyPromise;
  return sodium;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export async function generateKeyPair(): Promise<KeyPair> {
  const s = await ready();
  const kp = s.crypto_box_keypair();
  return {
    publicKey: s.to_base64(kp.publicKey),
    privateKey: s.to_base64(kp.privateKey),
  };
}

export async function generateConversationKey(): Promise<string> {
  const s = await ready();
  return s.to_base64(s.crypto_secretbox_keygen());
}

/** Seal (wrap) a conversation key for a recipient's public key. */
export async function sealKeyForMember(
  conversationKey: string,
  recipientPublicKey: string
): Promise<string> {
  const s = await ready();
  const sealed = s.crypto_box_seal(
    s.from_base64(conversationKey),
    s.from_base64(recipientPublicKey)
  );
  return s.to_base64(sealed);
}

/** Open a sealed conversation key with the member's own key pair. */
export async function openSealedKey(
  sealed: string,
  publicKey: string,
  privateKey: string
): Promise<string> {
  const s = await ready();
  const opened = s.crypto_box_seal_open(
    s.from_base64(sealed),
    s.from_base64(publicKey),
    s.from_base64(privateKey)
  );
  return s.to_base64(opened);
}

export async function encryptMessage(
  plaintext: string,
  conversationKey: string
): Promise<EncryptedPayload> {
  const s = await ready();
  const nonce = s.randombytes_buf(s.crypto_secretbox_NONCEBYTES);
  const cipher = s.crypto_secretbox_easy(
    s.from_string(plaintext),
    nonce,
    s.from_base64(conversationKey)
  );
  return { ciphertext: s.to_base64(cipher), nonce: s.to_base64(nonce) };
}

export async function decryptMessage(
  payload: EncryptedPayload,
  conversationKey: string
): Promise<string> {
  const s = await ready();
  try {
    const opened = s.crypto_secretbox_open_easy(
      s.from_base64(payload.ciphertext),
      s.from_base64(payload.nonce),
      s.from_base64(conversationKey)
    );
    return s.to_string(opened);
  } catch {
    return '🔒 Unable to decrypt';
  }
}

// ---------------------------------------------------------------------------
// Portable keys: wrap the private key with a password-derived key so the same
// key pair can be recovered on any device. The server only stores the wrapped
// blob + salt — never the password or the plaintext private key.
// ---------------------------------------------------------------------------
export async function randomSalt(): Promise<string> {
  const s = await ready();
  return s.to_base64(s.randombytes_buf(32));
}

// Derive a 32-byte wrapping key from the password, keyed by the salt (BLAKE2b).
// Note: this is a lightweight KDF (not Argon2 — that primitive isn't in the
// standard libsodium build). Adequate for this demo; for production prefer a
// slow memory-hard KDF via libsodium-wrappers-sumo.
async function deriveKey(password: string, saltB64: string): Promise<Uint8Array> {
  const s = await ready();
  return s.crypto_generichash(s.crypto_secretbox_KEYBYTES, s.from_string(password), s.from_base64(saltB64));
}

export async function wrapPrivateKey(privateKey: string, password: string, saltB64: string): Promise<string> {
  const s = await ready();
  const key = await deriveKey(password, saltB64);
  const nonce = s.randombytes_buf(s.crypto_secretbox_NONCEBYTES);
  const cipher = s.crypto_secretbox_easy(s.from_base64(privateKey), nonce, key);
  return `${s.to_base64(nonce)}:${s.to_base64(cipher)}`;
}

export async function unwrapPrivateKey(wrapped: string, password: string, saltB64: string): Promise<string> {
  const s = await ready();
  const [nonceB64, cipherB64] = wrapped.split(':');
  const key = await deriveKey(password, saltB64);
  const opened = s.crypto_secretbox_open_easy(s.from_base64(cipherB64), s.from_base64(nonceB64), key);
  return s.to_base64(opened);
}

/** Short fingerprint of a public key for the "verify safety number" UX. */
export async function keyFingerprint(publicKey: string): Promise<string> {
  const s = await ready();
  const hash = s.crypto_generichash(16, s.from_base64(publicKey));
  return s
    .to_hex(hash)
    .slice(0, 20)
    .match(/.{1,4}/g)!
    .join(' ');
}
