'use client';

import { createClient } from './client';

/**
 * Upload a file to a public Supabase Storage bucket and return its public URL.
 * Returns null in demo mode or on failure (caller can fall back to a sample URL).
 * Buckets: `avatars`, `posts`, `stories` (create them in the Supabase dashboard).
 */
export async function uploadPublic(bucket: string, file: File): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  try {
    const ext = file.name.split('.').pop() ?? 'bin';
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) return null;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}
