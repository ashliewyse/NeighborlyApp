-- Allow approved Neighborly members to add one optional image to a saved post comment.

alter table public.post_comments
  add column if not exists image_path text;

alter table public.post_comments
  alter column body set default '';

alter table public.post_comments
  drop constraint if exists post_comments_body_length;

alter table public.post_comments
  drop constraint if exists post_comments_body_or_image;

alter table public.post_comments
  add constraint post_comments_body_or_image
  check (
    char_length(btrim(body)) <= 2000
    and (
      char_length(btrim(body)) >= 1
      or image_path is not null
    )
  );

alter table public.post_comments
  drop constraint if exists post_comments_image_path_format;

alter table public.post_comments
  add constraint post_comments_image_path_format
  check (
    image_path is null
    or (
      char_length(image_path) between 1 and 600
      and image_path = btrim(image_path)
      and image_path ~ '^[0-9a-f-]{36}/comments/[0-9a-f-]{36}/[0-9]+-[a-z0-9]+\.(jpg|png|webp|gif)$'
    )
  );

comment on column public.post_comments.image_path is
  'User-owned path in the public neighborly-media bucket for an optional comment image.';

drop policy if exists "approved members create own post comments"
  on public.post_comments;

create policy "approved members create own post comments"
on public.post_comments
for insert
to authenticated
with check (
  private.has_site_access()
  and author_id = (select auth.uid())
  and exists (
    select 1
    from public.posts post
    where post.id = post_id
  )
  and (
    image_path is null
    or (
      split_part(image_path, '/', 1) = author_id::text
      and split_part(image_path, '/', 2) = 'comments'
      and split_part(image_path, '/', 3) = post_id::text
      and split_part(image_path, '/', 4) <> ''
      and split_part(image_path, '/', 5) = ''
    )
  )
);

-- Replace permissive duplicate media policies with approved-member, owner-folder policies.
drop policy if exists "approved members upload neighborly media" on storage.objects;
drop policy if exists "approved members update neighborly media" on storage.objects;
drop policy if exists "approved members delete neighborly media" on storage.objects;
drop policy if exists "authenticated users upload neighborly media" on storage.objects;
drop policy if exists "users update own neighborly media" on storage.objects;
drop policy if exists "users delete own neighborly media" on storage.objects;
drop policy if exists "approved members upload own neighborly media" on storage.objects;
drop policy if exists "approved members update own neighborly media" on storage.objects;
drop policy if exists "approved members delete own neighborly media" on storage.objects;

create policy "approved members upload own neighborly media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'neighborly-media'
  and private.has_site_access()
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "approved members update own neighborly media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'neighborly-media'
  and private.has_site_access()
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'neighborly-media'
  and private.has_site_access()
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "approved members delete own neighborly media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'neighborly-media'
  and private.has_site_access()
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
