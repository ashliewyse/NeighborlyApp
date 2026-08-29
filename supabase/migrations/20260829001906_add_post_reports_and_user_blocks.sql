create table public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);

create index user_blocks_blocked_created_idx
  on public.user_blocks (blocked_id, created_at desc);

alter table public.user_blocks enable row level security;
revoke all on table public.user_blocks from anon, authenticated;
grant select, insert, delete on table public.user_blocks to authenticated;
grant all on table public.user_blocks to service_role;

create policy "members view blocks they created or admins view all"
  on public.user_blocks
  for select
  to authenticated
  using (
    blocker_id = (select auth.uid())
    or exists (
      select 1 from public.site_admins admin
      where admin.user_id = (select auth.uid()) and admin.enabled
    )
  );

create policy "members block from their own account"
  on public.user_blocks
  for insert
  to authenticated
  with check (
    private.has_site_access()
    and blocker_id = (select auth.uid())
    and blocker_id <> blocked_id
  );

create policy "members remove their own blocks"
  on public.user_blocks
  for delete
  to authenticated
  using (
    private.has_site_access()
    and blocker_id = (select auth.uid())
  );

create or replace function private.can_interact_with(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and p_other_user_id is not null
    and not exists (
      select 1
      from public.user_blocks ub
      where
        (ub.blocker_id = (select auth.uid()) and ub.blocked_id = p_other_user_id)
        or
        (ub.blocker_id = p_other_user_id and ub.blocked_id = (select auth.uid()))
    );
$$;
revoke all on function private.can_interact_with(uuid) from public, anon;
grant execute on function private.can_interact_with(uuid) to authenticated;

create policy "blocked members hidden from profiles"
  on public.profiles
  as restrictive
  for select
  to authenticated
  using (private.can_interact_with(id));

create policy "blocked members hidden from business profiles"
  on public.business_profiles
  as restrictive
  for select
  to authenticated
  using (private.can_interact_with(user_id));

create policy "blocked members hidden from posts"
  on public.posts
  as restrictive
  for select
  to authenticated
  using (private.can_interact_with(author_id));

create policy "blocked members hidden from comments"
  on public.post_comments
  as restrictive
  for select
  to authenticated
  using (private.can_interact_with(author_id));

alter policy "Participants can view their messages" on public.direct_messages
  using (
    private.has_site_access()
    and ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id)
    and private.can_interact_with(
      case when (select auth.uid()) = sender_id then recipient_id else sender_id end
    )
  );

alter policy "Users can send messages from their own account" on public.direct_messages
  with check (
    private.has_site_access()
    and (select auth.uid()) = sender_id
    and sender_id <> recipient_id
    and private.can_interact_with(recipient_id)
  );

alter policy "Recipients can mark messages as read" on public.direct_messages
  using (
    private.has_site_access()
    and (select auth.uid()) = recipient_id
    and private.can_interact_with(sender_id)
  )
  with check (
    private.has_site_access()
    and (select auth.uid()) = recipient_id
    and private.can_interact_with(sender_id)
  );

alter policy "Users can send their own friend requests" on public.friendships
  with check (
    private.has_site_access()
    and (select auth.uid()) = requester_id
    and requester_id <> addressee_id
    and status = 'pending'
    and responded_at is null
    and private.can_interact_with(addressee_id)
  );

alter policy "Users can follow from their own account" on public.profile_follows
  with check (
    private.has_site_access()
    and (select auth.uid()) = follower_id
    and follower_id <> followed_id
    and private.can_interact_with(followed_id)
  );

alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('new_neighbor', 'post_reported', 'user_blocked'));

create table public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete set null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete set null,
  reason text not null,
  details text,
  post_excerpt text,
  status text not null default 'open',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint post_reports_reason_check check (
    reason in ('spam_scam', 'harassment_bullying', 'hate_threats', 'false_misleading', 'inappropriate', 'privacy', 'other')
  ),
  constraint post_reports_details_length check (
    details is null or char_length(btrim(details)) between 1 and 1000
  ),
  constraint post_reports_excerpt_length check (
    post_excerpt is null or char_length(post_excerpt) <= 500
  ),
  constraint post_reports_status_check check (
    status in ('open', 'reviewing', 'resolved', 'dismissed')
  ),
  constraint post_reports_unique_reporter_post unique (reporter_id, post_id)
);

create index post_reports_status_created_idx
  on public.post_reports (status, created_at desc);
create index post_reports_reported_user_created_idx
  on public.post_reports (reported_user_id, created_at desc);
create index post_reports_post_id_idx
  on public.post_reports (post_id);

alter table public.post_reports enable row level security;
revoke all on table public.post_reports from anon, authenticated;
grant select, insert, update on table public.post_reports to authenticated;
grant all on table public.post_reports to service_role;

