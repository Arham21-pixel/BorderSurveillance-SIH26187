create table if not exists public.cameras (
  id text primary key,
  name text not null,
  source text not null,
  latitude double precision,
  longitude double precision,
  sector text not null default 'unassigned',
  status text not null default 'offline' check (status in ('online', 'offline', 'degraded')),
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists cameras_sector_idx on public.cameras (sector);
create index if not exists cameras_status_idx on public.cameras (status);

alter table public.cameras enable row level security;

create policy "cameras_select_authenticated"
  on public.cameras for select
  to authenticated
  using (true);

create policy "cameras_write_authenticated"
  on public.cameras for all
  to authenticated
  using (true)
  with check (true);
