'use client';

import { createClient } from './client';

/**
 * Upload a file to a public Supabase Storage bucket and return its public URL.
 * Returns null in demo mode or on failure (caller can fall back to a sample URL).
 * Buckets: `avatars`, `posts`, `stories` (create them in the Supabase dashboard).
 */
export async function uploadPublic(bucket: string, file: File | Blob): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  try {
    const name = 'name' in file ? file.name : '';
    // strip codec params (e.g. "audio/webm;codecs=opus") for the extension
    const baseType = (file.type || '').split(';')[0];
    const ext = name.includes('.') ? name.split('.').pop() : (baseType.split('/')[1] || 'bin');
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: baseType || undefined, // critical for audio to decode on playback
    });
    if (error) return null;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}
