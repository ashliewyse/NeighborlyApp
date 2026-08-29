alter table public.site_moderators
  add column if not exists can_review_reports boolean not null default true,
  add column if not exists can_view_blocks boolean not null default true,
  add column if not exists can_remove_posts boolean not null default true,
  add column if not exists can_remove_comments boolean not null default true,
  add column if not exists can_warn_members boolean not null default true,
  add column if not exists granted_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create or replace function private.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.site_admins a
    where a.user_id = (select auth.uid())
      and a.enabled
  );
$$;
revoke all on function private.is_site_admin() from public, anon;
grant execute on function private.is_site_admin() to authenticated;

create or replace function private.is_site_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.site_moderators m
    where m.user_id = (select auth.uid())
      and m.enabled
  );
$$;
revoke all on function private.is_site_moderator() from public, anon;
grant execute on function private.is_site_moderator() to authenticated;

create or replace function private.is_site_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_site_admin() or private.is_site_moderator();
$$;
revoke all on function private.is_site_staff() from public, anon;
grant execute on function private.is_site_staff() to authenticated;

create or replace function private.can_moderate(p_capability text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_site_admin()
    or exists (
      select 1
      from public.site_moderators m
      where m.user_id = (select auth.uid())
        and m.enabled
        and case p_capability
          when 'review_reports' then m.can_review_reports
          when 'view_blocks' then m.can_view_blocks
          when 'remove_posts' then m.can_remove_posts
          when 'remove_comments' then m.can_remove_comments
          when 'warn_members' then m.can_warn_members
          else false
        end
    );
$$;
revoke all on function private.can_moderate(text) from public, anon;
grant execute on function private.can_moderate(text) to authenticated;

create table if not exists public.member_enforcement (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state text not null default 'active' check (state in ('active','warned','suspended','banned')),
  public_reason text,
  internal_note text,
  warning_count integer not null default 0 check (warning_count >= 0),
  suspended_until timestamptz,
  last_warned_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint member_enforcement_reason_length check (public_reason is null or char_length(btrim(public_reason)) between 1 and 500),
  constraint member_enforcement_note_length check (internal_note is null or char_length(btrim(internal_note)) between 1 and 2000)
);

alter table public.member_enforcement enable row level security;
revoke all on table public.member_enforcement from anon, authenticated;
grant select on table public.member_enforcement to authenticated;
grant all on table public.member_enforcement to service_role;

create policy "staff view member enforcement"
  on public.member_enforcement
  for select
  to authenticated
  using (private.is_site_staff());

create index if not exists member_enforcement_state_idx
  on public.member_enforcement (state, updated_at desc);

create or replace function private.has_site_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      not coalesce(
        (select setting.approval_required
         from public.site_access_settings setting
         where setting.id = true),
        true
      )
      or exists (
        select 1
        from public.member_access access_row
        where access_row.user_id = (select auth.uid())
          and access_row.status = 'approved'
      )
    )
    and not exists (
      select 1
      from public.member_enforcement enforcement
      where enforcement.user_id = (select auth.uid())
        and (
          enforcement.state = 'banned'
          or (
            enforcement.state = 'suspended'
            and (enforcement.suspended_until is null or enforcement.suspended_until > now())
          )
        )
    );
$$;
revoke all on function private.has_site_access() from public, anon;
grant execute on function private.has_site_access() to authenticated;

alter table public.posts
  add column if not exists moderation_hidden_at timestamptz,
  add column if not exists moderation_hidden_by uuid references auth.users(id) on delete set null,
  add column if not exists moderation_hidden_reason text;

alter table public.post_comments
  add column if not exists moderation_hidden_at timestamptz,
  add column if not exists moderation_hidden_by uuid references auth.users(id) on delete set null,
  add column if not exists moderation_hidden_reason text;

alter table public.posts
  drop constraint if exists posts_moderation_hidden_reason_length;
alter table public.posts
  add constraint posts_moderation_hidden_reason_length
  check (moderation_hidden_reason is null or char_length(btrim(moderation_hidden_reason)) between 1 and 1000);

alter table public.post_comments
  drop constraint if exists comments_moderation_hidden_reason_length;
alter table public.post_comments
  add constraint comments_moderation_hidden_reason_length
  check (moderation_hidden_reason is null or char_length(btrim(moderation_hidden_reason)) between 1 and 1000);

