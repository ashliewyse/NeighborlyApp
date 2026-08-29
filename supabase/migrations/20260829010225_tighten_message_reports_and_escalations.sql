create or replace function private.enforce_message_report_direction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_sender_id uuid;
  v_recipient_id uuid;
begin
  if new.target_type <> 'message' then
    return new;
  end if;

  select dm.sender_id, dm.recipient_id
    into v_sender_id, v_recipient_id
  from public.direct_messages dm
  where dm.id = new.message_id;

  if not found then
    raise exception 'That message is not available to report.';
  end if;

  if v_recipient_id <> v_user_id then
    raise exception 'Only a message you received can be reported.';
  end if;

  return new;
end;
$$;
revoke all on function private.enforce_message_report_direction() from public, anon, authenticated;

drop trigger if exists safety_reports_message_direction on public.safety_reports;
create trigger safety_reports_message_direction
  before insert on public.safety_reports
  for each row execute function private.enforce_message_report_direction();

create or replace function private.notify_admins_of_escalated_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff_name text;
begin
  if new.status <> 'escalated' or old.status = 'escalated' then
    return new;
  end if;

  v_staff_name := coalesce(private.member_display_name(new.reviewed_by), 'A moderator');

  insert into public.notifications (user_id, type, title, body, subject_user_id, post_id)
  select
    admin.user_id,
    'moderation_action',
    'Safety report escalated',
    v_staff_name || ' escalated a ' || new.target_type || ' report for administrator review.',
    new.reported_user_id,
    new.post_id
  from public.site_admins admin
  where admin.enabled
    and (new.reviewed_by is null or admin.user_id <> new.reviewed_by);

  return new;
end;
$$;
revoke all on function private.notify_admins_of_escalated_report() from public, anon, authenticated;

drop trigger if exists safety_reports_notify_admins_on_escalation on public.safety_reports;
create trigger safety_reports_notify_admins_on_escalation
  after update of status on public.safety_reports
  for each row execute function private.notify_admins_of_escalated_report();
