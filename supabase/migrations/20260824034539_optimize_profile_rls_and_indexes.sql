create index if not exists posts_author_id_idx
  on public.posts (author_id);

create index if not exists posts_profile_user_id_idx
  on public.posts (profile_user_id);

create index if not exists profile_photos_user_id_created_at_idx
  on public.profile_photos (user_id, created_at);

alter policy "users can insert own profile"
  on public.profiles
  with check ((select auth.uid()) = id);

alter policy "users can update own profile"
  on public.profiles
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

alter policy "users can delete own profile"
  on public.profiles
  using ((select auth.uid()) = id);

alter policy "users add own profile photos"
  on public.profile_photos
  with check ((select auth.uid()) = user_id);

alter policy "users delete own profile photos"
  on public.profile_photos
  using ((select auth.uid()) = user_id);

alter policy "authenticated users create posts"
  on public.posts
  with check ((select auth.uid()) = author_id);

alter policy "authors update own posts"
  on public.posts
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

alter policy "authors delete own posts"
  on public.posts
  using ((select auth.uid()) = author_id);

alter policy "neighbor_reviews_insert"
  on public.neighbor_reviews
  with check (
    reviewer_id = (select auth.uid())
    and reviewer_id <> reviewee_id
  );

alter policy "neighbor_reviews_update"
  on public.neighbor_reviews
  using (reviewer_id = (select auth.uid()))
  with check (
    reviewer_id = (select auth.uid())
    and reviewer_id <> reviewee_id
  );

alter policy "neighbor_reviews_delete"
  on public.neighbor_reviews
  using (reviewer_id = (select auth.uid()));
