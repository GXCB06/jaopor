-- Applied 2026-10-14 (owner: "apply"). Chat (Phase 11 follow-up): edit and delete your own messages.
--  * chat_messages gains edited_at / deleted_at.
--  * A participant may UPDATE (edit the text) or soft-DELETE (clear the body) their own message while
--    the conversation is still open. Nobody else, and never an already-deleted message.
--  * Deletes are soft: the row stays (both people see "ข้อความถูกลบ", the order is unchanged) but the
--    text is gone the moment deleted_at is set.
--
-- Security model (unchanged otherwise): only the two participants read or write; new-message inserts
-- still go through private.chat_messages_guard (200 a day, open conversation only). The edit guard
-- below re-checks author + open conversation, and column grants stop conversation_id / sender_id /
-- created_at from changing.

alter table public.chat_messages
  add column edited_at timestamptz,
  add column deleted_at timestamptz;

-- A live message still needs 1–2000 chars; a deleted one keeps its row with an empty body.
alter table public.chat_messages drop constraint chat_messages_body_check;
alter table public.chat_messages add constraint chat_messages_body_check
  check (char_length(body) between 0 and 2000);
alter table public.chat_messages add constraint chat_messages_body_when_live
  check (deleted_at is not null or char_length(body) between 1 and 2000);

-- Only these three columns may ever change, and only on the caller's own rows (see the policy).
grant update (body, edited_at, deleted_at) on public.chat_messages to authenticated;

-- The author edits/deletes their own message, only while it is still live and the conversation open.
-- An already-deleted row is filtered out here (USING), so an update then matches nothing.
create policy "chat_messages: authors edit their own" on public.chat_messages
  for update to authenticated
  using (
    sender_id = (select auth.uid())
    and deleted_at is null
    and private.can_message(conversation_id, (select auth.uid()))
  )
  with check (sender_id = (select auth.uid()));

-- Stamp edited_at on a text change; require the author and an open conversation. Never touches an
-- already-deleted row (the UPDATE policy already excludes those). Service role / migrations pass.
create or replace function private.chat_messages_edit_guard()
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
  if me is null or old.sender_id <> me then
    raise exception 'not your message' using errcode = '42501';
  end if;
  if old.deleted_at is not null then
    raise exception 'already deleted' using errcode = '42501';
  end if;
  if not private.can_message(old.conversation_id, me) then
    raise exception 'conversation closed' using errcode = '42501';
  end if;
  if new.deleted_at is null then
    new.edited_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function private.chat_messages_edit_guard() from public, anon, authenticated;
create trigger chat_messages_edit_guard before update on public.chat_messages
  for each row execute function private.chat_messages_edit_guard();
