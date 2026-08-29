create or replace function public.admin_member_safety_summary(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not private.is_site_admin() then
    raise exception 'Administrator access required.';
  end if;
  if p_user_id is null then
    raise exception 'Member is required.';
  end if;

  select jsonb_build_object(
    'reports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'target_type', r.target_type,
        'reason', r.reason,
        'status', r.status,
        'reporter_name', coalesce(private.member_display_name(r.reporter_id), 'Member'),
        'target_excerpt', r.target_excerpt,
        'details', r.details,
        'created_at', r.created_at,
        'reviewed_at', r.reviewed_at
      ) order by r.created_at desc)
      from public.safety_reports r
      where r.reported_user_id = p_user_id
    ), '[]'::jsonb),
    'blocks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'direction', case when b.blocker_id = p_user_id then 'blocked_by_member' else 'member_was_blocked' end,
        'other_user_id', case when b.blocker_id = p_user_id then b.blocked_id else b.blocker_id end,
        'other_name', case when b.blocker_id = p_user_id then b.blocked_name else b.blocker_name end,
        'created_at', b.created_at
      ) order by b.created_at desc)
      from public.user_blocks b
      where b.blocker_id = p_user_id or b.blocked_id = p_user_id
    ), '[]'::jsonb),
    'actions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'action_type', a.action_type,
        'actor_name', coalesce(private.member_display_name(a.actor_user_id), 'Staff member'),
        'note', a.note,
        'created_at', a.created_at
      ) order by a.created_at desc)
      from public.moderation_actions a
      where a.target_user_id = p_user_id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;
revoke all on function public.admin_member_safety_summary(uuid) from public, anon;
grant execute on function public.admin_member_safety_summary(uuid) to authenticated;

create or replace function public.admin_recent_moderation_actions(p_limit integer default 50)
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
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_site_admin() then
    raise exception 'Administrator access required.';
  end if;

  return query
    select
      a.id,
      a.actor_user_id,
      coalesce(private.member_display_name(a.actor_user_id), 'Staff member'),
      a.target_user_id,
      coalesce(private.member_display_name(a.target_user_id), 'Member'),
      a.action_type,
      a.note,
      a.created_at
    from public.moderation_actions a
    order by a.created_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 100));
end;
$$;
revoke all on function public.admin_recent_moderation_actions(integer) from public, anon;
grant execute on function public.admin_recent_moderation_actions(integer) to authenticated;
