create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint direct_messages_no_self check (sender_id <> recipient_id),
  constraint direct_messages_body_length check (
    char_length(btrim(body)) between 1 and 2000
  )
);

comment on table public.direct_messages is
  'Private one-to-one messages between Neighborly accounts.';

create index direct_messages_sender_recipient_created_idx
  on public.direct_messages (sender_id, recipient_id, created_at desc);

create index direct_messages_recipient_sender_created_idx
  on public.direct_messages (recipient_id, sender_id, created_at desc);

create index direct_messages_unread_idx
  on public.direct_messages (recipient_id, created_at desc)
  where read_at is null;

alter table public.direct_messages enable row level security;

revoke all on table public.direct_messages from anon;
grant select, insert on table public.direct_messages to authenticated;
grant update (read_at) on table public.direct_messages to authenticated;

create policy "Participants can view their messages"
  on public.direct_messages
  for select
  to authenticated
  using (
    (select auth.uid()) = sender_id
    or (select auth.uid()) = recipient_id
  );

create policy "Users can send messages from their own account"
  on public.direct_messages
  for insert
  to authenticated
  with check (
    (select auth.uid()) = sender_id
    and sender_id <> recipient_id
  );

create policy "Recipients can mark messages as read"
  on public.direct_messages
  for update
  to authenticated
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);
