create table if not exists public.comment_likes (
  comment_id uuid not null references public.post_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.comment_likes enable row level security;

drop policy if exists "approved members read comment likes" on public.comment_likes;
create policy "approved members read comment likes"
on public.comment_likes
for select
to authenticated
using (private.has_site_access());

drop policy if exists "approved members create own comment likes" on public.comment_likes;
create policy "approved members create own comment likes"
on public.comment_likes
for insert
to authenticated
with check (
  private.has_site_access()
  and user_id = (select auth.uid())
  and exists (
    select 1
    from public.post_comments comment
    where comment.id = comment_id
      and comment.moderation_hidden_at is null
      and private.can_interact_with(comment.author_id)
  )
);

drop policy if exists "approved members remove own comment likes" on public.comment_likes;
create policy "approved members remove own comment likes"
on public.comment_likes
for delete
to authenticated
using (
  private.has_site_access()
  and user_id = (select auth.uid())
);

create index if not exists comment_likes_user_id_idx on public.comment_likes(user_id);

grant select, insert, delete on public.comment_likes to authenticated;
