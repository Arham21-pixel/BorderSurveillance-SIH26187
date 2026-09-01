create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  camera_id text not null references public.cameras(id) on delete cascade,
  track_id integer,
  kind text not null,
  description text not null,
  risk_score numeric(4,3) not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_camera_idx on public.events (camera_id, created_at desc);
create index if not exists events_kind_idx on public.events (kind);

alter table public.events enable row level security;

create policy "events_select_authenticated"
  on public.events for select
  to authenticated
  using (true);

create policy "events_insert_authenticated"
  on public.events for insert
  to authenticated
  with check (true);
