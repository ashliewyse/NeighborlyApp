create index site_feedback_responded_by_idx
  on public.site_feedback (responded_by)
  where responded_by is not null;
