create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.site_access_settings (
  id boolean primary key default true check (id),
  approval_required boolean not null default true,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.site_access_settings (id, approval_required)
values (true, true)
on conflict (id) do update
set approval_required = excluded.approval_required,
    updated_at = now();

alter table public.site_access_settings enable row level security;
grant select, update on public.site_access_settings to authenticated;

create policy "signed in users read access mode"
on public.site_access_settings
for select
to authenticated
using (true);

create policy "admins manage access mode"
on public.site_access_settings
for update
to authenticated
using (
  exists (
    select 1
    from public.site_admins admin
    where admin.user_id = (select auth.uid())
      and admin.enabled = true
  )
)
with check (
  id = true
  and exists (
    select 1
    from public.site_admins admin
    where admin.user_id = (select auth.uid())
      and admin.enabled = true
  )
);

create table public.member_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  requested_name text not null default '',
  account_type text not null default 'personal' check (account_type in ('personal', 'business')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (review_note is null or char_length(review_note) <= 1000),
  updated_at timestamptz not null default now()
);

create index member_access_status_requested_idx
  on public.member_access (status, requested_at desc);

alter table public.member_access enable row level security;
grant select, update on public.member_access to authenticated;

create policy "members read own access and admins read all"
on public.member_access
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.site_admins admin
    where admin.user_id = (select auth.uid())
      and admin.enabled = true
  )
);

create policy "admins review member access"
on public.member_access
for update
to authenticated
using (
  exists (
    select 1
    from public.site_admins admin
    where admin.user_id = (select auth.uid())
      and admin.enabled = true
  )
)
with check (
  exists (
    select 1
    from public.site_admins admin
    where admin.user_id = (select auth.uid())
      and admin.enabled = true
  )
);

-- Everyone who registered before approval mode was enabled keeps access.
insert into public.member_access (
  user_id,
  email,
  requested_name,
  account_type,
  status,
  requested_at
)
select
  auth_user.id,
  coalesce(auth_user.email, ''),
  coalesce(auth_user.raw_user_meta_data ->> 'full_name', ''),
  case when auth_user.raw_user_meta_data ->> 'account_type' = 'business' then 'business' else 'personal' end,
  'approved',
  auth_user.created_at
from auth.users auth_user
on conflict (user_id) do nothing;

create or replace function private.has_site_access()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
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
    );
$$;

revoke all on function private.has_site_access() from public;
grant execute on function private.has_site_access() to authenticated;

create or replace function private.handle_new_member_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requires_approval boolean := coalesce(
    (select setting.approval_required
     from public.site_access_settings setting
     where setting.id = true),
    true
  );
begin
  insert into public.member_access (
    user_id,
    email,
    requested_name,
    account_type,
    status,
    requested_at
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(metadata ->> 'full_name', ''),
    case when metadata ->> 'account_type' = 'business' then 'business' else 'personal' end,
    case when requires_approval then 'pending' else 'approved' end,
    now()
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_member_access() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists neighborly_member_access_on_signup on auth.users;
create trigger neighborly_member_access_on_signup
  after insert on auth.users
  for each row execute function private.handle_new_member_access();

-- Pending applicants can save their own basic profile, but cannot browse members.
create policy "approved members read profiles"
on public.profiles
as restrictive
for select
to authenticated
using (private.has_site_access() or id = (select auth.uid()));

create policy "approved members read business profiles"
on public.business_profiles
as restrictive
for select
to authenticated
using (private.has_site_access() or user_id = (select auth.uid()));

-- All community activity requires approval while testing mode is enabled.
create policy "approved members use posts"
on public.posts
as restrictive
for all
to authenticated
using (private.has_site_access())
with check (private.has_site_access());

create policy "approved members use direct messages"
on public.direct_messages
as restrictive
for all
to authenticated
using (private.has_site_access())
with check (private.has_site_access());

create policy "approved members use friendships"
on public.friendships
as restrictive
for all
to authenticated
using (private.has_site_access())
with check (private.has_site_access());

create policy "approved members use follows"
on public.profile_follows
as restrictive
for all
to authenticated
using (private.has_site_access())
with check (private.has_site_access());

create policy "approved members use profile photos"
on public.profile_photos
as restrictive
for all
to authenticated
using (private.has_site_access())
with check (private.has_site_access());

create policy "approved members use reviews"
on public.neighbor_reviews
as restrictive
for all
to authenticated
using (private.has_site_access())
with check (private.has_site_access());

create policy "approved members use advertising"
on public.advertising_campaigns
as restrictive
for all
to authenticated
using (private.has_site_access())
with check (private.has_site_access());

create policy "approved members use feedback"
on public.site_feedback
as restrictive
for all
to authenticated
using (private.has_site_access())
with check (private.has_site_access());

create policy "approved members upload neighborly media"
on storage.objects
as restrictive
for insert
to authenticated
with check (private.has_site_access());

create policy "approved members update neighborly media"
on storage.objects
as restrictive
for update
to authenticated
using (private.has_site_access())
with check (private.has_site_access());

create policy "approved members delete neighborly media"
on storage.objects
as restrictive
for delete
to authenticated
using (private.has_site_access());
