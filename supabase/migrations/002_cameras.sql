create table if not exists public.cameras (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  camera_code text not null unique,
  location text,
  latitude double precision,
  longitude double precision,
  stream_ref text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'ERROR')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_cameras_updated_at on public.cameras;
create trigger trg_cameras_updated_at
before update on public.cameras
for each row execute function public.set_updated_at();

create index if not exists idx_cameras_status on public.cameras (status);
create index if not exists idx_cameras_created_at on public.cameras (created_at desc);

create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  camera_id uuid not null references public.cameras(id) on delete cascade,
  name text not null,
  zone_type text not null default 'MONITOR' check (zone_type in ('MONITOR', 'RESTRICTED', 'ENTRY', 'EXIT')),
  polygon jsonb not null default '[]'::jsonb,
  severity text not null default 'MEDIUM' check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  created_at timestamptz not null default now()
);

create index if not exists idx_zones_camera_id on public.zones (camera_id);
create index if not exists idx_zones_zone_type on public.zones (zone_type);

alter table public.cameras enable row level security;
alter table public.zones enable row level security;

drop policy if exists cameras_select_authenticated on public.cameras;
create policy cameras_select_authenticated
on public.cameras
for select
to authenticated
using (true);

drop policy if exists cameras_write_authenticated on public.cameras;
create policy cameras_write_authenticated
on public.cameras
for all
to authenticated
using (true)
with check (true);

drop policy if exists zones_select_authenticated on public.zones;
create policy zones_select_authenticated
on public.zones
for select
to authenticated
using (true);

drop policy if exists zones_write_authenticated on public.zones;
create policy zones_write_authenticated
on public.zones
for all
to authenticated
using (true)
with check (true);
