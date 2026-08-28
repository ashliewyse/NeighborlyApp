create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_likes_user_id_post_id_idx
  on public.post_likes (user_id, post_id);

alter table public.post_likes enable row level security;

revoke all on table public.post_likes from anon;
grant select, insert, delete on table public.post_likes to authenticated;

create policy "approved members read post likes"
on public.post_likes
for select
to authenticated
using (private.has_site_access());

create policy "approved members create own post likes"
on public.post_likes
for insert
to authenticated
with check (
  private.has_site_access()
  and user_id = (select auth.uid())
);

create policy "approved members remove own post likes"
on public.post_likes
for delete
to authenticated
using (
  private.has_site_access()
  and user_id = (select auth.uid())
);
