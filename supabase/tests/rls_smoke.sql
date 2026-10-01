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

  execute 'reset role';
  raise exception 'RLS_TEST_RESULTS (rolled back): %', out;
end $$;
