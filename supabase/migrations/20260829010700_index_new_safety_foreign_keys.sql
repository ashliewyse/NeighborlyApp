create index if not exists member_enforcement_updated_by_idx
  on public.member_enforcement (updated_by)
  where updated_by is not null;

create index if not exists moderation_actions_actor_user_idx
  on public.moderation_actions (actor_user_id, created_at desc);
create index if not exists moderation_actions_report_idx
  on public.moderation_actions (report_id)
  where report_id is not null;
create index if not exists moderation_actions_post_idx
  on public.moderation_actions (post_id)
  where post_id is not null;
create index if not exists moderation_actions_comment_idx
  on public.moderation_actions (comment_id)
  where comment_id is not null;

create index if not exists posts_moderation_hidden_by_idx
  on public.posts (moderation_hidden_by)
  where moderation_hidden_by is not null;
create index if not exists post_comments_moderation_hidden_by_idx
  on public.post_comments (moderation_hidden_by)
  where moderation_hidden_by is not null;

create index if not exists safety_reports_post_id_idx
  on public.safety_reports (post_id)
  where post_id is not null;
create index if not exists safety_reports_comment_id_idx
  on public.safety_reports (comment_id)
  where comment_id is not null;
create index if not exists safety_reports_message_id_idx
  on public.safety_reports (message_id)
  where message_id is not null;
create index if not exists safety_reports_reviewed_by_idx
  on public.safety_reports (reviewed_by)
  where reviewed_by is not null;

create index if not exists site_moderators_granted_by_idx
  on public.site_moderators (granted_by)
  where granted_by is not null;
