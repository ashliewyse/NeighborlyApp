alter table public.posts
  add column if not exists is_admin_post boolean not null default false;

comment on column public.posts.is_admin_post is
  'True only for official Neighborly announcements created by an enabled site administrator.';

drop policy if exists "authenticated users create posts" on public.posts;
create policy "authenticated users create posts"
on public.posts
for insert
to authenticated
with check (
  (select auth.uid()) = author_id
  and (
    not is_admin_post
    or exists (
      select 1
      from public.site_admins admin
      where admin.user_id = (select auth.uid())
        and admin.enabled = true
    )
  )
);

drop policy if exists "authors update own posts" on public.posts;
create policy "authors update own posts"
on public.posts
for update
to authenticated
using ((select auth.uid()) = author_id)
with check (
  (select auth.uid()) = author_id
  and (
    not is_admin_post
    or exists (
      select 1
      from public.site_admins admin
      where admin.user_id = (select auth.uid())
        and admin.enabled = true
    )
  )
);
