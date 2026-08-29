create or replace function private.staff_member_directory(p_search text default null)
returns table(
  user_id uuid,
  display_name text,
  account_type text,
  city text,
  neighborhood text,
  enforcement_state text,
  warning_count integer,
  open_report_count bigint,
  is_admin boolean,
  is_moderator boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_site_staff() then
    raise exception 'Staff access required.';
  end if;

  return query
    select
      p.id,
      coalesce(nullif(btrim(bp.business_name), ''), nullif(btrim(p.full_name), ''), 'Member'),
      p.account_type,
      coalesce(bp.city, p.city),
      coalesce(bp.neighborhood, p.neighborhood),
      coalesce(me.state, 'active'),
      coalesce(me.warning_count, 0),
      (
        select count(*)
        from public.safety_reports sr
        where sr.reported_user_id = p.id
          and sr.status in ('open', 'reviewing', 'escalated')
      ),
      exists(
        select 1
        from public.site_admins a
        where a.user_id = p.id and a.enabled
      ),
      exists(
        select 1
        from public.site_moderators m
        where m.user_id = p.id and m.enabled
      )
    from public.profiles p
    join public.member_access ma
      on ma.user_id = p.id
     and ma.status = 'approved'
    left join public.business_profiles bp on bp.user_id = p.id
    left join public.member_enforcement me on me.user_id = p.id
    where
      p_search is null
      or btrim(p_search) = ''
      or p.full_name ilike '%' || btrim(p_search) || '%'
      or coalesce(bp.business_name, '') ilike '%' || btrim(p_search) || '%'
      or coalesce(p.city, '') ilike '%' || btrim(p_search) || '%'
      or coalesce(p.neighborhood, '') ilike '%' || btrim(p_search) || '%'
      or coalesce(bp.city, '') ilike '%' || btrim(p_search) || '%'
      or coalesce(bp.neighborhood, '') ilike '%' || btrim(p_search) || '%'
    order by coalesce(nullif(btrim(bp.business_name), ''), nullif(btrim(p.full_name), ''), 'Member')
    limit 100;
end;
$$;

revoke all on function private.staff_member_directory(text) from public, anon;
grant execute on function private.staff_member_directory(text) to authenticated;

create or replace function public.staff_member_directory(p_search text default null)
returns table(
  user_id uuid,
  display_name text,
  account_type text,
  city text,
  neighborhood text,
  enforcement_state text,
  warning_count integer,
  open_report_count bigint,
  is_admin boolean,
  is_moderator boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.staff_member_directory(p_search);
$$;

revoke all on function public.staff_member_directory(text) from public, anon;
grant execute on function public.staff_member_directory(text) to authenticated;

create or replace function private.moderation_warn_member(p_user_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_message text;
begin
  if not private.can_moderate('warn_members') then
    raise exception 'Warning permission required.';
  end if;

  if p_user_id is null or p_user_id = v_actor then
    raise exception 'Choose another member.';
  end if;

  if not exists(
    select 1
    from public.member_access ma
    where ma.user_id = p_user_id
      and ma.status = 'approved'
  ) then
    raise exception 'That member is not available for moderation.';
  end if;

  if exists(
    select 1
    from public.site_admins a
    where a.user_id = p_user_id
      and a.enabled
  ) then
    raise exception 'Administrator accounts cannot be warned by moderators.';
  end if;

  v_message := coalesce(
    nullif(btrim(p_note), ''),
    'Please review Neighborly Community Guidelines and keep future interactions respectful and safe.'
  );

  insert into public.member_enforcement(
    user_id,
    state,
    public_reason,
    internal_note,
    warning_count,
    last_warned_at,
    updated_by,
    updated_at
  )
  values(
    p_user_id,
    'warned',
    v_message,
    nullif(btrim(p_note), ''),
    1,
    now(),
    v_actor,
    now()
  )
  on conflict(user_id) do update set
    state = case
      when public.member_enforcement.state in ('suspended', 'banned') then public.member_enforcement.state
      else 'warned'
    end,
    public_reason = excluded.public_reason,
    internal_note = excluded.internal_note,
    warning_count = public.member_enforcement.warning_count + 1,
    last_warned_at = now(),
    updated_by = v_actor,
    updated_at = now();

  insert into public.notifications(user_id, type, title, body, subject_user_id)
  values(
    p_user_id,
    'moderation_warning',
    'Neighborly moderation warning',
    v_message,
    v_actor
  );

  insert into public.moderation_actions(actor_user_id, target_user_id, action_type, note)
  values(v_actor, p_user_id, 'warn_member', nullif(btrim(p_note), ''));
end;
$$;

revoke all on function private.moderation_warn_member(uuid, text) from public, anon;
grant execute on function private.moderation_warn_member(uuid, text) to authenticated;

create or replace function public.moderation_warn_member(p_user_id uuid, p_note text default null)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.moderation_warn_member(p_user_id, p_note);
$$;

revoke all on function public.moderation_warn_member(uuid, text) from public, anon;
grant execute on function public.moderation_warn_member(uuid, text) to authenticated;

create or replace function private.staff_my_recent_actions(p_limit integer default 25)
returns table(
  action_id uuid,
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
  if not private.is_site_staff() then
    raise exception 'Staff access required.';
  end if;

  return query
    select
      ma.id,
      ma.target_user_id,
      coalesce(private.member_display_name(ma.target_user_id), 'Member'),
      ma.action_type,
      ma.note,
      ma.created_at
    from public.moderation_actions ma
    where ma.actor_user_id = (select auth.uid())
    order by ma.created_at desc
    limit greatest(1, least(coalesce(p_limit, 25), 100));
end;
$$;

revoke all on function private.staff_my_recent_actions(integer) from public, anon;
grant execute on function private.staff_my_recent_actions(integer) to authenticated;

create or replace function public.staff_my_recent_actions(p_limit integer default 25)
returns table(
  action_id uuid,
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
  select * from private.staff_my_recent_actions(p_limit);
$$;

revoke all on function public.staff_my_recent_actions(integer) from public, anon;
grant execute on function public.staff_my_recent_actions(integer) to authenticated;
