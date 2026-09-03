insert into public.cameras (id, name, camera_code, location, latitude, longitude, stream_ref, status)
values
  ('11111111-1111-1111-1111-111111111111', 'North Fence 01', 'NF-01', 'North Sector Fence', 34.1526, 77.5771, '0', 'ACTIVE'),
  ('22222222-2222-2222-2222-222222222222', 'River Crossing 02', 'RC-02', 'West River Crossing', 34.1401, 77.5102, 'data/sample_videos/demo.mp4', 'ACTIVE')
on conflict (id) do nothing;

insert into public.zones (id, camera_id, name, zone_type, polygon, severity)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Inner Fence Belt',
    'RESTRICTED',
    '[{"x":80,"y":200},{"x":900,"y":200},{"x":900,"y":520},{"x":80,"y":520}]'::jsonb,
    'HIGH'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'Bridge Entry Corridor',
    'ENTRY',
    '[{"x":120,"y":170},{"x":760,"y":170},{"x":760,"y":460},{"x":120,"y":460}]'::jsonb,
    'MEDIUM'
  )
on conflict (id) do nothing;
