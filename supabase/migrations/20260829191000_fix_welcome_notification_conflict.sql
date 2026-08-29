do $$
declare
  v_sql text;
  v_old text := 'on conflict (user_id, type, subject_user_id) do nothing;';
  v_new text := 'on conflict (user_id, type, subject_user_id) where type = ''new_neighbor'' and subject_user_id is not null do nothing;';
begin
  select pg_get_functiondef('private.create_welcome_announcement(uuid)'::regprocedure)
    into v_sql;

  if position(v_old in lower(v_sql)) = 0 then
    raise exception 'Expected ON CONFLICT clause was not found in private.create_welcome_announcement(uuid)';
  end if;

  v_sql := replace(v_sql, v_old, v_new);
  execute v_sql;
end $$;
