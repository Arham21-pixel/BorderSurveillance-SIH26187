create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  camera_id uuid not null references public.cameras(id) on delete cascade,
  external_track_id text not null,
  object_class text not null,
  start_time timestamptz not null,
  last_seen timestamptz not null,
  direction text not null default 'UNKNOWN' check (direction in ('NORTH', 'SOUTH', 'EAST', 'WEST', 'UNKNOWN')),
  dwell_time double precision not null default 0,
  trajectory jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (camera_id, external_track_id)
);

create index if not exists idx_tracks_camera_last_seen on public.tracks (camera_id, last_seen desc);

create table if not exists public.detections (
  id uuid primary key default gen_random_uuid(),
  camera_id uuid not null references public.cameras(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete set null,
  object_class text not null,
  confidence double precision not null check (confidence >= 0 and confidence <= 1),
  bounding_box jsonb not null,
  timestamp timestamptz not null
);

create index if not exists idx_detections_camera_timestamp on public.detections (camera_id, timestamp desc);
create index if not exists idx_detections_track_timestamp on public.detections (track_id, timestamp desc);

create table if not exists public.behaviour_events (
  id uuid primary key default gen_random_uuid(),
  camera_id uuid not null references public.cameras(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete set null,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  timestamp timestamptz not null
);

create index if not exists idx_behaviour_events_camera_timestamp on public.behaviour_events (camera_id, timestamp desc);
create index if not exists idx_behaviour_events_type_timestamp on public.behaviour_events (event_type, timestamp desc);

alter table public.tracks enable row level security;
alter table public.detections enable row level security;
alter table public.behaviour_events enable row level security;

drop policy if exists tracks_select_authenticated on public.tracks;
create policy tracks_select_authenticated
on public.tracks
for select
to authenticated
using (true);

drop policy if exists tracks_write_authenticated on public.tracks;
create policy tracks_write_authenticated
on public.tracks
for all
to authenticated
using (true)
with check (true);

drop policy if exists detections_select_authenticated on public.detections;
create policy detections_select_authenticated
on public.detections
for select
to authenticated
using (true);

drop policy if exists detections_insert_authenticated on public.detections;
create policy detections_insert_authenticated
on public.detections
for insert
to authenticated
with check (true);

drop policy if exists behaviour_events_select_authenticated on public.behaviour_events;
create policy behaviour_events_select_authenticated
on public.behaviour_events
for select
to authenticated
using (true);

drop policy if exists behaviour_events_write_authenticated on public.behaviour_events;
create policy behaviour_events_write_authenticated
on public.behaviour_events
for all
to authenticated
using (true)
with check (true);