create policy "members view own reports or admins view all"
  on public.post_reports
  for select
  to authenticated
  using (
    reporter_id = (select auth.uid())
    or exists (
      select 1 from public.site_admins admin
      where admin.user_id = (select auth.uid()) and admin.enabled
    )
  );

create policy "members submit post reports"
  on public.post_reports
  for insert
  to authenticated
  with check (
    private.has_site_access()
    and reporter_id = (select auth.uid())
    and status = 'open'
    and reviewed_by is null
    and reviewed_at is null
  );

create policy "admins review post reports"
  on public.post_reports
  for update
  to authenticated
  using (
    private.has_site_access()
    and exists (
      select 1 from public.site_admins admin
      where admin.user_id = (select auth.uid()) and admin.enabled
    )
  )
  with check (
    private.has_site_access()
    and exists (
      select 1 from public.site_admins admin
      where admin.user_id = (select auth.uid()) and admin.enabled
    )
  );

create or replace function private.member_display_name(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(btrim(bp.business_name), ''),
    nullif(btrim(p.full_name), ''),
    'Member'
  )
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.business_profiles bp on bp.user_id = u.id
  where u.id = p_user_id;
$$;
revoke all on function private.member_display_name(uuid) from public, anon, authenticated;

create or replace function private.prepare_post_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_author_id uuid;
  v_content text;
begin
  if v_user_id is null then
    raise exception 'Authentication required to report a post.';
  end if;

  select p.author_id, p.content
    into v_author_id, v_content
  from public.posts p
  where p.id = new.post_id;

  if not found then
    raise exception 'The post could not be found.';
  end if;

  if v_author_id = v_user_id then
    raise exception 'You cannot report your own post.';
  end if;

  new.reporter_id := v_user_id;
  new.reported_user_id := v_author_id;
  new.post_excerpt := left(coalesce(v_content, ''), 500);
  new.status := 'open';
  new.reviewed_by := null;
  new.reviewed_at := null;
  return new;
end;
$$;
revoke all on function private.prepare_post_report() from public, anon, authenticated;

create trigger post_reports_prepare
  before insert on public.post_reports
  for each row execute function private.prepare_post_report();

create or replace function private.notify_admins_of_post_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reporter_name text;
  v_reported_name text;
  v_reason_label text;
begin
  v_reporter_name := coalesce(private.member_display_name(new.reporter_id), 'A member');
  v_reported_name := coalesce(private.member_display_name(new.reported_user_id), 'another member');
  v_reason_label := case new.reason
    when 'spam_scam' then 'Spam or scam'
    when 'harassment_bullying' then 'Harassment or bullying'
    when 'hate_threats' then 'Hate, threats, or violence'
    when 'false_misleading' then 'False or misleading information'
    when 'inappropriate' then 'Inappropriate content'
    when 'privacy' then 'Privacy concern'
    else 'Other'
  end;

  insert into public.notifications (user_id, type, title, body, subject_user_id, post_id)
  select
    admin.user_id,
    'post_reported',
    'Post reported',
    v_reporter_name || ' reported a post by ' || v_reported_name || '. Reason: ' || v_reason_label || '.',
    null,
    new.post_id
  from public.site_admins admin
  where admin.enabled;

  return new;
end;
$$;
revoke all on function private.notify_admins_of_post_report() from public, anon, authenticated;

create trigger post_reports_notify_admins
  after insert on public.post_reports
  for each row execute function private.notify_admins_of_post_report();

create or replace function private.handle_user_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_blocker_name text;
  v_blocked_name text;
begin
  delete from public.friendships
  where (requester_id = new.blocker_id and addressee_id = new.blocked_id)
     or (requester_id = new.blocked_id and addressee_id = new.blocker_id);

  delete from public.profile_follows
  where (follower_id = new.blocker_id and followed_id = new.blocked_id)
     or (follower_id = new.blocked_id and followed_id = new.blocker_id);

  v_blocker_name := coalesce(private.member_display_name(new.blocker_id), 'A member');
  v_blocked_name := coalesce(private.member_display_name(new.blocked_id), 'another member');

  insert into public.notifications (user_id, type, title, body, subject_user_id, post_id)
  select
    admin.user_id,
    'user_blocked',
    'Member blocked',
    v_blocker_name || ' blocked ' || v_blocked_name || '. Their posts, profiles, social connections, and direct messages are now restricted from each other.',
    null,
    null
  from public.site_admins admin
  where admin.enabled;

  return new;
end;
$$;
revoke all on function private.handle_user_block() from public, anon, authenticated;

create trigger user_blocks_cleanup_and_notify
  after insert on public.user_blocks
  for each row execute function private.handle_user_block();