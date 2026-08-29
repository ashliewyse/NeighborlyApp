create index post_reports_reviewed_by_idx
  on public.post_reports (reviewed_by)
  where reviewed_by is not null;
