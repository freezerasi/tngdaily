-- ---------------------------------------------------------------------------
-- TNG Daily — 0006 storage bucket for community contribution uploads
--
-- Cloudinary handles editorial images. Contribution uploads from anonymous
-- readers land in Supabase Storage instead, so an unauthenticated upload can
-- never consume a signed Cloudinary credential.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contributions',
  'contributions',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read so an approved contribution can show its photo.
drop policy if exists contributions_bucket_public_read on storage.objects;
create policy contributions_bucket_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'contributions');

-- No anon insert policy: uploads pass through /api/contributions/upload, which
-- validates the file and writes with the service role.
drop policy if exists contributions_bucket_editor_write on storage.objects;
create policy contributions_bucket_editor_write on storage.objects
  for all to authenticated
  using (bucket_id = 'contributions' and public.tng_is_editor())
  with check (bucket_id = 'contributions' and public.tng_is_editor());
