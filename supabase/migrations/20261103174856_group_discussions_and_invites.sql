-- Add discussions to existing real groups without changing main-feed visibility.
create function private.is_community_group_member(p_group_id uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select (select auth.uid()) is not null and private.has_site_access()
    and exists (select 1 from public.community_groups g
      join public.community_group_members m on m.group_id=g.id
      where g.id=p_group_id and g.is_active and m.user_id=(select auth.uid()));
$$;
revoke all on function private.is_community_group_member(uuid) from public, anon;
grant execute on function private.is_community_group_member(uuid) to authenticated;

create table public.community_group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.community_groups(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index community_group_posts_group_created_idx on public.community_group_posts(group_id,created_at desc,id desc);
create index community_group_posts_author_idx on public.community_group_posts(author_id);
alter table public.community_group_posts enable row level security;
revoke all on public.community_group_posts from public,anon,authenticated;
grant select,insert,delete on public.community_group_posts to authenticated;
create policy "group members read discussions" on public.community_group_posts for select to authenticated
using (private.is_community_group_member(group_id) and private.can_interact_with(author_id));
create policy "group members post as themselves" on public.community_group_posts for insert to authenticated
with check (private.is_community_group_member(group_id) and author_id=(select auth.uid()));
create policy "authors and group owners remove discussions" on public.community_group_posts for delete to authenticated
using (private.is_community_group_member(group_id) and (author_id=(select auth.uid())
  or private.is_site_admin() or exists(select 1 from public.community_groups g where g.id=group_id and g.created_by=(select auth.uid()))));

create table public.community_group_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_group_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index community_group_replies_post_created_idx on public.community_group_replies(post_id,created_at,id);
create index community_group_replies_author_idx on public.community_group_replies(author_id);
alter table public.community_group_replies enable row level security;
revoke all on public.community_group_replies from public,anon,authenticated;
grant select,insert,delete on public.community_group_replies to authenticated;
create policy "group members read replies" on public.community_group_replies for select to authenticated
using (private.has_site_access() and private.can_interact_with(author_id)
  and exists(select 1 from public.community_group_posts p where p.id=post_id));
create policy "group members reply as themselves" on public.community_group_replies for insert to authenticated
with check (private.has_site_access() and author_id=(select auth.uid())
  and exists(select 1 from public.community_group_posts p where p.id=post_id));
create policy "authors and group owners remove replies" on public.community_group_replies for delete to authenticated
using (private.has_site_access() and exists(select 1 from public.community_group_posts p
  join public.community_groups g on g.id=p.group_id where p.id=post_id
  and (community_group_replies.author_id=(select auth.uid()) or g.created_by=(select auth.uid()) or private.is_site_admin())));

create table public.community_group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.community_groups(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique(group_id,invitee_id),
  check (inviter_id <> invitee_id),
  check ((status='pending' and responded_at is null) or (status<>'pending' and responded_at is not null))
);
create index community_group_invites_recipient_idx on public.community_group_invites(invitee_id,status,created_at desc);
create index community_group_invites_sender_idx on public.community_group_invites(inviter_id);
alter table public.community_group_invites enable row level security;
revoke all on public.community_group_invites from public,anon,authenticated;
grant select,insert on public.community_group_invites to authenticated;
grant update(status,responded_at) on public.community_group_invites to authenticated;
create policy "invitation participants read" on public.community_group_invites for select to authenticated
using (private.has_site_access() and (inviter_id=(select auth.uid()) or invitee_id=(select auth.uid()))
  and private.can_interact_with(case when inviter_id=(select auth.uid()) then invitee_id else inviter_id end)
  and exists(select 1 from public.community_groups g where g.id=group_id and g.is_active));
create policy "group members invite neighbors" on public.community_group_invites for insert to authenticated
with check (private.is_community_group_member(group_id) and inviter_id=(select auth.uid())
  and private.can_interact_with(invitee_id) and status='pending' and responded_at is null
  and not exists(select 1 from public.community_group_members m where m.group_id=community_group_invites.group_id and m.user_id=invitee_id));
create policy "recipients respond to invitations" on public.community_group_invites for update to authenticated
using (private.has_site_access() and invitee_id=(select auth.uid()) and status='pending' and private.can_interact_with(inviter_id))
with check (private.has_site_access() and invitee_id=(select auth.uid()) and status in ('accepted','declined') and responded_at is not null and private.can_interact_with(inviter_id));

create function public.respond_to_group_invite(p_invite_id uuid,p_accept boolean)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare target_group uuid;
begin
  if (select auth.uid()) is null or not private.has_site_access() then
    raise exception 'Sign in to respond to this invitation' using errcode='42501';
  end if;
  update public.community_group_invites set status=case when p_accept then 'accepted' else 'declined' end,responded_at=now()
  where id=p_invite_id and invitee_id=(select auth.uid()) and status='pending'
  returning group_id into target_group;
  if target_group is null then raise exception 'This invitation is no longer available' using errcode='42501'; end if;
  if p_accept then
    insert into public.community_group_members(group_id,user_id) values(target_group,(select auth.uid())) on conflict do nothing;
  end if;
  return target_group;
end;
$$;
revoke all on function public.respond_to_group_invite(uuid,boolean) from public,anon;
grant execute on function public.respond_to_group_invite(uuid,boolean) to authenticated;
