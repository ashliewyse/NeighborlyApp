create table public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.site_admins enable row level security;

revoke all on table public.site_admins from anon, authenticated;
grant select on table public.site_admins to authenticated;
grant all on table public.site_admins to service_role;

create policy "admins view own membership"
  on public.site_admins
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and enabled
  );

create table public.site_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  contact_email text not null,
  category text not null default 'idea',
  subject text not null,
  message text not null,
  status text not null default 'unread',
  admin_response text,
  responded_by uuid references auth.users(id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_feedback_sender_name_length
    check (char_length(btrim(sender_name)) between 1 and 100),
  constraint site_feedback_email_length
    check (char_length(btrim(contact_email)) between 3 and 254),
  constraint site_feedback_category_check
    check (category = any (array['idea', 'problem', 'question', 'safety', 'other'])),
  constraint site_feedback_subject_length
    check (char_length(btrim(subject)) between 2 and 120),
  constraint site_feedback_message_length
    check (char_length(btrim(message)) between 5 and 5000),
  constraint site_feedback_status_check
    check (status = any (array['unread', 'read', 'resolved'])),
  constraint site_feedback_response_length
    check (admin_response is null or char_length(btrim(admin_response)) between 1 and 5000),
  constraint site_feedback_response_consistency
    check (
      (admin_response is null and responded_by is null and responded_at is null)
      or (admin_response is not null and responded_by is not null and responded_at is not null)
    )
);

alter table public.site_feedback enable row level security;

revoke all on table public.site_feedback from anon, authenticated;
grant select, insert, update on table public.site_feedback to authenticated;
grant all on table public.site_feedback to service_role;

create policy "feedback visible to sender or admin"
  on public.site_feedback
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.site_admins
      where site_admins.user_id = (select auth.uid())
        and site_admins.enabled
    )
  );

create policy "signed in users submit feedback"
  on public.site_feedback
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'unread'
    and admin_response is null
    and responded_by is null
    and responded_at is null
  );

create policy "admins respond to feedback"
  on public.site_feedback
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.site_admins
      where site_admins.user_id = (select auth.uid())
        and site_admins.enabled
    )
  )
  with check (
    exists (
      select 1
      from public.site_admins
      where site_admins.user_id = (select auth.uid())
        and site_admins.enabled
    )
  );

create index site_feedback_status_created_idx
  on public.site_feedback (status, created_at desc);

create index site_feedback_user_created_idx
  on public.site_feedback (user_id, created_at desc);

alter table public.advertising_campaigns
  add column payment_method text,
  add column payment_reference text,
  add constraint advertising_campaigns_payment_method_check
    check (
      payment_method is null
      or payment_method = any (array['stripe', 'cash_app', 'bank_transfer', 'complimentary', 'other'])
    ),
  add constraint advertising_campaigns_payment_reference_length
    check (
      payment_reference is null
      or char_length(btrim(payment_reference)) between 1 and 200
    );

grant update on table public.advertising_campaigns to authenticated;

drop policy if exists "advertising campaigns visible to authenticated"
  on public.advertising_campaigns;

create policy "advertising campaigns visible to authenticated"
  on public.advertising_campaigns
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.site_admins
      where site_admins.user_id = (select auth.uid())
        and site_admins.enabled
    )
    or (
      status = 'active'
      and billing_status = 'paid'
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at > now())
    )
  );

create policy "admins manage advertising campaigns"
  on public.advertising_campaigns
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.site_admins
      where site_admins.user_id = (select auth.uid())
        and site_admins.enabled
    )
  )
  with check (
    exists (
      select 1
      from public.site_admins
      where site_admins.user_id = (select auth.uid())
        and site_admins.enabled
    )
  );
