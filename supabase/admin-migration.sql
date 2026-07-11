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
create or replace function public.guard_privileged_profile_columns()
returns trigger
language plpgsql
security definer
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
-- Grant yourself admin. Run this once, with your own username.
-- ---------------------------------------------------------------------------
-- update public.profiles set is_admin = true where username = 'your_username';
