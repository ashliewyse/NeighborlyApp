create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_account_type text := case
    when v_metadata ->> 'account_type' = 'business' then 'business'
    else 'personal'
  end;
begin
  insert into public.profiles (
    id, full_name, city, zip_code, neighborhood, bio, theme, account_type
  )
  values (
    new.id,
    coalesce(v_metadata ->> 'full_name', ''),
    coalesce(v_metadata ->> 'city', ''),
    coalesce(v_metadata ->> 'zip_code', ''),
    coalesce(v_metadata ->> 'neighborhood', ''),
    coalesce(v_metadata ->> 'bio', ''),
    coalesce(nullif(v_metadata ->> 'theme', ''), 'classic-blue'),
    v_account_type
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      city = excluded.city,
      zip_code = excluded.zip_code,
      neighborhood = excluded.neighborhood,
      bio = excluded.bio,
      theme = excluded.theme,
      account_type = excluded.account_type,
      updated_at = now();

  if v_account_type = 'business'
     and nullif(trim(v_metadata ->> 'business_name'), '') is not null then
    insert into public.business_profiles (
      user_id, business_name, category, owner_name, description, city,
      zip_code, neighborhood, phone, website, theme
    )
    values (
      new.id,
      trim(v_metadata ->> 'business_name'),
      coalesce(nullif(trim(v_metadata ->> 'business_category'), ''), 'Local Business'),
      coalesce(v_metadata ->> 'full_name', ''),
      coalesce(v_metadata ->> 'business_description', ''),
      coalesce(v_metadata ->> 'city', ''),
      coalesce(v_metadata ->> 'zip_code', ''),
      coalesce(v_metadata ->> 'neighborhood', ''),
      coalesce(v_metadata ->> 'business_phone', ''),
      coalesce(v_metadata ->> 'business_website', ''),
      coalesce(nullif(v_metadata ->> 'theme', ''), 'classic-blue')
    )
    on conflict (user_id) do update
    set business_name = excluded.business_name,
        category = excluded.category,
        owner_name = excluded.owner_name,
        description = excluded.description,
        city = excluded.city,
        zip_code = excluded.zip_code,
        neighborhood = excluded.neighborhood,
        phone = excluded.phone,
        website = excluded.website,
        theme = excluded.theme,
        updated_at = now();
  end if;

  return new;
end;
$function$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to postgres, service_role;

create or replace function public.set_my_profile_media(
  p_avatar_url text default null,
  p_cover_url text default null,
  p_theme text default null
)
returns public.profiles
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set avatar_url = coalesce(p_avatar_url, avatar_url),
      cover_url = coalesce(p_cover_url, cover_url),
      theme = coalesce(p_theme, theme),
      updated_at = now()
  where id = auth.uid()
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return v_profile;
end;
$function$;

revoke all on function public.set_my_profile_media(text, text, text) from public, anon;
grant execute on function public.set_my_profile_media(text, text, text) to authenticated;

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'neighborly-media';
