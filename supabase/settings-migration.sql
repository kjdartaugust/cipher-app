-- ============================================================================
-- Cipher settings/security migration — run in the Supabase SQL editor.
-- Adds private-account flag and a user block list. Safe to run multiple times.
-- ============================================================================

alter table public.profiles add column if not exists private boolean default false;

create table if not exists public.blocks (
  blocker_id uuid references public.profiles(id) on delete cascade,
  blocked_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

alter table public.blocks enable row level security;

drop policy if exists "manage own blocks" on public.blocks;
create policy "manage own blocks" on public.blocks
  for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.blocks';
  exception when duplicate_object then null;
  end;
end $$;
