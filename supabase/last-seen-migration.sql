-- Last seen.
--
-- Realtime presence only tells you who is connected *right now* — the moment a
-- user closes the app they disappear from the channel and there is nowhere to
-- read "when did they leave". So we persist it.
--
-- Written on a heartbeat while the app is in the foreground, and once more on
-- the way out (visibilitychange / pagehide). Frozen while the user is
-- Invisible: a ticking timestamp would leak exactly the thing Invisible is
-- supposed to hide.

alter table public.profiles add column if not exists last_seen_at timestamptz;

-- Existing profiles have no history; leave them null. The UI reads null as
-- "no last-seen info" and simply shows nothing, rather than claiming they were
-- last seen at the moment you ran this migration.
