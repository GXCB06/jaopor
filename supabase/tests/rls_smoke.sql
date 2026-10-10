-- RLS smoke test — run after every migration (Supabase MCP `execute_sql` on project mrrmafia).
-- Everything runs in one DO block that ends with RAISE EXCEPTION, so ALL changes roll back and the
-- results come back as the error message. Expect every line to read "(good)" / match "expect".
-- Founding numbers are max+1 (no sequence since migration founding_number_no_gaps), so the
-- rollback leaves nothing to reset.
do $$
declare
  a uuid := '00000000-0000-4000-8000-00000000000a';
  b uuid := '00000000-0000-4000-8000-00000000000b';
  sid bigint;
  sid2 bigint;
  n int;
  j jsonb;
  c uuid;
  cs uuid[];
  fnum int;
  pid bigint;
  cid bigint;
  cid2 bigint;
  cid3 bigint;
  k int;
  conv bigint;
  msg bigint;
  c1 uuid := '00000000-0000-4000-8000-0000000000c1';
  c2 uuid := '00000000-0000-4000-8000-0000000000c2';
  ov uuid := '00000000-0000-4000-8000-0000000000d1';
  base text := 'https://letfxefyqxxrfujpwtri.supabase.co/storage/v1/object/public/avatars/';
  out text := '';
  old_slug text;
