create or replace function public.profile_recent_activity(
  p_user_id uuid,
  p_limit integer default 5
)
returns table (
  activity_type text,
  activity_text text,
  activity_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with target as (
    select p.id
    from public.profiles p
    where p.id = p_user_id
      and private.has_site_access()
      and private.can_interact_with(p.id)
  ),
  activity as (
    select
      'comment'::text as activity_type,
      'Commented on a community post'::text as activity_text,
      c.created_at as activity_at
    from public.post_comments c
    join target t on t.id = c.author_id
    join public.posts p on p.id = c.post_id
    where c.moderation_hidden_at is null
      and p.moderation_hidden_at is null

    union all

    select
      'neighbor'::text,
      'Connected with a neighbor'::text,
      coalesce(f.responded_at, f.created_at)
    from public.friendships f
    join target t
      on t.id = f.requester_id or t.id = f.addressee_id
    where f.status = 'accepted'

    union all

    select
      'review'::text,
      'Left a review for a neighbor'::text,
      r.created_at
    from public.neighbor_reviews r
    join target t on t.id = r.reviewer_id
  )
  select a.activity_type, a.activity_text, a.activity_at
  from activity a
  order by a.activity_at desc
  limit least(greatest(coalesce(p_limit, 5), 1), 5);
$$;

revoke all on function public.profile_recent_activity(uuid, integer) from public, anon;
grant execute on function public.profile_recent_activity(uuid, integer) to authenticated;
