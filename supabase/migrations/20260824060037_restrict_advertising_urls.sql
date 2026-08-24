alter table public.advertising_campaigns
  drop constraint if exists advertising_campaigns_image_url_length,
  add constraint advertising_campaigns_image_url_check
    check (
      char_length(btrim(image_url)) between 1 and 2000
      and image_url ~* '^https://'
    ),
  drop constraint if exists advertising_campaigns_destination_url_length,
  add constraint advertising_campaigns_destination_url_check
    check (
      destination_url is null
      or (
        char_length(btrim(destination_url)) between 8 and 2000
        and destination_url ~* '^https?://'
      )
    );
