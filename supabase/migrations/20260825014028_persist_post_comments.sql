-- Persist feed comments and restrict access to approved Neighborly members.

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint post_comments_body_length
    check (char_length(btrim(body)) between 1 and 2000)
);

comment on table public.post_comments is
  'Comments written by approved Neighborly members on saved feed posts.';

create index post_comments_post_created_idx
  on public.post_comments (post_id, created_at, id);

create index post_comments_author_created_idx
  on public.post_comments (author_id, created_at desc);

alter table public.post_comments enable row level security;

revoke all on table public.post_comments from anon, authenticated;
grant select, insert, delete on table public.post_comments to authenticated;

create policy "approved members view post comments"
on public.post_comments
for select
to authenticated
using (private.has_site_access());

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
);

create policy "authors and admins remove post comments"
on public.post_comments
for delete
to authenticated
using (
  private.has_site_access()
  and (
    author_id = (select auth.uid())
    or exists (
      select 1
      from public.site_admins admin
      where admin.user_id = (select auth.uid())
        and admin.enabled = true
    )
  )
);
