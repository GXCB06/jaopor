-- Applied 2026-10-01 (owner: "apply"). Phase 11 (docs/SPEC.md §13): in-app 1:1 chat, opened by an accepted contact request.
--  1. conversations       one per pair of people; created when a request is accepted (+ backfill)
--  2. chat_messages       text only (1–2000 chars), 200 a day per person (rate_events), no edits
--  3. conversation_reads  my "read up to" time per conversation → unread counts
--  4. reports             + target_type 'message'
--  5. realtime            chat_messages in the supabase_realtime publication (RLS applies)
--
-- Security model (same as Phases 9–10):
--  * Only the two people in a conversation can read it or write to it (RLS, explicit checks).
--  * Clients never create conversations or block / unblock: conversations come from the accepted
--    request trigger; blocking is done by a server action (service role) after checking the
--    caller is in the conversation, and it also sets the contact request to 'blocked' so their
--    LINE / email stop being shared and no new request can be sent.
--  * Deleting an account deletes the messages that person sent (their personal data); the other
--    person keeps the conversation with their own messages, shown with "ผู้ใช้ที่ลบบัญชี".
--  * Messages are not end-to-end encrypted. The team reads a message only when it is reported
--    (the /privacy wording says so).

-- ---------------------------------------------------------------------------------------------
-- 1. conversations
-- ---------------------------------------------------------------------------------------------
create table public.conversations (
  id bigint generated always as identity primary key,
  -- Ordered pair (user_a < user_b) so a pair has one conversation; null = deleted account.
  user_a uuid references public.profiles (id) on delete set null,
  user_b uuid references public.profiles (id) on delete set null,
  request_id bigint references public.contact_requests (id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  -- blocked_at set = closed for good; blocked_by is who did it (null once their account is gone,
  -- which is why "blocked" is read from blocked_at and there is no check pairing the two).
  blocked_by uuid references public.profiles (id) on delete set null,
  blocked_at timestamptz,
  check (user_a is null or user_b is null or user_a < user_b),
  unique (user_a, user_b)
);
create index conversations_user_a_idx on public.conversations (user_a, last_message_at desc);
create index conversations_user_b_idx on public.conversations (user_b, last_message_at desc);
create index conversations_request_idx on public.conversations (request_id);
create index conversations_blocked_by_idx on public.conversations (blocked_by);

alter table public.conversations enable row level security;
revoke all on public.conversations from anon, authenticated;
grant select on public.conversations to authenticated;
grant select, insert, update, delete on public.conversations to service_role;

create policy "conversations: participants read" on public.conversations
  for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));

-- Accepting a request opens (or reopens the existing) conversation for the pair.
create or replace function private.contact_requests_open_chat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    insert into public.conversations (user_a, user_b, request_id)
    values (least(new.from_id, new.to_id), greatest(new.from_id, new.to_id), new.id)
    on conflict (user_a, user_b) do update set request_id = excluded.request_id;
  end if;
  return null;
end;
$$;
revoke execute on function private.contact_requests_open_chat() from public, anon, authenticated;
create trigger contact_requests_open_chat after update of status on public.contact_requests
  for each row execute function private.contact_requests_open_chat();

-- Backfill: every pair with an accepted request gets a conversation now.
insert into public.conversations (user_a, user_b, request_id, created_at)
select distinct on (least(r.from_id, r.to_id), greatest(r.from_id, r.to_id))
  least(r.from_id, r.to_id), greatest(r.from_id, r.to_id), r.id,
  coalesce(r.responded_at, r.created_at)
from public.contact_requests r
where r.status = 'accepted'
order by least(r.from_id, r.to_id), greatest(r.from_id, r.to_id), r.responded_at desc nulls last
on conflict (user_a, user_b) do nothing;

