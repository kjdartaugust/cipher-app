-- ============================================================================
-- Cipher RLS fix — run this in the Supabase SQL editor if you applied an EARLY
-- version of schema.sql. It replaces the conversation/message policies with
-- recursion-safe versions and adds the missing INSERT/UPDATE policies that the
-- app needs to create conversations and send messages.
-- Safe to run multiple times.
-- ============================================================================

create or replace function public.is_member(conv uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = conv and user_id = auth.uid()
  );
$$;

-- conversations
drop policy if exists "member can see conversation" on public.conversations;
drop policy if exists "authenticated can create conversation" on public.conversations;
drop policy if exists "member can update conversation" on public.conversations;
create policy "member can see conversation" on public.conversations for select using (public.is_member(id));
create policy "authenticated can create conversation" on public.conversations for insert with check (auth.uid() is not null);
create policy "member can update conversation" on public.conversations for update using (public.is_member(id));

-- conversation_members
drop policy if exists "see own membership" on public.conversation_members;
drop policy if exists "see conversation membership" on public.conversation_members;
drop policy if exists "authenticated can add members" on public.conversation_members;
create policy "see conversation membership" on public.conversation_members for select using (public.is_member(conversation_id));
create policy "authenticated can add members" on public.conversation_members for insert with check (auth.uid() is not null);

-- messages
drop policy if exists "member can read messages" on public.messages;
drop policy if exists "member can send messages" on public.messages;
create policy "member can read messages" on public.messages for select using (public.is_member(conversation_id));
create policy "member can send messages" on public.messages for insert with check (
  sender_id = auth.uid() and public.is_member(conversation_id)
);

-- Add social tables to the realtime publication so the live feed refreshes.
-- (ignore "already member" errors)
do $$
declare t text;
begin
  foreach t in array array['messages','message_receipts','message_reactions','notifications','story_views','posts','likes','saves','comments','follows','stories']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Storage buckets (run once; ignore errors if they already exist)
insert into storage.buckets (id, name, public) values
  ('avatars','avatars', true),
  ('posts','posts', true),
  ('stories','stories', true)
on conflict (id) do nothing;

-- Allow public read + authenticated write on the public buckets
drop policy if exists "public read" on storage.objects;
drop policy if exists "authenticated upload" on storage.objects;
create policy "public read" on storage.objects for select using (bucket_id in ('avatars','posts','stories'));
create policy "authenticated upload" on storage.objects for insert
  with check (bucket_id in ('avatars','posts','stories') and auth.uid() is not null);
