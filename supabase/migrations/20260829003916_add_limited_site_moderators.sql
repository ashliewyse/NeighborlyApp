create table public.site_moderators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.site_moderators enable row level security;
revoke all on table public.site_moderators from anon, authenticated;
grant select on table public.site_moderators to authenticated;
grant all on table public.site_moderators to service_role;

create policy "moderators view own role or admins view all"
  on public.site_moderators
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.site_admins admin
      where admin.user_id = (select auth.uid())
        and admin.enabled
    )
  );

drop policy if exists "members view own reports or admins view all" on public.post_reports;
create policy "members view own reports or staff view all"
  on public.post_reports
  for select
  to authenticated
  using (
    reporter_id = (select auth.uid())
    or exists (
      select 1 from public.site_admins admin
      where admin.user_id = (select auth.uid()) and admin.enabled
    )
    or exists (
      select 1 from public.site_moderators moderator
      where moderator.user_id = (select auth.uid()) and moderator.enabled
    )
  );

drop policy if exists "admins review post reports" on public.post_reports;
create policy "staff review post reports"
  on public.post_reports
  for update
  to authenticated
  using (
    private.has_site_access()
    and (
      exists (
        select 1 from public.site_admins admin
        where admin.user_id = (select auth.uid()) and admin.enabled
      )
      or exists (
        select 1 from public.site_moderators moderator
        where moderator.user_id = (select auth.uid()) and moderator.enabled
      )
    )
  )
  with check (
    private.has_site_access()
    and (
      exists (
        select 1 from public.site_admins admin
        where admin.user_id = (select auth.uid()) and admin.enabled
      )
      or exists (
        select 1 from public.site_moderators moderator
        where moderator.user_id = (select auth.uid()) and moderator.enabled
      )
    )
  );

drop policy if exists "members view blocks they created or admins view all" on public.user_blocks;
create policy "members view own blocks or staff view all"
  on public.user_blocks
  for select
  to authenticated
  using (
    blocker_id = (select auth.uid())
    or exists (
      select 1 from public.site_admins admin
      where admin.user_id = (select auth.uid()) and admin.enabled
    )
    or exists (
      select 1 from public.site_moderators moderator
      where moderator.user_id = (select auth.uid()) and moderator.enabled
    )
  );

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
    staff.user_id,
    'post_reported',
    'Post reported',
    v_reporter_name || ' reported a post by ' || v_reported_name || '. Reason: ' || v_reason_label || '.',
    null,
    new.post_id
  from (
    select admin.user_id from public.site_admins admin where admin.enabled
    union
    select moderator.user_id from public.site_moderators moderator where moderator.enabled
  ) staff;

  return new;
end;
$$;
revoke all on function private.notify_admins_of_post_report() from public, anon, authenticated;

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
    staff.user_id,
    'user_blocked',
    'Member blocked',
    v_blocker_name || ' blocked ' || v_blocked_name || '. Their posts, profiles, social connections, and direct messages are now restricted from each other.',
    null,
    null
  from (
    select admin.user_id from public.site_admins admin where admin.enabled
    union
    select moderator.user_id from public.site_moderators moderator where moderator.enabled
  ) staff;

  return new;
end;
$$;
revoke all on function private.handle_user_block() from public, anon, authenticated;