begin
  insert into auth.users (id, email, raw_user_meta_data, aud, role)
  values (a, 'rls-a@test.local', '{"full_name":"Tester A"}', 'authenticated', 'authenticated'),
         (b, 'rls-b@test.local', '{"full_name":"Tester B"}', 'authenticated', 'authenticated');
  select count(*) into n from public.profiles where id in (a, b);
  out := out || format('T1 profiles auto-created: %s (expect 2) | ', n);

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.startups (owner_id, slug, name, website_url, ai_tools)
  values (a, 'rls-test-a', 'Test A', 'https://a.test', array['claude-code'])
  returning id, founding_number into sid, fnum;
  out := out || format('T2 A inserts own startup: ok, founding_number=%s | ', fnum);

  -- T11: a FAILED insert (duplicate slug) must not burn a founding number.
  begin
    insert into public.startups (owner_id, slug, name, website_url) values (a, 'rls-test-a', 'Dup', 'https://d.test');
  exception when unique_violation then null;
  end;
  insert into public.startups (owner_id, slug, name, website_url) values (a, 'rls-test-a2', 'Test A2', 'https://a2.test')
  returning id, founding_number into sid2, n;
  out := out || format('T11 number after failed insert: %s (expect %s) | ', n, fnum + 1);

  begin
    update public.startups set mrr_cents = 999999 where id = sid;
    out := out || 'T3 A writes mrr_cents: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T3 A writes mrr_cents: denied (good) | ';
  end;

  begin
    insert into public.startups (owner_id, slug, name, website_url) values (b, 'rls-spoof', 'Spoof', 'https://x.test');
    out := out || 'T4 A inserts as B: ALLOWED (BAD) | ';
  exception when others then out := out || format('T4 A inserts as B: denied (%s) | ', sqlstate);
  end;

  begin
    perform 1 from public.provider_connections;
    out := out || 'T5 authenticated reads provider_connections: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T5 authenticated reads provider_connections: denied (good) | ';
  end;

  update public.startups set tagline = 'edited' where id = sid;
  get diagnostics n = row_count;
  out := out || format('T6 A edits own tagline: %s row (expect 1) | ', n);

  -- v2 (projects_links_traction): LINE-only project, asks, and server-only traction columns.
  update public.startups
  set website_url = null, line_url = 'https://lin.ee/abc123', looking_for = array['users', 'feedback']
  where id = sid;
  get diagnostics n = row_count;
  out := out || format('T12 A switches to LINE-only + looking_for: %s row (expect 1) | ', n);

  begin
    update public.startups set line_url = null where id = sid;
    out := out || 'T13 project with no link: ALLOWED (BAD) | ';
  exception when check_violation then out := out || 'T13 project with no link: denied (good) | ';
  end;

  begin
    update public.startups set visitors_30d = 999999 where id = sid;
    out := out || 'T14 A writes visitors_30d: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T14 A writes visitors_30d: denied (good) | ';
  end;

  begin
    insert into public.traffic_snapshots (startup_id, day, visitors) values (sid, current_date, 5);
    out := out || 'T15 A inserts traffic snapshot: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T15 A inserts traffic snapshot: denied (good) | ';
  end;

  begin
    update public.startups set is_demo = true where id = sid;
    out := out || 'T16 A marks own project as demo: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T16 A marks own project as demo: denied (good) | ';
  end;

  begin
    insert into public.pixel_visitors (startup_id, day, visitor_hash, net_hash)
    values (sid, current_date, '\x01', '\x02');
    out := out || 'T17 A writes pixel_visitors: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T17 A writes pixel_visitors: denied (good) | ';
  end;

  begin
    update public.startups set build_stack = array['Faked'] where id = sid;
    out := out || 'T18 A writes build_stack: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T18 A writes build_stack: denied (good) | ';
  end;

  -- spec_phase1_vocab: structured fields, vocab trigger, province FK, screenshots, lookup tables.
  update public.startups
  set tech_stack = '{"frontend": ["next-js"], "payments": ["promptpay"]}', province = 'mukdahan',
      marketing_channels = array['seo', 'custom:Pantip ads'],
      pricing_amount = 990, pricing_currency = 'THB', pricing_period = 'month', founder_role = 'Founder'
  where id = sid;
  get diagnostics n = row_count;
  out := out || format('T19 A saves stack/province/channels/pricing: %s row (expect 1) | ', n);

  begin
    update public.startups set tech_stack = '{"frontend": ["stripe"]}' where id = sid;
    out := out || 'T20 unknown stack slug: ALLOWED (BAD) | ';
  exception when check_violation then out := out || 'T20 unknown stack slug: denied (good) | ';
  end;

  begin
    update public.startups set marketing_channels = array['myspace'] where id = sid;
    out := out || 'T21 unknown channel: ALLOWED (BAD) | ';
  exception when check_violation then out := out || 'T21 unknown channel: denied (good) | ';
  end;

  begin
    update public.startups set province = 'atlantis' where id = sid;
    out := out || 'T22 unknown province: ALLOWED (BAD) | ';
  exception when foreign_key_violation then out := out || 'T22 unknown province: denied (good) | ';
  end;

  insert into public.startup_screenshots (startup_id, path, kind, width, height, position)
  select sid, sid || '/' || gen_random_uuid() || '.webp', 'desktop', 1600, 1000, g - 1
  from generate_series(1, 8) g;
  get diagnostics n = row_count;
  out := out || format('T23 A adds 8 screenshots: %s (expect 8) | ', n);

  begin
    insert into public.startup_screenshots (startup_id, path, kind, width, height)
    values (sid, sid || '/' || gen_random_uuid() || '.webp', 'mobile', 390, 844);
    out := out || 'T24 9th screenshot: ALLOWED (BAD) | ';
  exception when check_violation then out := out || 'T24 9th screenshot: denied (good) | ';
  end;

  begin
    insert into public.startup_screenshots (startup_id, path, kind, width, height)
    values (sid, '1/' || gen_random_uuid() || '.webp', 'desktop', 10, 10);
    out := out || 'T25 screenshot path in another folder: ALLOWED (BAD) | ';
  exception when check_violation then out := out || 'T25 screenshot path in another folder: denied (good) | ';
  end;

  begin
    insert into public.fx_rates (day, usd_thb) values (current_date + 1, 1);
    out := out || 'T26 A writes fx_rates: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T26 A writes fx_rates: denied (good) | ';
  end;

  -- stack_custom_entries: custom tools only in the `other` group.
  update public.startups set tech_stack = '{"other": ["custom:Prisma"], "frontend": ["react"]}' where id = sid;
  get diagnostics n = row_count;
  out := out || format('T32 custom stack entry in other: %s row (expect 1) | ', n);
  begin
    update public.startups set tech_stack = '{"frontend": ["custom:Prisma"]}' where id = sid;
    out := out || 'T33 custom entry in a known group: ALLOWED (BAD) | ';
  exception when check_violation then out := out || 'T33 custom entry in a known group: denied (good) | ';
  end;
  -- stack_vocab_v2: the new groups (language / services / nocode) save for the owner.
  update public.startups
  set tech_stack = '{"language": ["javascript"], "services": ["line-messaging-api"], "nocode": ["wordpress"]}'
  where id = sid;
  get diagnostics n = row_count;
  out := out || format('T36 new stack groups: %s row (expect 1) | ', n);

  -- fix_screenshot_storage_policies: owners write only in their own startup's folder.
  insert into storage.objects (bucket_id, name, owner_id) values ('screenshots', sid || '/' || gen_random_uuid() || '.webp', a::text);
  get diagnostics n = row_count;
  out := out || format('T34 A uploads into own startup folder: %s (expect 1) | ', n);
  begin
    insert into storage.objects (bucket_id, name, owner_id) values ('screenshots', '1/' || gen_random_uuid() || '.webp', a::text);
    out := out || 'T35 A uploads into another startup folder: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T35 A uploads into another startup folder: denied (good) | ';
  end;

  -- upload_images_jpeg: Safari uploads JPEG, so .jpg paths are valid too; nothing else is.
  insert into public.startup_screenshots (startup_id, path, kind, width, height)
  values (sid2, sid2 || '/' || gen_random_uuid() || '.jpg', 'desktop', 10, 10);
  get diagnostics n = row_count;
  out := out || format('T115 A adds a .jpg screenshot: %s (expect 1) | ', n);
  begin
    insert into public.startup_screenshots (startup_id, path, kind, width, height)
    values (sid2, sid2 || '/' || gen_random_uuid() || '.png', 'desktop', 10, 10);
    out := out || 'T116 .png screenshot path: ALLOWED (BAD) | ';
  exception when check_violation then out := out || 'T116 .png screenshot path: denied (good) | ';
  end;

  begin
    update public.provinces set region = 'south' where slug = 'bangkok';
    out := out || 'T27 A edits provinces: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T27 A edits provinces: denied (good) | ';
  end;

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.startups set name = 'hacked' where id = sid;
  get diagnostics n = row_count;
  out := out || format('T7 B edits A startup: %s rows (expect 0) | ', n);
  delete from public.startups where id = sid;
  get diagnostics n = row_count;
  out := out || format('T8 B deletes A startup: %s rows (expect 0) | ', n);
  begin
    -- A's second project (no screenshots yet), so only RLS can stop it (not the 8-image limit).
    insert into public.startup_screenshots (startup_id, path, kind, width, height)
    values (sid2, sid2 || '/' || gen_random_uuid() || '.webp', 'desktop', 10, 10);
    out := out || 'T28 B adds screenshot to A startup: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T28 B adds screenshot to A startup: denied (good) | ';
  end;
  update public.startup_screenshots set caption = 'hacked' where startup_id = sid;
  get diagnostics n = row_count;
  out := out || format('T29 B edits A screenshots: %s rows (expect 0) | ', n);

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  select count(*) into n from public.startups where id = sid;
  out := out || format('T9 anon sees published startup: %s (expect 1) | ', n);
  select count(*) into n from public.startup_screenshots where startup_id = sid;
  out := out || format('T30 anon sees screenshots of published startup: %s (expect 8) | ', n);
  select count(*) into n from public.provinces;
  out := out || format('T31 anon reads provinces: %s (expect 77) | ', n);
  select count(*) into n from public.category_counts() where startups > 0;
  out := out || format('T37 anon calls category_counts: ok (%s categories) | ', n);
  select count(*) into n from public.province_leaderboard('commits');
  out := out || format('T38 anon calls province_leaderboard: ok (%s provinces) | ', n);
  begin
    insert into public.startups (owner_id, slug, name, website_url) values (a, 'rls-anon', 'Anon', 'https://x.test');
    out := out || 'T10 anon inserts: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T10 anon inserts: denied (good) | ';
  end;

  -- builder_profiles (Phase 9a) ---------------------------------------------------------
  execute 'reset role';
  update public.profiles set handle = 'rls_tester_a' where id = a;
  update public.profiles set handle = 'rls_tester_b' where id = b;
  select count(*) into n from public.startup_members
  where startup_id = sid and user_id = a and role = 'founder' and status = 'confirmed';
  out := out || format('T39 owner auto-added as confirmed founder: %s (expect 1) | ', n);

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.profiles
  set headline = 'Builder A', bio = 'secret bio', status = 'looking_cofounder',
      field_visibility = '{"bio": "hidden", "skills": "members"}'
  where id = a;
  insert into public.private_contacts (user_id, line_id, email) values (a, 'tester_a', 'a@test.local');
  insert into public.profile_skills (user_id, skill_slug, is_superpower) values
    (a, 'frontend', true), (a, 'backend', true), (a, 'seo', true);
  begin
    insert into public.profile_skills (user_id, skill_slug, is_superpower) values (a, 'ai-agents', true);
    out := out || 'T40 4th superpower: ALLOWED (BAD) | ';
  exception when check_violation then out := out || 'T40 4th superpower: denied (good) | ';
  end;
  begin
    update public.profiles set social_links = '{"website": "javascript:alert(1)"}' where id = a;
    out := out || 'T41 bad social link: ALLOWED (BAD) | ';
  exception when check_violation then out := out || 'T41 bad social link: denied (good) | ';
  end;

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform p.bio from public.profiles p where p.id = a;
    out := out || 'T42 B selects A bio column: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T42 B selects A bio column: denied (good) | ';
  end;
  update public.profiles set headline = 'hacked' where id = a;
  get diagnostics n = row_count;
  out := out || format('T43 B edits A profile: %s rows (expect 0) | ', n);
  select count(*) into n from public.private_contacts where user_id = a;
  out := out || format('T44 B reads A contacts before accept: %s (expect 0) | ', n);
  select count(*) into n from public.profile_skills where user_id = a;
  out := out || format('T45 signed-in B sees A members-only skills: %s (expect 3) | ', n);

  insert into public.contact_requests (from_id, to_id, topic, message) values (b, a, 'cofounder', 'hi');
  begin
    insert into public.contact_requests (from_id, to_id, topic, message) values (b, a, 'job', 'again');
    out := out || 'T46 2nd pending request same pair: ALLOWED (BAD) | ';
  exception when unique_violation then out := out || 'T46 2nd pending request same pair: denied (good) | ';
  end;
  update public.contact_requests set status = 'accepted' where from_id = b and to_id = a;
  get diagnostics n = row_count;
  out := out || format('T47 sender accepts own request: %s rows (expect 0) | ', n);

  -- B asks to join A's startup; B can't confirm it, A can.
  insert into public.startup_members (startup_id, user_id, role, invited_by) values (sid, b, 'maker', b);
  begin
    update public.startup_members set status = 'confirmed' where startup_id = sid and user_id = b;
    out := out || 'T48 member confirms own request: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T48 member confirms own request: denied (good) | ';
  end;

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.contact_requests set status = 'accepted' where from_id = b and to_id = a;
  get diagnostics n = row_count;
  out := out || format('T49 recipient accepts: %s row (expect 1) | ', n);
  update public.startup_members set status = 'confirmed' where startup_id = sid and user_id = b;
  get diagnostics n = row_count;
  out := out || format('T50 owner approves member: %s row (expect 1) | ', n);
  begin
    delete from public.startup_members where startup_id = sid and user_id = a;
    out := out || 'T51 owner removes own founder row: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T51 owner removes own founder row: denied (good) | ';
  end;

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.private_contacts where user_id = a;
  out := out || format('T52 B reads A contacts after accept: %s (expect 1) | ', n);

  -- Rate limit: B already sent 1 today; 4 more to new users are fine, the 6th is refused.
  execute 'reset role';
  for i in 1..5 loop
    insert into auth.users (id, email, aud, role)
    values (gen_random_uuid(), format('rls-c%s@test.local', i), 'authenticated', 'authenticated');
  end loop;
  select array_agg(u.id order by u.email) into cs from auth.users u where u.email like 'rls-c%@test.local';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := 0;
  begin
    foreach c in array cs loop
      insert into public.contact_requests (from_id, to_id, topic, message) values (b, c, 'collab', 'hey');
      n := n + 1;
    end loop;
    out := out || 'T53 6th request in a day: ALLOWED (BAD) | ';
  exception when program_limit_exceeded then
    out := out || format('T53 6th request in a day: denied after %s (expect 4) | ', n);
  end;

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  select count(*) into n from public.profile_skills where user_id = a;
  out := out || format('T54 anon sees A members-only skills: %s (expect 0) | ', n);
  begin
    perform public.get_profile('rls_tester_a', null);
    out := out || 'T55 anon calls get_profile: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T55 anon calls get_profile: denied (good) | ';
  end;

  execute 'reset role';
  j := public.get_profile('rls_tester_a', null);
  out := out || format('T56 server get_profile, signed out: bio=%s headline=%s (expect null, Builder A) | ',
    coalesce(j ->> 'bio', 'null'), j ->> 'headline');
  j := public.get_profile('rls_tester_a', a);
  out := out || format('T57 server get_profile as owner: bio=%s (expect secret bio) | ', j ->> 'bio');

  -- notifications_live_pings ------------------------------------------------------------
  execute 'reset role';
  select count(*) into n from public.notifications where user_id = a and kind = 'request_received';
  out := out || format('T58 recipient notified of the request: %s (expect 1) | ', n);
  select count(*) into n from public.notifications where kind = 'request_accepted' and user_id in (a, b);
  out := out || format('T59 both sides notified on accept: %s (expect 2) | ', n);

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.notifications where user_id = a;
  out := out || format('T60 B reads A notifications: %s (expect 0) | ', n);
  update public.notifications set read_at = now() where user_id = b;
  get diagnostics n = row_count;
  out := out || format('T61 B marks own notifications read: %s (expect >= 1) | ', n);
  begin
    update public.notifications set kind = 'request_received' where user_id = b;
    out := out || 'T62 B rewrites notification kind: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T62 B rewrites notification kind: denied (good) | ';
  end;
  begin
    perform 1 from public.live_pings;
    out := out || 'T63 authenticated reads live_pings: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T63 authenticated reads live_pings: denied (good) | ';
  end;

  -- feed_posts (Phase 10a) ---------------------------------------------------------------
  -- State: A owns sid (published) and sid2; B is a confirmed maker of sid; cs = 5 extra users.
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.posts (author_id, startup_id, type, body) values (b, sid, 'feature', 'first post')
  returning id into pid;
  out := out || format('T64 confirmed member posts: ok (province copied: %s) | ',
    coalesce((select province from public.posts where id = pid), 'null'));
  begin
    insert into public.posts (author_id, startup_id, type, body) values (b, sid2, 'feature', 'not mine');
    out := out || 'T65 non-member posts on A startup: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T65 non-member posts on A startup: denied (good) | ';
  end;
  begin
    insert into public.posts (author_id, startup_id, type, body) values (b, sid, 'milestone', 'fake ฿1M');
    out := out || 'T66 client posts a milestone: ALLOWED (BAD) | ';
  exception when insufficient_privilege or check_violation then
    out := out || 'T66 client posts a milestone: denied (good) | ';
  end;
  begin
    insert into public.posts (author_id, startup_id, type, body, link_preview)
    values (b, sid, 'feature', 'x', '{"title": "spoofed"}');
    out := out || 'T67 client writes link_preview: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T67 client writes link_preview: denied (good) | ';
  end;
  -- 5 posts a day: pid + 4 more succeed, the 6th is refused. (The 4 are inserted outside the
  -- exception block: a caught exception rolls back everything done inside its block.)
  for k in 1..4 loop
    insert into public.posts (author_id, startup_id, type, body) values (b, sid, 'lesson', 'post ' || k);
  end loop;
  begin
    insert into public.posts (author_id, startup_id, type, body) values (b, sid, 'lesson', 'sixth');
    out := out || 'T68 6th post in a day: ALLOWED (BAD) | ';
  exception when program_limit_exceeded then out := out || 'T68 6th post in a day: denied (good) | ';
  end;
  -- Deleting posts doesn't give the quota back.
  delete from public.posts where author_id = b and id <> pid;
  get diagnostics n = row_count;
  begin
    insert into public.posts (author_id, startup_id, type, body) values (b, sid, 'lesson', 'after delete');
    out := out || format('T69 post after deleting %s: ALLOWED (BAD) | ', n);
  exception when program_limit_exceeded then
    out := out || format('T69 post after deleting %s (expect 4): still denied (good) | ', n);
  end;
  update public.posts set body = 'first post (edited)' where id = pid;
  get diagnostics n = row_count;
  out := out || format('T70 author edits within 15 min: %s row, edited_at set: %s | ', n,
    (select edited_at is not null from public.posts where id = pid));
  insert into public.post_images (post_id, path, width, height, position)
  values (pid, pid || '/' || gen_random_uuid() || '.webp', 10, 10, 0);
  out := out || 'T71 author adds image while editable: ok | ';
  insert into public.post_images (post_id, path, width, height, position)
  values (pid, pid || '/' || gen_random_uuid() || '.jpg', 10, 10, 1);
  out := out || 'T117 author adds a .jpg image: ok | ';
  begin
    insert into public.post_images (post_id, path, width, height, position)
    values (pid, pid || '/' || gen_random_uuid() || '.png', 10, 10, 2);
    out := out || 'T118 .png post image path: ALLOWED (BAD) | ';
  exception when check_violation then out := out || 'T118 .png post image path: denied (good) | ';
  end;
  begin
    perform 1 from public.milestones;
    out := out || 'T72 client reads milestones: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T72 client reads milestones: denied (good) | ';
  end;
  begin
    perform 1 from public.storage_cleanup;
    out := out || 'T73 client reads storage_cleanup: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T73 client reads storage_cleanup: denied (good) | ';
  end;
  begin
    perform 1 from private.rate_events;
    out := out || 'T74 client reads rate_events: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T74 client reads rate_events: denied (good) | ';
  end;

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.posts set body = 'hacked' where id = pid;
  get diagnostics n = row_count;
  out := out || format('T75 A edits B post: %s rows (expect 0) | ', n);
  delete from public.posts where id = pid;
  get diagnostics n = row_count;
  out := out || format('T76 A deletes B post: %s rows (expect 0) | ', n);
  insert into public.post_likes (post_id, user_id) values (pid, a);
  delete from public.post_likes where post_id = pid and user_id = a;
  insert into public.post_likes (post_id, user_id) values (pid, a);
  insert into public.post_comments (post_id, author_id, body) values (pid, a, 'nice!') returning id into cid;
  execute 'reset role';
  select count(*) into n from public.notifications where user_id = b and kind = 'post_like' and post_id = pid;
  out := out || format('T77 like → unlike → like notifies once: %s (expect 1), likes_count=%s (expect 1) | ',
    n, (select likes_count from public.posts where id = pid));
  select count(*) into n from public.notifications where user_id = b and kind = 'post_comment' and comment_id = cid;
  out := out || format('T78 post author notified of comment: %s (expect 1) | ', n);

  -- A third user comments, B replies to it, then that user deletes their account.
  perform set_config('request.jwt.claims', json_build_object('sub', cs[1], 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.post_comments (post_id, author_id, body) values (pid, cs[1], 'from C1') returning id into cid2;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.post_comments (post_id, author_id, parent_id, body) values (pid, b, cid2, 'reply to C1')
  returning id into cid3;
  begin
    insert into public.post_comments (post_id, author_id, parent_id, body) values (pid, b, cid3, 'reply to reply');
    out := out || 'T79 reply to a reply: ALLOWED (BAD) | ';
  exception when check_violation then out := out || 'T79 reply to a reply: denied (good) | ';
  end;
  update public.post_comments set deleted_at = now() where id = cid;
  get diagnostics n = row_count;
  out := out || format('T80 B deletes A comment: %s rows (expect 0) | ', n);
  select count(*) into n from public.post_likes where user_id = a;
  out := out || format('T81 B sees who else liked: %s (expect 0) | ', n);
  begin
    insert into public.notifications (user_id, kind, actor_id, post_id) values (a, 'post_like', b, pid);
    out := out || 'T82 client forges a notification: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T82 client forges a notification: denied (good) | ';
  end;
  insert into public.reports (reporter_id, target_type, target_id, reason) values (b, 'comment', cid::text, 'spam');
  begin
    perform 1 from public.reports;
    out := out || 'T83 reporter reads reports: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T83 files a report, can''t read reports: good | ';
  end;

  execute 'reset role';
  n := (select comments_count from public.posts where id = pid);
  delete from auth.users where id = cs[1];
  out := out || format('T84 deleted account: comment tombstoned=%s, reply kept=%s, comments_count %s→%s (expect true, true, 3→2) | ',
    (select deleted_at is not null and body = '' and author_id is null from public.post_comments where id = cid2),
    (select count(*) = 1 from public.post_comments where id = cid3),
    n, (select comments_count from public.posts where id = pid));

  perform public.refresh_activity();
  select coalesce(sum(score), 0) into n from private.user_activity_days
  where user_id = b and day = (now() at time zone 'UTC')::date;
  out := out || format('T85 heatmap counts B posts today: %s (expect >= 1) | ', n);

  -- Moderation: hiding drops the images and queues their files.
  update public.posts set hidden_at = now() where id = pid;
  out := out || format('T86 hide: image rows=%s (expect 0), files queued=%s (expect 2: .webp + .jpg) | ',
    (select count(*) from public.post_images where post_id = pid),
    (select count(*) from public.storage_cleanup where path like pid || '/%'));

  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  select count(*) into n from public.posts where id = pid;
  out := out || format('T87 anon sees hidden post: %s (expect 0) | ', n);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    insert into public.post_comments (post_id, author_id, body) values (pid, a, 'on hidden');
    out := out || 'T88 comment on hidden post: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T88 comment on hidden post: denied (good) | ';
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    insert into public.post_likes (post_id, user_id) values (pid, b);
    out := out || 'T89 author likes own hidden post: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T89 author likes own hidden post: denied (good) | ';
  end;
  select count(*) into n from public.posts where id = pid;
  out := out || format('T90 author still sees own hidden post: %s (expect 1) | ', n);

  -- chat (Phase 11) -------------------------------------------------------------------------
  -- State: B's request to A was accepted (T49) → the trigger opened a conversation for them.
  execute 'reset role';
  select id into conv from public.conversations
  where user_a = least(a, b) and user_b = greatest(a, b);
  out := out || format('T91 accepted request opened a conversation: %s (expect true) | ', conv is not null);

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.chat_messages (conversation_id, sender_id, body) values (conv, b, 'hello A')
  returning id into msg;
  begin
    insert into public.chat_messages (conversation_id, sender_id, body) values (conv, a, 'as A');
    out := out || 'T92 B sends as A: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T92 B sends as A: denied (good) | ';
  end;
  begin
    insert into public.conversations (user_a, user_b) values (least(b, cs[2]), greatest(b, cs[2]));
    out := out || 'T93 client creates a conversation: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T93 client creates a conversation: denied (good) | ';
  end;
  begin
    update public.conversations set blocked_at = null where id = conv;
    out := out || 'T94 client edits a conversation: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T94 client edits a conversation: denied (good) | ';
  end;
  -- 200 messages a day: 199 more succeed, the 201st is refused (inserted outside the exception
  -- block, which would roll them back).
  for k in 1..199 loop
    insert into public.chat_messages (conversation_id, sender_id, body) values (conv, b, 'm' || k);
  end loop;
  begin
    insert into public.chat_messages (conversation_id, sender_id, body) values (conv, b, 'one too many');
    out := out || 'T95 201st message in a day: ALLOWED (BAD) | ';
  exception when program_limit_exceeded then out := out || 'T95 201st message in a day: denied (good) | ';
  end;

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.chat_messages where conversation_id = conv;
  out := out || format('T96 A reads the conversation: %s messages (expect 200) | ', n);
  insert into public.conversation_reads (conversation_id, user_id) values (conv, a);
  begin
    insert into public.conversation_reads (conversation_id, user_id) values (conv, b);
    out := out || 'T97 A marks B''s read state: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T97 A marks B''s read state: denied (good) | ';
  end;
  insert into public.reports (reporter_id, target_type, target_id, reason) values (a, 'message', msg::text, 'harassment');
  out := out || 'T98 participant reports a message: ok | ';

  -- A third person sees nothing and can't write or report.
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', cs[2], 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.conversations where id = conv;
  out := out || format('T99 third person sees the conversation: %s (expect 0) | ', n);
  select count(*) into n from public.chat_messages where conversation_id = conv;
  out := out || format('T100 third person reads messages: %s (expect 0) | ', n);
  begin
    insert into public.chat_messages (conversation_id, sender_id, body) values (conv, cs[2], 'hi');
    out := out || 'T101 third person writes: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T101 third person writes: denied (good) | ';
  end;
  begin
    insert into public.reports (reporter_id, target_type, target_id, reason) values (cs[2], 'message', msg::text, 'spam');
    out := out || 'T102 stranger reports (exposes) a message: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T102 stranger reports a message: denied (good) | ';
  end;

  -- Block (the server action uses the service role): no new messages, history stays.
  execute 'reset role';
  update public.conversations set blocked_by = a, blocked_at = now() where id = conv;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    insert into public.chat_messages (conversation_id, sender_id, body) values (conv, a, 'after block');
    out := out || 'T103 message to a blocked conversation: ALLOWED (BAD) | ';
  exception when insufficient_privilege then
    out := out || format('T103 blocked: new message denied, history still %s (expect 200) | ',
      (select count(*) from public.chat_messages where conversation_id = conv));
  end;

  -- Deleting B's account removes B's messages only; A keeps the conversation.
  execute 'reset role';
  insert into public.chat_messages (conversation_id, sender_id, body) values (conv, a, 'from A');
  delete from auth.users where id = b;
  out := out || format('T104 B deleted: B messages=%s (expect 0), A messages=%s (expect 1), conversation kept=%s | ',
    (select count(*) from public.chat_messages where conversation_id = conv and sender_id = b),
    (select count(*) from public.chat_messages where conversation_id = conv and sender_id = a),
    (select count(*) = 1 from public.conversations where id = conv and a in (user_a, user_b)));

  -- Profile photos (migration profile_avatars_v2). Two fresh accounts c1 / c2; "service" steps run
  -- as the migration owner, like the server action's service role (RLS bypassed, constraint not).
  execute 'reset role';
  insert into auth.users (id, email, raw_user_meta_data, aud, role)
  values (c1, 'rls-avatar1@test.local', '{"full_name":"C1","avatar_url":"https://evil.example/pixel.gif"}', 'authenticated', 'authenticated'),
         (c2, 'rls-avatar2@test.local', '{"full_name":"C2","avatar_url":"https://lh3.googleusercontent.com/a/c2=s96-c"}', 'authenticated', 'authenticated');
  out := out || format('T104a sign-up photo: tampered=%s (expect null), google kept=%s | ',
    coalesce((select avatar_url from public.profiles where id = c1), 'null'),
    (select avatar_url like 'https://lh3.googleusercontent.com/%' from public.profiles where id = c2));

  out := out || format('T105a privileges: table UPDATE=%s, avatar_url UPDATE=%s, display_name UPDATE=%s (expect false, false, true) | ',
    has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
    has_column_privilege('authenticated', 'public.profiles', 'avatar_url', 'UPDATE'),
    has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE'));
  perform set_config('request.jwt.claims', json_build_object('sub', c1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    update public.profiles set avatar_url = 'https://attacker.example/test' where id = auth.uid();
    out := out || 'T105 client sets own avatar_url: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T105 client sets own avatar_url: denied (good) | ';
  end;
  update public.profiles set display_name = 'C1 edited', headline = 'still editable' where id = auth.uid();
  get diagnostics n = row_count;
  out := out || format('T105b client edits own name / headline: %s row (expect 1) | ', n);
  update public.profiles set display_name = 'hijack' where id = c2;
  get diagnostics n = row_count;
  out := out || format('T105c client edits another profile: %s rows (expect 0) | ', n);

  -- Direct Storage writes (the Storage API runs these same statements under the user's JWT).
  begin
    insert into storage.objects (bucket_id, name, owner, owner_id)
    values ('avatars', c1::text || '/0b6f3c1e-5d1a-4c55-9a8e-3f1b2c4d5e6f.webp', c1, c1::text);
    out := out || 'T108 client uploads into avatars: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T108 client uploads into avatars: denied (good) | ';
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('avatars', 'anything/at/all.txt');
    out := out || 'T108b client creates an arbitrary path: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T108b client creates an arbitrary path: denied (good) | ';
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  begin
    insert into storage.objects (bucket_id, name) values ('avatars', c1::text || '/x.webp');
    out := out || 'T108c anon uploads into avatars: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T108c anon uploads: denied (good) | ';
  end;

  -- c2 has a real photo object (written the way the server writes it).
  execute 'reset role';
  insert into storage.objects (bucket_id, name, owner, owner_id)
  values ('avatars', c2::text || '/1c7a4d2f-6e2b-4d66-8b9f-4a2c3d5e6f70.webp', c2, c2::text);
  update public.profiles
    set avatar_url = base || c2::text || '/1c7a4d2f-6e2b-4d66-8b9f-4a2c3d5e6f70.webp' where id = c2;

  -- Raw SQL deletes are blocked for everyone by storage.protect_delete; the Storage API sets
  -- storage.allow_delete_query per request, after which RLS decides. Do the same here.
  perform set_config('storage.allow_delete_query', 'true', true);
  perform set_config('request.jwt.claims', json_build_object('sub', c1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  delete from storage.objects where bucket_id = 'avatars' and name like c2::text || '/%';
  get diagnostics n = row_count;
  out := out || format('T109 client deletes another user''s photo: %s rows (expect 0) | ', n);
  update storage.objects set name = c1::text || '/1c7a4d2f-6e2b-4d66-8b9f-4a2c3d5e6f70.webp'
    where bucket_id = 'avatars' and name like c2::text || '/%';
  get diagnostics n = row_count;
  out := out || format('T111 client moves / overwrites another user''s photo: %s rows (expect 0) | ', n);
  begin
    insert into storage.objects (bucket_id, name, owner, owner_id)
    values ('avatars', c1::text || '/1c7a4d2f-6e2b-4d66-8b9f-4a2c3d5e6f70.webp', c1, c1::text);
    out := out || 'T111b client copies a photo into its folder: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T111b client copies a photo: denied (good) | ';
  end;
  perform set_config('request.jwt.claims', json_build_object('sub', c2, 'role', 'authenticated')::text, true);
  delete from storage.objects where bucket_id = 'avatars' and name like c2::text || '/%';
  get diagnostics n = row_count;
  out := out || format('T109b client deletes even its own photo directly: %s rows (expect 0; server only) | ', n);
  execute 'reset role';
  select count(*) into n from storage.objects where bucket_id = 'avatars' and name like c2::text || '/%';
  out := out || format('T109c c2 photo object still there: %s (expect 1) | ', n);

  -- The constraint holds for every writer (service role included).
  begin
    update public.profiles set avatar_url = base || c2::text || '/1c7a4d2f-6e2b-4d66-8b9f-4a2c3d5e6f70.webp' where id = c1;
    out := out || 'T111c c1 profile pointed at c2''s file: ALLOWED (BAD) | ';
  exception when check_violation then out := out || 'T111c c1 profile pointed at c2''s file: refused (good) | ';
  end;
  begin
    update public.profiles set avatar_url = 'https://evil.example/storage/v1/object/public/avatars/' || c1::text || '/0b6f3c1e-5d1a-4c55-9a8e-3f1b2c4d5e6f.webp' where id = c1;
    out := out || 'T110b look-alike host: ALLOWED (BAD) | ';
  exception when check_violation then out := out || 'T110b look-alike host: refused (good) | ';
  end;
  begin
    update public.profiles set avatar_url = base || c1::text || '/0b6f3c1e-5d1a-4c55-9a8e-3f1b2c4d5e6f.webp?x=1' where id = c1;
    out := out || 'T110c malformed own URL: ALLOWED (BAD) | ';
  exception when check_violation then out := out || 'T110c malformed own URL: refused (good) | ';
  end;
  begin
    update public.profiles set avatar_url = 'https://lh3.googleusercontent.com.evil.example/a' where id = c1;
    out := out || 'T110d fake Google host: ALLOWED (BAD) | ';
  exception when check_violation then out := out || 'T110d fake Google host: refused (good) | ';
  end;

  -- T112: a refused profile update changes nothing and queues nothing.
  select count(*) into k from public.storage_cleanup where bucket = 'avatars';
  begin
    update public.profiles set avatar_url = 'https://attacker.example/x.gif' where id = c2;
  exception when check_violation then null;
  end;
  out := out || format('T112 refused update: photo unchanged=%s, queue grew by %s (expect true, 0) | ',
    (select avatar_url = base || c2::text || '/1c7a4d2f-6e2b-4d66-8b9f-4a2c3d5e6f70.webp' from public.profiles where id = c2),
    (select count(*) from public.storage_cleanup where bucket = 'avatars') - k);

  -- T106: replacing an own photo queues exactly the old own file.
  update public.profiles set avatar_url = base || c1::text || '/0b6f3c1e-5d1a-4c55-9a8e-3f1b2c4d5e6f.webp' where id = c1;
  update public.profiles set avatar_url = base || c1::text || '/9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f.jpg' where id = c1;
  out := out || format('T106 replaced own photo queued: %s (expect %s/0b6f…webp only) | ',
    (select string_agg(path, ',') from public.storage_cleanup where bucket = 'avatars' and path like c1::text || '/%'), c1);

  -- T110: Google / GitHub URLs are never queued.
  delete from public.storage_cleanup where bucket = 'avatars';
  update public.profiles set avatar_url = 'https://lh3.googleusercontent.com/a/c2=s96-c' where id = c2;
  delete from public.storage_cleanup where bucket = 'avatars'; -- (c2's own file, queued: correct)
  update public.profiles set avatar_url = 'https://avatars.githubusercontent.com/u/2?v=4' where id = c2;
  update public.profiles set avatar_url = null where id = c2;
  select count(*) into n from public.storage_cleanup where bucket = 'avatars';
  out := out || format('T110 provider URLs replaced / removed: %s queued (expect 0) | ', n);

  -- T107: deleting an account queues its own photo (and nobody else's).
  delete from auth.users where id = c1;
  out := out || format('T107 c1 deleted: profile gone=%s, queued=%s (expect true, %s/9c1d…jpg) | ',
    not exists (select 1 from public.profiles where id = c1),
    (select string_agg(path, ',') from public.storage_cleanup where bucket = 'avatars'), c1);

  -- T113: 20 photo changes a day; anon can't call it.
  perform set_config('request.jwt.claims', json_build_object('sub', c2, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  for k in 1..20 loop
    perform public.take_avatar_change();
  end loop;
  begin
    perform public.take_avatar_change();
    out := out || 'T113 21st photo change today: ALLOWED (BAD) | ';
  exception when sqlstate '54000' then out := out || 'T113 21st photo change today: limited (good) | ';
  end;
  execute 'reset role';
  out := out || format('T113b anon may call take_avatar_change: %s (expect false) | ',
    has_function_privilege('anon', 'public.take_avatar_change()', 'EXECUTE'));

  -- T114: configuration as intended.
  out := out || format('T114 bucket=%s; restrictive no-write policies=%s (expect 3); cleanup fn callable by authenticated=%s (expect false); definer+search_path: %s | ',
    (select format('public=%s limit=%s types=%s', public, file_size_limit, allowed_mime_types) from storage.buckets where id = 'avatars'),
    (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and permissive = 'RESTRICTIVE' and policyname like 'avatars:%'),
    has_function_privilege('authenticated', 'private.profiles_queue_avatar_cleanup()', 'EXECUTE'),
    (select string_agg(p.proname || '=' || p.prosecdef || ':' || coalesce(array_to_string(p.proconfig, ','), 'none'), ' ')
       from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
      where (ns.nspname, p.proname) in (('private', 'profiles_queue_avatar_cleanup'), ('private', 'handle_new_user'), ('public', 'take_avatar_change'))));

  -- upload_images_jpeg: the Storage API enforces these types (not SQL), so check the config.
  execute 'reset role';
  select count(*) into n from storage.buckets
  where id in ('screenshots', 'post-images')
    and allowed_mime_types @> array['image/webp', 'image/jpeg']
    and allowed_mime_types <@ array['image/webp', 'image/jpeg'];
  out := out || format('T119 screenshot + post-image buckets accept exactly WebP + JPEG: %s (expect 2) | ', n);

  -- owner_verified (round 3): T120–T126. A fresh user so earlier tests can't interfere.
  execute 'reset role';
  insert into auth.users (id, email, raw_user_meta_data, aud, role)
  values (ov, 'rls-ov@test.local', '{"full_name":"Tester OV"}', 'authenticated', 'authenticated');
  perform set_config('request.jwt.claims', json_build_object('sub', ov, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.startups (owner_id, slug, name, website_url)
  values (ov, 'rls-ov', 'OV', 'https://ov.test') returning id into sid;

  -- T120: the owner can't set the badge or the level themselves (server-only, like verified numbers).
  begin
    update public.startups set owner_verified_at = now() + interval '1 year' where id = sid;
    out := out || 'T120 owner sets owner_verified_at: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T120 owner sets owner_verified_at: denied (good) | ';
  end;
  begin
    insert into public.startups (owner_id, slug, name, website_url, owner_verified_at)
    values (ov, 'rls-ov-2', 'OV2', 'https://ov2.test', now());
    out := out || 'T120b owner inserts with owner_verified_at: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T120b owner inserts with owner_verified_at: denied (good) | ';
  end;
  begin
    update public.startups set proof_level = 3 where id = sid;
    out := out || 'T120c owner sets proof_level: ALLOWED (BAD) | ';
  exception when insufficient_privilege or generated_always then out := out || 'T120c owner sets proof_level: denied (good) | ';
  end;
  out := out || format('T120d client grants insert/update on owner_verified_at, proof_level, visitors_30d, build_commits: %s (expect all f) | ',
    concat_ws(',',
      has_column_privilege('authenticated', 'public.startups', 'owner_verified_at', 'INSERT'),
      has_column_privilege('authenticated', 'public.startups', 'owner_verified_at', 'UPDATE'),
      has_column_privilege('authenticated', 'public.startups', 'proof_level', 'INSERT'),
      has_column_privilege('authenticated', 'public.startups', 'proof_level', 'UPDATE'),
      has_column_privilege('authenticated', 'public.startups', 'visitors_30d', 'UPDATE'),
      has_column_privilege('authenticated', 'public.startups', 'build_commits', 'UPDATE'),
      has_column_privilege('anon', 'public.startups', 'owner_verified_at', 'UPDATE')));

  -- T121: proof_level follows the columns: none 0 → owner 1 → visitors only 1 → build 2 → revenue 3; demo 0.
  execute 'reset role';
  j := to_jsonb(array[(select proof_level from public.startups where id = sid)]);
  update public.startups set owner_verified_at = now() where id = sid;
  j := j || to_jsonb((select proof_level from public.startups where id = sid));
  update public.startups set owner_verified_at = null, visitors_30d = 100 where id = sid;
  j := j || to_jsonb((select proof_level from public.startups where id = sid));
  update public.startups set build_commits = 10 where id = sid;
  j := j || to_jsonb((select proof_level from public.startups where id = sid));
  update public.startups set verification_status = 'verified' where id = sid;
  j := j || to_jsonb((select proof_level from public.startups where id = sid));
  update public.startups set is_demo = true where id = sid;
  j := j || to_jsonb((select proof_level from public.startups where id = sid));
  update public.startups set is_demo = false, verification_status = 'unverified', build_commits = null, visitors_30d = null where id = sid;
  j := j || to_jsonb((select proof_level from public.startups where id = sid));
  out := out || format('T121 proof_level none→owner→visitors→build→revenue→demo→cleared: %s (expect [0, 1, 1, 2, 3, 0, 0]) | ', j);

  -- T122: owner edits. Renaming or a new slug keeps the badge (it is tied to the id); a new website clears it.
  update public.startups set owner_verified_at = now() where id = sid;
  perform set_config('request.jwt.claims', json_build_object('sub', ov, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.startups set name = 'OV renamed', slug = 'rls-ov-renamed' where id = sid;
  out := out || format('T122 rename + new slug keeps badge: %s (expect true) | ',
    (select owner_verified_at is not null from public.startups where id = sid));
  update public.startups set website_url = 'https://other.test' where id = sid;
  out := out || format('T122b owner changes website: cleared=%s, proof_level=%s (expect true, 0) | ',
    (select owner_verified_at is null from public.startups where id = sid),
    (select proof_level from public.startups where id = sid));

  -- T123: the server (service role) path: any website change clears it, even in the same statement
  -- that sets the badge, a change back, a trailing slash, letter case, or http→https.
  execute 'reset role';
  update public.startups set website_url = 'https://ov.test', owner_verified_at = null where id = sid;
  j := '[]'::jsonb;
  update public.startups set website_url = 'https://x.test', owner_verified_at = now() where id = sid;
  j := j || to_jsonb((select owner_verified_at is null from public.startups where id = sid));
  update public.startups set owner_verified_at = now() where id = sid;
  update public.startups set website_url = 'https://ov.test' where id = sid;
  j := j || to_jsonb((select owner_verified_at is null from public.startups where id = sid));
  update public.startups set owner_verified_at = now() where id = sid;
  update public.startups set website_url = 'https://ov.test/' where id = sid;
  j := j || to_jsonb((select owner_verified_at is null from public.startups where id = sid));
  update public.startups set owner_verified_at = now() where id = sid;
  update public.startups set website_url = 'https://OV.test/' where id = sid;
  j := j || to_jsonb((select owner_verified_at is null from public.startups where id = sid));
  update public.startups set owner_verified_at = now() where id = sid;
  update public.startups set website_url = 'http://OV.test/' where id = sid;
  j := j || to_jsonb((select owner_verified_at is null from public.startups where id = sid));
  out := out || format('T123 server website changes clear the badge (same-statement, back, slash, case, scheme): %s (expect all true) | ', j);
  update public.startups set owner_verified_at = now() where id = sid;
  update public.startups set website_url = website_url, name = 'same site' where id = sid;
  out := out || format('T123b website set to the same value keeps it: %s (expect true) | ',
    (select owner_verified_at is not null from public.startups where id = sid));

  -- T124: nobody writes the generated level, not even the server.
  begin
    update public.startups set proof_level = 3 where id = sid;
    out := out || 'T124 server sets proof_level: ALLOWED (BAD) | ';
  exception when generated_always then out := out || 'T124 server sets proof_level: refused (good) | ';
  end;

  -- T125: visitors can read the badge and the order key (public profile / lists).
  out := out || format('T125 anon reads owner_verified_at=%s proof_level=%s (expect true, true) | ',
    has_column_privilege('anon', 'public.startups', 'owner_verified_at', 'SELECT'),
    has_column_privilege('anon', 'public.startups', 'proof_level', 'SELECT'));

  -- T126: trigger function: not callable by clients, fixed search_path, fires on website_url only.
  out := out || format('T126 reset fn callable by authenticated=%s anon=%s (expect false, false); config=%s; trigger=%s | ',
    has_function_privilege('authenticated', 'private.startups_reset_owner_verified()', 'EXECUTE'),
    has_function_privilege('anon', 'private.startups_reset_owner_verified()', 'EXECUTE'),
    (select coalesce(array_to_string(proconfig, ','), 'none') from pg_proc where proname = 'startups_reset_owner_verified'),
    (select pg_get_triggerdef(oid) from pg_trigger where tgname = 'startups_reset_owner_verified'));

  -- T127–T131: editable links keep old links (migration 20261008061335_slug_history).
  execute 'reset role';
  out := out || format('T127 the T122 rename remembered the old slug: %s (expect true) | ',
    exists (select 1 from public.startup_slug_history where startup_id = sid));
  select slug into old_slug from public.startup_slug_history where startup_id = sid
    order by renamed_at desc limit 1;
  -- T128: another owner can't take that old slug (it would receive the old links' traffic).
  -- cs[3]: a fresh user still present (B was deleted in T104).
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', cs[3], 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    insert into public.startups (owner_id, slug, name, website_url)
      values (cs[3], old_slug, 'Taker', 'https://taker.test');
    out := out || 'T128 another owner takes an old slug: ALLOWED (BAD) | ';
  exception when unique_violation then
    out := out || 'T128 another owner takes an old slug: refused as taken (good) | ';
  end;
  execute 'reset role';
  -- T129: the owner takes its old slug back: live again, no longer a redirect.
  perform set_config('request.jwt.claims', json_build_object('sub', ov, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.startups set slug = old_slug where id = sid;
  execute 'reset role';
  out := out || format('T129 owner takes back its old slug: live=%s still-in-history=%s (expect true, false) | ',
    exists (select 1 from public.startups where id = sid and slug = old_slug),
    exists (select 1 from public.startup_slug_history where slug = old_slug));
  -- T130: clients never write the history; visitors may read it (old public URLs).
  out := out || format('T130 authenticated insert=%s update=%s delete=%s (expect false x3); anon select=%s (expect true) | ',
    has_table_privilege('authenticated', 'public.startup_slug_history', 'INSERT'),
    has_table_privilege('authenticated', 'public.startup_slug_history', 'UPDATE'),
    has_table_privilege('authenticated', 'public.startup_slug_history', 'DELETE'),
    has_table_privilege('anon', 'public.startup_slug_history', 'SELECT'));
  -- T131: trigger functions not callable by clients, fixed search_path.
  out := out || format('T131 slug fns callable by authenticated=%s/%s (expect false, false); config=%s | ',
    has_function_privilege('authenticated', 'private.startups_reserve_old_slugs()', 'EXECUTE'),
    has_function_privilege('authenticated', 'private.startups_remember_slug()', 'EXECUTE'),
    (select string_agg(proname || ':' || coalesce(array_to_string(proconfig, ','), 'none'), ' ')
       from pg_proc where proname in ('startups_reserve_old_slugs', 'startups_remember_slug')));

  -- T132–T136: owner "hide for now" (migration 20261008063754_owner_private_status).
  perform set_config('request.jwt.claims', json_build_object('sub', ov, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.startups set status = 'private' where id = sid;
  get diagnostics n = row_count;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  out := out || format('T132 owner makes it private: %s row (expect 1); anon sees it: %s (expect 0) | ',
    n, (select count(*) from public.startups where id = sid));
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', ov, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  out := out || format('T132b owner still sees own private project: %s (expect 1) | ',
    (select count(*) from public.startups where id = sid));
  update public.startups set status = 'published' where id = sid;
  get diagnostics n = row_count;
  out := out || format('T133 owner publishes it again: %s row (expect 1) | ', n);
  begin
    update public.startups set status = 'hidden' where id = sid;
    out := out || 'T134 owner sets moderation hidden: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T134 owner sets moderation hidden: denied (good) | ';
  end;
  execute 'reset role';
  update public.startups set status = 'hidden' where id = sid; -- a moderator (service role)
  perform set_config('request.jwt.claims', json_build_object('sub', ov, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    update public.startups set status = 'published' where id = sid;
    out := out || 'T135 owner undoes a moderator hide: ALLOWED (BAD) | ';
  exception when insufficient_privilege then out := out || 'T135 owner undoes a moderator hide: denied (good) | ';
  end;
  execute 'reset role';
  update public.startups set status = 'published' where id = sid;
  perform set_config('request.jwt.claims', json_build_object('sub', cs[3], 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.startups set status = 'private' where id = sid;
  get diagnostics n = row_count;
  out := out || format('T136 another user hides it: %s rows (expect 0) | ', n);
  execute 'reset role';
  out := out || format('T136b status fn callable by authenticated=%s (expect false); config=%s | ',
    has_function_privilege('authenticated', 'private.startups_owner_status()', 'EXECUTE'),
    (select coalesce(array_to_string(proconfig, ','), 'none') from pg_proc where proname = 'startups_owner_status'));
  execute 'reset role';

  -- T137–T145: add-project funnel analytics (migration 20261011120000_add_funnel_events).
  -- T137: the analytics schema and table are unreachable from the API by any client role.
  out := out || format('T137 analytics hidden: anon usage=%s auth usage=%s svc usage=%s; anon sel=%s auth sel=%s svc sel=%s; rls=%s policies=%s (expect false x6, true, 0) | ',
    has_schema_privilege('anon', 'analytics', 'USAGE'),
    has_schema_privilege('authenticated', 'analytics', 'USAGE'),
    has_schema_privilege('service_role', 'analytics', 'USAGE'),
    has_table_privilege('anon', 'analytics.funnel_events', 'SELECT'),
    has_table_privilege('authenticated', 'analytics.funnel_events', 'SELECT'),
    has_table_privilege('service_role', 'analytics.funnel_events', 'SELECT'),
    (select relrowsecurity from pg_class where oid = 'analytics.funnel_events'::regclass),
    (select count(*) from pg_policies where schemaname = 'analytics' and tablename = 'funnel_events'));
  -- T138: execute rights — browser fn for authenticated only; server fns for service_role only.
  out := out || format('T138 exec rights: auth log_add=%s anon log_add=%s svc log_verify=%s auth log_verify=%s svc prune=%s auth prune=%s (expect t f t f t f) | ',
    has_function_privilege('authenticated', 'public.log_add_event(uuid,text,bigint,jsonb)', 'EXECUTE'),
    has_function_privilege('anon', 'public.log_add_event(uuid,text,bigint,jsonb)', 'EXECUTE'),
    has_function_privilege('service_role', 'public.log_verify_result(uuid,bigint,text,boolean,text)', 'EXECUTE'),
    has_function_privilege('authenticated', 'public.log_verify_result(uuid,bigint,text,boolean,text)', 'EXECUTE'),
    has_function_privilege('service_role', 'public.prune_funnel_events()', 'EXECUTE'),
    has_function_privilege('authenticated', 'public.prune_funnel_events()', 'EXECUTE'));
  -- T139: a valid event inserts one row owned by auth.uid(); replaying it inserts nothing.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.log_add_event('00000000-0000-4000-8000-0000000000e1'::uuid, 'add_opened');
  perform public.log_add_event('00000000-0000-4000-8000-0000000000e1'::uuid, 'add_opened');
  execute 'reset role';
  out := out || format('T139 add_opened twice → %s row, own user=%s (expect 1, true) | ',
    (select count(*) from analytics.funnel_events where attempt_id = '00000000-0000-4000-8000-0000000000e1'),
    (select bool_and(user_id = a) from analytics.funnel_events where attempt_id = '00000000-0000-4000-8000-0000000000e1'));
  -- T140: unknown event, browser verify_result, extra prop, bad code / choice, missing skipped,
  -- add_created without a project: all store nothing and never raise.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.log_add_event('00000000-0000-4000-8000-0000000000e2'::uuid, 'bogus_event');
  perform public.log_add_event('00000000-0000-4000-8000-0000000000e2'::uuid, 'verify_result');
  perform public.log_add_event('00000000-0000-4000-8000-0000000000e2'::uuid, 'add_failed', null, jsonb_build_object('code', 'invalid_link', 'extra', 'x'));
  perform public.log_add_event('00000000-0000-4000-8000-0000000000e2'::uuid, 'add_failed', null, jsonb_build_object('code', 'nope'));
  perform public.log_add_event('00000000-0000-4000-8000-0000000000e2'::uuid, 'verify_chose', sid, jsonb_build_object('choice', 'nope'));
  perform public.log_add_event('00000000-0000-4000-8000-0000000000e2'::uuid, 'add_finished', sid, jsonb_build_object());
  perform public.log_add_event('00000000-0000-4000-8000-0000000000e2'::uuid, 'add_created', null, jsonb_build_object());
  execute 'reset role';
  out := out || format('T140 invalid browser events stored: %s (expect 0) | ',
    (select count(*) from analytics.funnel_events where attempt_id = '00000000-0000-4000-8000-0000000000e2'));
  -- T141: logging into someone else's project stores nothing.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.log_add_event('00000000-0000-4000-8000-0000000000e3'::uuid, 'add_created', sid);
  execute 'reset role';
  out := out || format('T141 B logs into A''s project: %s (expect 0) | ',
    (select count(*) from analytics.funnel_events where attempt_id = '00000000-0000-4000-8000-0000000000e3'));
  -- T142: at most 100 browser events per user per 24 h (fresh user has no other events).
  insert into auth.users (id, email, aud, role)
  values ('00000000-0000-4000-8000-0000000000f1', 'rls-funnel-cap@test.local', 'authenticated', 'authenticated');
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-8000-0000000000f1', 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  for i in 1..100 loop
    perform public.log_add_event(('00000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid, 'add_opened');
  end loop;
  perform public.log_add_event('00000000-0000-4000-8000-00000000ffff'::uuid, 'add_opened');
  execute 'reset role';
  out := out || format('T142 24h cap: %s events, 101st stored=%s (expect 100, false) | ',
    (select count(*) from analytics.funnel_events where user_id = '00000000-0000-4000-8000-0000000000f1'),
    exists (select 1 from analytics.funnel_events where user_id = '00000000-0000-4000-8000-0000000000f1' and attempt_id = '00000000-0000-4000-8000-00000000ffff'));
  -- T142b: verify_result rows don't count toward the per-user client cap.
  select count(*) into n from analytics.funnel_events where user_id = a and event <> 'verify_result';
  execute 'set local role service_role';
  perform public.log_verify_result(a, sid, 'stripe', true, null);
  execute 'reset role';
  out := out || format('T142b verify_result not in client cap: client %s→%s (expect same), verify=%s (expect 1) | ',
    n,
    (select count(*) from analytics.funnel_events where user_id = a and event <> 'verify_result'),
    (select count(*) from analytics.funnel_events where user_id = a and event = 'verify_result'));
  -- T143: server verify_result — bad source / ok-with-code / bad code / foreign owner add 0; capped 50/project/day.
  execute 'set local role service_role';
  perform public.log_verify_result(a, sid, 'bogus', true, null);
  perform public.log_verify_result(a, sid, 'stripe', true, 'invalid_key');
  perform public.log_verify_result(a, sid, 'stripe', false, 'nope');
  perform public.log_verify_result(b, sid, 'stripe', true, null);
  for i in 1..60 loop
    perform public.log_verify_result(a, sid, 'github', true, null);
  end loop;
  execute 'reset role';
  out := out || format('T143 verify_result cap: %s rows for sid (expect 50) | ',
    (select count(*) from analytics.funnel_events where startup_id = sid and event = 'verify_result'));
  -- T144: prune deletes only rows older than 180 days.
  insert into analytics.funnel_events (user_id, attempt_id, event, created_at)
  values (a, '00000000-0000-4000-8000-0000000000e9', 'add_opened', now() - interval '181 days'),
         (a, '00000000-0000-4000-8000-0000000000ea', 'add_opened', now() - interval '10 days');
  execute 'set local role service_role';
  select public.prune_funnel_events() into n;
  execute 'reset role';
  out := out || format('T144 prune deleted %s (expect 1); old left=%s new left=%s (expect 0, 1) | ',
    n,
    (select count(*) from analytics.funnel_events where attempt_id = '00000000-0000-4000-8000-0000000000e9'),
    (select count(*) from analytics.funnel_events where attempt_id = '00000000-0000-4000-8000-0000000000ea'));
  -- T145: account delete cascades; project delete keeps the row with startup_id = null; definer fns fixed search_path.
  insert into auth.users (id, email, aud, role)
  values ('00000000-0000-4000-8000-0000000000f2', 'rls-funnel-del@test.local', 'authenticated', 'authenticated');
  insert into analytics.funnel_events (user_id, attempt_id, event)
  values ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000ec', 'add_opened');
  delete from auth.users where id = '00000000-0000-4000-8000-0000000000f2';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.startups (owner_id, slug, name, website_url)
  values (a, 'rls-funnel-proj', 'Funnel', 'https://funnel.test') returning id into pid;
  execute 'reset role';
  insert into analytics.funnel_events (user_id, attempt_id, startup_id, event)
  values (a, '00000000-0000-4000-8000-0000000000eb', pid, 'verify_chose');
  delete from public.startups where id = pid;
  out := out || format('T145 cascade: user rows left=%s (expect 0); project row kept=%s startup_id null=%s (expect 1, true) | ',
    (select count(*) from analytics.funnel_events where attempt_id = '00000000-0000-4000-8000-0000000000ec'),
    (select count(*) from analytics.funnel_events where attempt_id = '00000000-0000-4000-8000-0000000000eb'),
    (select startup_id is null from analytics.funnel_events where attempt_id = '00000000-0000-4000-8000-0000000000eb'));
  out := out || format('T145 definer fns fixed search_path: %s (expect 3) | ',
    (select count(*) from pg_proc
       where proname in ('log_add_event', 'log_verify_result', 'prune_funnel_events')
         and prosecdef and 'search_path=' = any (proconfig)));

  execute 'reset role';
  raise exception 'RLS_TEST_RESULTS (rolled back): %', out;
end $$;
