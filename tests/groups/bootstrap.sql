-- Isolated PostgreSQL harness for the existing group policies. No network or production writes.
create role anon;
create role authenticated;
create schema auth;
create schema private;
grant usage on schema public,auth,private to authenticated;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table public.profiles(id uuid primary key, full_name text, created_at timestamptz default now());
insert into public.profiles(id,full_name) values ('00000000-0000-4000-8000-000000000001','Local fixture owner'),('11111111-1111-4111-8111-111111111111','Local fixture neighbor');
create table public.user_blocks(blocker_id uuid,blocked_id uuid,primary key(blocker_id,blocked_id));
create table public.site_admins(user_id uuid primary key,enabled boolean default true);
create table public.member_enforcement(user_id uuid primary key,state text,suspended_until timestamptz);
create function private.has_site_access() returns boolean language sql stable security definer set search_path='' as $$
select (select auth.uid()) is not null and not exists(select 1 from public.member_enforcement e where e.user_id=(select auth.uid()) and (e.state='banned' or (e.state='suspended' and (e.suspended_until is null or e.suspended_until>now())))); $$;
create function private.can_interact_with(p_other_user_id uuid) returns boolean language sql stable security definer set search_path='' as $$
select (select auth.uid()) is not null and p_other_user_id is not null and not exists(select 1 from public.user_blocks ub where (ub.blocker_id=(select auth.uid()) and ub.blocked_id=p_other_user_id) or (ub.blocker_id=p_other_user_id and ub.blocked_id=(select auth.uid()))); $$;
create function private.is_site_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.site_admins where user_id=(select auth.uid()) and enabled); $$;
create table public.community_groups(id uuid primary key default gen_random_uuid(), name text, description text, city text, created_by uuid references public.profiles(id), is_active boolean default true);
create table public.community_group_members(group_id uuid references public.community_groups(id) on delete cascade,user_id uuid references public.profiles(id),joined_at timestamptz default now(),primary key(group_id,user_id));
alter table public.community_groups enable row level security;
alter table public.community_group_members enable row level security;
grant select on public.profiles,public.community_groups to authenticated;
grant select,insert,delete on public.community_group_members to authenticated;
create policy groups_read on public.community_groups for select to authenticated using (private.has_site_access() and is_active);
create policy members_read on public.community_group_members for select to authenticated using (private.has_site_access());
create policy members_join on public.community_group_members for insert to authenticated with check (private.has_site_access() and user_id=(select auth.uid()) and exists(select 1 from public.community_groups g where g.id=group_id and g.is_active));
create policy members_leave on public.community_group_members for delete to authenticated using (private.has_site_access() and user_id=(select auth.uid()));
