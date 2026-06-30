-- ============================================================================
-- Cipher Moments migration — run in the Supabase SQL editor.
-- Adds text/voice "mood drop" support to stories. Safe to run multiple times.
-- ============================================================================

alter table public.stories add column if not exists kind text default 'photo';
alter table public.stories add column if not exists text text;
alter table public.stories add column if not exists audio_duration int;

-- text/voice moments have no media
alter table public.stories alter column media drop not null;
