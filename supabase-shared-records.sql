-- ResidentHub: shared records for live website <-> app sync.
-- Paste this whole file in Supabase: SQL Editor > New query > Run.
-- It is safe to run more than once.
--
-- One row per record: kind = 'proof' | 'slot' | 'request' | 'setting', id = the record's id.
-- The website and the app both read and write this table, and Supabase Realtime
-- pushes every change to every open page and app within about a second.
--
-- NOTE: the demo logins in the website and app are not Supabase Auth accounts yet, so
-- this table is open to anyone who has the project's anon key. That is fine for the
-- capstone demo. Before real residents use it, switch the logins to Supabase Auth
-- and replace the two policies below with ones that check auth.uid().

create table if not exists public.shared_records (
  kind        text        not null,
  id          text        not null,
  value       jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (kind, id)
);

create or replace function public.shared_records_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists shared_records_touch on public.shared_records;
create trigger shared_records_touch
  before insert or update on public.shared_records
  for each row execute function public.shared_records_touch();

alter table public.shared_records enable row level security;
grant select, insert, update, delete on public.shared_records to anon, authenticated;

drop policy if exists "demo read"  on public.shared_records;
drop policy if exists "demo write" on public.shared_records;

create policy "demo read"  on public.shared_records
  for select to anon, authenticated using (true);

create policy "demo write" on public.shared_records
  for all to anon, authenticated
  using (kind in ('proof','slot','request','setting'))
  with check (kind in ('proof','slot','request','setting'));

-- Live updates
alter table public.shared_records replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shared_records'
  ) then
    alter publication supabase_realtime add table public.shared_records;
  end if;
end $$;
