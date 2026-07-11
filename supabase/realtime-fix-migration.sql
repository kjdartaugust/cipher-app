-- ---------------------------------------------------------------------------
-- Fix: message EDITS and soft-DELETES were not reaching the other participant
-- live (they only showed on the editor's own screen).
--
-- Why: Supabase Realtime runs the table's RLS SELECT policy to decide who
-- receives each change. For messages that policy is is_member(conversation_id).
--   • INSERT  → checked against the NEW row (has conversation_id) → delivered. ✓
--   • UPDATE  → checked against the OLD row. With the default REPLICA IDENTITY
--               the old row carries only the primary key, so conversation_id is
--               NULL, is_member(NULL) is false, and the recipient is filtered
--               out → the edit/delete event is silently dropped. ✗
--
-- REPLICA IDENTITY FULL makes Postgres emit the complete old row, so the policy
-- evaluates correctly and edit/delete events broadcast to conversation members.
-- (This is a database-side change — run once in the Supabase SQL editor. No app
-- redeploy needed.)
-- ---------------------------------------------------------------------------

alter table public.messages replica identity full;

-- Read receipts flip delivered -> read via an UPDATE too, so give them the same
-- treatment for live status ticks.
alter table public.message_receipts replica identity full;
