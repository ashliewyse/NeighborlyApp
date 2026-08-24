drop policy if exists "advertisers view own campaigns"
  on public.advertising_campaigns;

drop policy if exists "active paid ads are viewable"
  on public.advertising_campaigns;

create policy "advertising campaigns visible to authenticated"
  on public.advertising_campaigns
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (
      status = 'active'
      and billing_status = 'paid'
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at > now())
    )
  );

create policy "active paid ads viewable by visitors"
  on public.advertising_campaigns
  for select
  to anon
  using (
    status = 'active'
    and billing_status = 'paid'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );
