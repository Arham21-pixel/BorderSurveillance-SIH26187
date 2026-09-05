create table if not exists public.risk_scores (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.behaviour_events(id) on delete cascade,
  score double precision not null check (score >= 0 and score <= 100),
  severity text not null check (severity in ('NORMAL', 'SUSPICIOUS', 'HIGH', 'CRITICAL')),
  reasons jsonb not null default '[]'::jsonb,
  contributing_factors jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null
);

create index if not exists idx_risk_scores_event on public.risk_scores (event_id);
create index if not exists idx_risk_scores_severity on public.risk_scores (severity);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.behaviour_events(id) on delete cascade,
  camera_id uuid not null references public.cameras(id) on delete cascade,
  risk_score double precision not null check (risk_score >= 0 and risk_score <= 100),
  severity text not null check (severity in ('NORMAL', 'SUSPICIOUS', 'HIGH', 'CRITICAL')),
  status text not null default 'OPEN' check (status in ('OPEN', 'ACKNOWLEDGED', 'DISMISSED', 'RESOLVED')),
  acknowledged_by uuid references public.users(id) on delete set null,
  acknowledged_at timestamptz,
  reasons jsonb not null default '[]'::jsonb,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_alerts_camera_created_at on public.alerts (camera_id, created_at desc);
create index if not exists idx_alerts_status on public.alerts (status);
create index if not exists idx_alerts_severity on public.alerts (severity);

create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.alerts(id) on delete cascade,
  camera_id uuid not null references public.cameras(id) on delete cascade,
  snapshot_url text,
  video_clip_url text,
  trajectory_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  timestamp timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_evidence_alert_id on public.evidence (alert_id);

create table if not exists public.system_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_system_events_type_created_at on public.system_events (event_type, created_at desc);

alter table public.risk_scores enable row level security;
alter table public.alerts enable row level security;
alter table public.evidence enable row level security;
alter table public.system_events enable row level security;

drop policy if exists risk_scores_select_authenticated on public.risk_scores;
create policy risk_scores_select_authenticated
on public.risk_scores
for select
to authenticated
using (true);

drop policy if exists risk_scores_write_authenticated on public.risk_scores;
create policy risk_scores_write_authenticated
on public.risk_scores
for all
to authenticated
using (true)
with check (true);

drop policy if exists alerts_select_authenticated on public.alerts;
create policy alerts_select_authenticated
on public.alerts
for select
to authenticated
using (true);

drop policy if exists alerts_write_authenticated on public.alerts;
create policy alerts_write_authenticated
on public.alerts
for all
to authenticated
using (true)
with check (true);

drop policy if exists evidence_select_authenticated on public.evidence;
create policy evidence_select_authenticated
on public.evidence
for select
to authenticated
using (true);

drop policy if exists evidence_write_authenticated on public.evidence;
create policy evidence_write_authenticated
on public.evidence
for all
to authenticated
using (true)
with check (true);

drop policy if exists system_events_select_authenticated on public.system_events;
create policy system_events_select_authenticated
on public.system_events
for select
to authenticated
using (true);

drop policy if exists system_events_insert_authenticated on public.system_events;
create policy system_events_insert_authenticated
on public.system_events
for insert
to authenticated
with check (true);
