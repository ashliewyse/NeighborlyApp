alter table public.user_blocks
  add column blocker_name text not null default 'Member',
  add column blocked_name text not null default 'Member',
  add constraint user_blocks_blocker_name_length check (char_length(btrim(blocker_name)) between 1 and 120),
  add constraint user_blocks_blocked_name_length check (char_length(btrim(blocked_name)) between 1 and 120);

create or replace function private.prepare_user_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.blocker_name := left(coalesce(private.member_display_name(new.blocker_id), 'Member'), 120);
  new.blocked_name := left(coalesce(private.member_display_name(new.blocked_id), 'Member'), 120);
  return new;
end;
$$;
revoke all on function private.prepare_user_block() from public, anon, authenticated;

create trigger user_blocks_prepare_names
  before insert on public.user_blocks
  for each row execute function private.prepare_user_block();
