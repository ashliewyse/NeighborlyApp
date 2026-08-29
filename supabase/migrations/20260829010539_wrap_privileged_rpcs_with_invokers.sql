alter function public.admin_member_directory(text) set schema private;
alter function public.admin_member_safety_summary(uuid) set schema private;
alter function public.admin_recent_moderation_actions(integer) set schema private;
alter function public.admin_set_member_status(uuid,text,text,text,timestamptz) set schema private;
alter function public.moderation_hide_reported_comment(uuid,text) set schema private;
alter function public.moderation_hide_reported_post(uuid,text) set schema private;
alter function public.moderation_set_report_status(uuid,text,text) set schema private;
alter function public.moderation_warn_reported_member(uuid,text) set schema private;
alter function public.my_account_restriction() set schema private;
alter function public.my_staff_capabilities() set schema private;
alter function public.set_moderator_access(uuid,boolean,boolean,boolean,boolean,boolean,boolean) set schema private;
alter function public.staff_recent_blocks() set schema private;
alter function public.staff_safety_reports() set schema private;

create function public.admin_member_directory(p_search text default null)
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
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.admin_member_directory(p_search);
$$;
revoke all on function public.admin_member_directory(text) from public, anon;
grant execute on function public.admin_member_directory(text) to authenticated;

create function public.admin_member_safety_summary(p_user_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.admin_member_safety_summary(p_user_id);
$$;
revoke all on function public.admin_member_safety_summary(uuid) from public, anon;
grant execute on function public.admin_member_safety_summary(uuid) to authenticated;

create function public.admin_recent_moderation_actions(p_limit integer default 50)
returns table(
  action_id uuid,
  actor_user_id uuid,
  actor_name text,
  target_user_id uuid,
  target_name text,
  action_type text,
  note text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.admin_recent_moderation_actions(p_limit);
$$;
revoke all on function public.admin_recent_moderation_actions(integer) from public, anon;
grant execute on function public.admin_recent_moderation_actions(integer) to authenticated;

create function public.admin_set_member_status(
  p_user_id uuid,
  p_state text,
  p_public_reason text default null,
  p_internal_note text default null,
  p_suspended_until timestamptz default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.admin_set_member_status(
    p_user_id,
    p_state,
    p_public_reason,
    p_internal_note,
    p_suspended_until
  );
$$;
revoke all on function public.admin_set_member_status(uuid,text,text,text,timestamptz) from public, anon;
grant execute on function public.admin_set_member_status(uuid,text,text,text,timestamptz) to authenticated;

create function public.moderation_hide_reported_comment(p_report_id uuid, p_note text default null)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.moderation_hide_reported_comment(p_report_id,p_note);
$$;
revoke all on function public.moderation_hide_reported_comment(uuid,text) from public, anon;
grant execute on function public.moderation_hide_reported_comment(uuid,text) to authenticated;

create function public.moderation_hide_reported_post(p_report_id uuid, p_note text default null)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.moderation_hide_reported_post(p_report_id,p_note);
$$;
revoke all on function public.moderation_hide_reported_post(uuid,text) from public, anon;
grant execute on function public.moderation_hide_reported_post(uuid,text) to authenticated;

create function public.moderation_set_report_status(p_report_id uuid, p_status text, p_note text default null)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.moderation_set_report_status(p_report_id,p_status,p_note);
$$;
revoke all on function public.moderation_set_report_status(uuid,text,text) from public, anon;
grant execute on function public.moderation_set_report_status(uuid,text,text) to authenticated;

create function public.moderation_warn_reported_member(p_report_id uuid, p_note text default null)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.moderation_warn_reported_member(p_report_id,p_note);
$$;
revoke all on function public.moderation_warn_reported_member(uuid,text) from public, anon;
grant execute on function public.moderation_warn_reported_member(uuid,text) to authenticated;

create function public.my_account_restriction()
returns table(
  state text,
  public_reason text,
  suspended_until timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.my_account_restriction();
$$;
revoke all on function public.my_account_restriction() from public, anon;
grant execute on function public.my_account_restriction() to authenticated;

create function public.my_staff_capabilities()
returns table(
  is_admin boolean,
  is_moderator boolean,
  can_review_reports boolean,
  can_view_blocks boolean,
  can_remove_posts boolean,
  can_remove_comments boolean,
  can_warn_members boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.my_staff_capabilities();
$$;
revoke all on function public.my_staff_capabilities() from public, anon;
grant execute on function public.my_staff_capabilities() to authenticated;

create function public.set_moderator_access(
  p_user_id uuid,
  p_enabled boolean,
  p_can_review_reports boolean default true,
  p_can_view_blocks boolean default true,
  p_can_remove_posts boolean default true,
  p_can_remove_comments boolean default true,
  p_can_warn_members boolean default true
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_moderator_access(
    p_user_id,
    p_enabled,
    p_can_review_reports,
    p_can_view_blocks,
    p_can_remove_posts,
    p_can_remove_comments,
    p_can_warn_members
  );
$$;
revoke all on function public.set_moderator_access(uuid,boolean,boolean,boolean,boolean,boolean,boolean) from public, anon;
grant execute on function public.set_moderator_access(uuid,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated;

create function public.staff_recent_blocks()
returns table(
  blocker_id uuid,
  blocker_name text,
  blocked_id uuid,
  blocked_name text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.staff_recent_blocks();
$$;
revoke all on function public.staff_recent_blocks() from public, anon;
grant execute on function public.staff_recent_blocks() to authenticated;

create function public.staff_safety_reports()
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
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.staff_safety_reports();
$$;
revoke all on function public.staff_safety_reports() from public, anon;
grant execute on function public.staff_safety_reports() to authenticated;
