create table public.profile_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint profile_follows_no_self check (follower_id <> followed_id)
);

create index profile_follows_followed_created_idx
  on public.profile_follows (followed_id, created_at desc);

alter table public.profile_follows enable row level security;

revoke all on table public.profile_follows from anon, authenticated;
grant select, insert, delete on table public.profile_follows to authenticated;

create policy "Follow participants can view follows"
  on public.profile_follows
  for select
  to authenticated
  using (
    (select auth.uid()) = follower_id
    or (select auth.uid()) = followed_id
  );

create policy "Users can follow from their own account"
  on public.profile_follows
  for insert
  to authenticated
  with check (
    (select auth.uid()) = follower_id
    and follower_id <> followed_id
  );

create policy "Users can unfollow from their own account"
  on public.profile_follows
  for delete
  to authenticated
  using ((select auth.uid()) = follower_id);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_status_check check (status in ('pending', 'accepted')),
  constraint friendships_response_consistency check (
    (status = 'pending' and responded_at is null)
    or (status = 'accepted' and responded_at is not null)
  )
);

create unique index friendships_unique_pair_idx
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create index friendships_requester_status_created_idx
  on public.friendships (requester_id, status, created_at desc);

create index friendships_addressee_status_created_idx
  on public.friendships (addressee_id, status, created_at desc);

alter table public.friendships enable row level security;

revoke all on table public.friendships from anon, authenticated;
grant select, insert, delete on table public.friendships to authenticated;
grant update (status, responded_at) on table public.friendships to authenticated;

create policy "Friendship participants can view relationships"
  on public.friendships
  for select
  to authenticated
  using (
    (select auth.uid()) = requester_id
    or (select auth.uid()) = addressee_id
  );

create policy "Users can send their own friend requests"
  on public.friendships
  for insert
  to authenticated
  with check (
    (select auth.uid()) = requester_id
    and requester_id <> addressee_id
    and status = 'pending'
    and responded_at is null
  );

create policy "Recipients can accept pending friend requests"
  on public.friendships
  for update
  to authenticated
  using (
    (select auth.uid()) = addressee_id
    and status = 'pending'
  )
  with check (
    (select auth.uid()) = addressee_id
    and status = 'accepted'
    and responded_at is not null
  );

create policy "Participants can remove friendships"
  on public.friendships
  for delete
  to authenticated
  using (
    (select auth.uid()) = requester_id
    or (select auth.uid()) = addressee_id
  );
