alter table public.site_access_settings
  add column if not exists welcome_posts_enabled boolean not null default true,
  add column if not exists welcome_notifications_enabled boolean not null default true,
  add column if not exists welcome_audience_mode text not null default 'auto',
  add column if not exists welcome_area_threshold integer not null default 100;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'site_access_settings_welcome_audience_mode_check'
      and conrelid = 'public.site_access_settings'::regclass
  ) then
    alter table public.site_access_settings
      add constraint site_access_settings_welcome_audience_mode_check
      check (welcome_audience_mode in ('all','area','auto'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'site_access_settings_welcome_area_threshold_check'
      and conrelid = 'public.site_access_settings'::regclass
  ) then
    alter table public.site_access_settings
      add constraint site_access_settings_welcome_area_threshold_check
      check (welcome_area_threshold >= 1);
  end if;
end $$;

update public.site_access_settings
set welcome_posts_enabled = true,
    welcome_notifications_enabled = true,
    welcome_audience_mode = 'auto',
    welcome_area_threshold = 100
where id = true;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  subject_user_id uuid references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (type in ('new_neighbor')),
  constraint notifications_unique_subject unique (user_id, type, subject_user_id)
);

create index if not exists notifications_user_unread_created_idx
  on public.notifications (user_id, read_at, created_at desc);
create index if not exists notifications_subject_user_id_idx
  on public.notifications(subject_user_id);
create index if not exists notifications_post_id_idx
  on public.notifications(post_id);

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant all on public.notifications to service_role;

drop policy if exists "members read own notifications" on public.notifications;
create policy "members read own notifications"
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "members mark own notifications read" on public.notifications;
create policy "members mark own notifications read"
  on public.notifications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  new_neighbor boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from anon, authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant all on public.notification_preferences to service_role;

drop policy if exists "members read own notification preferences" on public.notification_preferences;
create policy "members read own notification preferences"
  on public.notification_preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "members create own notification preferences" on public.notification_preferences;
create policy "members create own notification preferences"
  on public.notification_preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "members update own notification preferences" on public.notification_preferences;
create policy "members update own notification preferences"
  on public.notification_preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists private.welcome_announcements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete set null,
  audience_scope text not null check (audience_scope in ('all','area')),
  announced_at timestamptz not null default now()
);
create index if not exists welcome_announcements_post_id_idx
  on private.welcome_announcements(post_id);
alter table private.welcome_announcements enable row level security;

