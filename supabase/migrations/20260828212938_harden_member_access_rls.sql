drop policy if exists "approved members use direct messages" on public.direct_messages;
alter policy "Participants can view their messages" on public.direct_messages
  using (private.has_site_access() and ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id));
alter policy "Recipients can mark messages as read" on public.direct_messages
  using (private.has_site_access() and (select auth.uid()) = recipient_id)
  with check (private.has_site_access() and (select auth.uid()) = recipient_id);
alter policy "Users can send messages from their own account" on public.direct_messages
  with check (private.has_site_access() and (select auth.uid()) = sender_id and sender_id <> recipient_id);

drop policy if exists "approved members use friendships" on public.friendships;
alter policy "Friendship participants can view relationships" on public.friendships
  using (private.has_site_access() and ((select auth.uid()) = requester_id or (select auth.uid()) = addressee_id));
alter policy "Participants can remove friendships" on public.friendships
  using (private.has_site_access() and ((select auth.uid()) = requester_id or (select auth.uid()) = addressee_id));
alter policy "Recipients can accept pending friend requests" on public.friendships
  using (private.has_site_access() and (select auth.uid()) = addressee_id and status = 'pending')
  with check (private.has_site_access() and (select auth.uid()) = addressee_id and status = 'accepted' and responded_at is not null);
alter policy "Users can send their own friend requests" on public.friendships
  with check (private.has_site_access() and (select auth.uid()) = requester_id and requester_id <> addressee_id and status = 'pending' and responded_at is null);

drop policy if exists "approved members use follows" on public.profile_follows;
alter policy "Follow participants can view follows" on public.profile_follows
  using (private.has_site_access() and ((select auth.uid()) = follower_id or (select auth.uid()) = followed_id));
alter policy "Users can follow from their own account" on public.profile_follows
  with check (private.has_site_access() and (select auth.uid()) = follower_id and follower_id <> followed_id);
alter policy "Users can unfollow from their own account" on public.profile_follows
  using (private.has_site_access() and (select auth.uid()) = follower_id);

drop policy if exists "approved members use posts" on public.posts;
alter policy "authenticated users create posts" on public.posts
  with check (
    private.has_site_access()
    and (select auth.uid()) = author_id
    and (
      not is_admin_post
      or exists (
        select 1 from public.site_admins admin
        where admin.user_id = (select auth.uid()) and admin.enabled = true
      )
    )
  );
alter policy "authors delete own posts" on public.posts
  using (private.has_site_access() and (select auth.uid()) = author_id);
alter policy "authors update own posts" on public.posts
  using (private.has_site_access() and (select auth.uid()) = author_id)
  with check (
    private.has_site_access()
    and (select auth.uid()) = author_id
    and (
      not is_admin_post
      or exists (
        select 1 from public.site_admins admin
        where admin.user_id = (select auth.uid()) and admin.enabled = true
      )
    )
  );

drop policy if exists "approved members use advertising" on public.advertising_campaigns;
alter policy "advertisers submit campaigns" on public.advertising_campaigns
  with check (
    private.has_site_access()
    and (select auth.uid()) = user_id
    and status = 'pending'
    and billing_status = 'unpaid'
    and stripe_customer_id is null
    and stripe_subscription_id is null
    and starts_at is null
    and ends_at is null
  );
alter policy "advertising campaigns visible to authenticated" on public.advertising_campaigns
  using (
    private.has_site_access()
    and (
      (select auth.uid()) = user_id
      or exists (
        select 1 from public.site_admins
        where site_admins.user_id = (select auth.uid()) and site_admins.enabled
      )
      or (
        status = 'active' and billing_status = 'paid'
        and (starts_at is null or starts_at <= now())
        and (ends_at is null or ends_at > now())
      )
    )
  );
alter policy "admins manage advertising campaigns" on public.advertising_campaigns
  using (
    private.has_site_access()
    and exists (
      select 1 from public.site_admins
      where site_admins.user_id = (select auth.uid()) and site_admins.enabled
    )
  )
  with check (
    private.has_site_access()
    and exists (
      select 1 from public.site_admins
      where site_admins.user_id = (select auth.uid()) and site_admins.enabled
    )
  );

drop policy if exists "approved members use reviews" on public.neighbor_reviews;
alter policy "neighbor_reviews_select" on public.neighbor_reviews
  using (private.has_site_access());
alter policy "neighbor_reviews_insert" on public.neighbor_reviews
  with check (private.has_site_access() and reviewer_id = (select auth.uid()) and reviewer_id <> reviewee_id);
alter policy "neighbor_reviews_delete" on public.neighbor_reviews
  using (private.has_site_access() and reviewer_id = (select auth.uid()));
alter policy "neighbor_reviews_update" on public.neighbor_reviews
  using (private.has_site_access() and reviewer_id = (select auth.uid()))
  with check (private.has_site_access() and reviewer_id = (select auth.uid()) and reviewer_id <> reviewee_id);

drop policy if exists "approved members use profile photos" on public.profile_photos;
alter policy "users add own profile photos" on public.profile_photos
  with check (private.has_site_access() and (select auth.uid()) = user_id);
alter policy "users delete own profile photos" on public.profile_photos
  using (private.has_site_access() and (select auth.uid()) = user_id);

drop policy if exists "approved members use feedback" on public.site_feedback;
alter policy "signed in users submit feedback" on public.site_feedback
  with check (
    private.has_site_access()
    and user_id = (select auth.uid())
    and status = 'unread'
    and admin_response is null
    and responded_by is null
    and responded_at is null
  );
alter policy "feedback visible to sender or admin" on public.site_feedback
  using (
    private.has_site_access()
    and (
      user_id = (select auth.uid())
      or exists (
        select 1 from public.site_admins
        where site_admins.user_id = (select auth.uid()) and site_admins.enabled
      )
    )
  );
alter policy "admins respond to feedback" on public.site_feedback
  using (
    private.has_site_access()
    and exists (
      select 1 from public.site_admins
      where site_admins.user_id = (select auth.uid()) and site_admins.enabled
    )
  )
  with check (
    private.has_site_access()
    and exists (
      select 1 from public.site_admins
      where site_admins.user_id = (select auth.uid()) and site_admins.enabled
    )
  );
