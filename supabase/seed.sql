insert into public.cameras (id, name, source, latitude, longitude, sector, status)
values
  ('cam-north-01', 'North Fence 01', '0', 34.1526, 77.5771, 'north', 'online'),
  ('cam-west-02', 'River Crossing 02', 'data/sample_videos/demo.mp4', 34.1401, 77.5102, 'west', 'online'),
  ('cam-east-03', 'Ridge Watch 03', 'rtsp://example.invalid/east03', 34.1710, 77.6408, 'east', 'offline')
on conflict (id) do nothing;

insert into public.events (camera_id, track_id, kind, description, risk_score)
select 'cam-north-01', 1, 'zone_intrusion', 'Person entered restricted belt', 0.820
where exists (select 1 from public.cameras where id = 'cam-north-01');
