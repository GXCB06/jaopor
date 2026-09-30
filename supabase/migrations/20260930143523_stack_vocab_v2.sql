-- Tech stack vocabulary v2 (user: "JavaScript is missing"): new groups language, services and
-- nocode, plus more frameworks, databases, hosts, AI and Thai payment options. Generated from
-- src/lib/config/stack.ts; config.test.ts checks this latest definition matches the config.
-- Only the allowed lists change; custom entries stay in the `other` group.
create or replace function private.startups_validate_vocab()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  allowed jsonb := jsonb_build_object(
    'language', '["javascript","typescript","java","php","ruby","csharp","dart","rust","c","cpp","elixir","scala","html-css"]'::jsonb,
    'frontend', '["next-js","react","react-native","vue","nuxt","svelte","flutter","swift","swiftui","kotlin","tailwind-css","expo","angular","astro","remix","sveltekit","solid","vite","gatsby","electron","tauri","ionic","capacitor","jquery","bootstrap","shadcn-ui","mui","sass","three-js","redux","android","unity","godot"]'::jsonb,
    'backend', '["node-js","python","go","laravel","django","fastapi","supabase","firebase","rails","express","nestjs","hono","flask","spring","dotnet","deno","bun","graphql","trpc","prisma","drizzle","appwrite","pocketbase","convex","n8n"]'::jsonb,
    'database', '["postgresql","mysql","mongodb","redis","sqlite","mariadb","neon","planetscale","turso","upstash","dynamodb","elasticsearch","pinecone","qdrant"]'::jsonb,
    'hosting', '["vercel","cloudflare","aws","google-cloud","railway","render","netlify","fly-io","digitalocean","heroku","hetzner","github-pages","docker","kubernetes"]'::jsonb,
    'ai', '["claude","openai","gemini","llama","mistral","deepseek","typhoon","hugging-face","langchain","ollama","openrouter","elevenlabs","vercel-ai-sdk"]'::jsonb,
    'payments', '["stripe","revenuecat","omise","2c2p","promptpay","lemon-squeezy","paddle","paypal","xendit","line-pay","truemoney","gb-prime-pay","polar","alipay"]'::jsonb,
    'services', '["line-messaging-api","clerk","auth0","resend","sendgrid","twilio","sentry","posthog","google-analytics","mixpanel","algolia","meilisearch","zapier","make","notion","airtable"]'::jsonb,
    'nocode', '["wordpress","webflow","framer","bubble","wix","shopify","woocommerce"]'::jsonb
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
       or jsonb_array_length(val) > 20
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