create policy "hidden posts stay hidden from members"
  on public.posts
  as restrictive
  for select
  to authenticated
  using (moderation_hidden_at is null or private.is_site_staff());

create policy "hidden comments stay hidden from members"
  on public.post_comments
  as restrictive
  for select
  to authenticated
  using (moderation_hidden_at is null or private.is_site_staff());

create policy "hidden posts cannot be deleted by members"
  on public.posts
  as restrictive
  for delete
  to authenticated
  using (moderation_hidden_at is null or private.is_site_staff());

create policy "hidden comments cannot be deleted by members"
  on public.post_comments
  as restrictive
  for delete
  to authenticated
  using (moderation_hidden_at is null or private.is_site_staff());

create or replace function private.protect_post_moderation_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_site_staff() then
    new.moderation_hidden_at := old.moderation_hidden_at;
    new.moderation_hidden_by := old.moderation_hidden_by;
    new.moderation_hidden_reason := old.moderation_hidden_reason;
  end if;
  return new;
end;
$$;
revoke all on function private.protect_post_moderation_columns() from public, anon, authenticated;

drop trigger if exists protect_post_moderation_columns on public.posts;
create trigger protect_post_moderation_columns
  before update on public.posts
  for each row execute function private.protect_post_moderation_columns();

create or replace function private.protect_comment_moderation_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_site_staff() then
    new.moderation_hidden_at := old.moderation_hidden_at;
    new.moderation_hidden_by := old.moderation_hidden_by;
    new.moderation_hidden_reason := old.moderation_hidden_reason;
  end if;
  return new;
end;
$$;
revoke all on function private.protect_comment_moderation_columns() from public, anon, authenticated;

drop trigger if exists protect_comment_moderation_columns on public.post_comments;
create trigger protect_comment_moderation_columns
  before update on public.post_comments
  for each row execute function private.protect_comment_moderation_columns();

