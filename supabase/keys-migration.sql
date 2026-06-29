-- ============================================================================
-- Cipher portable-keys migration — run in the Supabase SQL editor.
-- Stores each user's password-wrapped private key so the SAME key pair can be
-- recovered on any device. The server never sees the password or the plaintext
-- private key — only the encrypted blob and the KDF salt.
-- Safe to run multiple times.
-- ============================================================================

alter table public.profiles add column if not exists enc_private_key text;
alter table public.profiles add column if not exists key_salt text;