-- ---------------------------------------------------------------------------------------------
-- 2. chat_messages
-- ---------------------------------------------------------------------------------------------
create table public.chat_messages (
  id bigint generated always as identity primary key,
  conversation_id bigint not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index chat_messages_conversation_idx on public.chat_messages (conversation_id, created_at desc);
create index chat_messages_sender_idx on public.chat_messages (sender_id, created_at);

-- Am I one of the two people, and is the conversation open (not blocked, other person exists)?
-- Definer: RLS on conversations must not hide the row from this check.
create or replace function private.can_message(p_conversation bigint, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation
      and p_user in (c.user_a, c.user_b)
      and c.user_a is not null and c.user_b is not null
      and c.blocked_at is null
  );
$$;
revoke execute on function private.can_message(bigint, uuid) from public;
grant execute on function private.can_message(bigint, uuid) to authenticated;

alter table private.rate_events drop constraint rate_events_kind_check;
alter table private.rate_events add constraint rate_events_kind_check
  check (kind in ('post', 'comment', 'message'));

create or replace function private.chat_messages_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if me is null or new.sender_id <> me or not private.can_message(new.conversation_id, me) then
    raise exception 'not allowed in this conversation' using errcode = '42501';
  end if;
  perform private.take_rate('message', 200);
  new.created_at := now();
  return new;
end;
$$;
revoke execute on function private.chat_messages_guard() from public;
create trigger chat_messages_guard before insert on public.chat_messages
  for each row execute function private.chat_messages_guard();

-- Conversation list order.
create or replace function private.chat_messages_touch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations set last_message_at = new.created_at
  where id = new.conversation_id;
  return null;
end;
$$;
revoke execute on function private.chat_messages_touch() from public, anon, authenticated;
create trigger chat_messages_touch after insert on public.chat_messages
  for each row execute function private.chat_messages_touch();

alter table public.chat_messages enable row level security;
revoke all on public.chat_messages from anon, authenticated;
grant select on public.chat_messages to authenticated;
grant insert (conversation_id, sender_id, body) on public.chat_messages to authenticated;
grant select, insert, update, delete on public.chat_messages to service_role;

-- Both people read the whole conversation (also after a block: history stays readable).
create policy "chat_messages: participants read" on public.chat_messages
  for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (select auth.uid()) in (c.user_a, c.user_b)
  ));
create policy "chat_messages: participants write to open conversations" on public.chat_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and private.can_message(conversation_id, (select auth.uid()))
  );

-- ---------------------------------------------------------------------------------------------
-- 3. conversation_reads: "read up to" per person and conversation (unread = newer messages from
--    the other person)
-- ---------------------------------------------------------------------------------------------
create table public.conversation_reads (
  conversation_id bigint not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_reads_user_idx on public.conversation_reads (user_id);

alter table public.conversation_reads enable row level security;
revoke all on public.conversation_reads from anon, authenticated;
grant select on public.conversation_reads to authenticated;
grant insert (conversation_id, user_id, last_read_at), update (last_read_at)
  on public.conversation_reads to authenticated;
grant select, insert, update, delete on public.conversation_reads to service_role;

create policy "conversation_reads: own rows" on public.conversation_reads
  for select to authenticated using (user_id = (select auth.uid()));
create policy "conversation_reads: mark my conversations read" on public.conversation_reads
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (select auth.uid()) in (c.user_a, c.user_b)
    )
  );
create policy "conversation_reads: update my rows" on public.conversation_reads
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- 4. reports: messages can be reported, but only by someone in that conversation. Enforced here,
--    not just in the server action: a report is what lets the team read a message, so a stranger
--    must not be able to report (and expose) someone else's message by guessing its id. The
--    chat_messages SELECT policy applies inside the subquery, so "I can see it" = "I'm in it".
-- ---------------------------------------------------------------------------------------------
alter table public.reports drop constraint reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in ('post', 'comment', 'user', 'message'));

drop policy "reports: file as myself" on public.reports;
create policy "reports: file as myself" on public.reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and not (target_type = 'user' and target_id = (select auth.uid())::text)
    and (
      target_type <> 'message'
      or exists (select 1 from public.chat_messages m where m.id::text = target_id)
    )
  );

-- ---------------------------------------------------------------------------------------------
-- 5. Realtime: new messages are pushed to the two people (postgres_changes applies the SELECT
--    policy above, so nobody else receives them)
-- ---------------------------------------------------------------------------------------------
alter publication supabase_realtime add table public.chat_messages;
