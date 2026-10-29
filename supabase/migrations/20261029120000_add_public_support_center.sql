-- Public, unauthenticated help requests are INSERT-only. All reading and updates are admin-only.
create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null check (char_length(btrim(sender_name)) between 1 and 120),
  contact_email text not null check (char_length(contact_email) between 5 and 254 and contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  category text not null check (category in ('login','installation','bug','safety','account','other')),
  subject text not null check (char_length(btrim(subject)) between 2 and 120),
  message text not null check (char_length(btrim(message)) between 5 and 5000),
  status text not null default 'new' check (status in ('new','in_progress','resolved')),
  admin_response text check (admin_response is null or char_length(admin_response) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_requests_status_created_idx on public.support_requests (status, created_at desc);
alter table public.support_requests enable row level security;
revoke all on public.support_requests from anon, authenticated;
grant insert (sender_name, contact_email, category, subject, message) on public.support_requests to anon, authenticated;
grant select, update on public.support_requests to authenticated;

create policy "anyone may send an initial support request"
  on public.support_requests for insert to anon, authenticated
  with check (status = 'new' and admin_response is null);
create policy "only enabled admins can read support requests"
  on public.support_requests for select to authenticated
  using (exists (select 1 from public.site_admins a where a.user_id = (select auth.uid()) and a.enabled));
create policy "only enabled admins can update support requests"
  on public.support_requests for update to authenticated
  using (exists (select 1 from public.site_admins a where a.user_id = (select auth.uid()) and a.enabled))
  with check (exists (select 1 from public.site_admins a where a.user_id = (select auth.uid()) and a.enabled));

-- The public can read only published FAQs. Only enabled site admins can edit them.
create table if not exists public.support_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null unique check (char_length(btrim(question)) between 5 and 200),
  answer text not null check (char_length(btrim(answer)) between 5 and 5000),
  sort_order integer not null default 100 check (sort_order between 0 and 9999),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_faqs_public_order_idx on public.support_faqs (sort_order) where published;
alter table public.support_faqs enable row level security;
revoke all on public.support_faqs from anon, authenticated;
grant select on public.support_faqs to anon, authenticated;
grant insert, update, delete on public.support_faqs to authenticated;
create policy "published FAQs are public and admins can read all"
  on public.support_faqs for select to anon, authenticated
  using (published or exists (select 1 from public.site_admins a where a.user_id = (select auth.uid()) and a.enabled));
create policy "admins may add FAQs"
  on public.support_faqs for insert to authenticated
  with check (exists (select 1 from public.site_admins a where a.user_id = (select auth.uid()) and a.enabled));
create policy "admins may edit FAQs"
  on public.support_faqs for update to authenticated
  using (exists (select 1 from public.site_admins a where a.user_id = (select auth.uid()) and a.enabled))
  with check (exists (select 1 from public.site_admins a where a.user_id = (select auth.uid()) and a.enabled));
create policy "admins may delete FAQs"
  on public.support_faqs for delete to authenticated
  using (exists (select 1 from public.site_admins a where a.user_id = (select auth.uid()) and a.enabled));

insert into public.support_faqs (question, answer, sort_order) values
('How do I install Neighborly?', 'Visit neighborshelpingneighbors.online/install from Safari on iPhone or Chrome on Android. Follow the instructions to add Neighborly to your home screen. It is not currently listed in the app stores.', 10),
('I cannot sign in or confirm my email. What should I do?', 'Double-check your email address and password. Use the password reset option on the sign-in page, or check your spam folder for the confirmation email. If you are still stuck, send a support request below.', 20),
('What do Neighborly badges mean?', 'Badges help highlight community participation and other account or safety-related signals. A badge does not guarantee that someone is safe or that their services are certified. Always use your judgment when meeting or hiring someone.', 30),
('Can neighbors and businesses rate each other?', 'Neighborly offers community reviews and ratings to share feedback about local interactions. Keep reviews accurate, specific, and respectful. Businesses and neighbors should not use ratings to harass or pressure others.', 40),
('How do I report a problem or safety concern?', 'Use the report tools when available, or choose Safety concern in the support form below. Never share passwords or sensitive information. For an emergency or immediate danger, contact local emergency services instead.', 50)
on conflict (question) do nothing;