create table if not exists public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment','profile','business','message')),
  reported_user_id uuid references auth.users(id) on delete set null,
  post_id uuid references public.posts(id) on delete set null,
  comment_id uuid references public.post_comments(id) on delete set null,
  message_id uuid references public.direct_messages(id) on delete set null,
  reason text not null check (reason in ('spam_scam','harassment_bullying','hate_threats','false_misleading','inappropriate','privacy','other')),
  details text,
  target_excerpt text,
  status text not null default 'open' check (status in ('open','reviewing','escalated','resolved','dismissed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint safety_reports_details_length check (details is null or char_length(btrim(details)) between 1 and 1000),
  constraint safety_reports_excerpt_length check (target_excerpt is null or char_length(target_excerpt) <= 500)
);

alter table public.safety_reports enable row level security;
revoke all on table public.safety_reports from anon, authenticated;
grant select, insert on table public.safety_reports to authenticated;
grant all on table public.safety_reports to service_role;

create policy "members view own safety reports or staff view reports"
  on public.safety_reports
  for select
  to authenticated
  using (
    reporter_id = (select auth.uid())
    or private.can_moderate('review_reports')
  );

create policy "approved members submit safety reports"
  on public.safety_reports
  for insert
  to authenticated
  with check (
    private.has_site_access()
    and reporter_id = (select auth.uid())
  );

create unique index if not exists safety_reports_post_unique
  on public.safety_reports (reporter_id, post_id)
  where target_type = 'post' and post_id is not null;
create unique index if not exists safety_reports_comment_unique
  on public.safety_reports (reporter_id, comment_id)
  where target_type = 'comment' and comment_id is not null;
create unique index if not exists safety_reports_message_unique
  on public.safety_reports (reporter_id, message_id)
  where target_type = 'message' and message_id is not null;
create unique index if not exists safety_reports_profile_unique
  on public.safety_reports (reporter_id, reported_user_id)
  where target_type = 'profile' and reported_user_id is not null;
create unique index if not exists safety_reports_business_unique
  on public.safety_reports (reporter_id, reported_user_id)
  where target_type = 'business' and reported_user_id is not null;
create index if not exists safety_reports_status_created_idx
  on public.safety_reports (status, created_at desc);
create index if not exists safety_reports_reported_user_idx
  on public.safety_reports (reported_user_id, created_at desc);

create or replace function private.prepare_safety_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_author_id uuid;
  v_sender_id uuid;
  v_recipient_id uuid;
  v_body text;
  v_post_id uuid;
begin
  if v_user_id is null or not private.has_site_access() then
    raise exception 'An approved Neighborly account is required to submit a report.';
  end if;

  if (
    select count(*)
    from public.safety_reports r
    where r.reporter_id = v_user_id
      and r.created_at >= now() - interval '1 hour'
  ) >= 20 then
    raise exception 'Report limit reached. Please wait before submitting another report.';
  end if;

  new.reporter_id := v_user_id;
  new.status := 'open';
  new.reviewed_by := null;
  new.reviewed_at := null;

  case new.target_type
    when 'post' then
      select p.author_id, p.content into v_author_id, v_body
      from public.posts p
      where p.id = new.post_id and p.moderation_hidden_at is null;
      if not found then raise exception 'That post is not available to report.'; end if;
      if v_author_id = v_user_id then raise exception 'You cannot report your own post.'; end if;
      if not private.can_interact_with(v_author_id) then raise exception 'That post is not available to report.'; end if;
      new.reported_user_id := v_author_id;
      new.target_excerpt := left(coalesce(v_body,''), 500);
      new.comment_id := null;
      new.message_id := null;

    when 'comment' then
      select c.author_id, c.body, c.post_id into v_author_id, v_body, v_post_id
      from public.post_comments c
      join public.posts p on p.id = c.post_id
      where c.id = new.comment_id
        and c.moderation_hidden_at is null
        and p.moderation_hidden_at is null;
      if not found then raise exception 'That comment is not available to report.'; end if;
      if v_author_id = v_user_id then raise exception 'You cannot report your own comment.'; end if;
      if not private.can_interact_with(v_author_id) then raise exception 'That comment is not available to report.'; end if;
      new.reported_user_id := v_author_id;
      new.post_id := v_post_id;
      new.target_excerpt := left(coalesce(v_body,''), 500);
      new.message_id := null;

    when 'profile' then
      v_author_id := new.reported_user_id;
      if v_author_id is null or v_author_id = v_user_id then raise exception 'That profile cannot be reported.'; end if;
      if not private.can_interact_with(v_author_id) then raise exception 'That profile is not available to report.'; end if;
      select p.full_name || case when nullif(btrim(p.bio),'') is not null then ': ' || p.bio else '' end into v_body
      from public.profiles p where p.id = v_author_id;
      if not found then raise exception 'That profile could not be found.'; end if;
      new.target_excerpt := left(coalesce(v_body,''), 500);
      new.post_id := null;
      new.comment_id := null;
      new.message_id := null;

    when 'business' then
      v_author_id := new.reported_user_id;
      if v_author_id is null or v_author_id = v_user_id then raise exception 'That business cannot be reported.'; end if;
      if not private.can_interact_with(v_author_id) then raise exception 'That business is not available to report.'; end if;
      select bp.business_name || case when nullif(btrim(bp.description),'') is not null then ': ' || bp.description else '' end into v_body
      from public.business_profiles bp where bp.user_id = v_author_id;
      if not found then raise exception 'That business could not be found.'; end if;
      new.target_excerpt := left(coalesce(v_body,''), 500);
      new.post_id := null;
      new.comment_id := null;
      new.message_id := null;

    when 'message' then
      select dm.sender_id, dm.recipient_id, dm.body into v_sender_id, v_recipient_id, v_body
      from public.direct_messages dm
      where dm.id = new.message_id
        and (dm.sender_id = v_user_id or dm.recipient_id = v_user_id);
      if not found then raise exception 'That message is not available to report.'; end if;
      if v_sender_id = v_user_id then v_author_id := v_recipient_id; else v_author_id := v_sender_id; end if;
      if v_author_id = v_user_id then raise exception 'You cannot report your own message.'; end if;
      new.reported_user_id := v_author_id;
      new.target_excerpt := left(coalesce(v_body,''), 500);
      new.post_id := null;
      new.comment_id := null;

    else
      raise exception 'Unsupported report type.';
  end case;

  return new;
end;
$$;
revoke all on function private.prepare_safety_report() from public, anon, authenticated;

drop trigger if exists safety_reports_prepare on public.safety_reports;
create trigger safety_reports_prepare
  before insert on public.safety_reports
  for each row execute function private.prepare_safety_report();

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  report_id uuid references public.safety_reports(id) on delete set null,
  post_id uuid references public.posts(id) on delete set null,
  comment_id uuid references public.post_comments(id) on delete set null,
  action_type text not null check (action_type in (
    'report_reviewing','report_escalated','report_resolved','report_dismissed',
    'hide_post','hide_comment','restore_post','restore_comment',
    'warn_member','suspend_member','ban_member','restore_member',
    'grant_moderator','revoke_moderator','update_moderator_permissions'
  )),
  note text,
  created_at timestamptz not null default now(),
  constraint moderation_actions_note_length check (note is null or char_length(btrim(note)) between 1 and 2000)
);

