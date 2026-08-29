create or replace function public.my_staff_capabilities()
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
security definer
set search_path = ''
as $$
  select
    private.is_site_admin(),
    private.is_site_moderator(),
    private.can_moderate('review_reports'),
    private.can_moderate('view_blocks'),
    private.can_moderate('remove_posts'),
    private.can_moderate('remove_comments'),
    private.can_moderate('warn_members');
$$;
revoke all on function public.my_staff_capabilities() from public, anon;
grant execute on function public.my_staff_capabilities() to authenticated;
