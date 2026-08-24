alter table public.posts
  add column if not exists city text,
  add column if not exists neighborhood text;

update public.posts as post
set
  city = coalesce(
    nullif(btrim(business.city), ''),
    nullif(btrim(profile.city), ''),
    'Michigan City'
  ),
  neighborhood = coalesce(
    nullif(btrim(business.neighborhood), ''),
    nullif(btrim(profile.neighborhood), ''),
    nullif(btrim(business.city), ''),
    nullif(btrim(profile.city), ''),
    'Local Area'
  )
from public.profiles as profile
left join public.business_profiles as business
  on business.user_id = profile.id
where profile.id = post.author_id
  and (post.city is null or post.neighborhood is null);

alter table public.posts
  drop constraint if exists posts_city_length,
  add constraint posts_city_length
    check (city is null or char_length(btrim(city)) between 1 and 120),
  drop constraint if exists posts_neighborhood_length,
  add constraint posts_neighborhood_length
    check (neighborhood is null or char_length(btrim(neighborhood)) between 1 and 120);

create index if not exists posts_city_created_at_idx
  on public.posts ((lower(city)), created_at desc)
  where city is not null;