alter table public.moderation_actions enable row level security;
revoke all on table public.moderation_actions from anon, authenticated;
grant select on table public.moderation_actions to authenticated;
grant all on table public.moderation_actions to service_role;
create policy "staff view moderation audit log"
  on public.moderation_actions
  for select
  to authenticated
  using (private.is_site_staff());
create index if not exists moderation_actions_created_idx
  on public.moderation_actions (created_at desc);
create index if not exists moderation_actions_target_idx
  on public.moderation_actions (target_user_id, created_at desc);

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('new_neighbor','post_reported','user_blocked','safety_reported','moderation_warning','moderation_action'));

create or replace function private.notify_staff_of_safety_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reporter_name text;
  v_reported_name text;
  v_target_label text;
  v_reason_label text;
begin
  v_reporter_name := coalesce(private.member_display_name(new.reporter_id), 'A member');
  v_reported_name := coalesce(private.member_display_name(new.reported_user_id), 'another member');
  v_target_label := initcap(new.target_type);
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
    'safety_reported',
    v_target_label || ' reported',
    v_reporter_name || ' reported ' || lower(v_target_label) || ' content involving ' || v_reported_name || '. Reason: ' || v_reason_label || '.',
    new.reported_user_id,
    new.post_id
  from (
    select a.user_id from public.site_admins a where a.enabled
    union
    select m.user_id from public.site_moderators m where m.enabled and m.can_review_reports
  ) staff;
  return new;
end;
$$;
revoke all on function private.notify_staff_of_safety_report() from public, anon, authenticated;

drop trigger if exists safety_reports_notify_staff on public.safety_reports;
create trigger safety_reports_notify_staff
  after insert on public.safety_reports
  for each row execute function private.notify_staff_of_safety_report();

