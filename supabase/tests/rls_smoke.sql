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
  out text := '';
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
  out := out || format('T86 hide: image rows=%s (expect 0), files queued=%s (expect 1) | ',
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

  execute 'reset role';
  raise exception 'RLS_TEST_RESULTS (rolled back): %', out;
end $$;
