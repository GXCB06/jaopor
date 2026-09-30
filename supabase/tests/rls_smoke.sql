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
  begin
    insert into public.startups (owner_id, slug, name, website_url) values (a, 'rls-anon', 'Anon', 'https://x.test');
    out := out || 'T10 anon inserts: ALLOWED (BAD)';
  exception when insufficient_privilege then out := out || 'T10 anon inserts: denied (good)';
  end;

  execute 'reset role';
  raise exception 'RLS_TEST_RESULTS (rolled back): %', out;
end $$;
