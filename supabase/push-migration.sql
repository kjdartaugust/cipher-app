-- ============================================================================
-- Cipher Web Push migration — run in the Supabase SQL editor.
-- Stores each device's push subscription so the server can notify users when
-- the app/browser is closed. Safe to run multiple times.
-- ============================================================================

create table if not exists public.push_subscriptions (
  endpoint     text primary key,
  user_id      uuid references public.profiles(id) on delete cascade,
  subscription jsonb not null,
  created_at   timestamptz default now()
);

create index if not exists idx_push_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "manage own push subs" on public.push_subscriptions;
create policy "manage own push subs" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