create or replace function public.my_account_restriction()
returns table(state text, public_reason text, suspended_until timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(e.state, 'active'::text), e.public_reason, e.suspended_until
  from (select 1) seed
  left join public.member_enforcement e on e.user_id = (select auth.uid());
$$;
revoke all on function public.my_account_restriction() from public, anon;
grant execute on function public.my_account_restriction() to authenticated;

create or replace function public.staff_safety_reports()
returns table(
  report_id uuid,
  target_type text,
  reporter_id uuid,
  reporter_name text,
  reported_user_id uuid,
  reported_name text,
  reason text,
  details text,
  target_excerpt text,
  status text,
  post_id uuid,
  comment_id uuid,
  message_id uuid,
  created_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.can_moderate('review_reports') then raise exception 'Moderator access required.'; end if;
  return query
    select
      r.id, r.target_type, r.reporter_id,
      coalesce(private.member_display_name(r.reporter_id), 'Member'),
      r.reported_user_id,
      coalesce(private.member_display_name(r.reported_user_id), 'Member'),
      r.reason, r.details, r.target_excerpt, r.status,
      r.post_id, r.comment_id, r.message_id, r.created_at, r.reviewed_by, r.reviewed_at
    from public.safety_reports r
    order by case r.status when 'open' then 0 when 'reviewing' then 1 when 'escalated' then 2 else 3 end,
             r.created_at desc
    limit 250;
end;
$$;
revoke all on function public.staff_safety_reports() from public, anon;
grant execute on function public.staff_safety_reports() to authenticated;

create or replace function public.staff_recent_blocks()
returns table(
  blocker_id uuid,
  blocker_name text,
  blocked_id uuid,
  blocked_name text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.can_moderate('view_blocks') then raise exception 'Block activity access required.'; end if;
  return query
    select b.blocker_id, b.blocker_name, b.blocked_id, b.blocked_name, b.created_at
    from public.user_blocks b
    order by b.created_at desc
    limit 100;
end;
$$;
revoke all on function public.staff_recent_blocks() from public, anon;
grant execute on function public.staff_recent_blocks() to authenticated;

create or replace function public.moderation_set_report_status(p_report_id uuid, p_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_target uuid;
  v_action text;
begin
  if not private.can_moderate('review_reports') then raise exception 'Moderator access required.'; end if;
  if p_status not in ('reviewing','escalated','resolved','dismissed') then raise exception 'Invalid report status.'; end if;
  select r.reported_user_id into v_target from public.safety_reports r where r.id = p_report_id;
  if not found then raise exception 'Report not found.'; end if;
  update public.safety_reports set status = p_status, reviewed_by = v_actor, reviewed_at = now() where id = p_report_id;
  v_action := case p_status
    when 'reviewing' then 'report_reviewing'
    when 'escalated' then 'report_escalated'
    when 'resolved' then 'report_resolved'
    else 'report_dismissed'
  end;
  insert into public.moderation_actions(actor_user_id,target_user_id,report_id,action_type,note)
  values(v_actor,v_target,p_report_id,v_action,nullif(btrim(p_note),''));
end;
$$;
revoke all on function public.moderation_set_report_status(uuid,text,text) from public, anon;
grant execute on function public.moderation_set_report_status(uuid,text,text) to authenticated;

create or replace function public.moderation_hide_reported_post(p_report_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_post uuid;
  v_target uuid;
begin
  if not private.can_moderate('remove_posts') then raise exception 'Post moderation permission required.'; end if;
  select r.post_id, r.reported_user_id into v_post, v_target
  from public.safety_reports r where r.id = p_report_id and r.target_type = 'post';
  if not found or v_post is null then raise exception 'Reported post not found.'; end if;
  update public.posts
  set moderation_hidden_at = now(), moderation_hidden_by = v_actor,
      moderation_hidden_reason = coalesce(nullif(btrim(p_note),''), 'Hidden after safety report review')
  where id = v_post;
  update public.safety_reports set status='resolved', reviewed_by=v_actor, reviewed_at=now() where id=p_report_id;
  insert into public.moderation_actions(actor_user_id,target_user_id,report_id,post_id,action_type,note)
  values(v_actor,v_target,p_report_id,v_post,'hide_post',nullif(btrim(p_note),''));
end;
$$;
revoke all on function public.moderation_hide_reported_post(uuid,text) from public, anon;
grant execute on function public.moderation_hide_reported_post(uuid,text) to authenticated;

create or replace function public.moderation_hide_reported_comment(p_report_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_comment uuid;
  v_target uuid;
begin
  if not private.can_moderate('remove_comments') then raise exception 'Comment moderation permission required.'; end if;
  select r.comment_id, r.reported_user_id into v_comment, v_target
  from public.safety_reports r where r.id = p_report_id and r.target_type = 'comment';
  if not found or v_comment is null then raise exception 'Reported comment not found.'; end if;
  update public.post_comments
  set moderation_hidden_at = now(), moderation_hidden_by = v_actor,
      moderation_hidden_reason = coalesce(nullif(btrim(p_note),''), 'Hidden after safety report review')
  where id = v_comment;
  update public.safety_reports set status='resolved', reviewed_by=v_actor, reviewed_at=now() where id=p_report_id;
  insert into public.moderation_actions(actor_user_id,target_user_id,report_id,comment_id,action_type,note)
  values(v_actor,v_target,p_report_id,v_comment,'hide_comment',nullif(btrim(p_note),''));
end;
$$;
revoke all on function public.moderation_hide_reported_comment(uuid,text) from public, anon;
grant execute on function public.moderation_hide_reported_comment(uuid,text) to authenticated;

create or replace function public.moderation_warn_reported_member(p_report_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_target uuid;
  v_message text;
begin
  if not private.can_moderate('warn_members') then raise exception 'Warning permission required.'; end if;
  select r.reported_user_id into v_target from public.safety_reports r where r.id=p_report_id;
  if not found or v_target is null then raise exception 'Reported member not found.'; end if;
  if exists(select 1 from public.site_admins a where a.user_id=v_target and a.enabled) then
    raise exception 'Administrator accounts cannot be warned by moderators.';
  end if;
  v_message := coalesce(nullif(btrim(p_note),''), 'Please review Neighborly Community Guidelines. A safety report involving your account was reviewed by the moderation team.');
  insert into public.member_enforcement(user_id,state,public_reason,internal_note,warning_count,last_warned_at,updated_by,updated_at)
  values(v_target,'warned',v_message,nullif(btrim(p_note),''),1,now(),v_actor,now())
  on conflict(user_id) do update set
    state = case when public.member_enforcement.state in ('suspended','banned') then public.member_enforcement.state else 'warned' end,
    public_reason = excluded.public_reason,
    internal_note = excluded.internal_note,
    warning_count = public.member_enforcement.warning_count + 1,
    last_warned_at = now(), updated_by = v_actor, updated_at = now();
  insert into public.notifications(user_id,type,title,body,subject_user_id)
  values(v_target,'moderation_warning','Neighborly moderation warning',v_message,v_actor);
  insert into public.moderation_actions(actor_user_id,target_user_id,report_id,action_type,note)
  values(v_actor,v_target,p_report_id,'warn_member',nullif(btrim(p_note),''));
end;
$$;
revoke all on function public.moderation_warn_reported_member(uuid,text) from public, anon;
grant execute on function public.moderation_warn_reported_member(uuid,text) to authenticated;

create or replace function public.set_moderator_access(
  p_user_id uuid,
  p_enabled boolean,
  p_can_review_reports boolean default true,
  p_can_view_blocks boolean default true,
  p_can_remove_posts boolean default true,
  p_can_remove_comments boolean default true,
  p_can_warn_members boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_exists boolean;
  v_was_enabled boolean;
  v_action text;
begin
  if not private.is_site_admin() then raise exception 'Administrator access required.'; end if;
  if p_user_id is null or p_user_id = v_actor then raise exception 'Choose another approved member.'; end if;
  if exists(select 1 from public.site_admins a where a.user_id=p_user_id and a.enabled) then raise exception 'Administrators already have full access.'; end if;
  select exists(select 1 from public.member_access ma where ma.user_id=p_user_id and ma.status='approved') into v_exists;
  if not v_exists then raise exception 'Only approved members can be moderators.'; end if;
  select m.enabled into v_was_enabled from public.site_moderators m where m.user_id=p_user_id;
  insert into public.site_moderators(user_id,enabled,can_review_reports,can_view_blocks,can_remove_posts,can_remove_comments,can_warn_members,granted_by,updated_at)
  values(p_user_id,p_enabled,p_can_review_reports,p_can_view_blocks,p_can_remove_posts,p_can_remove_comments,p_can_warn_members,v_actor,now())
  on conflict(user_id) do update set
    enabled=excluded.enabled,
    can_review_reports=excluded.can_review_reports,
    can_view_blocks=excluded.can_view_blocks,
    can_remove_posts=excluded.can_remove_posts,
    can_remove_comments=excluded.can_remove_comments,
    can_warn_members=excluded.can_warn_members,
    granted_by=v_actor,
    updated_at=now();
  v_action := case
    when p_enabled and coalesce(v_was_enabled,false)=false then 'grant_moderator'
    when not p_enabled then 'revoke_moderator'
    else 'update_moderator_permissions'
  end;
  insert into public.moderation_actions(actor_user_id,target_user_id,action_type,note)
  values(v_actor,p_user_id,v_action,
    'review='||p_can_review_reports||', blocks='||p_can_view_blocks||', posts='||p_can_remove_posts||', comments='||p_can_remove_comments||', warn='||p_can_warn_members);
end;
$$;
revoke all on function public.set_moderator_access(uuid,boolean,boolean,boolean,boolean,boolean,boolean) from public, anon;
grant execute on function public.set_moderator_access(uuid,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated;

create or replace function public.admin_set_member_status(
  p_user_id uuid,
  p_state text,
  p_public_reason text default null,
  p_internal_note text default null,
  p_suspended_until timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_action text;
  v_message text;
begin
  if not private.is_site_admin() then raise exception 'Administrator access required.'; end if;
  if p_user_id is null or p_user_id = v_actor then raise exception 'Choose another member.'; end if;
  if p_state not in ('active','warned','suspended','banned') then raise exception 'Invalid account status.'; end if;
  if p_state in ('suspended','banned') and exists(select 1 from public.site_admins a where a.user_id=p_user_id and a.enabled) then
    raise exception 'Enabled administrator accounts cannot be suspended or banned here.';
  end if;
  insert into public.member_enforcement(user_id,state,public_reason,internal_note,warning_count,suspended_until,last_warned_at,updated_by,updated_at)
  values(
    p_user_id,p_state,nullif(btrim(p_public_reason),''),nullif(btrim(p_internal_note),''),
    case when p_state='warned' then 1 else 0 end,
    case when p_state='suspended' then p_suspended_until else null end,
    case when p_state='warned' then now() else null end,
    v_actor,now()
  )
  on conflict(user_id) do update set
    state=excluded.state,
    public_reason=excluded.public_reason,
    internal_note=excluded.internal_note,
    warning_count=case when p_state='warned' then public.member_enforcement.warning_count+1 else public.member_enforcement.warning_count end,
    suspended_until=case when p_state='suspended' then p_suspended_until else null end,
    last_warned_at=case when p_state='warned' then now() else public.member_enforcement.last_warned_at end,
    updated_by=v_actor, updated_at=now();
  v_action := case p_state
    when 'warned' then 'warn_member'
    when 'suspended' then 'suspend_member'
    when 'banned' then 'ban_member'
    else 'restore_member'
  end;
  insert into public.moderation_actions(actor_user_id,target_user_id,action_type,note)
  values(v_actor,p_user_id,v_action,nullif(btrim(p_internal_note),''));
  if p_state <> 'active' then
    v_message := coalesce(nullif(btrim(p_public_reason),''),
      case p_state
        when 'warned' then 'Please review Neighborly Community Guidelines.'
        when 'suspended' then 'Your Neighborly account has been temporarily suspended.'
        else 'Your Neighborly account has been restricted by an administrator.'
      end
    );
    insert into public.notifications(user_id,type,title,body,subject_user_id)
    values(
      p_user_id,
      case when p_state='warned' then 'moderation_warning' else 'moderation_action' end,
      case p_state when 'warned' then 'Neighborly moderation warning' when 'suspended' then 'Neighborly account suspended' else 'Neighborly account restricted' end,
      v_message,
      v_actor
    );
  end if;
end;
$$;
revoke all on function public.admin_set_member_status(uuid,text,text,text,timestamptz) from public, anon;
grant execute on function public.admin_set_member_status(uuid,text,text,text,timestamptz) to authenticated;

create or replace function public.admin_member_directory(p_search text default null)
returns table(
  user_id uuid,
  display_name text,
  email text,
  account_type text,
  city text,
  neighborhood text,
  access_status text,
  enforcement_state text,
  public_reason text,
  warning_count integer,
  suspended_until timestamptz,
  is_admin boolean,
  is_moderator boolean,
  can_review_reports boolean,
  can_view_blocks boolean,
  can_remove_posts boolean,
  can_remove_comments boolean,
  can_warn_members boolean,
  open_report_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_site_admin() then raise exception 'Administrator access required.'; end if;
  return query
    select
      p.id,
      coalesce(nullif(btrim(bp.business_name),''), nullif(btrim(p.full_name),''), 'Member'),
      ma.email,
      p.account_type,
      coalesce(bp.city,p.city),
      coalesce(bp.neighborhood,p.neighborhood),
      ma.status,
      coalesce(me.state,'active'),
      me.public_reason,
      coalesce(me.warning_count,0),
      me.suspended_until,
      exists(select 1 from public.site_admins a where a.user_id=p.id and a.enabled),
      coalesce(sm.enabled,false),
      coalesce(sm.can_review_reports,false),
      coalesce(sm.can_view_blocks,false),
      coalesce(sm.can_remove_posts,false),
      coalesce(sm.can_remove_comments,false),
      coalesce(sm.can_warn_members,false),
      (select count(*) from public.safety_reports sr where sr.reported_user_id=p.id and sr.status in ('open','reviewing','escalated'))
    from public.profiles p
    left join public.business_profiles bp on bp.user_id=p.id
    left join public.member_access ma on ma.user_id=p.id
    left join public.member_enforcement me on me.user_id=p.id
    left join public.site_moderators sm on sm.user_id=p.id
    where p_search is null
       or btrim(p_search)=''
       or p.full_name ilike '%'||btrim(p_search)||'%'
       or coalesce(bp.business_name,'') ilike '%'||btrim(p_search)||'%'
       or coalesce(ma.email,'') ilike '%'||btrim(p_search)||'%'
    order by coalesce(nullif(btrim(bp.business_name),''), nullif(btrim(p.full_name),''), 'Member')
    limit 250;
end;
$$;
revoke all on function public.admin_member_directory(text) from public, anon;
grant execute on function public.admin_member_directory(text) to authenticated;
