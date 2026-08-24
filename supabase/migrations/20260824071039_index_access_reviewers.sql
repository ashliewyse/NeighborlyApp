create index member_access_reviewed_by_idx
  on public.member_access (reviewed_by)
  where reviewed_by is not null;

create index site_access_settings_updated_by_idx
  on public.site_access_settings (updated_by)
  where updated_by is not null;
