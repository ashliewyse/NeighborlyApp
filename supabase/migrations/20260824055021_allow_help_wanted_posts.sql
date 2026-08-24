alter table public.posts
  drop constraint if exists posts_category_check,
  drop constraint if exists posts_post_type_check;

update public.posts
set category = 'helpwanted'
where category = 'help';

update public.posts
set post_type = 'help_wanted'
where post_type = 'help';

alter table public.posts
  add constraint posts_category_check
    check (category = any (array[
      'news',
      'safety',
      'event',
      'forsale',
      'recommendation',
      'general',
      'helpwanted'
    ])),
  add constraint posts_post_type_check
    check (post_type = any (array[
      'discussion',
      'alert',
      'recommendation',
      'help_wanted'
    ]));
