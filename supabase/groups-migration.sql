-- ============================================================================
-- Cipher group-management migration — run in the Supabase SQL editor.
-- Lets members leave a group and remove others. Safe to run multiple times.
-- (Conversation rename/avatar already work via the existing UPDATE policy.)
-- ============================================================================

drop policy if exists "member can remove membership" on public.conversation_members;
create policy "member can remove membership" on public.conversation_members
  for delete using (public.is_member(conversation_id));
