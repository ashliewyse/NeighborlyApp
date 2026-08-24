create table public.advertising_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null,
  business_name text not null,
  headline text not null,
  description text not null,
  image_url text not null,
  destination_url text,
  phone text,
  contact_email text not null,
  target_city text not null,
  status text not null default 'pending',
  billing_status text not null default 'unpaid',
  stripe_customer_id text,
  stripe_subscription_id text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint advertising_campaigns_tier_check
    check (tier in ('starter', 'spotlight', 'featured')),
  constraint advertising_campaigns_business_name_length
    check (char_length(btrim(business_name)) between 2 and 100),
  constraint advertising_campaigns_headline_length
    check (char_length(btrim(headline)) between 2 and 100),
  constraint advertising_campaigns_description_length
    check (char_length(btrim(description)) between 10 and 500),
  constraint advertising_campaigns_image_url_length
    check (char_length(btrim(image_url)) between 1 and 2000),
  constraint advertising_campaigns_destination_url_length
    check (destination_url is null or char_length(btrim(destination_url)) between 8 and 2000),
  constraint advertising_campaigns_phone_length
    check (phone is null or char_length(btrim(phone)) between 7 and 30),
  constraint advertising_campaigns_contact_email_length
    check (
      char_length(btrim(contact_email)) between 5 and 254
      and position('@' in contact_email) > 1
    ),
  constraint advertising_campaigns_target_city_length
    check (char_length(btrim(target_city)) between 1 and 120),
  constraint advertising_campaigns_status_check
    check (status in ('pending', 'approved', 'active', 'paused', 'rejected', 'expired')),
  constraint advertising_campaigns_billing_status_check
    check (billing_status in ('unpaid', 'pending', 'paid', 'past_due', 'canceled', 'refunded')),
  constraint advertising_campaigns_dates_check
    check (ends_at is null or starts_at is null or ends_at > starts_at)
);

alter table public.advertising_campaigns enable row level security;

revoke all on table public.advertising_campaigns from anon, authenticated;
grant select on table public.advertising_campaigns to anon;
grant select, insert on table public.advertising_campaigns to authenticated;
grant all on table public.advertising_campaigns to service_role;

create policy "advertisers view own campaigns"
  on public.advertising_campaigns
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "active paid ads are viewable"
  on public.advertising_campaigns
  for select
  to anon, authenticated
  using (
    status = 'active'
    and billing_status = 'paid'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

create policy "advertisers submit campaigns"
  on public.advertising_campaigns
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'pending'
    and billing_status = 'unpaid'
    and stripe_customer_id is null
    and stripe_subscription_id is null
    and starts_at is null
    and ends_at is null
  );

create index advertising_campaigns_owner_created_idx
  on public.advertising_campaigns (user_id, created_at desc);

create index advertising_campaigns_active_target_idx
  on public.advertising_campaigns (target_city, tier, created_at desc)
  where status = 'active' and billing_status = 'paid';
