-- RLS smoke test — run after every migration (Supabase MCP `execute_sql` on project mrrmafia).
-- Everything runs in one DO block that ends with RAISE EXCEPTION, so ALL changes roll back and the
-- results come back as the error message. Expect every line to read "(good)" / match "expect".
-- NOTE: sequences don't roll back → afterwards run:
--   alter sequence private.founding_number_seq restart with <next free number>;
do $$
declare
  a uuid := '00000000-0000-4000-8000-00000000000a';
  b uuid := '00000000-0000-4000-8000-00000000000b';
  sid bigint;
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

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.startups set name = 'hacked' where id = sid;
  get diagnostics n = row_count;
  out := out || format('T7 B edits A startup: %s rows (expect 0) | ', n);
  delete from public.startups where id = sid;
  get diagnostics n = row_count;
  out := out || format('T8 B deletes A startup: %s rows (expect 0) | ', n);

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  select count(*) into n from public.startups where id = sid;
  out := out || format('T9 anon sees published startup: %s (expect 1) | ', n);
  begin
    insert into public.startups (owner_id, slug, name, website_url) values (a, 'rls-anon', 'Anon', 'https://x.test');
    out := out || 'T10 anon inserts: ALLOWED (BAD)';
  exception when insufficient_privilege then out := out || 'T10 anon inserts: denied (good)';
  end;

  execute 'reset role';
  raise exception 'RLS_TEST_RESULTS (rolled back): %', out;
end $$;
