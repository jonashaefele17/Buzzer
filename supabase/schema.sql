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

-- Row Level Security: team devices stay anonymous and may only ever buzz (they
-- never log in), while every other host action (judge, adjustScore, startGame,
-- etc.) requires a login. This is enforced with column-level grants: anon can
-- only ever SET question_status/buzzed_team_id (exactly what buzz() touches),
-- never scores/config/question_number/excluded_team_ids/status.
alter table public.game enable row level security;

drop policy if exists "anon can read game" on public.game;
create policy "anon can read game"
  on public.game for select
  to anon, authenticated
  using (true);

drop policy if exists "anon can update game" on public.game;
drop policy if exists "anon can buzz" on public.game;
revoke update on public.game from anon;
grant update (question_status, buzzed_team_id) on public.game to anon;
create policy "anon can buzz"
  on public.game for update
  to anon
  using (true)
  with check (true);

drop policy if exists "authenticated can update game" on public.game;
create policy "authenticated can update game"
  on public.game for update
  to authenticated
  using (true)
  with check (true);

-- Enable realtime change notifications for this table so all clients
-- (host + every team device) get live updates. Guarded so re-running this
-- script doesn't fail if the table was already added previously.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game'
  ) then
    alter publication supabase_realtime add table public.game;
  end if;
end $$;

