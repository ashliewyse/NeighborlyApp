-- Cover the creator foreign key for efficient account cleanup and moderation.
create index if not exists community_groups_created_by_idx
  on public.community_groups (created_by);
