alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'new_neighbor',
    'post_reported',
    'user_blocked',
    'safety_reported',
    'moderation_warning',
    'moderation_action',
    'post_comment',
    'thread_comment'
  ));

alter table public.notifications
  drop constraint if exists notifications_unique_subject;

create unique index if not exists notifications_unique_new_neighbor_subject_idx
  on public.notifications (user_id, type, subject_user_id)
  where type = 'new_neighbor' and subject_user_id is not null;

alter table public.notification_preferences
  add column if not exists post_replies boolean not null default true,
  add column if not exists participated_post_replies boolean not null default true;

create or replace function private.notify_post_comment_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post_author_id uuid;
  v_commenter_name text;
  v_reply_text text;
  v_author_body text;
  v_participant_body text;
begin
  select p.author_id
    into v_post_author_id
  from public.posts p
  where p.id = new.post_id
    and p.moderation_hidden_at is null;

  if not found then
    return new;
  end if;

  v_commenter_name := coalesce(private.member_display_name(new.author_id), 'A neighbor');
  v_reply_text := nullif(btrim(regexp_replace(coalesce(new.body, ''), '\s+', ' ', 'g')), '');

  if v_reply_text is null then
    v_author_body := v_commenter_name || ' responded to your post with a photo.';
    v_participant_body := v_commenter_name || ' also responded to a post you joined with a photo.';
  else
    v_author_body := v_commenter_name || ' responded to your post: “' || left(v_reply_text, 180) || case when char_length(v_reply_text) > 180 then '…' else '' end || '”';
    v_participant_body := v_commenter_name || ' also responded to a post you joined: “' || left(v_reply_text, 180) || case when char_length(v_reply_text) > 180 then '…' else '' end || '”';
  end if;

  if v_post_author_id is not null and v_post_author_id <> new.author_id then
    insert into public.notifications (
      user_id,
      type,
      title,
      body,
      subject_user_id,
      post_id
    )
    select
      v_post_author_id,
      'post_comment',
      'New response to your post',
      v_author_body,
      new.author_id,
      new.post_id
    from public.member_access ma
    left join public.notification_preferences np on np.user_id = ma.user_id
    where ma.user_id = v_post_author_id
      and ma.status = 'approved'
      and coalesce(np.post_replies, true)
      and not exists (
        select 1
        from public.user_blocks ub
        where (ub.blocker_id = v_post_author_id and ub.blocked_id = new.author_id)
           or (ub.blocker_id = new.author_id and ub.blocked_id = v_post_author_id)
      );
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    subject_user_id,
    post_id
  )
  select distinct
    c.author_id,
    'thread_comment',
    'New response on a post you joined',
    v_participant_body,
    new.author_id,
    new.post_id
  from public.post_comments c
  join public.member_access ma
    on ma.user_id = c.author_id
   and ma.status = 'approved'
  left join public.notification_preferences np
    on np.user_id = c.author_id
  where c.post_id = new.post_id
    and c.author_id <> new.author_id
    and c.author_id is distinct from v_post_author_id
    and c.moderation_hidden_at is null
    and coalesce(np.participated_post_replies, true)
    and not exists (
      select 1
      from public.user_blocks ub
      where (ub.blocker_id = c.author_id and ub.blocked_id = new.author_id)
         or (ub.blocker_id = new.author_id and ub.blocked_id = c.author_id)
    );

  return new;
end;
$$;

revoke all on function private.notify_post_comment_activity() from public, anon, authenticated;

drop trigger if exists post_comments_notify_activity on public.post_comments;
create trigger post_comments_notify_activity
  after insert on public.post_comments
  for each row execute function private.notify_post_comment_activity();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
