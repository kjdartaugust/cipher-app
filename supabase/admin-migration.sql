-- Admin dashboard: role, suspension, and reports.
--
-- Scope note: an admin CANNOT read messages. Message bodies are encrypted with
-- a key derived from the user's password, which the server never sees, so there
-- is no admin path to plaintext and there is not supposed to be one. Everything
-- here operates on metadata (counts, timestamps) and on the data that genuinely
-- is plaintext in Postgres: profiles, posts, comments, stories.

-- ---------------------------------------------------------------------------
-- Role + suspension
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists is_admin   boolean not null default false;
alter table public.profiles add column if not exists suspended  boolean not null default false;
alter table public.profiles add column if not exists suspended_at     timestamptz;
alter table public.profiles add column if not exists suspended_reason text;

-- is_admin must never be self-grantable. The existing "users can update their
-- own profile" policy would happily let anyone set is_admin = true on
-- themselves, which would make the whole thing decorative. Postgres has no
-- column-level RLS, so we enforce it with a trigger: only the service role (a
-- server-side API route we control) may change is_admin or suspended.
-- NOT security definer, and that is the whole point. Inside a SECURITY DEFINER
-- function current_user is the function's OWNER (postgres), not the caller — so
-- the check below would pass for everybody and the guard would be decorative.
-- As SECURITY INVOKER, current_user is the role PostgREST is actually running
-- as: 'authenticated' for a signed-in user, 'service_role' for our API routes.
create or replace function public.guard_privileged_profile_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Trusted callers: the service role (our /api/admin routes, where PostgREST
  -- does SET LOCAL ROLE service_role) and superusers (you, in the SQL editor —
  -- otherwise this trigger would block the very statement that grants you
  -- admin in the first place).
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  if new.is_admin  is distinct from old.is_admin
  or new.suspended is distinct from old.suspended then
    raise exception 'is_admin and suspended may only be changed by an administrator';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_privileged_profile_columns on public.profiles;
create trigger guard_privileged_profile_columns
  before update on public.profiles
  for each row execute function public.guard_privileged_profile_columns();

-- ---------------------------------------------------------------------------
-- Reports (user-submitted; reviewed in the dashboard)
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid references public.profiles(id) on delete set null,
  -- what is being reported. 'user' | 'post' | 'comment' | 'story'
  target_type   text not null check (target_type in ('user', 'post', 'comment', 'story')),
  target_id     uuid not null,
  reason        text not null,
  note          text default '',
  -- 'open' | 'actioned' | 'dismissed'
  status        text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  resolved_by   uuid references public.profiles(id) on delete set null,
  resolved_at   timestamptz,
  created_at    timestamptz default now()
);

create index if not exists reports_status_idx  on public.reports (status, created_at desc);
create index if not exists reports_target_idx  on public.reports (target_type, target_id);

alter table public.reports enable row level security;

-- Anyone signed in can file a report...
drop policy if exists "file a report" on public.reports;
create policy "file a report" on public.reports
  for insert with check (auth.uid() = reporter_id);

-- ...and see the ones they filed. Reading everyone's reports, and resolving
-- them, happens through the service role in /api/admin, never from the client.
drop policy if exists "read own reports" on public.reports;
create policy "read own reports" on public.reports
  for select using (auth.uid() = reporter_id);

-- ---------------------------------------------------------------------------
-- Enforcing suspension
-- ---------------------------------------------------------------------------
-- A suspended flag that only greys out the UI is theatre — anyone can call the
-- API directly. Enforce it in the database: a suspended user can still sign in
-- and read (so they can see they've been suspended, and export nothing new),
-- but cannot create anything.
create or replace function public.is_suspended()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select suspended from public.profiles where id = auth.uid()), false);
$$;

-- Recreate the write policies with the suspension check folded into WITH CHECK,
-- which governs the rows a user may create or modify. DELETE is deliberately
-- left alone: a suspended user may still remove their own content.
drop policy if exists "member can send messages" on public.messages;
create policy "member can send messages" on public.messages for insert with check (
  sender_id = auth.uid()
  and public.is_member(conversation_id)
  and not public.is_suspended()
);

drop policy if exists "own posts write" on public.posts;
create policy "own posts write" on public.posts for all
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id and not public.is_suspended());

drop policy if exists "own comments write" on public.comments;
create policy "own comments write" on public.comments for all
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id and not public.is_suspended());

drop policy if exists "own stories write" on public.stories;
create policy "own stories write" on public.stories for all
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id and not public.is_suspended());

-- ---------------------------------------------------------------------------
-- Grant yourself admin. Run this once, with your own username.
-- ---------------------------------------------------------------------------
-- update public.profiles set is_admin = true where username = 'your_username';
