-- Spec 6.9: "Custom entries are allowed" for the tech stack too. Custom tools go into a 7th jsonb
-- group `other` as `custom:<1-30 chars>`; the six known groups still accept only config slugs.
-- Same trigger, same private schema; only the tech_stack check changes.
create or replace function private.startups_validate_vocab()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  allowed jsonb := jsonb_build_object(
    'frontend', '["next-js","react","react-native","vue","nuxt","svelte","flutter","swift","swiftui","kotlin","tailwind-css","expo"]'::jsonb,
    'backend', '["node-js","python","go","laravel","django","fastapi","supabase","firebase","rails"]'::jsonb,
    'database', '["postgresql","mysql","mongodb","redis","sqlite"]'::jsonb,
    'hosting', '["vercel","cloudflare","aws","google-cloud","railway","render","netlify"]'::jsonb,
    'ai', '["claude","openai","gemini","llama","mistral"]'::jsonb,
    'payments', '["stripe","revenuecat","omise","2c2p","promptpay","lemon-squeezy","paddle"]'::jsonb
  );
  grp text;
  val jsonb;
begin
  if jsonb_typeof(new.tech_stack) <> 'object' then
    raise exception 'tech_stack must be an object' using errcode = '23514';
  end if;
  for grp, val in select key, value from jsonb_each(new.tech_stack) loop
    if not (allowed ? grp or grp = 'other')
       or jsonb_typeof(val) <> 'array'
       or jsonb_array_length(val) > 12
       or exists (
         select 1 from jsonb_array_elements(val) e
         where jsonb_typeof(e) <> 'string'
            or case
                 when grp = 'other' then (e #>> '{}') !~ '^custom:.{1,30}$'
                 else not (allowed -> grp) ? (e #>> '{}')
               end
       )
    then
      raise exception 'invalid tech_stack group %', grp using errcode = '23514';
    end if;
  end loop;

  if exists (
    select 1 from unnest(new.marketing_channels) c
    where not (
      c = any (array['line-oa', 'line-ads', 'facebook', 'facebook-groups', 'facebook-ads', 'instagram', 'tiktok', 'tiktok-ads', 'youtube', 'youtube-ads', 'x', 'x-ads', 'linkedin', 'linkedin-ads', 'google-ads', 'meta-ads', 'pantip', 'blockdit', 'shopee-lazada-affiliate', 'seo', 'blog', 'content-marketing', 'email-marketing', 'influencer-kol', 'word-of-mouth', 'events-meetups'])
      or c ~ '^custom:.{1,40}$'
    )
  ) then
    raise exception 'invalid marketing channel' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function private.startups_validate_vocab() from public, anon, authenticated;