create or replace function private.create_welcome_announcement(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_account_type text;
  v_name text;
  v_city text;
  v_neighborhood text;
  v_business_name text;
  v_location_label text;
  v_message text;
  v_notification_title text;
  v_post_id uuid;
  v_existing_post_id uuid;
  v_scope text := 'all';
  v_approved_count integer := 0;
  v_posts_enabled boolean := true;
  v_notifications_enabled boolean := true;
  v_audience_mode text := 'auto';
  v_area_threshold integer := 100;
  v_claimed_user uuid;
begin
  select ma.status, ma.account_type
    into v_status, v_account_type
  from public.member_access ma
  where ma.user_id = p_user_id;

  if v_status is distinct from 'approved' then
    return null;
  end if;

  select p.full_name, p.city, p.neighborhood, p.account_type
    into v_name, v_city, v_neighborhood, v_account_type
  from public.profiles p
  where p.id = p_user_id;

  if not found then
    return null;
  end if;

  v_name := coalesce(nullif(trim(v_name), ''), 'A new neighbor');
  v_city := coalesce(trim(v_city), '');
  v_neighborhood := coalesce(trim(v_neighborhood), '');

  if v_account_type = 'business' then
    select bp.business_name
      into v_business_name
    from public.business_profiles bp
    where bp.user_id = p_user_id;

    if not found or nullif(trim(v_business_name), '') is null then
      return null;
    end if;
    v_business_name := trim(v_business_name);
  end if;

  select s.welcome_posts_enabled,
         s.welcome_notifications_enabled,
         s.welcome_audience_mode,
         s.welcome_area_threshold
    into v_posts_enabled,
         v_notifications_enabled,
         v_audience_mode,
         v_area_threshold
  from public.site_access_settings s
  where s.id = true;

  v_posts_enabled := coalesce(v_posts_enabled, true);
  v_notifications_enabled := coalesce(v_notifications_enabled, true);
  v_audience_mode := coalesce(v_audience_mode, 'auto');
  v_area_threshold := greatest(coalesce(v_area_threshold, 100), 1);

  select count(*)::integer
    into v_approved_count
  from public.member_access ma
  where ma.status = 'approved';

  if v_audience_mode = 'area'
     or (v_audience_mode = 'auto' and v_approved_count >= v_area_threshold) then
    v_scope := 'area';
  else
    v_scope := 'all';
  end if;

  if nullif(v_city, '') is null then
    v_scope := 'all';
  end if;

  if nullif(v_neighborhood, '') is not null
     and lower(v_neighborhood) <> lower(v_city) then
    v_location_label := v_neighborhood || case when nullif(v_city, '') is not null then ', ' || v_city else '' end;
  elsif nullif(v_city, '') is not null then
    v_location_label := v_city;
  else
    v_location_label := 'the Neighborly community';
  end if;

  if v_account_type = 'business' then
    v_notification_title := 'New Local Business';
    v_message := '🏪 New Local Business: ' || v_business_name || ' has joined Neighborly in ' || v_location_label || '. Stop by their profile and say hello!';
  else
    v_notification_title := 'New Neighbor';
    v_message := '👋 Welcome a New Neighbor! ' || v_name || ' just joined Neighborly in ' || v_location_label || '. Stop by their profile and say hello!';
  end if;

  insert into private.welcome_announcements (user_id, audience_scope)
  values (p_user_id, v_scope)
  on conflict (user_id) do nothing
  returning user_id into v_claimed_user;

  if v_claimed_user is null then
    select wa.post_id into v_existing_post_id
    from private.welcome_announcements wa
    where wa.user_id = p_user_id;
    return v_existing_post_id;
  end if;

  if v_posts_enabled then
    insert into public.posts (
      author_id,
      profile_user_id,
      post_type,
      content,
      category,
      city,
      neighborhood,
      is_admin_post
    ) values (
      p_user_id,
      p_user_id,
      'discussion',
      v_message,
      'general',
      case when v_scope = 'all' then 'All Areas' else v_city end,
      null,
      true
    )
    returning id into v_post_id;

    update private.welcome_announcements
    set post_id = v_post_id
    where user_id = p_user_id;
  end if;

  if v_notifications_enabled then
    insert into public.notifications (
      user_id,
      type,
      title,
      body,
      subject_user_id,
      post_id
    )
    select
      ma.user_id,
      'new_neighbor',
      v_notification_title,
      v_message,
      p_user_id,
      v_post_id
    from public.member_access ma
    left join public.notification_preferences np on np.user_id = ma.user_id
    left join public.profiles recipient_profile on recipient_profile.id = ma.user_id
    where ma.status = 'approved'
      and ma.user_id <> p_user_id
      and coalesce(np.new_neighbor, true)
      and (
        v_scope = 'all'
        or lower(trim(coalesce(recipient_profile.city, ''))) = lower(v_city)
      )
    on conflict (user_id, type, subject_user_id) do nothing;
  end if;

  return v_post_id;
end;
$$;
revoke all on function private.create_welcome_announcement(uuid) from public, anon, authenticated;

drop function if exists private.handle_member_access_welcome() cascade;
create function private.handle_member_access_welcome()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'approved' then
      perform private.create_welcome_announcement(new.user_id);
    end if;
  elsif tg_op = 'UPDATE' then
    if new.status = 'approved' and old.status is distinct from new.status then
      perform private.create_welcome_announcement(new.user_id);
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.handle_member_access_welcome() from public, anon, authenticated;
create trigger member_access_welcome_announcement
  after insert or update of status on public.member_access
  for each row execute function private.handle_member_access_welcome();

drop function if exists private.handle_profile_welcome() cascade;
create function private.handle_profile_welcome()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.create_welcome_announcement(new.id);
  return new;
end;
$$;
revoke all on function private.handle_profile_welcome() from public, anon, authenticated;
create trigger profile_welcome_announcement
  after insert on public.profiles
  for each row execute function private.handle_profile_welcome();

drop function if exists private.handle_business_profile_welcome() cascade;
create function private.handle_business_profile_welcome()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.create_welcome_announcement(new.user_id);
  return new;
end;
$$;
revoke all on function private.handle_business_profile_welcome() from public, anon, authenticated;
create trigger business_profile_welcome_announcement
  after insert on public.business_profiles
  for each row execute function private.handle_business_profile_welcome();
