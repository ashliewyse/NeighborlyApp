-- Local PostgreSQL fixture only. Run in a transaction and ALWAYS ROLLBACK.
create temporary table group_test_context as
select (select id from public.profiles order by created_at,id limit 1) as owner_id,
       (select id from public.profiles order by created_at,id offset 1 limit 1) as other_id,
       gen_random_uuid() as group_id, gen_random_uuid() as post_id, gen_random_uuid() as invite_id;
grant select on group_test_context to authenticated;
create function pg_temp.check_true(ok boolean, message text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'TEST FAILED: %',message; end if; end $$;
select pg_temp.check_true(owner_id is not null and other_id is not null,'two existing members required') from group_test_context;
select pg_temp.check_true(to_regclass('public.community_group_posts') is not null,'group discussions are installed');
insert into public.community_groups(id,name,description,city,created_by)
select group_id,'Transactional permissions check','Rolled back, never published.','Michigan City',owner_id from group_test_context;
insert into public.community_group_members(group_id,user_id) select group_id,owner_id from group_test_context;

set local role authenticated;
select set_config('request.jwt.claim.sub',owner_id::text,true) from group_test_context;
insert into public.community_group_posts(id,group_id,author_id,content) select post_id,group_id,owner_id,'A real permission check.' from group_test_context;
do $$ begin
  begin
    insert into public.community_group_posts(group_id,author_id,content) select group_id,other_id,'Forged author' from group_test_context;
    raise exception 'TEST FAILED: author spoof accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.community_group_posts(group_id,author_id,content) select group_id,owner_id,'   ' from group_test_context;
    raise exception 'TEST FAILED: blank content accepted';
  exception when check_violation then null; end;
end $$;

select set_config('request.jwt.claim.sub',other_id::text,true) from group_test_context;
select pg_temp.check_true((select count(*) from public.community_group_posts where group_id=t.group_id)=0,'outsider cannot read group') from group_test_context t;
do $$ begin
  begin
    insert into public.community_group_posts(group_id,author_id,content) select group_id,other_id,'Outsider post' from group_test_context;
    raise exception 'TEST FAILED: outsider posted';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub',owner_id::text,true) from group_test_context;
insert into public.community_group_invites(id,group_id,inviter_id,invitee_id) select invite_id,group_id,owner_id,other_id from group_test_context;
do $$ begin
  begin
    insert into public.community_group_invites(group_id,inviter_id,invitee_id) select group_id,owner_id,other_id from group_test_context;
    raise exception 'TEST FAILED: duplicate invitation accepted';
  exception when unique_violation then null; end;
  begin
    perform public.respond_to_group_invite(invite_id,true) from group_test_context;
    raise exception 'TEST FAILED: sender accepted for recipient';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.check_true((select count(*) from public.community_group_members m where m.group_id=t.group_id)=1,'invitation does not autojoin') from group_test_context t;

select set_config('request.jwt.claim.sub',other_id::text,true) from group_test_context;
select public.respond_to_group_invite(invite_id,true) from group_test_context;
select pg_temp.check_true((select count(*) from public.community_group_members m where m.group_id=t.group_id and m.user_id=t.other_id)=1,'accept adds membership') from group_test_context t;
select pg_temp.check_true((select count(*) from public.community_group_posts p where p.group_id=t.group_id)=1,'member can read discussion') from group_test_context t;
insert into public.community_group_replies(post_id,author_id,content) select post_id,other_id,'Reply persists.' from group_test_context;
select pg_temp.check_true((select count(*) from public.community_group_replies r where r.post_id=t.post_id)=1,'reply persisted') from group_test_context t;
with deleted as (delete from public.community_group_posts where id in (select post_id from group_test_context) returning id)
select pg_temp.check_true((select count(*) from deleted)=0,'member cannot delete another author');
do $$ begin
  begin
    update public.community_group_invites set inviter_id=(select other_id from group_test_context) where id=(select invite_id from group_test_context);
    raise exception 'TEST FAILED: invitation identity changed';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
insert into public.user_blocks(blocker_id,blocked_id) select owner_id,other_id from group_test_context on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub',other_id::text,true) from group_test_context;
select pg_temp.check_true((select count(*) from public.community_group_posts p where p.group_id=t.group_id)=0,'blocked author is hidden') from group_test_context t;
select pg_temp.check_true((select count(*) from public.community_group_replies r where r.post_id=t.post_id)=0,'replies to blocked thread are hidden') from group_test_context t;
delete from public.community_group_members where group_id=(select group_id from group_test_context) and user_id=(select other_id from group_test_context);
select pg_temp.check_true((select count(*) from public.community_group_posts p where p.group_id=t.group_id)=0,'leaving revokes discussion access') from group_test_context t;
reset role;
select 'PASS: group membership, discussions, replies, invitations, blocks and forgery checks' as result;
