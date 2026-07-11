-- ============================================================================
-- Cipher — Supabase schema
-- Run this in the Supabase SQL editor to provision the production backend.
-- The server only ever stores CIPHERTEXT for messages — never plaintext.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  username    text unique not null,
  name        text not null,
  avatar      text,
  bio         text default '',
  public_key  text not null,            -- base64 Curve25519 public key
  verified    boolean default false,
  created_at  timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Follows
-- ---------------------------------------------------------------------------
create table if not exists public.follows (
  follower_id  uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at   timestamptz default now(),
  primary key (follower_id, following_id)
);

-- ---------------------------------------------------------------------------
-- Posts / comments / likes / saves
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid references public.profiles(id) on delete cascade,
  text       text default '',
  media      jsonb default '[]'::jsonb,    -- [{type, url}]
  shares     int default 0,
  created_at timestamptz default now()
);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references public.posts(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete cascade,
  text       text not null,
  created_at timestamptz default now()
);

create table if not exists public.likes (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (post_id, user_id)
);

create table if not exists public.saves (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (post_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Stories (24h)
-- ---------------------------------------------------------------------------
create table if not exists public.stories (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid references public.profiles(id) on delete cascade,
  media       jsonb not null,            -- {type, url}
  highlighted boolean default false,
  created_at  timestamptz default now(),
  expires_at  timestamptz default now() + interval '24 hours'
);

create table if not exists public.story_views (
  story_id  uuid references public.stories(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete cascade,
  reaction  text,
  viewed_at timestamptz default now(),
  primary key (story_id, viewer_id)
);

-- ---------------------------------------------------------------------------
-- Conversations + encrypted membership keys
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  is_group        boolean default false,
  name            text,
  avatar          text,
  created_at      timestamptz default now(),
  last_message_at timestamptz default now()
);

-- Each member stores the conversation symmetric key SEALED to their public key.
-- Only the member's private key (held on-device) can open it.
create table if not exists public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade,
  sealed_key      text not null,         -- base64 crypto_box_seal(conversation_key, member_pubkey)
  primary key (conversation_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Messages — encrypted blobs only
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id       uuid references public.profiles(id) on delete cascade,
  kind            text default 'text',   -- text | image | file | voice
  ciphertext      text not null,         -- base64 — server cannot read this
  nonce           text not null,
  meta            jsonb default '{}'::jsonb,
  reply_to        uuid,
  edited_at       timestamptz,
  deleted         boolean default false,
  created_at      timestamptz default now()
);

create table if not exists public.message_reactions (
  message_id uuid references public.messages(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  emoji      text not null,
  primary key (message_id, user_id)
);

create table if not exists public.message_receipts (
  message_id uuid references public.messages(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  delivered  boolean default true,
  read       boolean default false,
  at         timestamptz default now(),
  primary key (message_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,  -- recipient
  actor_id   uuid references public.profiles(id) on delete cascade,
  type       text not null,
  target_id  text,
  preview    text,
  read       boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_posts_created on public.posts(created_at desc);
create index if not exists idx_messages_conv on public.messages(conversation_id, created_at);
create index if not exists idx_notif_user on public.notifications(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.follows               enable row level security;
alter table public.posts                 enable row level security;
alter table public.comments              enable row level security;
alter table public.likes                 enable row level security;
alter table public.saves                 enable row level security;
alter table public.stories               enable row level security;
alter table public.story_views           enable row level security;
alter table public.conversations         enable row level security;
alter table public.conversation_members  enable row level security;
alter table public.messages              enable row level security;
alter table public.message_reactions     enable row level security;
alter table public.message_receipts      enable row level security;
alter table public.notifications         enable row level security;

-- Public-readable social content
create policy "profiles readable"   on public.profiles for select using (true);
create policy "own profile write"   on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "follows readable"    on public.follows  for select using (true);
create policy "manage own follows"  on public.follows  for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);
create policy "posts readable"      on public.posts    for select using (true);
create policy "own posts write"     on public.posts    for all using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "comments readable"   on public.comments for select using (true);
create policy "own comments write"  on public.comments for all using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "likes readable"      on public.likes    for select using (true);
create policy "own likes"           on public.likes    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "saves visible to owner" on public.saves for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "stories readable"    on public.stories  for select using (true);
create policy "own stories write"   on public.stories  for all using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "story views"         on public.story_views for all using (auth.uid() = viewer_id) with check (auth.uid() = viewer_id);

-- Conversations & messages: members only
-- SECURITY DEFINER helper avoids the infinite-recursion footgun that arises when
-- a conversation_members policy queries conversation_members.
create or replace function public.is_member(conv uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = conv and user_id = auth.uid()
  );
$$;

create policy "member can see conversation" on public.conversations for select using (public.is_member(id));
create policy "authenticated can create conversation" on public.conversations for insert with check (auth.uid() is not null);
create policy "member can update conversation" on public.conversations for update using (public.is_member(id));

create policy "see conversation membership" on public.conversation_members for select using (public.is_member(conversation_id));
create policy "authenticated can add members" on public.conversation_members for insert with check (auth.uid() is not null);

create policy "member can read messages" on public.messages for select using (public.is_member(conversation_id));
create policy "member can send messages" on public.messages for insert with check (
  sender_id = auth.uid() and public.is_member(conversation_id)
);
create policy "sender can edit own messages" on public.messages for update using (sender_id = auth.uid());
create policy "reactions by members"  on public.message_reactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "receipts by members"   on public.message_receipts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notifications: recipient only
create policy "see own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "update own notifications" on public.notifications for update using (auth.uid() = user_id);
create policy "anyone can notify" on public.notifications for insert with check (auth.uid() = actor_id);

-- ---------------------------------------------------------------------------
-- Realtime + storage
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.message_receipts;
alter publication supabase_realtime add table public.message_reactions;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.story_views;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.likes;
alter publication supabase_realtime add table public.saves;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.follows;
alter publication supabase_realtime add table public.stories;

-- REPLICA IDENTITY FULL: required so Realtime can evaluate the RLS SELECT policy
-- against the OLD row for UPDATE/DELETE events. Without it, message edits and
-- soft-deletes (both UPDATEs) never reach the other participant, because the old
-- row lacks conversation_id and is_member(NULL) filters the recipient out.
alter table public.messages         replica identity full;
alter table public.message_receipts replica identity full;

-- Storage buckets (create in dashboard or via API):
--   insert into storage.buckets (id, name, public) values
--     ('avatars','avatars', true),
--     ('posts','posts', true),
--     ('stories','stories', true),
--     ('attachments','attachments', false);  -- encrypted chat attachments are private

-- New-user trigger: auto-create a profile row.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, name, public_key)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', 'user_' || left(new.id::text, 8)),
          coalesce(new.raw_user_meta_data->>'name', 'New User'),
          coalesce(new.raw_user_meta_data->>'public_key', ''));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
