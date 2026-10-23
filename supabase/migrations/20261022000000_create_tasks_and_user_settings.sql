-- Dayplan data model (see AGENTS.md → "Data model (Supabase)").
-- Every row belongs to one person: user_id is the Clerk user ID from the session token's `sub` claim.
-- Row-level security lets a signed-in person touch only their own rows; signed-out visitors (anon) get nothing.

-- tasks: one row per task
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  title text not null check (char_length(title) between 1 and 120),
  date date not null,
  done boolean not null default false,
  done_at timestamptz,
  position bigint not null,
  carried_from date,
  created_at timestamptz not null default now()
);

-- Every view loads tasks by person and day.
create index tasks_user_id_date_idx on public.tasks (user_id, date);

alter table public.tasks enable row level security;

create policy "Read own tasks" on public.tasks
  for select to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

create policy "Add own tasks" on public.tasks
  for insert to authenticated
  with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "Change own tasks" on public.tasks
  for update to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id)
  with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "Delete own tasks" on public.tasks
  for delete to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

-- user_settings: one row per person
create table public.user_settings (
  user_id text primary key default (auth.jwt() ->> 'sub'),
  wrap_up_time time,
  onboarded boolean not null default false,
  weather_mode text check (weather_mode in ('location', 'place', 'off')),
  -- Rounded to 2 decimals (about 1 km); never an exact position.
  weather_lat numeric(4, 2) check (weather_lat between -90 and 90),
  weather_lon numeric(5, 2) check (weather_lon between -180 and 180),
  weather_place_name text
);

alter table public.user_settings enable row level security;

create policy "Read own settings" on public.user_settings
  for select to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

create policy "Add own settings" on public.user_settings
  for insert to authenticated
  with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "Change own settings" on public.user_settings
  for update to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id)
  with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "Delete own settings" on public.user_settings
  for delete to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);
