-- Client error log.
--
-- A PWA on someone else's phone has a console you will never see. Without this,
-- "it didn't work" is the entire bug report. So the app posts its uncaught
-- errors here and the admin dashboard tails them.
--
-- Privacy: this stores an error message, a stack, and the page it happened on.
-- It must never carry message content — errors are logged from the global
-- handlers, not from anywhere that touches plaintext. Keep it that way.

create table if not exists public.client_errors (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  message    text not null,
  stack      text,
  url        text,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists client_errors_created_idx on public.client_errors (created_at desc);

alter table public.client_errors enable row level security;

-- Clients may report their own errors and nothing else. Reading the log happens
-- through the service role in /api/admin — no user can read anyone's errors,
-- including their own, because there is no reason for them to.
drop policy if exists "report own errors" on public.client_errors;
create policy "report own errors" on public.client_errors
  for insert with check (auth.uid() = user_id);
