-- Optional object storage for alert snapshots / clips.
-- The operator UI still works offline with in-memory evidence if this bucket is absent.

insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

drop policy if exists evidence_select_authenticated on storage.objects;
create policy evidence_select_authenticated
on storage.objects
for select
to authenticated
using (bucket_id = 'evidence');

drop policy if exists evidence_insert_authenticated on storage.objects;
create policy evidence_insert_authenticated
on storage.objects
for insert
to authenticated
with check (bucket_id = 'evidence');

drop policy if exists evidence_update_authenticated on storage.objects;
create policy evidence_update_authenticated
on storage.objects
for update
to authenticated
using (bucket_id = 'evidence')
with check (bucket_id = 'evidence');
