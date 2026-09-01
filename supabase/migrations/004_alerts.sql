create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  camera_id text not null references public.cameras(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  severity text not null check (severity in ('high', 'medium', 'low')),
  title text not null,
  description text not null,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'closed')),
  evidence_path text,
  acknowledged_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists alerts_status_idx on public.alerts (status, created_at desc);
create index if not exists alerts_severity_idx on public.alerts (severity);

alter table public.alerts enable row level security;

create policy "alerts_select_authenticated"
  on public.alerts for select
  to authenticated
  using (true);

create policy "alerts_insert_authenticated"
  on public.alerts for insert
  to authenticated
  with check (true);

create policy "alerts_update_authenticated"
  on public.alerts for update
  to authenticated
  using (true)
  with check (true);
