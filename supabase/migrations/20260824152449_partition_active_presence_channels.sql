-- Keep online presence private while allowing each selected area to use its
-- own channel. Partitioning avoids sending every user's presence state to
-- every connected client as Neighborly grows.

drop policy if exists "approved members receive neighborly realtime" on realtime.messages;
create policy "approved members receive neighborly realtime"
on realtime.messages
for select
to authenticated
using (
  private.has_site_access()
  and (
    realtime.topic() like 'neighborly:active:%'
    or realtime.topic() = 'user:' || (select auth.uid())::text || ':inbox'
  )
);

drop policy if exists "approved members send neighborly realtime" on realtime.messages;
create policy "approved members send neighborly realtime"
on realtime.messages
for insert
to authenticated
with check (
  private.has_site_access()
  and (
    realtime.topic() like 'neighborly:active:%'
    or realtime.topic() = 'user:' || (select auth.uid())::text || ':inbox'
  )
);
