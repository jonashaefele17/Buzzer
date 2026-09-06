-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Creates a single-row table holding the entire game state, since there is only
-- ever exactly ONE game running at a time (see project spec).

create table if not exists public.game (
  id smallint primary key default 1,
  config jsonb not null default '{"teams":[],"pointsCorrect":1,"pointsWrongEnabled":false,"pointsWrongValue":0}',
  status text not null default 'not_started',
  scores jsonb not null default '{}',
  previous_scores jsonb not null default '{}',
  question_number int not null default 0,
  question_status text not null default 'open',
  buzzed_team_id text,
  excluded_team_ids jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  constraint game_single_row check (id = 1)
);

-- Seed the one and only row (no-op if it already exists).
insert into public.game (id) values (1)
on conflict (id) do nothing;

-- Row Level Security: this app has no login (see spec, "kein Login-/Passwortschutz"),
-- so the public "publishable" key (formerly called "anon" key) needs read+write
-- access to this single row. The policies below still target Postgres role "anon",
-- which is the role the publishable key authenticates as.
alter table public.game enable row level security;

drop policy if exists "anon can read game" on public.game;
create policy "anon can read game"
  on public.game for select
  to anon
  using (true);

drop policy if exists "anon can update game" on public.game;
create policy "anon can update game"
  on public.game for update
  to anon
  using (true)
  with check (true);

-- Enable realtime change notifications for this table so all clients
-- (host + every team device) get live updates.
alter publication supabase_realtime add table public.game;
